import { GlobalRouter } from ".."

import v1Router from "./v1"
import v2Router from "./v2"

export default function(router: GlobalRouter) {
	v1Router(router)
	v2Router(router)

	// openapi still needed
	router.get('/openapi.json', () => {
		return Response.redirect('https://versions.mcjars.app/openapi.json', 301)
	})
}