import { GlobalRouter } from "../.."

import buildRouter from "./build"
import buildsRouter from "./builds"
import versionRouter from "./version"
import scriptRouter from "./script"
import statsRouter from "./stats"

export default function(router: GlobalRouter) {
	buildRouter(router)
	buildsRouter(router)
	versionRouter(router)
	scriptRouter(router)
	statsRouter(router)

	router.get('/api/v1/types', async({ req }) => {
		return Response.json({
			success: true,
			types: await req.database.types()
		})
	})
}