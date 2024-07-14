import { drizzle } from "drizzle-orm/d1"
import * as schema from "../schema"
import { number, time } from "@rjweb/utils"
import { and, countDistinct, eq, sql } from "drizzle-orm"
import cache from "./cache"

const compatibility = [
	'spigot', 'paper', 'folia', 'purpur',
	'fabric', 'forge', 'neoforge', 'bungeecord',
	'velocity', 'quilt', 'sponge'
] as const

const extraTypeInfos: Record<schema.ServerType, {
	name: string
	homepage: string
	deprecated: boolean
	experimental: boolean
	description: string
	categories: ('modded' | 'plugins' | 'proxy')[]
	compatibility: typeof compatibility[number][]
}> = {
	VANILLA: {
		name: 'Vanilla',
		homepage: 'https://minecraft.net/en-us/download/server',
		deprecated: false,
		experimental: false,
		description: 'The official Minecraft server software.',
		categories: [],
		compatibility: []
	}, PAPER: {
		name: 'Paper',
		homepage: 'https://papermc.io/software/paper',
		deprecated: false,
		experimental: false,
		description: 'A high performance fork of the Spigot Minecraft Server.',
		categories: ['plugins'],
		compatibility: ['spigot', 'paper']
	}, PUFFERFISH: {
		name: 'Pufferfish',
		homepage: 'https://pufferfish.host/downloads',
		deprecated: false,
		experimental: false,
		description: 'A fork of Paper that aims to be even more performant.',
		categories: ['plugins'],
		compatibility: ['spigot', 'paper']
	}, FOLIA: {
		name: 'Folia',
		homepage: 'https://papermc.io/software/folia',
		deprecated: false,
		experimental: true,
		description: 'A fork of Paper that uses regional multithreading for high player counts.',
		categories: ['plugins'],
		compatibility: ['folia']
	}, PURPUR: {
		name: 'Purpur',
		homepage: 'https://purpurmc.org',
		deprecated: false,
		experimental: false,
		description: 'A fork of Paper that aims to be more feature rich, adding patches from pufferfish too.',
		categories: ['plugins'],
		compatibility: ['spigot', 'paper', 'purpur']
	}, WATERFALL: {
		name: 'Waterfall',
		homepage: 'https://papermc.io/software/waterfall',
		deprecated: true,
		experimental: false,
		description: 'A fork of BungeeCord that aims to be more performant.',
		categories: ['plugins', 'proxy'],
		compatibility: ['bungeecord']
	}, VELOCITY: {
		name: 'Velocity',
		homepage: 'https://papermc.io/software/velocity',
		deprecated: false,
		experimental: false,
		description: 'A modern, high performance, extensible proxy server alternative for waterfall.',
		categories: ['plugins', 'proxy'],
		compatibility: ['velocity']
	}, FABRIC: {
		name: 'Fabric',
		homepage: 'https://fabricmc.net',
		deprecated: false,
		experimental: false,
		description: 'A lightweight and modular Minecraft server software.',
		categories: ['modded'],
		compatibility: ['fabric']
	}, BUNGEECORD: {
		name: 'BungeeCord',
		homepage: 'https://www.spigotmc.org/wiki/bungeecord-installation',
		deprecated: false,
		experimental: false,
		description: 'A proxy server software for Minecraft.',
		categories: ['plugins', 'proxy'],
		compatibility: ['bungeecord']
	}, QUILT: {
		name: 'Quilt',
		homepage: 'https://quiltmc.org',
		deprecated: false,
		experimental: true,
		description: 'A fork of Fabric that aims to be more feature rich and have easier apis.',
		categories: ['modded'],
		compatibility: ['fabric', 'quilt']
	}, FORGE: {
		name: 'Forge',
		homepage: 'https://files.minecraftforge.net/net/minecraftforge/forge',
		deprecated: false,
		experimental: false,
		description: 'The original Minecraft modding platform.',
		categories: ['modded'],
		compatibility: ['forge']
	}, NEOFORGE: {
		name: 'NeoForge',
		homepage: 'https://neoforged.net',
		deprecated: false,
		experimental: false,
		description: 'A cousin of Forge that aims to be more performant and have better modding apis.',
		categories: ['modded'],
		compatibility: ['forge', 'neoforge']
	}, MOHIST: {
		name: 'Mohist',
		homepage: 'https://mohistmc.com/software/mohist',
		deprecated: false,
		experimental: false,
		description: 'A variation of forge/neoforge that allows loading spigot plugins next to mods.',
		categories: ['modded', 'plugins'],
		compatibility: ['forge', 'spigot', 'paper']
	}, ARCLIGHT: {
		name: 'Arclight',
		homepage: 'https://github.com/IzzelAliz/Arclight',
		deprecated: false,
		experimental: false,
		description: 'A Bukkit server implementation utilizing Mixins for modding support.',
		categories: ['modded', 'plugins'],
		compatibility: ['fabric', 'spigot', 'forge', 'neoforge']
	}, SPONGE: {
		name: 'Sponge',
		homepage: 'https://www.spongepowered.org',
		deprecated: false,
		experimental: false,
		description: 'A modding platform for Minecraft.',
		categories: ['modded'],
		compatibility: ['sponge']
	}, LEAVES: {
		name: 'Leaves',
		homepage: 'https://leavesmc.org/software/leaves',
		deprecated: false,
		experimental: false,
		description: 'A fork of paper that aims to restore vanilla behavior and add new features.',
		categories: ['plugins'],
		compatibility: ['spigot', 'paper']
	}
}

