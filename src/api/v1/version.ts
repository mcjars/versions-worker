import { time } from "@rjweb/utils"
import { GlobalRouter } from "../.."
import { count, desc, eq } from "drizzle-orm"

export default function(router: GlobalRouter) {
	router.get('/api/v1/version/:version', async({ req }) => {
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
			version: Object.assign(versionData, {
				builds
			})
		})
	})

	router.get('/api/v1/version/:version/builds', async({ req }) => {
		const version = req.params.version

		const builds = await req.cache.use(`builds::${version}::all`, async() => {
			const data = await req.database.select()
				.from(req.database.schema.builds)
				.where(eq(req.database.schema.builds.versionId, version))
				.orderBy(desc(req.database.schema.builds.id))
				.all()

			return Object.fromEntries(req.database.schema.types.map((type) => [
				type,
				data.filter((build) => build.type === type).map(req.database.prepare.build)
			]))
		}, time(6).h())

		if (!builds) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		return Response.json({
			success: true,
			builds
		})
	})
}