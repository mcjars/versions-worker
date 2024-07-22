import { object, time } from "@rjweb/utils"
import { GlobalRouter } from "../.."
import { ServerType, types } from "../../schema"
import { and, count, desc, eq, ne } from "drizzle-orm"

export default function(router: GlobalRouter) {
	router.get('/api/v2/builds/version/:version', async({ req }) => {
		const version = req.params.version

		const versionData = await req.cache.use(`version::${version}`, () => req.database.select()
				.from(req.database.schema.minecraftVersions)
				.where(eq(req.database.schema.minecraftVersions.id, version))
				.limit(1)
				.get(),
			time(3).h()
		)

		if (!versionData) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		const builds = await req.cache.use(`versions::${version}::all`, async() => {
			const data = await req.database.select({
				type: req.database.schema.builds.type,
				builds: count()
			})
				.from(req.database.schema.builds)
				.where(eq(req.database.schema.builds.versionId, version))
				.groupBy(req.database.schema.builds.type)
				.all()

			return Object.fromEntries(req.database.schema.types.map((type) => [
				type,
				data.find((build) => build.type === type)?.builds ?? 0
			]))
		}, time(30).m())

		return Response.json({
			success: true,
			builds
		})
	})

	router.get('/api/v2/builds/:type', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const fields = Array.from(new Set((req.query.fields ?? '')
			.split(',')
			.filter((field) => field.length > 0)
		)) as 'id'[]

		return Response.json({
			success: true,
			builds: fields.length > 0
				? await req.database.versions(type).then((versions) => Object.fromEntries(Object.entries(versions).map(([ version, data ]) => [
						version,
						{
							...data,
							latest: data.latest ? object.pick(data.latest, fields) : null
						}
					])))
				: await req.database.versions(type)
		})
	})

	router.get('/api/v2/builds/:type/:version', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const version = req.params.version,
			location = await req.database.version(version, type)
		if (!location) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		const fields = Array.from(new Set((req.query.fields ?? '')
			.split(',')
			.filter((field) => field.length > 0)
		)) as 'id'[]

		const builds = await req.cache.use(`builds::${type}::${version}`, () => req.database.select(req.database.fields.build)
				.from(req.database.schema.builds)
				.where(and(
					eq(req.database.schema.builds.type, type),
					location === 'minecraft'
						? eq(req.database.schema.builds.versionId, version)
						: eq(req.database.schema.builds.projectVersionId, version)
				))
				.orderBy(desc(req.database.schema.builds.id))
				.all().then((builds) => builds.map(req.database.prepare.build)),
			time(10).m()
		)

		return Response.json({
			success: true,
			builds: fields.length > 0 ? builds.map((build) => object.pick(build, fields)) : builds
		})
	})

	router.get('/api/v2/builds/:type/:version/changes', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const version = req.params.version,
			location = await req.database.version(version, type)
		if (!location) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		const builds = await req.cache.use(`builds::${type}::${version}`, () => req.database.select(req.database.fields.build)
				.from(req.database.schema.builds)
				.where(and(
					eq(req.database.schema.builds.type, type),
					ne(req.database.schema.builds.changes, []),
					location === 'minecraft'
						? eq(req.database.schema.builds.versionId, version)
						: eq(req.database.schema.builds.projectVersionId, version)
				))
				.orderBy(desc(req.database.schema.builds.id))
				.all().then((builds) => builds.map(req.database.prepare.build)),
			time(10).m()
		)

		return Response.json({
			success: true,
			changes: builds.map((build) => ({
				id: build.id,
				changes: build.changes
			}))
		})
	})
}