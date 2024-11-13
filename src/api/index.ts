import { Server, version as Version, Cors } from "rjweb-server"
import getVersion from "@/index"
import logger from "@/globals/logger"
import database from "@/globals/database"
import env from "@/globals/env"
import cache from "@/globals/cache"
import { Runtime } from "@rjweb/runtime-node"
import * as cluster from "@/globals/cluster"
import { ServerType, types } from "@/schema"
import { eq } from "drizzle-orm"

const startTime = performance.now()

export const server = new Server(Runtime, {
	port: env.PORT,
	proxy: {
		enabled: true,
		credentials: {
			authenticate: false
		}
	}, logging: {
		debug: env.LOG_LEVEL === 'debug'
	}
}, [
	Cors.use({ allowAll: true })
], {
	appVersion: getVersion(),
	database,
	logger,
	env,
	cache,
	data: {} as Record<string, any>,
	join(...strings: (string | number | undefined | null | boolean)[]): string {
		return strings.filter((str) => str === '' || Boolean(str)).join('\n')
	}
})

const organizationValidator = new server.Validator<{ force: boolean }>()
	.context<{
		organization: {
			id: number
			name: string
			icon: string
			types: ServerType[]
		}

		request: cluster.Request | null
	}>()
	.httpRequest(async(ctr, end, options) => {
		const authorization = ctr.headers.get('authorization', '')
		if (authorization.length !== 64 && options.force) return end(ctr.status(ctr.$status.UNAUTHORIZED).print({ success: false, errors: ['Invalid Authorization'] }))

		if (authorization.length === 64) {
			const organization = await ctr["@"].database.select({
				id: ctr["@"].database.schema.organizations.id,
				name: ctr["@"].database.schema.organizations.name,
				icon: ctr["@"].database.schema.organizations.icon,
				types: ctr["@"].database.schema.organizations.types
			})
				.from(ctr["@"].database.schema.organizationKeys)
				.innerJoin(ctr["@"].database.schema.organizations, eq(ctr["@"].database.schema.organizationKeys.organizationId, ctr["@"].database.schema.organizations.id))
				.where(eq(ctr["@"].database.schema.organizationKeys.key, authorization))
				.limit(1)
				.then((r) => r[0])

			if (!organization && options.force) return end(ctr.status(ctr.$status.UNAUTHORIZED).print({ success: false, errors: ['Invalid Authorization'] }))

			ctr["@"].organization = organization

			if (organization && ctr["@"].request) {
				ctr["@"].request.organizationId = organization.id
			}
		}
	})
	.httpRequest(async(ctr) => {
		if (ctr.url.path.startsWith('/api') && ctr.context.route?.type === 'http' && ctr.url.method !== 'OPTIONS' && ctr.url.method !== 'HEAD' && ctr.url.method !== 'TRACE' && ctr.url.method !== 'CONNECT') {
			ctr["@"].request = cluster.log(
				ctr.url.method,
				ctr.url.href,
				await ctr.$body().json().catch(() => null),
				ctr.client.ip,
				ctr.client.origin,
				ctr.client.userAgent,
				ctr["@"].organization?.id ?? null
			)
	
			ctr.headers.set('X-Request-ID', ctr["@"].request.id)
		} else {
			ctr["@"].request = null
		}
	})
	.httpRequestFinish((ctr) => {
		if (ctr["@"].request) {
			cluster.finish(ctr["@"].request, ctr.context.response.status, ctr.context.elapsed())
		}
	})

const clusterValidator = new server.Validator()
	.httpRequest((ctr, end) => {
		if (!env.CLUSTER_MAIN) return end(ctr.status(ctr.$status.SERVICE_UNAVAILABLE).print({ success: false, errors: ['Cluster is not available'] }))

		const authorization = ctr.headers.get('authorization', '')
		if (authorization !== env.CLUSTER_TOKEN) return end(ctr.status(ctr.$status.UNAUTHORIZED).print({ success: false, errors: ['Invalid Authorization'] }))
	})

export const globalAPIRouter = new server.FileLoader('/api')
	.load('api/routes/global', {
		fileBasedRouting: true
	})
	.validate(organizationValidator.use({ force: false }))
	.export()

export const organizationAPIRouter = new server.FileLoader('/api/organization')
	.load('api/routes/organization', {
		fileBasedRouting: true
	})
	.validate(organizationValidator.use({ force: true }))
	.export()

