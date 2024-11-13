import { filesystem } from "@rjweb/utils"
import { z } from "zod"

let env: Record<string, string | undefined>
try {
	env = filesystem.env('../.env', { async: false })
} catch {
	try {
		env = filesystem.env('../../.env', { async: false })
	} catch {
		env = process.env
	}
}

const infos = z.object({
	REDIS_URL: z.string(),
	SENTRY_URL: z.string().optional(),
	DATABASE_URL: z.string(),

	PORT: z.string().transform((str) => parseInt(str)).optional(),
	S3_URL: z.string(),

	CLUSTER_MAIN: z.union([ z.literal('true'), z.literal('false') ]).transform((str) => str === 'true'),
	CLUSTER_REMOTE: z.string().optional(),
	CLUSTER_TOKEN: z.string().optional(),

	LOG_LEVEL: z.union([ z.literal('none'), z.literal('info'), z.literal('debug') ]),
	LOG_DIRECTORY: z.string().optional(),

	APP_URL: z.string()
})

export type Environment = z.infer<typeof infos>

export default infos.parse(env)