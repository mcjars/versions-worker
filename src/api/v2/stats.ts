import { and, avg, count, eq, gte, lte, sql, sum, sumDistinct } from "drizzle-orm"
import { GlobalRouter } from "../.."
import { types, ServerType } from "../../schema"
import { time } from "@rjweb/utils"

export default function(router: GlobalRouter) {
	router.get('/api/v2/stats/version/:version', async({ req }) => {
		const version = req.params.version

		const stats = await req.cache.use(`stats::version::${version}`, () => req.database.select({
				builds: count(),
				total: {
					jar: sumDistinct(req.database.schema.builds.jarSize),
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

		if (!stats?.builds) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

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

	router.get('/api/v2/stats/version/:version/history/:year/:month', async({ req }) => {
		const version = req.params.version,
			year = parseInt(req.params.year),
			month = parseInt(req.params.month)

		if (isNaN(year) || year < 2024 || year > new Date().getFullYear()) return Response.json({ success: false, errors: ['Invalid year'] }, { status: 400 })
		if (isNaN(month) || month < 1 || month > 12) return Response.json({ success: false, errors: ['Invalid month'] }, { status: 400 })

		const start = new Date(year, month - 1, 1),
			end = new Date(year, month, 0)

		const stats = await req.cache.use(`stats::version::${version}::history::${start.getTime()}::${end.getTime()}`, () => req.database.select({
				builds: count(),
				day: sql`strftime('%Y-%m-%d', datetime(created, 'unixepoch'))`.as('day'),
				total: {
					jar: sumDistinct(req.database.schema.builds.jarSize),
					zip: sum(req.database.schema.builds.zipSize)
				}, average: {
					jar: avg(req.database.schema.builds.jarSize),
					zip: avg(req.database.schema.builds.zipSize)
				}
			})
				.from(req.database.schema.builds)
				.where(and(
					eq(req.database.schema.builds.versionId, version),
					gte(req.database.schema.builds.created, start),
					lte(req.database.schema.builds.created, end)
				))
				.groupBy(sql`day`)
				.all(),
			time(30).m()
		)

		return Response.json({
			success: true,
			stats: Array.from({ length: end.getDate() }, (_, i) => {
				const day = new Date(year, month - 1, i + 1).toISOString().split('T')[0]
				const data = stats.find((d) => d.day === day)

				return {
					day: parseInt(day.split('-')[2]),
					builds: data?.builds ?? 0,
					size: {
						total: {
							jar: Number(data?.total.jar ?? 0),
							zip: Number(data?.total.zip ?? 0)
						}, average: {
							jar: Number(data?.average.jar ?? 0),
							zip: Number(data?.average.zip ?? 0)
						}
					}
				}
			})
		})
	})

	router.get('/api/v2/stats/:type', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const stats = await req.cache.use(`stats::${type}`, () => req.database.select({
				builds: count(),
				total: {
					jar: type === 'FABRIC' ? sum(req.database.schema.builds.jarSize) : sumDistinct(req.database.schema.builds.jarSize),
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

	router.get('/api/v2/stats/:type/history/:year/:month', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const year = parseInt(req.params.year),
			month = parseInt(req.params.month)

		if (isNaN(year) || year < 2024 || year > new Date().getFullYear()) return Response.json({ success: false, errors: ['Invalid year'] }, { status: 400 })
		if (isNaN(month) || month < 1 || month > 12) return Response.json({ success: false, errors: ['Invalid month'] }, { status: 400 })

		const start = new Date(year, month - 1, 1),
			end = new Date(year, month, 0)

		const stats = await req.cache.use(`stats::${type}::history::${start.getTime()}::${end.getTime()}`, () => req.database.select({
				builds: count(),
				day: sql`strftime('%Y-%m-%d', datetime(created, 'unixepoch'))`.as('day'),
				total: {
					jar: sumDistinct(req.database.schema.builds.jarSize),
					zip: sum(req.database.schema.builds.zipSize)
				}, average: {
					jar: avg(req.database.schema.builds.jarSize),
					zip: avg(req.database.schema.builds.zipSize)
				}
			})
				.from(req.database.schema.builds)
				.where(and(
					eq(req.database.schema.builds.type, type),
					gte(req.database.schema.builds.created, start),
					lte(req.database.schema.builds.created, end)
				))
				.groupBy(sql`day`)
				.all(),
			time(30).m()
		)

		return Response.json({
			success: true,
			stats: Array.from({ length: end.getDate() }, (_, i) => {
				const day = new Date(year, month - 1, i + 1).toISOString().split('T')[0]
				const data = stats.find((d) => d.day === day)

				return {
					day: parseInt(day.split('-')[2]),
					builds: data?.builds ?? 0,
					size: {
						total: {
							jar: Number(data?.total.jar ?? 0),
							zip: Number(data?.total.zip ?? 0)
						}, average: {
							jar: Number(data?.average.jar ?? 0),
							zip: Number(data?.average.zip ?? 0)
						}
					}
				}
			})
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
					jar: type === 'FABRIC' ? sum(req.database.schema.builds.jarSize) : sumDistinct(req.database.schema.builds.jarSize),
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

	router.get('/api/v2/stats/:type/:version/history/:year/:month', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const version = req.params.version,
			location = await req.database.version(version, type)
		if (!location) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		const year = parseInt(req.params.year),
			month = parseInt(req.params.month)

		if (isNaN(year) || year < 2024 || year > new Date().getFullYear()) return Response.json({ success: false, errors: ['Invalid year'] }, { status: 400 })
		if (isNaN(month) || month < 1 || month > 12) return Response.json({ success: false, errors: ['Invalid month'] }, { status: 400 })

		const start = new Date(year, month - 1, 1),
			end = new Date(year, month, 0)

		const stats = await req.cache.use(`stats::${type}::${version}::history::${start.getTime()}::${end.getTime()}`, () => req.database.select({
				builds: count(),
				day: sql`strftime('%Y-%m-%d', datetime(created, 'unixepoch'))`.as('day'),
				total: {
					jar: type === 'FABRIC' ? sum(req.database.schema.builds.jarSize) : sumDistinct(req.database.schema.builds.jarSize),
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
						: eq(req.database.schema.builds.projectVersionId, version),
					gte(req.database.schema.builds.created, start),
					lte(req.database.schema.builds.created, end)
				))
				.groupBy(sql`day`)
				.all(),
			time(30).m()
		)

		return Response.json({
			success: true,
			stats: Array.from({ length: end.getDate() }, (_, i) => {
				const day = new Date(year, month - 1, i + 1).toISOString().split('T')[0]
				const data = stats.find((d) => d.day === day)

				return {
					day: parseInt(day.split('-')[2]),
					builds: data?.builds ?? 0,
					size: {
						total: {
							jar: Number(data?.total.jar ?? 0),
							zip: Number(data?.total.zip ?? 0)
						}, average: {
							jar: Number(data?.average.jar ?? 0),
							zip: Number(data?.average.zip ?? 0)
						}
					}
				}
			})
		})
	})
}