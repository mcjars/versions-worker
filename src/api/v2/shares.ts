import { and, count, countDistinct, desc, isNotNull, like, notLike, sql } from "drizzle-orm"
import { GlobalRouter } from "../.."
import { object, time } from "@rjweb/utils"
import { ServerType, types } from "../../schema"

export default function(router: GlobalRouter) {
	router.get('/api/v2/shares/versions', async({ req }) => {
		const versions = await req.cache.use('shares::versions', () => req.database.select({
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

	router.get('/api/v2/shares/versions/:type', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const versions = await req.cache.use(`shares::versions::${type}`, () => req.database.select({
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

	router.get('/api/v2/shares/types', async({ req }) => {
		const types = await req.cache.use('shares::types', () => req.database.select({
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
}