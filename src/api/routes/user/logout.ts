import { userAPIRouter } from "@/api"
import { eq } from "drizzle-orm"

export = new userAPIRouter.Path('/')
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
									success: { type: 'boolean', const: true }
								}, required: ['success']
							}
						}
					}
				}
			}
		})
		.onRequest(async(ctr) => {
			await ctr["@"].database.write.delete(ctr["@"].database.schema.userSessions)
				.where(eq(ctr["@"].database.schema.userSessions.id, ctr["@"].user.sessionId))

			ctr.cookies.delete('session')

			return ctr.print({ success: true })
		})
	)