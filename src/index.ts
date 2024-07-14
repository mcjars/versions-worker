import { Router } from "@tsndr/cloudflare-worker-router"
import { string, time } from "@rjweb/utils"
import db from "./globals/database"
import ch from "./globals/cache"

import apiRouter from "./api/routes"
import { eq } from "drizzle-orm"

const router = new Router<Env, {}, {
	database: ReturnType<typeof db>
	cache: ReturnType<typeof ch>
}>()

export type GlobalRouter = typeof router

apiRouter(router)

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
		headers: {
			...Object.fromEntries(response.headers),
			'content-type': 'application/java-archive',
			'content-disposition': `attachment; filename="server.jar"`
		}
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
		headers: {
			...Object.fromEntries(response.headers),
			'content-type': 'application/java-archive',
			'content-disposition': `attachment; filename="server.jar"`
		}
	})
})

router.get('/download/leaves/:version/:build/:file', async({ req }) => {
	const version = req.params.version,
		build = req.params.build,
		file = req.params.file

	const response = await fetch(`https://api.leavesmc.org/projects/leaves/versions/${version}/builds/${build}/downloads/${file}`)
	if (!response.ok) return Response.json({ success: false, errors: ['Build not found'] }, { status: 404 })

	return new Response(response.body as ReadableStream, {
		...response,
		status: response.status,
		statusText: response.statusText,
		headers: {
			...Object.fromEntries(response.headers),
			'content-type': 'application/java-archive',
			'content-disposition': `attachment; filename="server.jar"`
		}
	})
})

router.any('*', () => {
	return Response.json({ success: false, errors: ['Not found'] }, { status: 404 })
})

router.cors()

router.use(({ req, env }) => {
	req.database = db(env)
	req.cache = ch(env)
})

export default {
	async fetch(request, env, ctx) {
		const start = Date.now(),
			path = new URL(request.url).pathname,
			response = await router.handle(request, env, ctx)

		if (path.startsWith('/api')) {
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

				database.insert(database.schema.requests)
					.values({
						id,
						ip: request.headers.get('x-real-ip')?.split(',')?.at(-1)?.trim()
							?? request.headers.get('cf-connecting-ip') ?? '0.0.0.0',
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

				resolve()
			}))
		}

		return response
	}
} satisfies ExportedHandler<Env>