import { GlobalRouter } from ".."
import openApi from "../openapi-schema.json"

import v1Router from "./v1"
import v2Router from "./v2"
import organizationRouter from "./organization"
export default function(router: GlobalRouter) {
	v1Router(router)
	v2Router(router)
	organizationRouter(router)
	
	router.get('/openapi.json', () => {
		return Response.json(openApi)
	})

	router.get('/robots.txt', () => {
		return new Response('User-agent: *\nDisallow: /api')
	})
}
