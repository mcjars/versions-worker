import { GlobalRouter } from "../.."
import { and, asc, count, desc, eq, max, sql } from "drizzle-orm"
import { ServerType, types } from "../../schema"
import { time } from "@rjweb/utils"

export default function(router: GlobalRouter) {
	router.get('/api/v1/builds/:type', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType

		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		switch (type) {
			case "VELOCITY": {
				const versions = await req.cache.use('builds::VELOCITY', async() => {
					const versions = await req.database.select()
						.from(
							req.database.select({
								builds: count(req.database.schema.builds.id).as('builds'),
								latest: max(req.database.schema.builds.id).as('latest'),
								projectVersionId: req.database.schema.projectVersions.id
							})
								.from(req.database.schema.projectVersions)
								.innerJoin(req.database.schema.builds, and(
									eq(req.database.schema.builds.projectVersionId, req.database.schema.projectVersions.id),
									eq(req.database.schema.builds.type, type)
								))
								.groupBy(req.database.schema.projectVersions.id)
								.as('x')
						)
						.innerJoin(req.database.schema.builds, eq(req.database.schema.builds.id, sql`x.latest`))
						.all()

					return Object.fromEntries(versions.map((version) => [
						version.x.projectVersionId,
						{
							builds: Number(version.x.builds),
							latest: req.database.prepare.build(version.builds)
						}
					]))
				})

				return Response.json({
					success: true,
					versions
				})
			}

			default: {
				const versions = await req.cache.use(`builds::${type}`, async() => {
					const versions = await req.database.select()
						.from(
							req.database.select({
								created: req.database.schema.minecraftVersions.created,
								supported: req.database.schema.minecraftVersions.supported,
								versionType: req.database.schema.minecraftVersions.type,
								builds: count(req.database.schema.builds.id).as('builds'),
								latest: max(req.database.schema.builds.id).as('latest')
							})
								.from(req.database.schema.minecraftVersions)
								.innerJoin(req.database.schema.builds, and(
									eq(req.database.schema.builds.versionId, req.database.schema.minecraftVersions.id),
									eq(req.database.schema.builds.type, type)
								))
								.groupBy(
									req.database.schema.minecraftVersions.id,
									req.database.schema.minecraftVersions.created,
									req.database.schema.minecraftVersions.supported,
									req.database.schema.minecraftVersions.type
								)
								.orderBy(asc(req.database.schema.minecraftVersions.created))
								.as('x')
						)
						.innerJoin(req.database.schema.builds, eq(req.database.schema.builds.id, sql`x.latest`))
						.all()

					return Object.fromEntries(versions.map((version) => [
						version.builds.versionId,
						{
							type: version.x.versionType,
							supported: version.x.supported,
							created: version.x.created,
							builds: Number(version.x.builds),
							latest: req.database.prepare.build(version.builds)
						}
					]))
				})

				return Response.json({
					success: true,
					versions
				})
			}
		}
	})

	router.get('/api/v1/builds/:type/:version', async({ req }) => {
		const type = req.params.type.toUpperCase() as ServerType,
			version = req.params.version

		if (!types.includes(type)) return Response.json({ success: false, errors: ['Invalid type'] }, { status: 400 })

		const location = await req.database.version(version, type)
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