export default function database(env: Env) {
	const db = drizzle(env.DB, { schema })

	return Object.assign(db, {
		schema,

		prepare: {
			build<Data extends Record<string, any> | null | undefined>(raw: Data): Data extends null ? null : Data extends undefined ? null : Data {
				if (!raw) return null as any

				return {
					id: raw.id,
					type: raw.type,

					versionId: raw.versionId,
					projectVersionId: raw.projectVersionId,
					buildNumber: raw.buildNumber,
					experimental: raw.experimental,

					jarUrl: raw.jarUrl,
					jarSize: raw.jarSize,
					jarLocation: raw.jarLocation,
					zipUrl: raw.zipUrl,
					zipSize: raw.zipSize,

					installation: raw.installation,
					changes: raw.changes,

					created: raw.created,
				} as any
			}
		},

		async build(build: string) {
			build = build.trim()

			const int = isNaN(parseInt(build)) ? -1 : parseInt(build),
				hashType = build.length === 40 ? 'sha1'
					: build.length === 56 ? 'sha224'
					: build.length === 64 ? 'sha256'
					: build.length === 96 ? 'sha384'
					: build.length === 128 ? 'sha512'
					: build.length === 32 ? 'md5'
					: null
	
			if (hashType && build.match(/^[a-f0-9]+$/)) {
				return this.prepare.build(await db.select()
					.from(schema.builds)
					.innerJoin(schema.buildHashes, eq(schema.builds.id, schema.buildHashes.buildId))
					.where(eq(schema.buildHashes[hashType], build))
					.get().then((data) => data?.builds)
				)
			} else if (int && int > 0 && int < 2147483647) {
				return this.prepare.build(await db.select()
					.from(schema.builds)
					.where(eq(schema.builds.id, int))
					.get()
				)
			}

			return null
		},
	
		async version(version: string, type: schema.ServerType): Promise<'minecraft' | 'project' | null> {
			const [ minecraft, project ] = await cache(env).use(`versionLocation::${version}::${type}`, () => Promise.all([
				db.select({
					_: sql`1`
				})
					.from(schema.minecraftVersions)
					.where(eq(schema.minecraftVersions.id, version))
					.get(),
				db.select({
					_: sql`1`
				})
					.from(schema.projectVersions)
					.where(and(
						eq(schema.projectVersions.type, type),
						eq(schema.projectVersions.id, version)
					))
					.get()
			]), time(30).m())
	
			return minecraft ? 'minecraft' : project ? 'project' : null
		},
	
		async types() {
			const response = await cache(env).use('types::all', async() => {
				const data = await db.select({
					type: schema.builds.type,
					builds: countDistinct(schema.builds.id),
					versionsMinecraft: countDistinct(schema.builds.versionId),
					versionsProject: countDistinct(schema.builds.projectVersionId)
				})
					.from(schema.builds)
					.groupBy(schema.builds.type)
					.all()
		
				return Object.fromEntries(schema.types.map((type) => [
					type,
					{
						...extraTypeInfos[type],
						icon: `${env.S3_URL}/icons/${type.toLowerCase()}.png`,
						builds: data.find((d) => d.type === type)?.builds ?? 0,
						versions: {
							minecraft: data.find((d) => d.type === type)?.versionsMinecraft ?? 0,
							project: data.find((d) => d.type === type)?.versionsProject ?? 0
						}
					}
				]))
			}, time(30).m())
	
			return response
		}
	})
}