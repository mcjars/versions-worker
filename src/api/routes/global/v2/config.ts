import { globalAPIRouter } from "@/api"
import { configs } from "@/globals/database"
import { object, time, string } from "@rjweb/utils"
import { z } from "zod"

export = new globalAPIRouter.Path('/')
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
									success: {
										type: 'boolean',
										const: true
									}, formatted: {
										type: 'string'
									}, configs: {
										type: 'array',
										maxItems: 3,
										items: {
											type: 'object',
											properties: {
												from: {
													$ref: '#/components/schemas/types'
												}, value: {
													type: 'string'
												}, build: {
													oneOf: [
														{ $ref: '#/components/schemas/build' },
														{ type: 'null' }
													]
												}
											}, required: ['from', 'value', 'build']
										}
									}
								}, required: ['success', 'formatted', 'configs']
							}
						}
					}
				}, 400: {
					description: 'Bad Request',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/error'
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
								file: {
									type: 'string',
									enum: Object.keys(configs)
								}, config: {
									type: 'string'
								}
							}, required: ['file', 'config']
						}
					}
				}
			}
		})
		.onRequest(async(ctr) => {
			const data = z.object({
				file: z.string(),
				config: z.string().transform((str) => str.replaceAll('\\n', '\n'))
			}).safeParse(await ctr.$body().json().catch(() => null))

			const fields = Array.from(new Set((ctr.queries.get('fields', ''))
				.split(',')
				.filter((field) => field.length > 0)
			)) as 'id'[]

			if (!data.success) return ctr.status(ctr.$status.BAD_REQUEST).print({ success: false, errors: data.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`) })

			const formatted = ctr["@"].database.formatConfig(data.data.file, data.data.config)

			const valueMatches = await ctr["@"].cache.use(`config::${string.hash(formatted, { algorithm: 'sha256' })}`, () => ctr["@"].database.searchConfig(
				data.data.file, formatted,
				data.data.file.endsWith('.properties')
					? 'PROPERTIES' : data.data.file.endsWith('.toml')
						? 'TOML' : data.data.file.endsWith('.conf')
							? 'CONF' : 'YAML',
				3
			), time(1).h())

			return ctr.print({
				success: true,
				formatted,
				configs: valueMatches.map((match) => ({
					from: match.build.type,
					value: match.value,
					build: fields.length > 0
						? object.pick(ctr["@"].database.prepare.build(match.build), fields)
						: ctr["@"].database.prepare.build(match.build)
				}))
			})
		})
	)