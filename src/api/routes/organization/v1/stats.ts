import { organizationAPIRouter } from "@/api"
import { time } from "@rjweb/utils"
import { and, count, eq, isNotNull } from "drizzle-orm"

export = new organizationAPIRouter.Path('/')
	.http('GET', '/', (http) => http
		.document({
			responses: {
				200: {
					description: 'Success',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									success: {
										type: 'boolean',
										const: true
									}, infos: {
										type: 'object',
										properties: {
											icon: {
												type: 'string'
											}, name: {
												type: 'string'
											}, types: {
												type: 'array',
												items: {
													type: 'string'
												}
											}
										}, required: ['icon', 'name', 'types']
									}, stats: {
										type: 'object',
										properties: {
											requests: {
												type: 'integer'
											}, userAgents: {
												type: 'array',
												items: {
													type: 'string'
												}
											}, origins: {
												type: 'array',
												items: {
													type: 'string'
												}
											}
										}, required: ['requests', 'userAgents', 'origins']
									}
								}, required: ['success', 'infos', 'stats']
							}
						}
					}
				}
			}
		})
		.onRequest(async(ctr) => {
			const [ requests, userAgents, origins ] = await ctr["@"].cache.use(`organization::${ctr["@"].organization.id}::stats`, () => Promise.all([
					ctr["@"].database.select({
						requests: count(ctr["@"].database.schema.requests.id)
					})
						.from(ctr["@"].database.schema.requests)
						.where(eq(ctr["@"].database.schema.requests.organizationId, ctr["@"].organization.id))
						.then((r) => r[0]),
					ctr["@"].database.select({
						userAgent: ctr["@"].database.schema.requests.userAgent,
					})
						.from(ctr["@"].database.schema.requests)
						.where(eq(ctr["@"].database.schema.requests.organizationId, ctr["@"].organization.id))
						.groupBy(ctr["@"].database.schema.requests.userAgent)
						.then((userAgents) => userAgents.map((userAgent) => userAgent.userAgent)),
					ctr["@"].database.select({
						origin: ctr["@"].database.schema.requests.origin,
					})
						.from(ctr["@"].database.schema.requests)
						.where(and(
							eq(ctr["@"].database.schema.requests.organizationId, ctr["@"].organization.id),
							isNotNull(ctr["@"].database.schema.requests.origin)
						))
						.groupBy(ctr["@"].database.schema.requests.origin)
						.then((origins) => origins.map((origin) => origin.origin))
				]),
				time(5).m()
			)

			return ctr.print({
				success: true,
				infos: {
					icon: ctr["@"].organization.icon,
					name: ctr["@"].organization.name,
					types: ctr["@"].organization.types
				}, stats: {
					requests: requests?.requests ?? 0,
					userAgents: userAgents,
					origins: origins
				}
			})
		})
	)