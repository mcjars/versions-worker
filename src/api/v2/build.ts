import { time } from "@rjweb/utils"
import { GlobalRouter } from "../.."
import { z } from "zod"
import { ServerType, types } from "../../schema"
import { and, eq, or, sql } from "drizzle-orm"

const buildSearch = z.object({
	id: z.number().int().optional(),
	type: z.string().toUpperCase()
		.refine((str) => types.includes(str as 'VANILLA'))
		.transform((str) => str as ServerType)
		.optional(),
	versionId: z.string().optional(),
	projectVersionId: z.string().nullable().optional(),
	buildNumber: z.number().int().optional(),
	experimental: z.boolean().optional(),
	hash: z.object({
		primary: z.boolean().optional(),
		sha1: z.string().optional(),
		sha224: z.string().optional(),
		sha256: z.string().optional(),
		sha384: z.string().optional(),
		sha512: z.string().optional(),
		md5: z.string().optional(),
	}).optional(),
	jarUrl: z.string().nullable().optional(),
	jarSize: z.number().int().nullable().optional(),
	zipUrl: z.string().nullable().optional(),
	zipSize: z.number().int().nullable().optional(),
})

async function lookupBuild(data: z.infer<typeof buildSearch>, req: Parameters<Parameters<GlobalRouter['any']>[1]>[0]['req']) {
	return req.cache.use(`build::${JSON.stringify(data)}`, async() => {
		if (data.hash && Object.keys(data.hash).length > 0) {
			return req.database.prepare.build(await req.database.select()
				.from(req.database.schema.buildHashes)
				.where(and(
					data.hash.primary ? eq(req.database.schema.buildHashes.primary, data.hash.primary) : undefined,
					data.hash.sha1 ? eq(req.database.schema.buildHashes.sha1, data.hash.sha1) : undefined,
					data.hash.sha224 ? eq(req.database.schema.buildHashes.sha224, data.hash.sha224) : undefined,
					data.hash.sha256 ? eq(req.database.schema.buildHashes.sha256, data.hash.sha256) : undefined,
					data.hash.sha384 ? eq(req.database.schema.buildHashes.sha384, data.hash.sha384) : undefined,
					data.hash.sha512 ? eq(req.database.schema.buildHashes.sha512, data.hash.sha512) : undefined,
					data.hash.md5 ? eq(req.database.schema.buildHashes.md5, data.hash.md5) : undefined
				))
				.innerJoin(req.database.schema.builds, and(
					eq(req.database.schema.builds.id, req.database.schema.buildHashes.buildId),
					data.id ? eq(req.database.schema.builds.id, data.id) : undefined,
					data.type ? eq(req.database.schema.builds.type, data.type) : undefined,
					data.versionId ? eq(req.database.schema.builds.versionId, data.versionId) : undefined,
					data.projectVersionId ? eq(req.database.schema.builds.projectVersionId, data.projectVersionId) : undefined,
					data.buildNumber ? eq(req.database.schema.builds.buildNumber, data.buildNumber) : undefined,
					data.experimental ? eq(req.database.schema.builds.experimental, data.experimental) : undefined,
					data.jarUrl ? eq(req.database.schema.builds.jarUrl, data.jarUrl) : undefined,
					data.jarSize ? eq(req.database.schema.builds.jarSize, data.jarSize) : undefined,
					data.zipUrl ? eq(req.database.schema.builds.zipUrl, data.zipUrl) : undefined,
					data.zipSize ? eq(req.database.schema.builds.zipSize, data.zipSize) : undefined
				))
				.get().then((hash) => hash ? hash.builds : null)
			)
		} else {
			return req.database.prepare.build(await req.database.select()
				.from(req.database.schema.builds)
				.where(and(
					data.id ? eq(req.database.schema.builds.id, data.id) : undefined,
					data.type ? eq(req.database.schema.builds.type, data.type) : undefined,
					data.versionId ? eq(req.database.schema.builds.versionId, data.versionId) : undefined,
					data.projectVersionId ? eq(req.database.schema.builds.projectVersionId, data.projectVersionId) : undefined,
					data.buildNumber ? eq(req.database.schema.builds.buildNumber, data.buildNumber) : undefined,
					data.experimental ? eq(req.database.schema.builds.experimental, data.experimental) : undefined,
					data.jarUrl ? eq(req.database.schema.builds.jarUrl, data.jarUrl) : undefined,
					data.jarSize ? eq(req.database.schema.builds.jarSize, data.jarSize) : undefined,
					data.zipUrl ? eq(req.database.schema.builds.zipUrl, data.zipUrl) : undefined,
					data.zipSize ? eq(req.database.schema.builds.zipSize, data.zipSize) : undefined,
					sql`1`
				))
				.get()
			)
		}
	}, time(3).h())
}

export default function(router: GlobalRouter) {
	router.post('/api/v2/build', async({ req }) => {
		const data = z.union([
			buildSearch,
			buildSearch.array().min(1).max(10)
		]).safeParse(await req.json().catch(() => null))

		if (!data.success) return Response.json({ success: false, errors: data.error.errors.map((err) => `${err.path}: ${err.message}`) }, { status: 400 })

		if (Array.isArray(data.data)) {
			const builds = await Promise.all(data.data.map((build) => lookupBuild(build, req)))

			return Response.json({
				success: true,
				builds
			})
		} else {
			const build = await lookupBuild(data.data, req)
			if (!build) return Response.json({ success: false, errors: ['Build not found'] }, { status: 404 })

			const [ latest, version ] = await req.database.buildLatest(build)

			return Response.json({
				success: true,
				build,
				latest,
				version
			})
		}
	})
}