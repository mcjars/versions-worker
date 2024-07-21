import { and, count, countDistinct, desc, eq, gte, inArray, like, lte, sql } from "drizzle-orm"
import { GlobalRouter } from "../.."
import { types, ServerType } from "../../schema"
import { object, time } from "@rjweb/utils"

export default function(router: GlobalRouter) {
	router.get('/api/v2/requests/version/:version', async({ req }) => {
		const version = req.params.version

		const requests = await req.cache.use(`requests::version::${version}`, () => req.database.select({
				total: count().as('total'),
				uniqueIps: countDistinct(req.database.schema.requests.ip),
				type: sql<string>`UPPER(SUBSTR(${req.database.schema.requests.path}, 16, INSTR(SUBSTR(${req.database.schema.requests.path}, 16), '/') - 1))`.as('type')
			})
				.from(req.database.schema.requests)
				.where(and(
					like(req.database.schema.requests.path, `/api/v_/builds/%`),
					like(req.database.schema.requests.path, `%/${version}%`),
					inArray(sql`type`, [...req.database.schema.types])
				))
				.groupBy(sql`type`)
				.orderBy(desc(sql`total`))
				.all(),
			time(30).m()
		)

		if (!requests?.length) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		return Response.json({
			success: true,
			requests: Object.fromEntries(req.database.schema.types.map((type) => [
				type,
				object.pick(requests.find((stat) => stat.type === type) ?? { total: 0, uniqueIps: 0 }, ['total', 'uniqueIps'])
			]))
		})
	})

	router.get('/api/v2/requests/version/:version/history/:year/:month', async({ req }) => {
		const version = req.params.version,
			year = parseInt(req.params.year),
			month = parseInt(req.params.month)

		if (isNaN(year) || year < 2024 || year > new Date().getFullYear()) return Response.json({ success: false, errors: ['Invalid year'] }, { status: 400 })
		if (isNaN(month) || month < 1 || month > 12) return Response.json({ success: false, errors: ['Invalid month'] }, { status: 400 })

		const start = new Date(year, month - 1, 1),
			end = new Date(year, month, 0)

		const requests = await req.cache.use(`requests::version::${version}::history::${start.getTime()}::${end.getTime()}`, () => req.database.select({
				total: count().as('total'),
				uniqueIps: countDistinct(req.database.schema.requests.ip),
				type: sql<string>`UPPER(SUBSTR(${req.database.schema.requests.path}, 16, INSTR(SUBSTR(${req.database.schema.requests.path}, 16), '/') - 1))`.as('type'),
				day: sql<string>`strftime('%d', datetime(created, 'unixepoch'))`.as('day')
			})
				.from(req.database.schema.requests)
				.where(and(
					like(req.database.schema.requests.path, `/api/v_/builds/%`),
					like(req.database.schema.requests.path, `%/${version}%`),
					gte(req.database.schema.requests.created, start),
					lte(req.database.schema.requests.created, end),
					inArray(sql`type`, [...req.database.schema.types])
				))
				.groupBy(sql`type, day`)
				.orderBy(sql`day`)
				.all(),
			time(30).m()
		)

		if (!requests?.length) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		return Response.json({
			success: true,
			requests: Object.fromEntries(req.database.schema.types.map((type) => [
				type,
				Array.from({ length: end.getDate() }, (_, i) => {
					const data = requests.filter((stat) => stat.type === type && parseInt(stat.day) === i + 1)

					return data.map((stat) => ({
						day: parseInt(stat.day),
						total: stat.total,
						uniqueIps: stat.uniqueIps
					}))
				})
			]))
		})
	})

	router.get('/api/v2/requests/:type', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const [ requests, mcVersions, projectVersions ] = await Promise.all([
			req.cache.use(`requests::${type}`, () => req.database.select({
					total: count().as('total'),
					uniqueIps: countDistinct(req.database.schema.requests.ip),
					version: sql<string>`UPPER(
						SUBSTR(
							CONCAT(${req.database.schema.requests.path}, '/'),
							16 + INSTR(
								SUBSTR(CONCAT(${req.database.schema.requests.path}, '/'), 16),
								'/'
							),
							INSTR(
								SUBSTR(
									CONCAT(${req.database.schema.requests.path}, '/'),
									16 + INSTR(
										SUBSTR(CONCAT(${req.database.schema.requests.path}, '/'), 16),
										'/'
									)
								),
								'/'
							) - 1
						)
					)`.as('version')
				})
					.from(req.database.schema.requests)
					.where(like(req.database.schema.requests.path, `/api/v_/builds/${type}%`))
					.groupBy(sql`version`)
					.orderBy(desc(sql`total`))
					.all(),
				time(30).m()
			),
			req.cache.use('versions::all::minecraft', () => req.database.select({
					id: req.database.schema.minecraftVersions.id
				})
					.from(req.database.schema.minecraftVersions)
					.all(),
				time(3).h()
			),
			type !== 'VELOCITY' ? null : req.cache.use(`versions::all::project::${type}`, () => req.database.select({
					id: req.database.schema.projectVersions.id
				})
					.from(req.database.schema.projectVersions)
					.where(eq(req.database.schema.projectVersions.type, type))
					.all(),
				time(1).h()
			)
		])

		const mappedRequests = requests.map((stat) => ({
			version: type !== 'VELOCITY' ? mcVersions.find((v) => stat.version === v.id.toUpperCase())?.id : projectVersions?.find((v) => stat.version === v.id.toUpperCase())?.id,
			total: stat.total,
			uniqueIps: stat.uniqueIps
		}))

		return Response.json({
			success: true,
			requests: {
				root: object.pick(requests.find((stat) => stat.version === '/') ?? { total: 0, uniqueIps: 0 }, ['total', 'uniqueIps']),
				versions: Object.fromEntries(mappedRequests.filter((stat) => stat.version).map((stat) => [
					stat.version,
					object.pick(stat, ['total', 'uniqueIps'])
				]))
			}
		})
	})

	router.get('/api/v2/requests/:type/history/:year/:month', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const year = parseInt(req.params.year),
			month = parseInt(req.params.month)

		if (isNaN(year) || year < 2024 || year > new Date().getFullYear()) return Response.json({ success: false, errors: ['Invalid year'] }, { status: 400 })
		if (isNaN(month) || month < 1 || month > 12) return Response.json({ success: false, errors: ['Invalid month'] }, { status: 400 })

		const start = new Date(year, month - 1, 1),
			end = new Date(year, month, 0)

		const [ requests, mcVersions, projectVersions ] = await Promise.all([
			req.cache.use(`requests::${type}::history::${start.getTime()}::${end.getTime()}`, () => req.database.select({
					total: count().as('total'),
					uniqueIps: countDistinct(req.database.schema.requests.ip),
					day: sql<string>`strftime('%d', datetime(created, 'unixepoch'))`.as('day'),
					version: sql<string>`UPPER(
						SUBSTR(
							CONCAT(${req.database.schema.requests.path}, '/'),
							16 + INSTR(
								SUBSTR(CONCAT(${req.database.schema.requests.path}, '/'), 16),
								'/'
							),
							INSTR(
								SUBSTR(
									CONCAT(${req.database.schema.requests.path}, '/'),
									16 + INSTR(
										SUBSTR(CONCAT(${req.database.schema.requests.path}, '/'), 16),
										'/'
									)
								),
								'/'
							) - 1
						)
					)`.as('version')
				})
					.from(req.database.schema.requests)
					.where(and(
						like(req.database.schema.requests.path, `/api/v_/builds/${type}%`),
						gte(req.database.schema.requests.created, start),
						lte(req.database.schema.requests.created, end)
					))
					.groupBy(sql`version, day`)
					.orderBy(sql`day`)
					.all(),
				time(30).m()
			),
			req.cache.use('versions::all::minecraft', () => req.database.select({
					id: req.database.schema.minecraftVersions.id
				})
					.from(req.database.schema.minecraftVersions)
					.all(),
				time(3).h()
			),
			type !== 'VELOCITY' ? null : req.cache.use(`versions::all::project::${type}`, () => req.database.select({
					id: req.database.schema.projectVersions.id
				})
					.from(req.database.schema.projectVersions)
					.where(eq(req.database.schema.projectVersions.type, type))
					.all(),
				time(1).h()
			)
		])

		const mappedRequests = requests.map((stat) => ({
			day: parseInt(stat.day),
			version: type !== 'VELOCITY' ? mcVersions.find((v) => stat.version === v.id.toUpperCase())?.id : projectVersions?.find((v) => stat.version === v.id.toUpperCase())?.id,
			total: stat.total,
			uniqueIps: stat.uniqueIps
		}))

		return Response.json({
			success: true,
			requests: {
				root: object.pick(requests.find((stat) => stat.version === '/') ?? { total: 0, uniqueIps: 0 }, ['total', 'uniqueIps']),
				versions: Array.from({ length: end.getDate() }, (_, i) => {
					const data = mappedRequests.filter((stat) => stat.day === i + 1)

					return {
						day: i + 1,
						requests: Object.fromEntries(data.filter((stat) => stat.version).map((stat) => [
							stat.version,
							object.pick(stat, ['total', 'uniqueIps'])
						]))
					}
				})
			}
		})
	})
}