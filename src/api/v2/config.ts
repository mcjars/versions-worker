import { object, time } from "@rjweb/utils"
import { GlobalRouter } from "../.."
import { z } from "zod"

export default function(router: GlobalRouter) {
	router.post('/api/v2/config', async({ req }) => {
		const data = z.object({
			file: z.string(),
			config: z.string().transform((str) => str.replaceAll('\\n', '\n'))
		}).safeParse(await req.json().catch(() => null))

		const fields = Array.from(new Set((req.query.fields ?? '')
			.split(',')
			.filter((field) => field.length > 0)
		)) as 'id'[]

		if (!data.success) return Response.json({ success: false, errors: data.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`) }, { status: 400 })

		const formatted = req.database.formatConfig(data.data.file, data.data.config)

		const valueMatches = await req.cache.use(`config::${formatted}`, () => req.database.searchConfig(
			data.data.file, formatted,
			data.data.file.endsWith('.properties')
				? 'PROPERTIES' : data.data.file.endsWith('.toml')
					? 'TOML' : data.data.file.endsWith('.conf')
						? 'CONF' : 'YAML',
			3
		), time(10).m())

		return Response.json({
			success: true,
			formatted,
			configs: valueMatches.map((match) => ({
				from: match.configs.type,
				value: match.configValues.value,
				build: fields.length > 0 ? object.pick(req.database.prepare.build(match.builds), fields) : req.database.prepare.build(match.builds)
			}))
		})
	})
}