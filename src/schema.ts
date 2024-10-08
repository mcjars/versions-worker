import { isNotNull, relations } from "drizzle-orm"
import { foreignKey, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

export const types = [
	'VANILLA',
	'PAPER',
	'PUFFERFISH',
	'SPIGOT',
	'FOLIA',
	'PURPUR',
	'WATERFALL',
	'VELOCITY',
	'FABRIC',
	'BUNGEECORD',
	'QUILT',
	'FORGE',
	'NEOFORGE',
	'MOHIST',
	'ARCLIGHT',
	'SPONGE',
	'LEAVES',
	'CANVAS'
] as const

export const formats = [
	'YAML',
	'CONF',
	'TOML',
	'PROPERTIES'
] as const

export type ServerType = typeof types[number]
export type Format = typeof formats[number]

export type InstallStep = {
	type: 'download'

	file: string
	url: string
	size: number
} | {
	type: 'unzip'

	file: string
	location: string
} | {
	type: 'remove'

	location: string
}

export const organizations = sqliteTable('organizations', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),

	name: text('name', { length: 255 }).notNull(),
	icon: text('icon', { length: 255 }).notNull(),
	types: text('types', { mode: 'json' }).notNull().$type<ServerType[]>()
}, (organizations) => ({
	nameIdx: index('organizations_name_idx').on(organizations.name)
}))

export const organizationKeys = sqliteTable('organizationKeys', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
	organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

	key: text('key', { length: 64 }).notNull()
}, (organizationKeys) => ({
	organizationIdx: index('organizationKeys_organization_idx').on(organizationKeys.organizationId),
	keyIdx: index('organizationKeys_key_idx').on(organizationKeys.key)
}))

export const webhooks = sqliteTable('webhooks', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
	organizationId: integer('organization_id').references(() => organizations.id, { onDelete: 'restrict' }),

	label: text('label', { length: 255 }),
	name: text('name', { length: 63 }).notNull(),
	avatar: text('avatar', { length: 255 }).notNull(),
	url: text('url', { length: 255 }).notNull(),
	types: text('types', { mode: 'json' }).$type<ServerType[]>().default([...types]).notNull(),
	enabled: integer('enabled', { mode: 'boolean' }).default(true).notNull(),
	successful: integer('successful').default(0).notNull(),
	failed: integer('failed').default(0).notNull()
}, (webhooks) => ({
	organizationIdx: index('webhooks_organization_idx').on(webhooks.organizationId).where(isNotNull(webhooks.organizationId)),
	enabledIdx: index('webhooks_enabled_idx').on(webhooks.enabled)
}))

export const requests = sqliteTable('requests', {
	id: text('id', { length: 12 }).primaryKey().notNull(),
	organizationId: integer('organization_id').references(() => organizations.id, { onDelete: 'set null' }),

	origin: text('origin', { length: 255 }),
	method: text('method', { length: 7 }).notNull(),
	path: text('path', { length: 255 }).notNull(),
	time: integer('time').notNull(),
	status: integer('status').notNull(),
	body: text('body', { mode: 'json' }),
	ip: text('ip', { length: 45 }).notNull(),
	continent: text('continent', { length: 2 }),
	country: text('country', { length: 2 }),
	data: text('data', { mode: 'json' }),
	userAgent: text('user_agent', { length: 255 }).notNull(),
	created: integer('created', { mode: 'timestamp' }).notNull()
}, (requests) => ({
	organizationIdx: index('requests_organization_idx').on(requests.organizationId).where(isNotNull(requests.organizationId)),
	ipIdx: index('requests_ip_idx').on(requests.ip),
	pathIdx: index('requests_path_idx').on(requests.path),
	continentIdx: index('requests_continent_idx').on(requests.continent).where(isNotNull(requests.continent)),
	countryIdx: index('requests_country_idx').on(requests.country).where(isNotNull(requests.country)),
	dataIdx: index('requests_data_idx').on(requests.data).where(isNotNull(requests.data)),
	createdIdx: index('requests_created_idx').on(requests.created)
}))

