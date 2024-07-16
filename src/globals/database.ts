import { drizzle } from "drizzle-orm/d1"
import * as schema from "../schema"
import { time } from "@rjweb/utils"
import { and, asc, count, countDistinct, eq, like, max, min, sql } from "drizzle-orm"
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

export type RawBuild = {
	id: number
	type: schema.ServerType

	version_id: string | null
	project_version_id: string | null
	build_number: number
	experimental: number

	jar_url: string | null
	jar_size: number | null
	jar_location: string | null
	zip_url: string | null
	zip_size: number | null
	
	installation: string
	changes: string

	created: number
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
			},

			rawBuild<Data extends RawBuild>(build: Data): Data extends null ? null : Data extends undefined ? null : Data {
				if (!build) return null as any

				return {
					id: build.id,
					type: build.type,

					versionId: build.version_id,
					projectVersionId: build.project_version_id,
					buildNumber: build.build_number,
					experimental: build.experimental,

					jarUrl: build.jar_url,
					jarSize: build.jar_size,
					jarLocation: build.jar_location,
					zipUrl: build.zip_url,
					zipSize: build.zip_size,

					installation: JSON.parse(build.installation),
					changes: JSON.parse(build.changes),

					created: build.created,
				} as any
			}
		},

		fields: {
			build: {
				id: schema.builds.id,
				type: schema.builds.type,

				versionId: schema.builds.versionId,
				projectVersionId: schema.builds.projectVersionId,
				buildNumber: schema.builds.buildNumber,
				experimental: schema.builds.experimental,

				jarUrl: schema.builds.jarUrl,
				jarSize: schema.builds.jarSize,
				jarLocation: schema.builds.jarLocation,
				zipUrl: schema.builds.zipUrl,
				zipSize: schema.builds.zipSize,

				installation: schema.builds.installation,
				changes: schema.builds.changes,

				created: schema.builds.created
			} as const
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
					.limit(1)
					.get(),
				db.select({
					_: sql`1`
				})
					.from(schema.projectVersions)
					.where(and(
						eq(schema.projectVersions.type, type),
						eq(schema.projectVersions.id, version)
					))
					.limit(1)
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
							.limit(1)
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
							.limit(1)
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
							.limit(1)
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
					builds: count(),
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