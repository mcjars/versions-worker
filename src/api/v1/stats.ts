import { GlobalRouter } from "../.."

export default function(router: GlobalRouter) {
	router.get('/api/v1/stats', async({ req }) => {
		const stats = await req.cache.get<{
			builds: number
			hashes: number
			requests: number
			size: {
				database: number
			}

			total: {
				jarSize: number
				zipSize: number
			}
		}>('pre.stats::all')

		return Response.json({
			success: true,
			stats
		})
	})
}