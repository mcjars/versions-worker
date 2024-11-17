import { userAPIRouter } from "@/api"
import { object } from "@rjweb/utils"

export = new userAPIRouter.Path('/')
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
									user: {
										$ref: '#/components/schemas/user'
									}
								}, required: ['success', 'user']
							}
						}
					}
				}
			}
		})
		.onRequest((ctr) => {
			return ctr.print({
				success: true,
				user: Object.assign(object.pick(ctr["@"].user, ['id', 'name', 'email', 'login']), {
					avatar: `https://avatars.githubusercontent.com/u/${ctr["@"].user.githubId}`
				})
			})
		})
	)