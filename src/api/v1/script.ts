import { time } from "@rjweb/utils"
import { GlobalRouter } from "../.."
import path from "path"
import { eq } from "drizzle-orm"

export default function(router: GlobalRouter) {
	router.get('/api/v1/script/:build/bash', async({ req }) => {
		const build = await req.cache.use(`build::${req.params.build}`, () => req.database.build(req.params.build), time(3).h()),
			echo = !(req.query.echo === 'false')

		if (!build) return new Response([
			'#!/bin/bash',
			'',
			'echo "Build not found"',
			'exit 1'
		].filter((line) => !line.startsWith('echo') || echo).join('\n'))

		const { java } = build.versionId ? await req.cache.use(`version::${build.versionId}`, () => req.database.select()
				.from(req.database.schema.minecraftVersions)
				.where(eq(req.database.schema.minecraftVersions.id, build.versionId!))
				.get(),
			time(3).h()
		) ?? { java: 21 } : { java: 21 }

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
			`export JAVA_VERSION=${java}`,
			'',
			'echo "Installing Server"',
			...steps,
			'',
			'echo "Installation complete"',
			`echo "Use Java version: ${java}"`,
			'exit 0'
		].filter((line) => !line.startsWith('echo') || echo).join('\n'))
	})

	router.get('/api/v1/script/:build/powershell', async({ req }) => {
		const build = await req.cache.use(`build::${req.params.build}`, () => req.database.build(req.params.build), time(3).h()),
			echo = !(req.query.echo === 'false')

		if (!build) return new Response([
			'Write-Host "Build not found"',
			'exit 1'
		].filter((line) => !line.startsWith('Write-Host') || echo).join('\n'))

		const { java } = build.versionId ? await req.cache.use(`version::${build.versionId}`, () => req.database.select()
				.from(req.database.schema.minecraftVersions)
				.where(eq(req.database.schema.minecraftVersions.id, build.versionId!))
				.get(),
			time(3).h()
		) ?? { java: 21 } : { java: 21 }

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
			`$env:JAVA_VERSION = ${java}`,
			...steps,
			'',
			'Write-Host "Installation complete"',
			`Write-Host "Use Java version: ${java}"`,
			'exit 0'
		].filter((line) => !line.startsWith('Write-Host') || echo).join('\n'))
	})
}