export const minecraftVersions = sqliteTable('minecraftVersions', {
	id: text('id', { length: 31 }).primaryKey().notNull().unique('unique_id_idx'),

	type: text('type', { enum: ['RELEASE', 'SNAPSHOT'] }).notNull(),
	supported: integer('supported', { mode: 'boolean' }).notNull(),
	java: integer('java').default(21).notNull(),

	created: integer('created', { mode: 'timestamp' }).notNull()
}, (minecraftVersions) => ({
	typeIdx: index('minecraftVersions_type_idx').on(minecraftVersions.type),
	javaIdx: index('minecraftVersions_java_idx').on(minecraftVersions.java)
}))

export const projectVersions = sqliteTable('projectVersions', {
	id: text('id', { length: 31 }).notNull(),
	type: text('type', { enum: types }).notNull()
}, (projectVersions) => ({
	pk: primaryKey({ name: 'projectVersions_pk', columns: [projectVersions.type, projectVersions.id] }),
	typeIdx: index('projectVersions_type_idx').on(projectVersions.type)
}))

export const minecraftVersionsRelations = relations(minecraftVersions, ({ many }) => ({
	builds: many(builds, { relationName: 'versions' })
}))

export const projectVersionsRelations = relations(projectVersions, ({ many }) => ({
	builds: many(builds, { relationName: 'projectVersions' })
}))

export const builds = sqliteTable('builds', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
	versionId: text('version_id', { length: 31 }).references(() => minecraftVersions.id, { onDelete: 'cascade' }),
	projectVersionId: text('project_version_id', { length: 31 }),

	type: text('type', { enum: types }).notNull(),
	rehash: integer('rehash', { mode: 'boolean' }).default(false).notNull(),
	experimental: integer('experimental', { mode: 'boolean' }).default(false).notNull(),

	buildNumber: integer('build_number').notNull(),
	jarUrl: text('jar_url', { length: 255 }),
	jarSize: integer('jar_size'),
	jarLocation: text('jar_location', { length: 51 }),
	zipUrl: text('zip_url', { length: 255 }),
	zipSize: integer('zip_size'),

	metadata: text('metadata', { mode: 'json' }).notNull(),
	installation: text('installation', { mode: 'json' }).$type<InstallStep[][]>().notNull(),
	changes: text('changes', { mode: 'json' }).$type<string[]>().notNull(),
	created: integer('created', { mode: 'timestamp' })
}, (builds) => ({
	typeIdx: index('builds_type_idx').on(builds.type),
	experimentalIdx: index('builds_experimental_idx').on(builds.experimental),
	buildNumberIdx: index('builds_build_number_idx').on(builds.buildNumber),
	jarUrlIdx: index('builds_jar_url_idx').on(builds.jarUrl),
	jarSizeIdx: index('builds_jar_size_idx').on(builds.jarSize),
	jarLocationIdx: index('builds_jar_location_idx').on(builds.jarLocation),
	zipUrlIdx: index('builds_zip_url_idx').on(builds.zipUrl),
	zipSizeIdx: index('builds_zip_size_idx').on(builds.zipSize),
	createdIdx: index('builds_created_idx').on(builds.created),
	typeVersionIdx: index('builds_type_version_idx').on(builds.type, builds.versionId),
	typeProjectVersionIdx: index('builds_type_project_version_idx').on(builds.type, builds.projectVersionId),
	versionIdx: index('builds_version_idx').on(builds.versionId),
	projectVersionIdx: index('builds_project_version_idx').on(builds.projectVersionId),
	projectVersionFk: foreignKey({
		columns: [builds.type, builds.projectVersionId],
		foreignColumns: [projectVersions.type, projectVersions.id],
		name: 'builds_project_version_fk'
	}).onDelete('cascade')
}))

