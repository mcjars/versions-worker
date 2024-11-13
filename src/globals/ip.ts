import getVersion from "@/index"

export type Lookup = {
	continent: string
	country: string
	query: string
}

const ver = getVersion()

export async function lookup(ips: string[]): Promise<Lookup[]> {
	const data = await fetch('http://ip-api.com/batch', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': `Minecraft Version Worker/${ver} https://mcjars.app |-> me@rjns.dev`
		}, body: JSON.stringify(ips.map((ip) => ({
			query: ip,
			fields: 'continentCode,countryCode,query'
		})))
	})

	if (!data.ok) throw new Error(await data.text())

	return data.json().then((json) => json.map((entry: { continentCode: string, countryCode: string }) => ({
		continent: entry.continentCode,
		country: entry.countryCode
	})))
}