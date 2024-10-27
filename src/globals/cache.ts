class Cache {
	constructor(private kv: KVNamespace) {}

	async use<Data extends any>(key: string, fetcher: () => Promise<Data>, time?: number): Promise<Data> {
		const value = await this.kv.get(key, 'text')
		if (value) return JSON.parse(value === 'undefined' ? 'null' : value)

		const data = await fetcher()

		await this.kv.put(key, JSON.stringify(data), {
			expirationTtl: time && Math.floor(time / 1000)
		})

		return data
	}

	async get<Data extends any = unknown>(key: string): Promise<Data | null> {
		const value = await this.kv.get(key, 'text')
		return value ? JSON.parse(value === 'undefined' ? 'null' : value) : null
	}

	async set(key: string, data: any, time?: number) {
		await this.kv.put(key, JSON.stringify(data), {
			expirationTtl: time && Math.floor(time / 1000)
		})
	}

	delete(key: string) {
		return this.kv.delete(key)
	}
}

export default function cache(env: Env) {
	return new Cache(env.KV)
}