export const clusterAPIRouter = new server.FileLoader('/api/cluster')
	.load('api/routes/cluster', {
		fileBasedRouting: true
	})
	.validate(clusterValidator.use({}))
	.export()

server.path('/', (path) => path
	.http('GET', '/openapi.json', (http) => http
		.onRequest((ctr) => {
			const openAPI = server.openAPI('MCJars Versions API', ctr["@"].appVersion, {
				url: env.APP_URL
			}, {
				email: 'rjansengd@gmail.com',
				name: 'GitHub',
				url: 'https://github.com/mcjars'
			})

			openAPI.components = {
        ...openAPI.components,
        securitySchemes: {
          api_key: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization',
            scheme: 'token'
          }
        }
      }

			return ctr.print(openAPI)
		})
	)
	.http('GET', '/icons/{type}', (path) => path
		.document({
			parameters: [
				{
					name: 'type',
					in: 'path',
					required: true,
					schema: {
						type: 'string',
						enum: Array.from(types)
					}
				}
			], responses: {
				default: {
					description: 'Permanent Redirect',
					headers: {
						Location: {
							schema: {
								type: 'string'
							}
						}
					}, content: {
						'image/png': {
							schema: {
								type: 'string',
								format: 'binary'
							}
						}
					}
				}
			}
		})
		.onRequest((ctr) => {
			let file = ctr.params.get('type', '').toLowerCase()
			if (!file.endsWith('.png')) file += '.png'

			return ctr.redirect(`${env.S3_URL}/icons/${file}`, 'permanent')
		})
	)
	.http('GET', '/', (http) => http
		.onRequest((ctr) => {
			ctr.headers.set('Content-Type', 'text/html')

			return ctr.print(`
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
		<meta property="og:url" content="https://versions.mcjars.app">
		<meta property="og:image" content="${env.S3_URL}/icons/vanilla.png">
		<meta property="og:description" content="MCJars is a Minecraft Server Jar Website which allows you to download versions or reverse lookup for your favourite projects easily.">
		<meta name="description" content="MCJars is a Minecraft Server Jar Website which allows you to download versions or reverse lookup for your favourite projects easily.">
	</head>
	<body>
		<script id="api-reference" data-url="/openapi.json"></script>
		<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
	</body>
</html>
			`.trim())
		})
	)
)

server.http(async(ctr) => {
	ctr["@"].data = {}

	logger()
		.text(`${ctr.type.toUpperCase()} ${ctr.url.method}`, (c) => c.green)
		.text(':')
		.text(ctr.url.href, (c) => c.green)
		.text(ctr.client.ip.usual(), (c) => c.cyan)
		.text(ctr.context.ip.isProxied ? '(proxied)' : '(raw)', (c) => c.gray)
		.info()
})

server
	.rateLimit('httpRequest', (ctr) => {
		return ctr.status(ctr.$status.TOO_MANY_REQUESTS).print({ success: false, errors: ['You are making too many requests! Slow down.'] })
	})
	.rateLimit('wsMessage', (ctr) => {
		return ctr.close(1008, 'You are making too many requests! Slow down.')
	})

server.error('httpRequest', (ctr, error) => {
	if (process.env.NODE_ENV === 'development') ctr.status(ctr.$status.INTERNAL_SERVER_ERROR).print({ success: false, errors: [error.toString()] })
	else ctr.status(ctr.$status.INTERNAL_SERVER_ERROR).print({ success: false, errors: ['An Unknown Server Error has occured'] })

	logger()
		.text('HTTP Request Error')
		.text('\n')
		.text(error.toString(), (c) => c.red)
		.error()
})

server.notFound(async(ctr) => {
	return ctr.status(ctr.$status.NOT_FOUND).print({ success: false, errors: ['Route not found'] })
})

server.start()
	.then((port) => {
		logger()
			.text('HTTP Server', (c) => c.redBright)
			.text(`(${Version}) started on port`)
			.text(port, (c) => c.cyan)
			.text(`(${(performance.now() - startTime).toFixed(1)}ms)`, (c) => c.gray)
			.info()
	})
	.catch((err: Error) => {
		logger()
			.text('HTTP Server', (c) => c.redBright)
			.text('failed starting')
			.text('\n')
			.text(err.stack!, (c) => c.red)
			.error()
	})

require('@/globals/openapi')