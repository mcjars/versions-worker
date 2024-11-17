import { userAPIRouter, userOrganizationValidator } from "@/api"
import { time } from "@rjweb/utils"
import { count, countDistinct, eq } from "drizzle-orm"

export = new userAPIRouter.Path('/')
	.validate(userOrganizationValidator.use({}))
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
									success: { type: 'boolean', const: true },
									stats: {
										type: 'object',
										properties: {
											requests: { type: 'integer' },
											userAgents: { type: 'integer' },
											ips: { type: 'integer' },
											origins: { type: 'integer' },
											continents: { type: 'integer' },
											countries: { type: 'integer' }
										}, required: [
											'requests', 'userAgents', 'ips',
											'origins', 'continents', 'countries'
										]
									}
								}, required: ['success', 'stats']
							}
						}
					}
				}
			}
		})
		.onRequest(async(ctr) => {
			const stats = await ctr["@"].cache.use(`stats::${ctr["@"].organization.id}`, () => ctr["@"].database.select({
					requests: count(),
					userAgents: countDistinct(ctr["@"].database.schema.requests.userAgent),
					ips: countDistinct(ctr["@"].database.schema.requests.ip),
					origins: countDistinct(ctr["@"].database.schema.requests.origin),
					continents: countDistinct(ctr["@"].database.schema.requests.continent),
					countries: countDistinct(ctr["@"].database.schema.requests.country)
				})
					.from(ctr["@"].database.schema.requests)
					.where(eq(ctr["@"].database.schema.requests.organizationId, ctr["@"].organization.id))
					.then((r) => r[0]),
				time(5).m()
			)

			return ctr.print({
				success: true,
				stats
			})
		})
	)