class Cache {
	constructor(private kv: KVNamespace) {}

	async use<Data extends any>(key: string, fetcher: () => Promise<Data>, time: number): Promise<Data> {
		const value = await this.kv.get(key, 'json')
		if (value) return value as Data

		const data = await fetcher()

		await this.kv.put(key, JSON.stringify(data), {
			expirationTtl: time && Math.floor(time / 1000)
		})

		return data
	}

	delete(key: string) {
		return this.kv.delete(key)
	}
}

export default function cache(env: Env) {
	return new Cache(env.KV)
}