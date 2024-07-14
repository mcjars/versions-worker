import { time } from "@rjweb/utils"
import { GlobalRouter } from "../.."
import { and, count, desc, eq } from "drizzle-orm"

export default function(router: GlobalRouter) {
	router.get('/api/v1/version/:version', async({ req }) => {
		const version = req.params.version

		const versionData = await req.database.select()
			.from(req.database.schema.minecraftVersions)
			.where(eq(req.database.schema.minecraftVersions.id, version))
			.get()

		if (!versionData) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

		const builds = await req.cache.use(`versions::${version}::all`, async() => {
			const data = await Promise.all(req.database.schema.types.map((type) => req.database.select({ value: count() })
				.from(req.database.schema.builds)
				.where(and(
					eq(req.database.schema.builds.versionId, version),
					eq(req.database.schema.builds.type, type)
				))
				.get()
			))

			return Object.fromEntries(req.database.schema.types.map((type, index) => [
				type,
				data[index]?.value ?? 0
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

		const versionData = await req.database.select()
			.from(req.database.schema.minecraftVersions)
			.where(eq(req.database.schema.minecraftVersions.id, version))
			.get()

		if (!versionData) return Response.json({ success: false, errors: ['Version not found'] }, { status: 404 })

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
		}, time(10).m())

		return Response.json({
			success: true,
			builds
		})
	})
}