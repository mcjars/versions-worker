import { time } from "@rjweb/utils"
import { GlobalRouter } from "../.."
import path from "path"
import { eq } from "drizzle-orm"

export default function(router: GlobalRouter) {
	router.get('/api/v1/script/:build/bash', async({ req }) => {
		const echo = !(req.query.echo === 'false')

		const int = isNaN(parseInt(req.params.build)) ? -1 : parseInt(req.params.build),
			hashType = req.params.build.length === 40 ? 'sha1'
				: req.params.build.length === 56 ? 'sha224'
				: req.params.build.length === 64 ? 'sha256'
				: req.params.build.length === 96 ? 'sha384'
				: req.params.build.length === 128 ? 'sha512'
				: req.params.build.length === 32 ? 'md5'
				: null

		if (!hashType && (isNaN(int) || int < 0 || int > 2147483647)) return new Response([
			'#!/bin/bash',
			'',
			'echo "Build not found"',
			'exit 1'
		].filter((line) => !line.startsWith('echo') || echo).join('\n'))

		const build = await req.cache.use(`build::${req.params.build}::installation`, async() => {
			if (hashType) {
				return req.database.select({
					id: req.database.schema.builds.id,
					type: req.database.schema.builds.type,
					version_id: req.database.schema.builds.versionId,
					project_version_id: req.database.schema.builds.projectVersionId,
					build_number: req.database.schema.builds.buildNumber,
					java: req.database.schema.minecraftVersions.java,
					installation: req.database.schema.builds.installation
				})
					.from(req.database.schema.buildHashes)
					.where(eq(req.database.schema.buildHashes[hashType], req.params.build))
					.innerJoin(req.database.schema.builds, eq(req.database.schema.builds.id, req.database.schema.buildHashes.buildId))
					.leftJoin(req.database.schema.minecraftVersions, eq(req.database.schema.minecraftVersions.id, req.database.schema.builds.versionId))
					.get()
			} else {
				return req.database.select({
					id: req.database.schema.builds.id,
					type: req.database.schema.builds.type,
					version_id: req.database.schema.builds.versionId,
					project_version_id: req.database.schema.builds.projectVersionId,
					build_number: req.database.schema.builds.buildNumber,
					java: req.database.schema.minecraftVersions.java,
					installation: req.database.schema.builds.installation
				})
					.from(req.database.schema.builds)
					.where(eq(req.database.schema.builds.id, int))
					.leftJoin(req.database.schema.minecraftVersions, eq(req.database.schema.minecraftVersions.id, req.database.schema.builds.versionId))
					.get()
			}
		}, time(6).h())

		if (!build) return new Response([
			'#!/bin/bash',
			'',
			'echo "Build not found"',
			'exit 1'
		].filter((line) => !line.startsWith('echo') || echo).join('\n'))

		req.data.type = 'script'
		req.data.build = {
			id: build.id,
			type: build.type,
			versionId: build.version_id,
			projectVersionId: build.project_version_id,
			buildNumber: build.build_number,
			java: build.java
		}

		const steps: string[] = []
		for (const combined of build.installation) {
			steps.push('')

			for (const step of combined) {
				switch (step.type) {
					case "remove": {
						steps.push(`echo "Removing ${step.location}"`)
						steps.push(`rm -rf ${step.location}`)

						break
					}

					case "download": {
						steps.push(`echo "Downloading ${step.file}"`)
						steps.push(`mkdir -p ${path.dirname(step.file)}`)
						steps.push(`rm -f ${step.file}`)
						steps.push(`curl -s -o ${step.file} '${step.url}'&`)

						break
					}

					case "unzip": {
						steps.push(`echo "Unzipping ${step.file}"`)
						steps.push(`mkdir -p ${step.location}`)
						steps.push(`unzip -o ${step.file} -d ${step.location}&`)

						break
					}
				}
			}

			steps.push('wait')
		}

		return new Response([
			'#!/bin/bash',
			`export JAVA_VERSION=${build.java ?? 21}`,
			'',
			'echo "Installing Server"',
			...steps,
			'',
			'echo "Installation complete"',
			`echo "Use Java version: ${build.java ?? 21}"`,
			'exit 0'
		].filter((line) => !line.startsWith('echo') || echo).join('\n'))
	})

	router.get('/api/v1/script/:build/powershell', async({ req }) => {
		const echo = !(req.query.echo === 'false')

		const int = isNaN(parseInt(req.params.build)) ? -1 : parseInt(req.params.build),
			hashType = req.params.build.length === 40 ? 'sha1'
				: req.params.build.length === 56 ? 'sha224'
				: req.params.build.length === 64 ? 'sha256'
				: req.params.build.length === 96 ? 'sha384'
				: req.params.build.length === 128 ? 'sha512'
				: req.params.build.length === 32 ? 'md5'
				: null

		if (!hashType && (isNaN(int) || int < 0 || int > 2147483647)) return new Response([
			'Write-Host "Build not found"',
			'exit 1'
		].filter((line) => !line.startsWith('Write-Host') || echo).join('\n'))

		const build = await req.cache.use(`build::${req.params.build}::installation`, async() => {
			if (hashType) {
				return req.database.select({
					id: req.database.schema.builds.id,
					type: req.database.schema.builds.type,
					version_id: req.database.schema.builds.versionId,
					project_version_id: req.database.schema.builds.projectVersionId,
					build_number: req.database.schema.builds.buildNumber,
					java: req.database.schema.minecraftVersions.java,
					installation: req.database.schema.builds.installation
				})
					.from(req.database.schema.buildHashes)
					.where(eq(req.database.schema.buildHashes[hashType], req.params.build))
					.innerJoin(req.database.schema.builds, eq(req.database.schema.builds.id, req.database.schema.buildHashes.buildId))
					.leftJoin(req.database.schema.minecraftVersions, eq(req.database.schema.minecraftVersions.id, req.database.schema.builds.versionId))
					.get()
			} else {
				return req.database.select({
					id: req.database.schema.builds.id,
					type: req.database.schema.builds.type,
					version_id: req.database.schema.builds.versionId,
					project_version_id: req.database.schema.builds.projectVersionId,
					build_number: req.database.schema.builds.buildNumber,
					java: req.database.schema.minecraftVersions.java,
					installation: req.database.schema.builds.installation
				})
					.from(req.database.schema.builds)
					.where(eq(req.database.schema.builds.id, int))
					.leftJoin(req.database.schema.minecraftVersions, eq(req.database.schema.minecraftVersions.id, req.database.schema.builds.versionId))
					.get()
			}
		}, time(6).h())

		if (!build) return new Response([
			'Write-Host "Build not found"',
			'exit 1'
		].filter((line) => !line.startsWith('Write-Host') || echo).join('\n'))

		req.data.type = 'script'
		req.data.build = {
			id: build.id,
			type: build.type,
			versionId: build.version_id,
			projectVersionId: build.project_version_id,
			buildNumber: build.build_number,
			java: build.java
		}

		const steps: string[] = []
		for (const combined of build.installation) {
			steps.push('')
			steps.push('Invoke-Command {')

			for (const step of combined) {
				switch (step.type) {
					case "remove": {
						steps.push(`  Write-Host "Removing ${step.location}"`)
						steps.push(`  Remove-Item -Recurse -Force ${step.location}`)

						break
					}

					case "download": {
						steps.push(`  Write-Host "Downloading ${step.file}"`)
						steps.push(`  New-Item -ItemType Directory -Force ${path.dirname(step.file)}`)
						steps.push(`  Invoke-WebRequest -Uri '${step.url}' -OutFile ${step.file}`)

						break
					}

					case "unzip": {
						steps.push(`  Write-Host "Unzipping ${step.file}"`)
						steps.push(`  New-Item -ItemType Directory -Force ${step.location}`)
						steps.push(`  Expand-Archive -Path ${step.file} -DestinationPath ${step.location}`)

						break
					}
				}
			}

			steps.push('}')
		}

		return new Response([
			'Write-Host "Installing Server"',
			`$env:JAVA_VERSION = ${build.java ?? 21}`,
			...steps,
			'',
			'Write-Host "Installation complete"',
			`Write-Host "Use Java version: ${build.java ?? 21}"`,
			'exit 0'
		].filter((line) => !line.startsWith('Write-Host') || echo).join('\n'))
	})
}