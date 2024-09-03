import { object, time } from "@rjweb/utils"
import { GlobalRouter } from "../.."
import { z } from "zod"
import { ServerType, types } from "../../schema"
import { sql } from "drizzle-orm"
import { ReturnRow } from "../v1/build"

const buildSearch = z.object({
	id: z.number().int().optional(),
	type: z.string().toUpperCase()
		.refine((str) => types.includes(str as 'VANILLA'))
		.transform((str) => str as ServerType)
		.optional(),
	versionId: z.string().max(31).nullable().optional(),
	projectVersionId: z.string().max(31).nullable().optional(),
	buildNumber: z.number().int().optional(),
	experimental: z.boolean().transform((b) => +b).optional(),
	hash: z.object({
		primary: z.boolean().transform((b) => +b).optional(),
		sha1: z.string().length(40).optional(),
		sha224: z.string().length(56).optional(),
		sha256: z.string().length(64).optional(),
		sha384: z.string().length(96).optional(),
		sha512: z.string().length(128).optional(),
		md5: z.string().length(32).optional()
	}).optional(),
	jarUrl: z.string().nullable().optional(),
	jarSize: z.number().int().nullable().optional(),
	zipUrl: z.string().nullable().optional(),
	zipSize: z.number().int().nullable().optional(),
})

function toSnakeCase(str: string) {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function escapeString(str: string) {
	return str.replace(/'/g, "''")
}

async function lookupBuild(data: z.infer<typeof buildSearch>, req: Parameters<Parameters<GlobalRouter['any']>[1]>[0]['req']) {
	const { results: [ build, latest ] } = await req.cache.use(`build::${JSON.stringify(data)}`, async() => {
		return req.database.run(sql<[ReturnRow, ReturnRow]>`
			WITH spec_build AS (
				SELECT builds.*
				FROM ${data.hash && Object.keys(data.hash).length > 0
					? sql.raw('buildHashes INNER JOIN builds ON builds.id = buildHashes.build_id')
					: sql.identifier('builds')
				} WHERE ${sql.raw(
					Object.keys(data).filter((k) => k !== 'hash').map(toSnakeCase).map((key) => `builds.${toSnakeCase(key)} ${typeof data[key as keyof typeof data] === 'number'
						? `= ${data[key as keyof typeof data]}`
						: typeof data[key as keyof typeof data] === 'string'
							? `= '${escapeString(data[key as keyof typeof data] as any)}'`
							: 'IS NULL'}`)
					.concat(data.hash && Object.keys(data.hash).length > 0
						? Object.keys(data.hash).map((key) => `\`${key}\` = ${typeof data.hash![key as keyof typeof data.hash] === 'string'
							? `'${escapeString(data.hash![key as keyof typeof data.hash] as any)}'`
							: data.hash![key as keyof typeof data.hash]}`)
						: []
					).join(' AND ')
				)} LIMIT 1
			)

			, filtered_builds AS (
				SELECT b.*
				FROM builds b
				INNER JOIN spec_build sb
					ON sb.id = b.id 
					OR (COALESCE(sb.version_id, sb.project_version_id) = COALESCE(b.version_id, b.project_version_id) AND sb.type = b.type)
				WHERE b.type != 'ARCLIGHT' OR (
					(sb.project_version_id LIKE '%-fabric' AND b.project_version_id LIKE '%-fabric')
					OR (sb.project_version_id LIKE '%-forge' AND b.project_version_id LIKE '%-forge')
					OR (sb.project_version_id LIKE '%-neoforge' AND b.project_version_id LIKE '%-neoforge')
					OR (sb.project_version_id NOT LIKE '%-fabric' AND sb.project_version_id NOT LIKE '%-forge' AND sb.project_version_id NOT LIKE '%-neoforge')
				)
			)

			SELECT *, 0 AS build_count, '' AS _version_id, '' AS version_type, 0 AS version_supported, 0 AS version_java, 0 AS version_created
			FROM spec_build

			UNION ALL

			SELECT x.*, mv.*
			FROM (
				SELECT *
				FROM (
					SELECT b.*, count(1) OVER () AS build_count
					FROM filtered_builds b
					ORDER BY b.id DESC
				) LIMIT 1
			) x
			LEFT JOIN minecraftVersions mv ON mv.id = x.version_id;
		`) as Promise<D1Result<ReturnRow>>
	}, time(30).m())

	return [ build, latest ]
}

export default function(router: GlobalRouter) {
	router.post('/api/v2/build', async({ req }) => {
		const data = z.union([
			buildSearch,
			buildSearch.array().min(1).max(10)
		]).safeParse(await req.json().catch(() => null))

		const fields = Array.from(new Set((req.query.fields ?? '')
			.split(',')
			.filter((field) => field.length > 0)
		)) as 'id'[]

		if (!data.success) return Response.json({ success: false, errors: data.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`) }, { status: 400 })

		if (Array.isArray(data.data)) {
			const builds = await Promise.all(data.data.map((build) => lookupBuild(build, req)))

			return Response.json({
				success: true,
				builds: builds.map((build) => !build[0] || !build[1] ? null : ({
					build: fields.length > 0 ? object.pick(req.database.prepare.rawBuild(build[0]), fields) : req.database.prepare.rawBuild(build[0]),
					latest: fields.length > 0 && build[1] ? object.pick(req.database.prepare.rawBuild(build[1]), fields) : req.database.prepare.rawBuild(build[1]),
					version: {
						id: build[1].version_id || build[1].project_version_id,
						type: build[1].version_type ?? undefined,
						java: build[1].version_java ?? undefined,
						supported: build[1].version_supported ? Boolean(build[1].version_supported) : undefined,
						created: build[1].version_created ? new Date(build[1].version_created * 1000) : undefined,
						builds: build[1].build_count
					}
				}))
			})
		} else {
			const [ build, latest ] = await lookupBuild(data.data, req)
			if (!build || !latest) return Response.json({ success: false, errors: ['Build not found'] }, { status: 404 })

			req.data.type = 'lookup'
			req.data.build = {
				id: build.id,
				type: build.type,
				versionId: build.version_id,
				projectVersionId: build.project_version_id,
				buildNumber: build.build_number,
				java: latest.version_java
			}

			return Response.json({
				success: true,
				build: fields.length > 0 ? object.pick(req.database.prepare.rawBuild(build), fields) : req.database.prepare.rawBuild(build),
				latest: fields.length > 0 && latest ? object.pick(req.database.prepare.rawBuild(latest), fields) : req.database.prepare.rawBuild(latest),
				version: {
					id: latest.version_id || latest.project_version_id,
					type: latest.version_type ?? undefined,
					java: latest.version_java ?? undefined,
					supported: latest.version_supported ? Boolean(latest.version_supported) : undefined,
					created: latest.version_created ? new Date(latest.version_created * 1000) : undefined,
					builds: latest.build_count
				}
			})
		}
	})
}