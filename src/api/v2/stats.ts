import { and, avg, count, eq, sum } from "drizzle-orm"
import { GlobalRouter } from "../.."
import { types, ServerType } from "../../schema"
import { time } from "@rjweb/utils"

export default function(router: GlobalRouter) {
	router.get('/api/v2/stats/version/:version', async({ req }) => {
		const version = req.params.version

		const versionData = await req.cache.use(`version::${version}`, () => req.database.select()
				.from(req.database.schema.minecraftVersions)
				.where(eq(req.database.schema.minecraftVersions.id, version))
				.get(),
			time(3).h()
		)

		if (!versionData) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		const stats = await req.cache.use(`stats::version::${version}`, () => req.database.select({
				builds: count(),
				total: {
					jar: sum(req.database.schema.builds.jarSize),
					zip: sum(req.database.schema.builds.zipSize)
				}, average: {
					jar: avg(req.database.schema.builds.jarSize),
					zip: avg(req.database.schema.builds.zipSize)
				}
			})
				.from(req.database.schema.builds)
				.where(eq(req.database.schema.builds.versionId, version))
				.get(),
			time(30).m()
		)

		return Response.json({
			success: true,
			stats: {
				builds: stats?.builds ?? 0,
				size: {
					total: {
						jar: Number(stats?.total.jar ?? 0),
						zip: Number(stats?.total.zip ?? 0)
					}, average: {
						jar: Number(stats?.average.jar ?? 0),
						zip: Number(stats?.average.zip ?? 0)
					}
				}
			}
		})
	})

	router.get('/api/v2/stats/:type', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const stats = await req.cache.use(`stats::${type}`, () => req.database.select({
				builds: count(),
				total: {
					jar: sum(req.database.schema.builds.jarSize),
					zip: sum(req.database.schema.builds.zipSize)
				}, average: {
					jar: avg(req.database.schema.builds.jarSize),
					zip: avg(req.database.schema.builds.zipSize)
				}
			})
				.from(req.database.schema.builds)
				.where(eq(req.database.schema.builds.type, type))
				.get(),
			time(30).m()
		)

		return Response.json({
			success: true,
			stats: {
				builds: stats?.builds ?? 0,
				size: {
					total: {
						jar: Number(stats?.total.jar ?? 0),
						zip: Number(stats?.total.zip ?? 0)
					}, average: {
						jar: Number(stats?.average.jar ?? 0),
						zip: Number(stats?.average.zip ?? 0)
					}
				}
			}
		})
	})

	router.get('/api/v2/stats/:type/:version', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const version = req.params.version,
			location = await req.database.version(version, type)
		if (!location) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		const stats = await req.cache.use(`stats::${type}::${version}`, () => req.database.select({
				builds: count(),
				total: {
					jar: sum(req.database.schema.builds.jarSize),
					zip: sum(req.database.schema.builds.zipSize)
				}, average: {
					jar: avg(req.database.schema.builds.jarSize),
					zip: avg(req.database.schema.builds.zipSize)
				}
			})
				.from(req.database.schema.builds)
				.where(and(
					eq(req.database.schema.builds.type, type),
					location === 'minecraft'
						? eq(req.database.schema.builds.versionId, version)
						: eq(req.database.schema.builds.projectVersionId, version)
				))
				.get(),
			time(30).m()
		)

		return Response.json({
			success: true,
			stats: {
				builds: stats?.builds ?? 0,
				size: {
					total: {
						jar: Number(stats?.total.jar ?? 0),
						zip: Number(stats?.total.zip ?? 0)
					}, average: {
						jar: Number(stats?.average.jar ?? 0),
						zip: Number(stats?.average.zip ?? 0)
					}
				}
			}
		})
	})
}