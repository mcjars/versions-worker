import { GlobalRouter } from "../.."
import { and, desc, eq, sql } from "drizzle-orm"
import { ServerType, types } from "../../schema"
import { time } from "@rjweb/utils"

export default function(router: GlobalRouter) {
	router.get('/api/v1/builds/:type', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		return Response.json({
			success: true,
			versions: await req.database.versions(type)
		})
	})

	router.get('/api/v1/builds/:type/:version', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType
		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const version = req.params.version,
			location = await req.database.version(version, type)
		if (!location) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		const builds = await req.cache.use(`builds::${type}::${version}`, () => req.database.select()
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
			builds
		})
	})

	router.get('/api/v1/builds/:type/:version/:build', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType,
			version = req.params.version,
			build = parseInt(req.params.build)

		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })
		if (isNaN(build) && req.params.build.toLowerCase() !== 'latest') return Response.json({ success: false, errors: ['Invalid build'] }, { status: 400 })

		const location = await req.database.version(version, type)
		if (!location) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		const serverBuild = await req.cache.use(`build::${type}::${version}::buildNumber.${build}`, () => req.database.select()
				.from(req.database.schema.builds)
				.where(and(
					eq(req.database.schema.builds.type, type),
					location === 'minecraft'
						? eq(req.database.schema.builds.versionId, version)
						: eq(req.database.schema.builds.projectVersionId, version),
					isNaN(build)
						? sql`1`
						: eq(req.database.schema.builds.buildNumber, build)
				))
				.orderBy(desc(req.database.schema.builds.id))
				.get().then(req.database.prepare.build),
			time(3).h()
		)

		if (!serverBuild) return Response.json({ success: false, errors: ['Build not found'] }, { status: 404 })

		return Response.json({
			success: true,
			build: serverBuild
		})
	})
}