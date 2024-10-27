import db from "../globals/database"
import ch from "../globals/cache"
import { and, count, countDistinct, desc, isNotNull, like, notLike, sql, sum, sumDistinct } from "drizzle-orm"
import { object } from "@rjweb/utils"

export default async function([event, env, ctx]: Parameters<Exclude<ExportedHandler<Env>['scheduled'], undefined>>) {
	const database = db(env),
		cache = ch(env)

	{ // Update cache for /api/v1/stats
		const [ hashes, requests, builds, db ] = await Promise.all([
			database.select({
				hashes: count()
			})
				.from(database.schema.buildHashes)
				.get(),
			database.select({
				requests: count()
			})
				.from(database.schema.requests)
				.get(),
			database.select({
				builds: count(),
				totalJarSize: sumDistinct(database.schema.builds.jarSize),
				totalZipSize: sum(database.schema.builds.zipSize)
			})
				.from(database.schema.builds)
				.get(),
			database.run(sql`SELECT 1`)
		])

		await cache.set('pre.stats::all', {
			builds: builds?.builds ?? 0,
			hashes: hashes?.hashes ?? 0,
			requests: requests?.requests ?? 0,
			size: {
				database: db?.meta.size_after ?? 0
			}, total: {
				jarSize: Number(builds?.totalJarSize ?? 0),
				zipSize: Number(builds?.totalZipSize ?? 0)
			}
		})
	}

	{ // Update cache for /api/v2/lookups/versions
		const versions = await database.select({
			version: sql<string>`x.version`.as('version'),
			total: count().as('total'),
			uniqueIps: countDistinct(database.schema.requests.ip)
		})
			.from(database.select({
				version: sql<string>`json_extract(${database.schema.requests.data}, '$.build.versionId')`.as('version'),
				ip: database.schema.requests.ip
			})
				.from(database.schema.requests)
				.where(and(
					isNotNull(database.schema.requests.data),
					notLike(database.schema.requests.path, `%tracking=nostats%`),
					like(database.schema.requests.data, `%lookup%`)
				))
				.as('x'))
			.where(isNotNull(sql`x.version`))
			.groupBy(sql`x.version`)
			.orderBy(desc(sql`total`))
			.all()

		await cache.set('pre.lookups::versions', Object.fromEntries(versions.map((version) => [
			version.version,
			object.pick(version, ['total', 'uniqueIps'])
		])))
	}

	{ // Update cache for /api/v2/lookups/types
		const types = await database.select({
			type: sql<string>`x.type`.as('type'),
			total: count().as('total'),
			uniqueIps: countDistinct(database.schema.requests.ip)
		})
			.from(database.select({
				type: sql<string>`json_extract(${database.schema.requests.data}, '$.build.type')`.as('type'),
				ip: database.schema.requests.ip
			})
				.from(database.schema.requests)
				.where(and(
					isNotNull(database.schema.requests.data),
					notLike(database.schema.requests.path, `%tracking=nostats%`),
					like(database.schema.requests.data, `%lookup%`)
				))
				.as('x'))
			.where(isNotNull(sql`x.type`))
			.groupBy(sql`x.type`)
			.orderBy(desc(sql`total`))
			.all()

		await cache.set('pre.lookups::types', Object.fromEntries(types.map((type) => [
			type.type,
			object.pick(type, ['total', 'uniqueIps'])
		])))
	}

	{ // Update cache for /api/v2/lookups/versions/:type
		await Promise.all(database.schema.types.map(async(type) => {
			const selector = type === 'VELOCITY' ? '$.build.projectVersionId' : '$.build.versionId'

			const versions = await database.select({
					version: sql<string>`x.version`.as('version'),
					total: count().as('total'),
					uniqueIps: countDistinct(database.schema.requests.ip)
				})
					.from(database.select({
						version: sql<string>`json_extract(${database.schema.requests.data}, ${selector})`.as('version'),
						ip: database.schema.requests.ip
					})
						.from(database.schema.requests)
						.where(and(
							isNotNull(database.schema.requests.data),
							notLike(database.schema.requests.path, `%tracking=nostats%`),
							like(database.schema.requests.data, `%lookup%`),
							like(database.schema.requests.data, `%${type}%`)
						))
						.as('x'))
					.where(isNotNull(sql`x.version`))
					.groupBy(sql`x.version`)
					.orderBy(desc(sql`total`))
					.all()

			await cache.set(`pre.lookups::versions::${type}`, Object.fromEntries(versions.map((version) => [
				version.version,
				object.pick(version, ['total', 'uniqueIps'])
			])))
		}))
	}
}