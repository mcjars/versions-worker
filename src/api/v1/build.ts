import { time } from "@rjweb/utils"
import { GlobalRouter } from "../.."

export default function(router: GlobalRouter) {
	router.get('/api/v1/build/:build', async({ req }) => {
		const build = await req.cache.use(`build::${req.params.build}`, () => req.database.build(req.params.build), time(3).h())
		if (!build) return Response.json({ success: false, errors: ['Build not found'] }, { status: 404 })

		return Response.json({
			success: true,
			build
		})
	})
}