import { time } from "@rjweb/utils"
import { GlobalRouter } from "../.."
import { sql } from "drizzle-orm"
import { RawBuild } from "../../globals/database"

export type ReturnRow = RawBuild & {
	build_count: number
	version_type: string | null
	version_java: string | null
	version_supported: boolean | null
	version_created: number | null
}

export default function(router: GlobalRouter) {
	router.get('/api/v1/build/:build', async({ req }) => {
		const { results: [ build, latest ] } = await req.cache.use(`build::${req.params.build}`, async() => {
			const int = isNaN(parseInt(req.params.build)) ? -1 : parseInt(req.params.build),
				hashType = req.params.build.length === 40 ? 'sha1'
					: req.params.build.length === 56 ? 'sha224'
					: req.params.build.length === 64 ? 'sha256'
					: req.params.build.length === 96 ? 'sha384'
					: req.params.build.length === 128 ? 'sha512'
					: req.params.build.length === 32 ? 'md5'
					: null
	
			return req.database.run(sql<[ReturnRow, ReturnRow]>`
				WITH spec_build AS (
					SELECT builds.*
					FROM ${hashType
							? sql`buildHashes INNER JOIN builds ON builds.id = buildHashes.build_id WHERE ${sql.identifier(hashType)} = ${req.params.build}`
							: sql`builds WHERE id = ${int}`
					} LIMIT 1
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

		if (!build || !latest) return Response.json({ success: false, errors: ['Build not found'] }, { status: 404 })

		return Response.json({
			success: true,
			build: req.database.prepare.rawBuild(build),
			latest: req.database.prepare.rawBuild(latest),
			version: {
				id: latest.version_id || latest.project_version_id,
				type: latest.version_type ?? undefined,
				java: latest.version_java ?? undefined,
				supported: latest.version_supported ? Boolean(latest.version_supported) : undefined,
				created: latest.version_created ? new Date(latest.version_created * 1000) : undefined,
				builds: latest.build_count
			}
		})
	})
}