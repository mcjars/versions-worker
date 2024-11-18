import database from "@/globals/database"
import logger from "@/globals/logger"
import { network, string, time } from "@rjweb/utils"
import { JSONParsed } from "rjweb-server"
import * as schema from "@/schema"
import { lookup } from "@/globals/ip"

export type Request = {
	id: string
	organizationId: number | null

	origin: string
	method: schema.Method
	path: string
	time: number
	status: number
	body: Record<string, any> | null
	ip: string
	continent: string | null
	country: string | null
	data: Record<string, any> | null
	userAgent: string
	created: Date
}

const pending: Request[] = [],
	processing: Request[] = []

/**
 * Log a new request
 * @since 1.18.0
*/ export function log(method: schema.Method, route: string | RegExp, body: JSONParsed | null, ip: network.IPAddress, origin: string, userAgent: string, organization: number | null, data: Record<string, any> | null): Request {
	const request: Request = {
		id: string.generate({ length: 12 }),
		organizationId: organization ?? null,

		origin,
		method,
		path: typeof route === 'string' ? route : route.source,
		time: 0,
		status: 0,
		body: typeof body === 'object' ? body : null,
		ip: ip.usual(),
		continent: null,
		country: null,
		data,
		userAgent,
		created: new Date()
	}

	pending.push(request)

	return request
}

/**
 * Finish a request
 * @since 1.18.0
*/ export function finish(request: Request, status: number, ms: number): void {
	request.status = status
	request.time = Math.round(ms)

	pending.splice(pending.indexOf(request), 1)
	processing.push(request)
}

const process = async(): Promise<void> => {
	const requests = processing.splice(0, 30)
	if (!requests.length) return

	try {
		const ips = await lookup(requests.map((r) => r.ip)).catch(() => null)

		for (const request of requests) {
			const ip = ips?.find((ip) => ip.query === request.ip)
			if (ip) {
				request.continent = ip.continent
				request.country = ip.country
			}
		}

		await database.write.insert(schema.requests)
			.values(requests).catch(() => null)
	} catch (err) {
		processing.push(...requests)
		throw err
	}

	logger()
		.text('Processed')
		.text(requests.length, (c) => c.cyan)
		.text('requests')
		.info()
}

setInterval(() => {
	process()
		.catch((err: unknown) => {
			logger()
				.text('Failed to process requests', (c) => c.red)
				.text('\n')
				.text(String(err && typeof err === 'object' && 'stack' in err ? err.stack : err), (c) => c.red)
				.error()
		})
}, time(5).s())