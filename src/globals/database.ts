import { drizzle } from "drizzle-orm/d1"
import * as schema from "../schema"
import { number, time } from "@rjweb/utils"
import { and, asc, count, countDistinct, desc, eq, like, max, min, sql } from "drizzle-orm"
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
					.from(schema.buildHashes)
					.where(eq(schema.buildHashes[hashType], build))
					.innerJoin(schema.builds, eq(schema.builds.id, schema.buildHashes.buildId))
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

		async versions(type: schema.ServerType) {
			switch (type) {
				case "VELOCITY": {
					const versions = await cache(env).use('builds::VELOCITY', async() => {
						const versions = await db.select()
							.from(
								db.select({
									builds: count(schema.builds.id).as('builds'),
									latest: max(schema.builds.id).as('latest'),
									createdOldest: min(schema.builds.created).as('createdOldest'),
									projectVersionId: schema.projectVersions.id
								})
									.from(schema.projectVersions)
									.innerJoin(schema.builds, and(
										eq(schema.builds.projectVersionId, schema.projectVersions.id),
										eq(schema.builds.type, type)
									))
									.groupBy(schema.projectVersions.id)
									.as('x')
							)
							.innerJoin(schema.builds, eq(schema.builds.id, sql`x.latest`))
							.all()
	
						return Object.fromEntries(versions.map((version, i) => [
							version.x.projectVersionId,
							{
								type: 'RELEASE',
								supported: i === versions.length - 1,
								java: 21,
								created: version.x.createdOldest,
								builds: Number(version.x.builds),
								latest: this.prepare.build(version.builds)
							}
						]))
					}, time(30).m())
	
					return versions
				}
	
				default: {
					const versions = await cache(env).use(`builds::${type}`, async() => {
						const versions = await db.select()
							.from(
								db.select({
									java: schema.minecraftVersions.java,
									created: schema.minecraftVersions.created,
									supported: schema.minecraftVersions.supported,
									versionType: schema.minecraftVersions.type,
									builds: count(schema.builds.id).as('builds'),
									latest: max(schema.builds.id).as('latest')
								})
									.from(schema.minecraftVersions)
									.innerJoin(schema.builds, and(
										eq(schema.builds.versionId, schema.minecraftVersions.id),
										eq(schema.builds.type, type)
									))
									.groupBy(
										schema.minecraftVersions.id,
										schema.minecraftVersions.created,
										schema.minecraftVersions.supported,
										schema.minecraftVersions.java,
										schema.minecraftVersions.type
									)
									.orderBy(asc(schema.minecraftVersions.created))
									.as('x')
							)
							.innerJoin(schema.builds, eq(schema.builds.id, sql`x.latest`))
							.all()
	
						return Object.fromEntries(versions.map((version) => [
							version.builds.versionId!,
							{
								type: version.x.versionType,
								supported: version.x.supported,
								java: version.x.java,
								created: version.x.created,
								builds: Number(version.x.builds),
								latest: this.prepare.build(version.builds)
							}
						]))
					}, time(30).m())
	
					return versions
				}
			}
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

		async buildLatest(build: { type: schema.ServerType, versionId: string | null, projectVersionId: string | null }) {
			return cache(env).use(`latest::build::${build.type}::${build.type === 'VELOCITY' ? build.projectVersionId : build.versionId}::${build.type === 'ARCLIGHT' ? build.projectVersionId?.split('-').at(-1) : '<>'}`, async() => {
				switch (build.type) {
					case "VELOCITY": {
						if (!build.projectVersionId) return [null, null]

						const data = await db.select()
							.from(
								db.select({
									builds: count(schema.builds.id).as('builds'),
									latest: max(schema.builds.id).as('latest')
								})
									.from(schema.projectVersions)
									.where(eq(schema.projectVersions.id, build.projectVersionId))
									.innerJoin(schema.builds, and(
										eq(schema.builds.projectVersionId, schema.projectVersions.id),
										eq(schema.builds.type, build.type)
									))
									.as('x')
							)
							.innerJoin(schema.builds, eq(schema.builds.id, sql`x.latest`))
							.get()

						return [
							this.prepare.build(data?.builds),
							data && {
								id: build.projectVersionId,
								builds: data.x.builds
							}
						]
					}

					case "ARCLIGHT": {
						if (!build.versionId || !build.projectVersionId) return [null, null]

						const data = await db.select()
							.from(
								db.select({
									java: schema.minecraftVersions.java,
									created: schema.minecraftVersions.created,
									supported: schema.minecraftVersions.supported,
									versionType: schema.minecraftVersions.type,
									builds: count(schema.builds.id).as('builds'),
									latest: max(schema.builds.id).as('latest')
								})
									.from(schema.minecraftVersions)
									.where(eq(schema.minecraftVersions.id, build.versionId))
									.innerJoin(schema.builds, and(
										eq(schema.builds.versionId, schema.minecraftVersions.id),
										eq(schema.builds.type, build.type),
										like(schema.builds.projectVersionId, `%${build.projectVersionId.includes('fabric')
											? '-fabric' : build.projectVersionId.includes('forge')
												? '-forge' : '-neoforge'}%`)
									))
									.as('x')
							)
							.innerJoin(schema.builds, eq(schema.builds.id, sql`x.latest`))
							.get()

						return [
							this.prepare.build(data?.builds),
							data && {
								id: build.versionId,
								type: data.x.versionType,
								java: data.x.java,
								supported: data.x.supported,
								created: data.x.created,
								builds: data.x.builds
							}
						]
					}

					default: {
						if (!build.versionId) return [null, null]

						const data = await db.select()
							.from(
								db.select({
									java: schema.minecraftVersions.java,
									created: schema.minecraftVersions.created,
									supported: schema.minecraftVersions.supported,
									versionType: schema.minecraftVersions.type,
									builds: count(schema.builds.id).as('builds'),
									latest: max(schema.builds.id).as('latest')
								})
									.from(schema.minecraftVersions)
									.where(eq(schema.minecraftVersions.id, build.versionId))
									.innerJoin(schema.builds, and(
										eq(schema.builds.versionId, schema.minecraftVersions.id),
										eq(schema.builds.type, build.type)
									))
									.as('x')
							)
							.innerJoin(schema.builds, eq(schema.builds.id, sql`x.latest`))
							.get()

						return [
							this.prepare.build(data?.builds),
							data && {
								id: build.versionId,
								type: data.x.versionType,
								java: data.x.java,
								supported: data.x.supported,
								created: data.x.created,
								builds: data.x.builds
							}
						]
					}
				}
			}, time(5).m())
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