import { globalAPIRouter } from "@/api"

export = new globalAPIRouter.Path('/')
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
									}, types: {
										type: 'object',
										additionalProperties: {
											type: 'object',
											properties: {
												icon: {
													type: 'string'
												}, builds: {
													type: 'number'
												}, versions: {
													type: 'object',
													properties: {
														minecraft: {
															type: 'number'
														}, project: {
															type: 'number'
														}
													}, required: ['minecraft', 'project']
												}, name: {
													type: 'string'
												}, color: {
													type: 'string'
												}, homepage: {
													type: 'string'
												}, deprecated: {
													type: 'boolean'
												}, experimental: {
													type: 'boolean'
												}, description: {
													type: 'string'
												}, categories: {
													type: 'array',
													items: {
														type: 'string'
													}
												}, compatibility: {
													type: 'array',
													items: {
														type: 'string'
													}
												}
											}, required: [
												'icon',
												'builds',
												'versions',
												'name',
												'color',
												'homepage',
												'deprecated',
												'experimental',
												'description',
												'categories',
												'compatibility'
											]
										}
									}
								}, required: ['success', 'types']
							}
						}
					}
				}
			}
		})
		.onRequest(async(ctr) => {
			return ctr.print({
				success: true,
				types: await ctr["@"].database.types()
			})
		})
	)