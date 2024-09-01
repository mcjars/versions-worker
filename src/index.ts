import { Router } from "@tsndr/cloudflare-worker-router"
import { string, time } from "@rjweb/utils"
import db from "./globals/database"
import ch from "./globals/cache"
import { eq } from "drizzle-orm"

import apiRouter from "./api/routes"

const router = new Router<Env, {}, {
	database: ReturnType<typeof db>
	cache: ReturnType<typeof ch>
	data: Record<string, any>
}>()

export type GlobalRouter = typeof router

apiRouter(router)

router.get('/', ({ env }) => {
	return new Response(`
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <script defer data-domain="versions.mcjars.app" src="https://cat.rjns.dev/js/script.js"></script>
    <link rel="icon" type="image/png" href="${env.S3_URL}/icons/vanilla.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="darkreader-lock" />
    <title>MCJars API Docs</title>
    <meta property="og:type" content="website">
    <meta property="og:title" content="MCJars">
    <meta property="og:url" content="https://mcjars.app">
    <meta property="og:image" content="${env.S3_URL}/icons/vanilla.png">
    <meta property="og:description" content="MCJars is a Minecraft Server Jar Website which allows you to download versions or reverse lookup for your favourite projects easily.">
    <meta name="description" content="MCJars is a Minecraft Server Jar Website which allows you to download versions or reverse lookup for your favourite projects easily.">
    <meta name="keywords" content="minecraft, server, jar, download, lookup, reverse, lookup, mcjars, site">
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
	`.trim(), {
		headers: {
			'Content-Type': 'text/html'
		}
	})
})

router.get('/icons/:type', ({ req, env }) => {
	const dot = req.params.type.indexOf('.')

	let file = req.params.type.toLowerCase()
	if (dot !== -1) file = file.slice(0, dot)
	if (!file.endsWith('.png')) file += '.png'

	return Response.redirect(`${env.S3_URL}/icons/${file}`, 301)
})

router.get('/download/fabric/:version/:projectVersion/:installerVersion', async({ req }) => {
	const version = req.params.version,
		projectVersion = req.params.projectVersion,
		installerVersion = req.params.installerVersion.replace('.jar', '')

	const response = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${version}/${projectVersion}/${installerVersion}/server/jar`)
	if (!response.ok) return Response.json({ success: false, errors: ['Build not found'] }, { status: 404 })

	return new Response(await response.arrayBuffer(), {
		...response,
		status: response.status,
		statusText: response.statusText,
		headers: Object.fromEntries(response.headers.entries())
	})
})

router.get('/download/arclight/:branch/:version/:type', async({ req }) => {
	const branch = req.params.branch,
		version = req.params.version,
		type = req.params.type.replace('.jar', '')

	const response = await fetch(`https://files.hypertention.cn/v1/files/arclight/branches/${branch}/versions-snapshot/${version}/${type}`)
	if (!response.ok) return Response.json({ success: false, errors: ['Build not found'] }, { status: 404 })

	return new Response(response.body as ReadableStream, {
		...response,
		status: response.status,
		statusText: response.statusText,
		headers: Object.fromEntries(response.headers.entries())
	})
})

router.get('/download/leaves/:version/:build/:file', async({ req }) => {
	const version = req.params.version,
		build = req.params.build,
		file = req.params.file

	const response = await fetch(`https://api.leavesmc.org/v2/projects/leaves/versions/${version}/builds/${build}/downloads/${file}`)
	if (!response.ok) return Response.json({ success: false, errors: ['Build not found'] }, { status: 404 })

	return new Response(response.body as ReadableStream, {
		...response,
		status: response.status,
		statusText: response.statusText,
		headers: Object.fromEntries(response.headers.entries())
	})
})

router.get('/download/canvas/:build/:file', async({ req }) => {
	const build = req.params.build,
		file = req.params.file

	const response = await fetch(`https://github.com/CraftCanvasMC/Canvas/releases/download/${build}/${file}`)
	if (!response.ok) return Response.json({ success: false, errors: ['Build not found'] }, { status: 404 })

	return new Response(response.body as ReadableStream, {
		...response,
		status: response.status,
		statusText: response.statusText,
		headers: Object.fromEntries(response.headers.entries())
	})
})

router.any('*', () => {
	return Response.json({ success: false, errors: ['Not found'] }, { status: 404 })
})

router.cors()

const data: Record<string, any> = {}

router.use(({ req, env }) => {
	req.database = db(env)
	req.cache = ch(env)
	req.data = data
})

export default {
	async fetch(request, env, ctx) {
		const start = Date.now(),
			url = new URL(request.url),
			path = url.pathname.concat(url.search),
			response = await router.handle(request, env, ctx)

		if (path.startsWith('/api') && url.searchParams.get('tracking') !== 'none') {
			const id = string.generate({ numbers: false }),
				database = db(env)
			response.headers.set('X-Request-Id', id)

			ctx.waitUntil(new Promise<void>(async(resolve) => {
				let organizationId: number | null = null
				if (request.headers.has('authorization') && request.headers.get('authorization')!.length === 64) {
					const organization = await ch(env).use(`organization::$${request.headers.get('authorization')}`, () => database.select()
							.from(database.schema.organizations)
							.innerJoin(database.schema.organizationKeys, eq(database.schema.organizationKeys.organizationId, database.schema.organizations.id))
							.where(eq(database.schema.organizationKeys.key, request.headers.get('authorization')!))
							.get().then((organization) => organization?.organizations ?? null),
						time(5).m()
					)

					if (organization) {
						organizationId = organization.id
					}
				}

				try {
					await database.insert(database.schema.requests)
						.values({
							id,
							ip: request.headers.get('x-real-ip')?.split(',')?.at(-1)?.trim()
								?? request.headers.get('cf-connecting-ip') ?? '0.0.0.0',
							continent: request.cf?.continent,
							country: request.cf?.country,
							data: Object.keys(data).length ? data : null,
							origin: request.headers.get('origin'),
							created: new Date(start),
							method: request.method,
							path,
							organizationId,
							status: response.status,
							time: Date.now() - start,
							userAgent: request.headers.get('user-agent') ?? 'Unknown',
							body: await request.json().catch(() => null)
						})
						.execute()
				} catch { }

				resolve()
			}))
		}

		return response
	}
} satisfies ExportedHandler<Env>