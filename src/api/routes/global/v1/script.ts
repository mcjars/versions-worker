import { globalAPIRouter } from "@/api"
import { time } from "@rjweb/utils"
import { eq } from "drizzle-orm"
import path from "path"

export = new globalAPIRouter.Path('/')
	.document({
		parameters: [
			{
				name: 'build',
				in: 'path',
				description: 'The build number or hash to lookup',
				required: true,
				example: 'b1f3eeac53355d9ba5cf19e36abe8b2a30278c0e60942f3d07ac9ac9e4564951',
				schema: {
					type: 'string'
				}
			}
		], responses: {
			200: {
				description: 'Success',
				content: {
					'text/plain': {
						schema: {
							type: 'string'
						}
					}
				}
			}, 404: {
				description: 'Not Found',
				content: {
					'text/plain': {
						schema: {
							type: 'string'
						}
					}
				}
			}
		}
	})
	.http('GET', '/{build}/bash', (http) => http
		.onRequest(async(ctr) => {
			const echo = ctr.queries.get('echo', 'true') === 'true',
				buildParam = ctr.params.get('build', '')

			const int = isNaN(parseInt(buildParam)) ? -1 : parseInt(buildParam),
				hashType = buildParam.length === 40 ? 'sha1'
					: buildParam.length === 56 ? 'sha224'
					: buildParam.length === 64 ? 'sha256'
					: buildParam.length === 96 ? 'sha384'
					: buildParam.length === 128 ? 'sha512'
					: buildParam.length === 32 ? 'md5'
					: null

			if (!hashType && (isNaN(int) || int < 0 || int > 2147483647)) return ctr.print([
				'#!/bin/bash',
				'',
				'echo "Build not found"',
				'exit 1'
			].filter((line) => !line.startsWith('echo') || echo).join('\n'))

			const build = await ctr["@"].cache.use(`build::${buildParam}::installation`, async() => {
				if (hashType) {
					return ctr["@"].database.select({
						id: ctr["@"].database.schema.builds.id,
						type: ctr["@"].database.schema.builds.type,
						version_id: ctr["@"].database.schema.builds.versionId,
						project_version_id: ctr["@"].database.schema.builds.projectVersionId,
						build_number: ctr["@"].database.schema.builds.buildNumber,
						java: ctr["@"].database.schema.minecraftVersions.java,
						installation: ctr["@"].database.schema.builds.installation
					})
						.from(ctr["@"].database.schema.buildHashes)
						.where(eq(ctr["@"].database.schema.buildHashes[hashType], buildParam))
						.innerJoin(ctr["@"].database.schema.builds, eq(ctr["@"].database.schema.builds.id, ctr["@"].database.schema.buildHashes.buildId))
						.leftJoin(ctr["@"].database.schema.minecraftVersions, eq(ctr["@"].database.schema.minecraftVersions.id, ctr["@"].database.schema.builds.versionId))
						.limit(1)
						.then((r) => r[0])
				} else {
					return ctr["@"].database.select({
						id: ctr["@"].database.schema.builds.id,
						type: ctr["@"].database.schema.builds.type,
						version_id: ctr["@"].database.schema.builds.versionId,
						project_version_id: ctr["@"].database.schema.builds.projectVersionId,
						build_number: ctr["@"].database.schema.builds.buildNumber,
						java: ctr["@"].database.schema.minecraftVersions.java,
						installation: ctr["@"].database.schema.builds.installation
					})
						.from(ctr["@"].database.schema.builds)
						.where(eq(ctr["@"].database.schema.builds.id, int))
						.leftJoin(ctr["@"].database.schema.minecraftVersions, eq(ctr["@"].database.schema.minecraftVersions.id, ctr["@"].database.schema.builds.versionId))
						.limit(1)
						.then((r) => r[0])
				}
			}, time(6).h())

			if (!build) return ctr.print([
				'#!/bin/bash',
				'',
				'echo "Build not found"',
				'exit 1'
			].filter((line) => !line.startsWith('echo') || echo).join('\n'))

			ctr["@"].data.type = 'script'
			ctr["@"].data.build = {
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

			return ctr.print([
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
	)
	.http('GET', '/{build}/powershell', (http) => http
		.onRequest(async(ctr) => {
			const echo = ctr.queries.get('echo', 'true') === 'true',
				buildParam = ctr.params.get('build', '')

			const int = isNaN(parseInt(buildParam)) ? -1 : parseInt(buildParam),
				hashType = buildParam.length === 40 ? 'sha1'
					: buildParam.length === 56 ? 'sha224'
					: buildParam.length === 64 ? 'sha256'
					: buildParam.length === 96 ? 'sha384'
					: buildParam.length === 128 ? 'sha512'
					: buildParam.length === 32 ? 'md5'
					: null

			if (!hashType && (isNaN(int) || int < 0 || int > 2147483647)) return ctr.print([
				'Write-Host "Build not found"',
				'exit 1'
			].filter((line) => !line.startsWith('Write-Host') || echo).join('\n'))

			const build = await ctr["@"].cache.use(`build::${buildParam}::installation`, async() => {
				if (hashType) {
					return ctr["@"].database.select({
						id: ctr["@"].database.schema.builds.id,
						type: ctr["@"].database.schema.builds.type,
						version_id: ctr["@"].database.schema.builds.versionId,
						project_version_id: ctr["@"].database.schema.builds.projectVersionId,
						build_number: ctr["@"].database.schema.builds.buildNumber,
						java: ctr["@"].database.schema.minecraftVersions.java,
						installation: ctr["@"].database.schema.builds.installation
					})
						.from(ctr["@"].database.schema.buildHashes)
						.where(eq(ctr["@"].database.schema.buildHashes[hashType], buildParam))
						.innerJoin(ctr["@"].database.schema.builds, eq(ctr["@"].database.schema.builds.id, ctr["@"].database.schema.buildHashes.buildId))
						.leftJoin(ctr["@"].database.schema.minecraftVersions, eq(ctr["@"].database.schema.minecraftVersions.id, ctr["@"].database.schema.builds.versionId))
						.limit(1)
						.then((r) => r[0])
				} else {
					return ctr["@"].database.select({
						id: ctr["@"].database.schema.builds.id,
						type: ctr["@"].database.schema.builds.type,
						version_id: ctr["@"].database.schema.builds.versionId,
						project_version_id: ctr["@"].database.schema.builds.projectVersionId,
						build_number: ctr["@"].database.schema.builds.buildNumber,
						java: ctr["@"].database.schema.minecraftVersions.java,
						installation: ctr["@"].database.schema.builds.installation
					})
						.from(ctr["@"].database.schema.builds)
						.where(eq(ctr["@"].database.schema.builds.id, int))
						.leftJoin(ctr["@"].database.schema.minecraftVersions, eq(ctr["@"].database.schema.minecraftVersions.id, ctr["@"].database.schema.builds.versionId))
						.limit(1)
						.then((r) => r[0])
				}
			}, time(6).h())

			if (!build) return ctr.print([
				'Write-Host "Build not found"',
				'exit 1'
			].filter((line) => !line.startsWith('Write-Host') || echo).join('\n'))

			ctr["@"].data.type = 'script'
			ctr["@"].data.build = {
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

			return ctr.print([
				'Write-Host "Installing Server"',
				`$env:JAVA_VERSION = ${build.java ?? 21}`,
				...steps,
				'',
				'Write-Host "Installation complete"',
				`Write-Host "Use Java version: ${build.java ?? 21}"`,
				'exit 0'
			].filter((line) => !line.startsWith('Write-Host') || echo).join('\n'))
		})
	)