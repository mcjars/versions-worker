import { count, sql, sum, sumDistinct } from "drizzle-orm"
import { GlobalRouter } from "../.."
import { time } from "@rjweb/utils"

export default function(router: GlobalRouter) {
	router.get('/api/v1/stats', async({ req }) => {
		const [ hashes, requests, builds, database ] = await req.cache.use('stats::all', () => Promise.all([
				req.database.select({
					hashes: count()
				})
					.from(req.database.schema.buildHashes)
					.get(),
				req.database.select({
					requests: count()
				})
					.from(req.database.schema.requests)
					.get(),
				req.database.select({
					builds: count(),
					totalJarSize: sumDistinct(req.database.schema.builds.jarSize),
					totalZipSize: sum(req.database.schema.builds.zipSize)
				})
					.from(req.database.schema.builds)
					.get(),
				req.database.run(sql`SELECT 1`)
			]),
			time(1).h()
		)

		return Response.json({
			success: true,
			stats: {
				builds: builds?.builds ?? 0,
				hashes: hashes?.hashes ?? 0,
				requests: requests?.requests ?? 0,
				size: {
					database: database?.meta.size_after ?? 0
				}, total: {
					jarSize: Number(builds?.totalJarSize ?? 0),
					zipSize: Number(builds?.totalZipSize ?? 0)
				}
			}
		})
	})
}