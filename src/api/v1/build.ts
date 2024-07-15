import { time } from "@rjweb/utils"
import { GlobalRouter } from "../.."
import { eq } from "drizzle-orm"

export default function(router: GlobalRouter) {
	router.get('/api/v1/build/:build', async({ req }) => {
		const build = await req.cache.use(`build::${req.params.build}`, async() => {
			const int = isNaN(parseInt(req.params.build)) ? -1 : parseInt(req.params.build),
				hashType = req.params.build.length === 40 ? 'sha1'
					: req.params.build.length === 56 ? 'sha224'
					: req.params.build.length === 64 ? 'sha256'
					: req.params.build.length === 96 ? 'sha384'
					: req.params.build.length === 128 ? 'sha512'
					: req.params.build.length === 32 ? 'md5'
					: null
	
			if (hashType && req.params.build.match(/^[a-f0-9]+$/)) {
				return req.database.prepare.build(await req.database.select(req.database.fields.build)
					.from(req.database.schema.buildHashes)
					.where(eq(req.database.schema.buildHashes[hashType], req.params.build))
					.innerJoin(req.database.schema.builds, eq(req.database.schema.builds.id, req.database.schema.buildHashes.buildId))
					.limit(1)
					.get()
				)
			} else if (int && int > 0 && int < 2147483647) {
				return req.database.prepare.build(await req.database.select(req.database.fields.build)
					.from(req.database.schema.builds)
					.where(eq(req.database.schema.builds.id, int))
					.limit(1)
					.get()
				)
			}
		}, time(30).m())

		if (!build) return Response.json({ success: false, errors: ['Build not found'] }, { status: 404 })
		const [ latest, version ] = await req.database.buildLatest(build)

		return Response.json({
			success: true,
			build,
			latest,
			version
		})
	})
}