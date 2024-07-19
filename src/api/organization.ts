import { object, time } from "@rjweb/utils"
import { GlobalRouter } from ".."
import { and, count, eq, isNotNull } from "drizzle-orm"

async function validateOrganization(req: Parameters<Parameters<GlobalRouter['any']>[1]>[0]['req']) {
	if (!req.headers.has('authorization')) {
		return Response.json({ success: false, errors: ['Missing Authorization header'] }, { status: 401 })
	}

	if (req.headers.get('authorization')?.length !== 64) {
		return Response.json({ success: false, errors: ['Invalid Authorization header'] }, { status: 401 })
	}

	const organization = await req.cache.use(`organization::$${req.headers.get('authorization')}`, () => req.database.select()
			.from(req.database.schema.organizations)
			.innerJoin(req.database.schema.organizationKeys, eq(req.database.schema.organizationKeys.organizationId, req.database.schema.organizations.id))
			.where(eq(req.database.schema.organizationKeys.key, req.headers.get('authorization')!))
			.limit(1)
			.get().then((organization) => organization?.organizations ?? null),
		time(5).m()
	)

	if (!organization) {
		return Response.json({ success: false, errors: ['Invalid Authorization header'] }, { status: 401 })
	}

	return organization
}

export default function(router: GlobalRouter) {
	router.get('/api/organization/v1/stats', async({ req }) => {
		const organization = await validateOrganization(req)
		if (organization instanceof Response) return organization

		const [ requests, userAgents, origins ] = await req.cache.use(`organization::${organization.id}::stats`, () => Promise.all([
				req.database.select({
					requests: count(req.database.schema.requests.id)
				})
					.from(req.database.schema.requests)
					.where(eq(req.database.schema.requests.organizationId, organization.id))
					.get(),
				req.database.select({
					userAgent: req.database.schema.requests.userAgent,
				})
					.from(req.database.schema.requests)
					.where(eq(req.database.schema.requests.organizationId, organization.id))
					.groupBy(req.database.schema.requests.userAgent)
					.all().then((userAgents) => userAgents.map((userAgent) => userAgent.userAgent)),
				req.database.select({
					origin: req.database.schema.requests.origin,
				})
					.from(req.database.schema.requests)
					.where(and(
						eq(req.database.schema.requests.organizationId, organization.id),
						isNotNull(req.database.schema.requests.origin)
					))
					.groupBy(req.database.schema.requests.origin)
					.all().then((origins) => origins.map((origin) => origin.origin))
			]),
			time(5).m()
		)

		return Response.json({
			success: true,
			infos: {
				icon: organization.icon,
				name: organization.name,
				types: organization.types
			}, stats: {
				requests: requests?.requests ?? 0,
				userAgents: userAgents,
				origins: origins
			}
		})
	})

	router.get('/api/organization/v1/types', async({ req }) => {
		const organization = await validateOrganization(req)
		if (organization instanceof Response) return organization

		return Response.json({
			success: true,
			types: object.pick(await req.database.types(), organization.types)
		})
	})

	router.patch('/api/organization/v1/types', async({ req }) => {
		const organization = await validateOrganization(req)
		if (organization instanceof Response) return organization

		const data = await req.json()
		if (!data || typeof data !== 'object' || !('types' in data) || !Array.isArray(data.types)) {
			return Response.json({ success: false, errors: ['Invalid body'] }, { status: 400 })
		}

		const types = new Set(data.types.filter((type) => req.database.schema.types.includes(type)))

		await req.database.update(req.database.schema.organizations)
			.set({
				types: Array.from(types)
			})
			.where(eq(req.database.schema.organizations.id, organization.id))
			.run()

		return Response.json({ success: true })
	})
}