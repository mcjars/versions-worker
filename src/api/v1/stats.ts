import { count, countDistinct } from "drizzle-orm"
import { GlobalRouter } from "../.."
import { time } from "@rjweb/utils"

export default function(router: GlobalRouter) {
	router.get('/api/v1/stats', async({ req }) => {
		const [ data, requests ] = await req.cache.use('stats::all', () => Promise.all([
				req.database.select({
					builds: countDistinct(req.database.schema.buildHashes.buildId),
					hashes: count()
				})
					.from(req.database.schema.buildHashes)
					.get(),
				req.database.select({
					requests: count()
				})
					.from(req.database.schema.requests)
					.get()
			]),
			time(30).m()
		)

		return Response.json({
			success: true,
			stats: {
				builds: data?.builds ?? 0,
				hashes: data?.hashes ?? 0,
				requests: requests?.requests ?? 0
			}
		})
	})
}