import { GlobalRouter } from ".."

import v1Router from "./v1"

export default function(router: GlobalRouter) {
	v1Router(router)

	// openapi still needed
}