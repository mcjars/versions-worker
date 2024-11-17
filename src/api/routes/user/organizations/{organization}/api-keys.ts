import { userAPIRouter, userOrganizationValidator } from "@/api"
import { object, string, time } from "@rjweb/utils"
import { and, count, desc, eq, ilike } from "drizzle-orm"
import { z } from "zod"

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
									apiKeys: {
										type: 'array',
										items: {
											type: 'object',
											properties: {
												id: { type: 'integer' },
												name: { type: 'string' },
												created: { type: 'string', format: 'date-time' }
											}, required: ['id', 'name', 'created']
										}
									}
								}, required: ['success', 'apiKeys']
							}
						}
					}
				}
			}
		})
		.onRequest(async(ctr) => {
			const apiKeys = await ctr["@"].database.select({
				id: ctr["@"].database.schema.organizationKeys.id,
				name: ctr["@"].database.schema.organizationKeys.name,
				created: ctr["@"].database.schema.organizationKeys.created
			})
				.from(ctr["@"].database.schema.organizationKeys)
				.where(eq(ctr["@"].database.schema.organizationKeys.organizationId, ctr["@"].organization.id))
				.orderBy(desc(ctr["@"].database.schema.organizationKeys.created))

			return ctr.print({
				success: true,
				apiKeys
			})
		})
	)
	.http('POST', '/', (http) => http
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
									key: { type: 'string' }
								}, required: ['success', 'key']
							}
						}
					}
				}
			}, requestBody: {
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								name: { type: 'string' }
							}, required: ['name']
						}
					}
				}
			}
		})
		.onRequest(async(ctr) => {
			const data = z.object({
				name: z.string().max(255)
			}).safeParse(await ctr.$body().json().catch(() => null))

			if (!data.success) return ctr.status(ctr.$status.BAD_REQUEST).print({ success: false, errors: data.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`) })

			const apiKeys = await ctr["@"].database.select({
				count: count()
			})
				.from(ctr["@"].database.schema.organizationSubusers)
				.where(eq(ctr["@"].database.schema.organizationSubusers.organizationId, ctr["@"].organization.id))
				.then((r) => r[0]?.count)

			if (apiKeys >= 15) return ctr.status(ctr.$status.BAD_REQUEST).print({ success: false, errors: ['You have reached the maximum number of api keys'] })

			const key = await ctr["@"].database.write.insert(ctr["@"].database.schema.organizationKeys)
				.values({
					organizationId: ctr["@"].organization.id,
					name: data.data.name,
					key: string.hash(`${ctr["@"].organization.id}.${data.data.name}.${Date.now()}`, { algorithm: 'sha256' })
				})
				.returning({
					key: ctr["@"].database.schema.organizationKeys.key
				})
				.then((r) => r[0]?.key)

			return ctr.print({ success: true, key })
		})
	)
	.http('DELETE', '/{apiKey}', (http) => http
		.document({
			responses: {
				200: {
					description: 'Success',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									success: { type: 'boolean', const: true }
								}, required: ['success']
							}
						}
					}
				}
			}, parameters: [
				{
					name: 'apiKey',
					in: 'path',
					required: true,
					schema: {
						type: 'integer'
					}
				}
			]
		})
		.onRequest(async(ctr) => {
			const apiKeyId = parseInt(ctr.params.get('apiKey', '0'))
			if (!apiKeyId || isNaN(apiKeyId)) return ctr.status(ctr.$status.BAD_REQUEST).print({ success: false, errors: ['Invalid api key'] })

			try {
				const count = await ctr["@"].database.write.delete(ctr["@"].database.schema.organizationKeys)
					.where(and(
						eq(ctr["@"].database.schema.organizationKeys.organizationId, ctr["@"].organization.id),
						eq(ctr["@"].database.schema.organizationKeys.id, apiKeyId)
					))
					.returning({
						id: ctr["@"].database.schema.organizationKeys.id
					})

				if (!count.length) return ctr.status(ctr.$status.BAD_REQUEST).print({ success: false, errors: ['Api key not found'] })

				return ctr.print({ success: true })
			} catch {
				return ctr.status(ctr.$status.BAD_REQUEST).print({ success: false, errors: ['Api key is not valid'] })
			}
		})
	)