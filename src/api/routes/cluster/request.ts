import { clusterAPIRouter } from "@/api"
import { methodEnum } from "@/schema"
import { z } from "zod"

export = new clusterAPIRouter.Path('/')
	.http('POST', '/', (http) => http
		.onRequest(async(ctr) => {
			const data = z.object({
				requests: z.object({
					id: z.string(),
					organizationId: z.number().nullable(),

					origin: z.string(),
					method: z.enum(methodEnum.enumValues),
					path: z.string(),
					time: z.number(),
					status: z.number(),
					body: z.record(z.any()).nullable(),
					ip: z.string(),
					continent: z.string().nullable(),
					country: z.string().nullable(),
					data: z.record(z.any()).nullable(),
					userAgent: z.string(),
					created: z.string().datetime().transform((date) => new Date(date))
				}).array()
			}).safeParse(await ctr.$body().json().catch(() => null))

			if (!data.success) return ctr.status(ctr.$status.BAD_REQUEST).print({ success: false, errors: data.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`) })

			await ctr["@"].database.insert(ctr["@"].database.schema.requests)
				.values(data.data.requests)

			return ctr.print({ success: true })
		})
	)