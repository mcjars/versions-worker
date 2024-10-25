import { and, asc, count, countDistinct, desc, gte, isNotNull, like, lte, notLike, sql } from "drizzle-orm"
import { GlobalRouter } from "../.."
import { object, time } from "@rjweb/utils"
import { ServerType, types } from "../../schema"

export default function(router: GlobalRouter) {
	router.get('/api/v2/lookups/versions', async({ req }) => {
		const versions = await req.cache.use('lookups::versions', () => req.database.select({
				version: sql<string>`x.version`.as('version'),
				total: count().as('total'),
				uniqueIps: countDistinct(req.database.schema.requests.ip)
			})
				.from(req.database.select({
					version: sql<string>`json_extract(${req.database.schema.requests.data}, '$.build.versionId')`.as('version'),
					ip: req.database.schema.requests.ip
				})
					.from(req.database.schema.requests)
					.where(and(
						isNotNull(req.database.schema.requests.data),
						notLike(req.database.schema.requests.path, `%tracking=nostats%`),
						like(req.database.schema.requests.data, `%lookup%`)
					))
					.as('x'))
				.where(isNotNull(sql`x.version`))
				.groupBy(sql`x.version`)
				.orderBy(desc(sql`total`))
				.all(),
			time(30).m()
		)

		return Response.json({
			success: true,
			versions: Object.fromEntries(versions.map((version) => [
				version.version,
				object.pick(version, ['total', 'uniqueIps'])
			]))
		})
	})

	router.get('/api/v2/lookups/versions/history/:year/:month', async({ req }) => {
		const year = parseInt(req.params.year),
			month = parseInt(req.params.month)

		if (isNaN(year) || year < 2024 || year > new Date().getFullYear()) return Response.json({ success: false, errors: ['Invalid year'] }, { status: 400 })
		if (isNaN(month) || month < 1 || month > 12) return Response.json({ success: false, errors: ['Invalid month'] }, { status: 400 })

		const start = new Date(year, month - 1, 1),
			end = new Date(year, month, 0, 23, 59, 59, 999)

		const versions = await req.cache.use(`lookups::versions::history::${start.getTime()}::${end.getTime()}`, () => req.database.select({
				version: sql<string>`x.version`.as('version'),
				day: sql<string>`strftime('%d', datetime(x.created, 'unixepoch'))`.as('day'),
				total: count().as('total'),
				uniqueIps: countDistinct(req.database.schema.requests.ip)
			})
				.from(req.database.select({
					version: sql<string>`json_extract(${req.database.schema.requests.data}, '$.build.versionId')`.as('version'),
					created: req.database.schema.requests.created,
					ip: req.database.schema.requests.ip
				})
					.from(req.database.schema.requests)
					.where(and(
						isNotNull(req.database.schema.requests.data),
						notLike(req.database.schema.requests.path, `%tracking=nostats%`),
						like(req.database.schema.requests.data, `%lookup%`),
						gte(req.database.schema.requests.created, start),
						lte(req.database.schema.requests.created, end),
					))
					.as('x'))
				.where(isNotNull(sql`x.version`))
				.groupBy(sql`day`, sql`x.version`)
				.orderBy(asc(sql`day`), desc(sql`total`))
				.all(),
			time(30).m()
		)

		return Response.json({
			success: true,
			versions: Object.fromEntries(versions.map((version) => [
				version.version,
				Array.from({ length: end.getDate() }, (_, i) => {
					const data = versions.find((stat) => stat.version === version.version && parseInt(stat.day) === i + 1)

					return {
						day: i + 1,
						total: data?.total ?? 0,
						uniqueIps: data?.uniqueIps ?? 0
					}
				})
			]))
		})
	})

	router.get('/api/v2/lookups/versions/:type', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const versions = await req.cache.use(`lookups::versions::${type}`, () => req.database.select({
				version: sql<string>`x.version`.as('version'),
				total: count().as('total'),
				uniqueIps: countDistinct(req.database.schema.requests.ip)
			})
				.from(req.database.select({
					version: sql<string>`json_extract(${req.database.schema.requests.data}, '$.build.versionId')`.as('version'),
					ip: req.database.schema.requests.ip
				})
					.from(req.database.schema.requests)
					.where(and(
						isNotNull(req.database.schema.requests.data),
						notLike(req.database.schema.requests.path, `%tracking=nostats%`),
						like(req.database.schema.requests.data, `%lookup%`),
						like(req.database.schema.requests.data, `%${type}%`)
					))
					.as('x'))
				.where(isNotNull(sql`x.version`))
				.groupBy(sql`x.version`)
				.orderBy(desc(sql`total`))
				.all(),
			time(30).m()
		)

		return Response.json({
			success: true,
			versions: Object.fromEntries(versions.map((version) => [
				version.version,
				object.pick(version, ['total', 'uniqueIps'])
			]))
		})
	})

	router.get('/api/v2/lookups/versions/:type/history/:year/:month', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const year = parseInt(req.params.year),
			month = parseInt(req.params.month)

		if (isNaN(year) || year < 2024 || year > new Date().getFullYear()) return Response.json({ success: false, errors: ['Invalid year'] }, { status: 400 })
		if (isNaN(month) || month < 1 || month > 12) return Response.json({ success: false, errors: ['Invalid month'] }, { status: 400 })

		const start = new Date(year, month - 1, 1),
			end = new Date(year, month, 0, 23, 59, 59, 999)

		const versions = await req.cache.use(`lookups::versions::${type}::history::${start.getTime()}::${end.getTime()}`, () => req.database.select({
				version: sql<string>`x.version`.as('version'),
				day: sql<string>`strftime('%d', datetime(x.created, 'unixepoch'))`.as('day'),
				total: count().as('total'),
				uniqueIps: countDistinct(req.database.schema.requests.ip)
			})
				.from(req.database.select({
					version: sql<string>`json_extract(${req.database.schema.requests.data}, '$.build.versionId')`.as('version'),
					created: req.database.schema.requests.created,
					ip: req.database.schema.requests.ip
				})
					.from(req.database.schema.requests)
					.where(and(
						isNotNull(req.database.schema.requests.data),
						notLike(req.database.schema.requests.path, `%tracking=nostats%`),
						like(req.database.schema.requests.data, `%lookup%`),
						like(req.database.schema.requests.data, `%${type}%`),
						gte(req.database.schema.requests.created, start),
						lte(req.database.schema.requests.created, end),
					))
					.as('x'))
				.where(isNotNull(sql`x.version`))
				.groupBy(sql`day`, sql`x.version`)
				.orderBy(asc(sql`day`), desc(sql`total`))
				.all(),
			time(30).m()
		)

		return Response.json({
			success: true,
			versions: Object.fromEntries(versions.map((version) => [
				version.version,
				Array.from({ length: end.getDate() }, (_, i) => {
					const data = versions.find((stat) => stat.version === version.version && parseInt(stat.day) === i + 1)

					return {
						day: i + 1,
						total: data?.total ?? 0,
						uniqueIps: data?.uniqueIps ?? 0
					}
				})
			]))
		})
	})

	router.get('/api/v2/lookups/types', async({ req }) => {
		const types = await req.cache.use('lookups::types', () => req.database.select({
				type: sql<string>`x.type`.as('type'),
				total: count().as('total'),
				uniqueIps: countDistinct(req.database.schema.requests.ip)
			})
				.from(req.database.select({
					type: sql<string>`json_extract(${req.database.schema.requests.data}, '$.build.type')`.as('type'),
					ip: req.database.schema.requests.ip
				})
					.from(req.database.schema.requests)
					.where(and(
						isNotNull(req.database.schema.requests.data),
						notLike(req.database.schema.requests.path, `%tracking=nostats%`),
						like(req.database.schema.requests.data, `%lookup%`)
					))
					.as('x'))
				.where(isNotNull(sql`x.type`))
				.groupBy(sql`x.type`)
				.orderBy(desc(sql`total`))
				.all(),
			time(30).m()
		)

		return Response.json({
			success: true,
			types: Object.fromEntries(types.map((type) => [
				type.type,
				object.pick(type, ['total', 'uniqueIps'])
			]))
		})
	})

	router.get('/api/v2/lookups/types/history/:year/:month', async({ req }) => {
		const year = parseInt(req.params.year),
			month = parseInt(req.params.month)

		if (isNaN(year) || year < 2024 || year > new Date().getFullYear()) return Response.json({ success: false, errors: ['Invalid year'] }, { status: 400 })
		if (isNaN(month) || month < 1 || month > 12) return Response.json({ success: false, errors: ['Invalid month'] }, { status: 400 })

		const start = new Date(year, month - 1, 1),
			end = new Date(year, month, 0, 23, 59, 59, 999)

		const types = await req.cache.use(`lookups::types::history::${start.getTime()}::${end.getTime()}`, () => req.database.select({
				type: sql<string>`x.type`.as('type'),
				day: sql<string>`strftime('%d', datetime(x.created, 'unixepoch'))`.as('day'),
				total: count().as('total'),
				uniqueIps: countDistinct(req.database.schema.requests.ip)
			})
				.from(req.database.select({
					type: sql<string>`json_extract(${req.database.schema.requests.data}, '$.build.type')`.as('type'),
					created: req.database.schema.requests.created,
					ip: req.database.schema.requests.ip
				})
					.from(req.database.schema.requests)
					.where(and(
						isNotNull(req.database.schema.requests.data),
						notLike(req.database.schema.requests.path, `%tracking=nostats%`),
						like(req.database.schema.requests.data, `%lookup%`),
						gte(req.database.schema.requests.created, start),
						lte(req.database.schema.requests.created, end),
					))
					.as('x'))
				.where(isNotNull(sql`x.type`))
				.groupBy(sql`day`, sql`x.type`)
				.orderBy(asc(sql`day`), desc(sql`total`))
				.all(),
			time(30).m()
		)

		return Response.json({
			success: true,
			types: Object.fromEntries(types.map((type) => [
				type.type,
				Array.from({ length: end.getDate() }, (_, i) => {
					const data = types.find((stat) => stat.type === type.type && parseInt(stat.day) === i + 1)

					return {
						day: i + 1,
						total: data?.total ?? 0,
						uniqueIps: data?.uniqueIps ?? 0
					}
				})
			]))
		})
	})
}