export const buildsRelations = relations(builds, ({ one, many }) => ({
	version: one(minecraftVersions, {
		fields: [builds.versionId],
		references: [minecraftVersions.id],
		relationName: 'versions'
	}),

	projectVersion: one(projectVersions, {
		fields: [builds.type, builds.projectVersionId],
		references: [projectVersions.type, projectVersions.id],
		relationName: 'projectVersions'
	}),

	hashes: many(buildHashes)
}))

export const buildHashes = sqliteTable('buildHashes', {
	buildId: integer('build_id').notNull().references(() => builds.id, { onDelete: 'cascade' }),

	primary: integer('primary', { mode: 'boolean' }).notNull(),

	sha1: text('sha1', { length: 40 }).notNull(),
	sha224: text('sha224', { length: 56 }).notNull(),
	sha256: text('sha256', { length: 64 }).notNull(),
	sha384: text('sha384', { length: 96 }).notNull(),
	sha512: text('sha512', { length: 128 }).notNull(),
	md5: text('md5', { length: 32 }).notNull()
}, (hashes) => ({
	buildIdx: index('buildHashes_build_idx').on(hashes.buildId),
	primaryIdx: index('buildHashes_primary_idx').on(hashes.primary),
	sha1Idx: index('buildHashes_sha1_idx').on(hashes.sha1),
	sha224Idx: index('buildHashes_sha224_idx').on(hashes.sha224),
	sha256Idx: index('buildHashes_sha256_idx').on(hashes.sha256),
	sha384Idx: index('buildHashes_sha384_idx').on(hashes.sha384),
	sha512Idx: index('buildHashes_sha512_idx').on(hashes.sha512),
	md5Idx: index('buildHashes_md5_idx').on(hashes.md5)
}))

export const buildHashesRelations = relations(buildHashes, ({ one }) => ({
	build: one(builds, {
		fields: [buildHashes.buildId],
		references: [builds.id]
	})
}))

export const configs = sqliteTable('configs', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),

	location: text('location', { length: 51 }).unique().notNull(),
	type: text('type', { enum: types }).notNull(),
	format: text('format', { enum: formats }).notNull()
}, (configs) => ({
	typeIdx: index('configs_type_idx').on(configs.type),
	formatIdx: index('configs_format_idx').on(configs.format),
	uniqueLocationIdx: uniqueIndex('configs_unique_location_idx').on(configs.location)
}))

export const configValues = sqliteTable('configValues', {
	id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
	configId: integer('config_id').notNull().references(() => configs.id, { onDelete: 'cascade' }),

	sha1: text('sha1', { length: 40 }).notNull(),
	sha224: text('sha224', { length: 56 }).notNull(),
	sha256: text('sha256', { length: 64 }).notNull(),
	sha384: text('sha384', { length: 96 }).notNull(),
	sha512: text('sha512', { length: 128 }).notNull(),
	md5: text('md5', { length: 32 }).notNull(),

	value: text('value').notNull()
}, (configValues) => ({
	configIdx: index('configValues_config_idx').on(configValues.configId),
	valueIdx: index('configValues_value_idx').on(configValues.value),
	uniqueConfigValueIdx: uniqueIndex('configValues_unique_config_value_idx').on(configValues.configId, configValues.sha1, configValues.sha224, configValues.sha256, configValues.sha384, configValues.sha512, configValues.md5)
}))

export const buildConfigs = sqliteTable('buildConfigs', {
	buildId: integer('build_id').notNull().references(() => builds.id, { onDelete: 'cascade' }),
	configId: integer('config_id').notNull().references(() => configs.id, { onDelete: 'cascade' }),
	configValueId: integer('config_value_id').notNull().references(() => configValues.id, { onDelete: 'cascade' })
}, (buildConfigs) => ({
	pk: primaryKey({ name: 'buildConfigs_pk', columns: [buildConfigs.buildId, buildConfigs.configId] }),
	buildIdx: index('buildConfigs_build_idx').on(buildConfigs.buildId),
	configIdx: index('buildConfigs_config_idx').on(buildConfigs.configId),
	configValueIdx: index('buildConfigs_config_value_idx').on(buildConfigs.configValueId)
}))