import { time } from "@rjweb/utils"
import { GlobalRouter } from "../.."
import { sql } from "drizzle-orm"
import { RawBuild } from "../../globals/database"

type ReturnRow = RawBuild & {
	build_count: number
	version_type: string | null
	version_java: string | null
	version_supported: boolean | null
	version_created: number | null
}

export default function(router: GlobalRouter) {
	router.get('/api/v1/build/:build', async({ req }) => {
		const { meta, results: [ build, latest ] } = await req.cache.use(`build::${req.params.build}`, async() => {
			const int = isNaN(parseInt(req.params.build)) ? -1 : parseInt(req.params.build),
				hashType = req.params.build.length === 40 ? 'sha1'
					: req.params.build.length === 56 ? 'sha224'
					: req.params.build.length === 64 ? 'sha256'
					: req.params.build.length === 96 ? 'sha384'
					: req.params.build.length === 128 ? 'sha512'
					: req.params.build.length === 32 ? 'md5'
					: null
	
			return req.database.run(sql<[ReturnRow, ReturnRow]>`
				WITH current_build AS (
					SELECT builds.* FROM ${hashType && req.params.build.match(/^[a-f0-9]+$/)
						? sql`buildHashes INNER JOIN builds ON builds.id = buildHashes.build_id WHERE ${sql.identifier(hashType)} = ${req.params.build}`
						: sql`builds WHERE id = ${int}`
    			} LIMIT 1
				),
				latest_build AS (
					SELECT *
					FROM builds msb
					WHERE msb.type = (SELECT type FROM current_build)
					AND (
						msb.version_id = (SELECT version_id FROM current_build) 
						OR msb.project_version_id = (SELECT project_version_id FROM current_build)
					) ORDER BY msb.id DESC LIMIT 1
				),
				builds_count AS (
					SELECT
						COALESCE(cb.version_id, cb.project_version_id) AS version_id,
						COUNT(*) AS build_count
					FROM builds cb
					WHERE
						cb.version_id = (SELECT version_id FROM current_build)
						OR cb.project_version_id = (SELECT project_version_id FROM current_build)
					GROUP BY COALESCE(cb.version_id, cb.project_version_id)
				),
				version_data AS (
					SELECT
						v.id as _version_id,
						v.type as version_type,
						v.java as version_java,
						v.supported as version_supported,
						v.created as version_created,
						COALESCE((SELECT version_id FROM current_build), (SELECT project_version_id FROM current_build)) AS version_id
					FROM minecraftVersions v
					WHERE v.id = COALESCE((SELECT version_id FROM current_build), (SELECT project_version_id FROM current_build))
				)

				SELECT cb.*, COALESCE(bc.build_count, 0) AS build_count, vd.*
				FROM current_build cb
				LEFT JOIN builds_count bc ON bc.version_id = COALESCE(cb.version_id, cb.project_version_id)
				LEFT JOIN version_data vd ON vd._version_id = COALESCE(cb.version_id, cb.project_version_id)

				UNION ALL

				SELECT lb.*, COALESCE(bc.build_count, 0) AS build_count, vd.*
				FROM latest_build lb
				LEFT JOIN builds_count bc ON bc.version_id = COALESCE(lb.version_id, lb.project_version_id)
				LEFT JOIN version_data vd ON vd._version_id = COALESCE(lb.version_id, lb.project_version_id)
				WHERE COALESCE(lb.version_id, lb.project_version_id) IS NOT NULL;
			`) as Promise<D1Result<ReturnRow>>
		}, time(30).m())

		return Response.json({
			success: true,
			build: req.database.prepare.rawBuild(build),
			latest: req.database.prepare.rawBuild(latest),
			version: {
				id: build.version_id || build.project_version_id,
				type: build.version_type ?? undefined,
				java: build.version_java ?? undefined,
				supported: build.version_supported ? Boolean(build.version_supported) : undefined,
				created: build.version_created ? new Date(build.version_created * 1000) : undefined,
				builds: build.build_count
			}
		})
	})
}