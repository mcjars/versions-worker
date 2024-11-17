import { isNotNull, relations, sql } from "drizzle-orm"
import { foreignKey, index, integer, primaryKey, pgTable, varchar, uniqueIndex, pgEnum, serial, jsonb, char, boolean, smallint, timestamp, inet, text } from "drizzle-orm/pg-core"

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

export const typesEnum = pgEnum('server_type', types),
	versionTypeEnum = pgEnum('version_type', ['RELEASE', 'SNAPSHOT']),
	formatsEnum = pgEnum('format', formats),
	methodEnum = pgEnum('method', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])

export type ServerType = typeof types[number]
export type Format = typeof formats[number]
export type Method = typeof methodEnum['enumValues'][number]

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

export const organizations = pgTable('organizations', {
	id: serial('id').primaryKey().notNull(),
	ownerId: integer('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }).default(1),

	name: varchar('name', { length: 255 }).notNull(),
	icon: varchar('icon', { length: 255 }),
	types: jsonb('types').notNull().$type<ServerType[]>(),

	created: timestamp('created').default(sql`now()`).notNull()
}, (organizations) => ({
	nameIdx: index('organizations_name_idx').on(organizations.name)
}))

export const organizationKeys = pgTable('organization_keys', {
	id: serial('id').primaryKey().notNull(),
	organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

	name: varchar('name', { length: 255 }).notNull().default('Key'),
	key: char('key', { length: 64 }).notNull(),

	created: timestamp('created').default(sql`now()`).notNull()
}, (organizationKeys) => ({
	organizationIdx: index('organizationKeys_organization_idx').on(organizationKeys.organizationId),
	keyIdx: index('organizationKeys_key_idx').on(organizationKeys.key)
}))

export const organizationSubusers = pgTable('organization_subusers', {
	organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
	userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' })
}, (organizationSubusers) => ({
	pk: primaryKey({ name: 'organizationSubusers_pk', columns: [organizationSubusers.organizationId, organizationSubusers.userId] }),
	organizationIdx: index('organizationSubusers_organization_idx').on(organizationSubusers.organizationId),
	userIdx: index('organizationSubusers_user_idx').on(organizationSubusers.userId)
}))

export const webhooks = pgTable('webhooks', {
	id: serial('id').primaryKey().notNull(),
	organizationId: integer('organization_id').references(() => organizations.id, { onDelete: 'restrict' }),

	label: varchar('label', { length: 255 }),
	url: varchar('url', { length: 255 }).notNull(),
	types: jsonb('types').$type<ServerType[]>().default([...types]).notNull(),
	enabled: boolean('enabled').default(true).notNull(),
	successful: integer('successful').default(0).notNull(),
	failed: integer('failed').default(0).notNull()
}, (webhooks) => ({
	organizationIdx: index('webhooks_organization_idx').on(webhooks.organizationId).where(isNotNull(webhooks.organizationId)),
	enabledIdx: index('webhooks_enabled_idx').on(webhooks.enabled)
}))

export const users = pgTable('users', {
	id: serial('id').primaryKey().notNull(),
	githubId: integer('github_id').notNull().unique(),

	name: varchar('name', { length: 255 }),
	email: varchar('email', { length: 255 }).notNull(),
	login: varchar('login', { length: 255 }).notNull(),

	lastLogin: timestamp('last_login').default(sql`now()`).notNull(),
	created: timestamp('created').default(sql`now()`).notNull()
}, (users) => ({
	githubIdIdx: index('users_github_id_idx').on(users.githubId),
	loginIdx: index('users_login_idx').on(users.login),
	emailIdx: index('users_email_idx').on(users.email)
}))

export const userSessions = pgTable('user_sessions', {
	id: serial('id').primaryKey().notNull(),
	userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

	session: char('session', { length: 64 }).notNull(),

	lastUsed: timestamp('last_used').default(sql`now()`).notNull(),
	created: timestamp('created').default(sql`now()`).notNull()
}, (userSessions) => ({
	userIdx: index('userSessions_user_idx').on(userSessions.userId),
	sessionIdx: uniqueIndex('userSessions_session_idx').on(userSessions.session)
}))

export const requests = pgTable('requests', {
	id: char('id', { length: 12 }).primaryKey().notNull(),
	organizationId: integer('organization_id').references(() => organizations.id, { onDelete: 'set null' }),

	origin: varchar('origin', { length: 255 }),
	method: methodEnum('method').notNull(),
	path: varchar('path', { length: 255 }).notNull(),
	time: integer('time').notNull(),
	status: smallint('status').notNull(),
	body: jsonb('body'),
	ip: inet('ip').notNull(),
	continent: char('continent', { length: 2 }),
	country: char('country', { length: 2 }),
	data: jsonb('data'),
	userAgent: varchar('user_agent', { length: 255 }).notNull(),
	created: timestamp('created').notNull()
}, (requests) => ({
	organizationIdx: index('requests_organization_idx').on(requests.organizationId).where(isNotNull(requests.organizationId)),
	ipIdx: index('requests_ip_idx').on(requests.ip),
	pathIdx: index('requests_path_idx').on(requests.path),
	continentIdx: index('requests_continent_idx').on(requests.continent).where(isNotNull(requests.continent)),
	countryIdx: index('requests_country_idx').on(requests.country).where(isNotNull(requests.country)),
	dataIdx: index('requests_data_idx').on(requests.data).where(isNotNull(requests.data)),
	createdIdx: index('requests_created_idx').on(requests.created)
}))

export const minecraftVersions = pgTable('minecraft_versions', {
	id: varchar('id', { length: 63 }).primaryKey().notNull(),

	type: versionTypeEnum('type').notNull(),
	supported: boolean('supported').notNull(),
	java: smallint('java').default(21).notNull(),

	created: timestamp('created').notNull()
}, (minecraftVersions) => ({
	typeIdx: index('minecraftVersions_type_idx').on(minecraftVersions.type),
	javaIdx: index('minecraftVersions_java_idx').on(minecraftVersions.java)
}))

export const projectVersions = pgTable('project_versions', {
	id: varchar('id', { length: 63 }).notNull(),
	type: typesEnum('type').notNull()
}, (projectVersions) => ({
	pk: primaryKey({ name: 'projectVersions_pk', columns: [projectVersions.type, projectVersions.id] }),
	typeIdx: index('projectVersions_type_idx').on(projectVersions.type)
}))

export const minecraftVersionsRelations = relations(minecraftVersions, ({ many }) => ({
	builds: many(builds, { relationName: 'versions' })
}))

export const projectVersionsRelations = relations(projectVersions, ({ many }) => ({
	builds: many(builds, { relationName: 'project_versions' })
}))

export const builds = pgTable('builds', {
	id: serial('id').primaryKey().notNull(),
	versionId: varchar('version_id', { length: 63 }).references(() => minecraftVersions.id, { onDelete: 'cascade' }),
	projectVersionId: varchar('project_version_id', { length: 63 }),

	type: typesEnum('type').notNull(),
	rehash: boolean('rehash').default(false).notNull(),
	experimental: boolean('experimental').default(false).notNull(),

	buildNumber: integer('build_number').notNull(),
	jarUrl: varchar('jar_url', { length: 255 }),
	jarSize: integer('jar_size'),
	jarLocation: varchar('jar_location', { length: 51 }),
	zipUrl: varchar('zip_url', { length: 255 }),
	zipSize: integer('zip_size'),

	metadata: jsonb('metadata').notNull(),
	installation: jsonb('installation').$type<InstallStep[][]>().notNull(),
	changes: jsonb('changes').$type<string[]>().notNull(),
	created: timestamp('created')
}, (builds) => ({
	typeIdx: index('builds_type_idx').on(builds.type),
	experimentalIdx: index('builds_experimental_idx').on(builds.experimental),
	buildNumberIdx: index('builds_build_number_idx').on(builds.buildNumber),
	jarUrlIdx: index('builds_jar_url_idx').on(builds.jarUrl),
	jarSizeIdx: index('builds_jar_size_idx').on(builds.jarSize),
	zipUrlIdx: index('builds_zip_url_idx').on(builds.zipUrl),
	zipSizeIdx: index('builds_zip_size_idx').on(builds.zipSize),
	createdIdx: index('builds_created_idx').on(builds.created).where(isNotNull(builds.created)),
	versionTypeIdx: index('builds_version_type_idx').on(builds.versionId, builds.type),
	projectVersionTypeIdx: index('builds_project_version_type_idx').on(builds.projectVersionId, builds.type),
	versionIdx: index('builds_version_idx').on(builds.versionId),
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

export const buildHashes = pgTable('build_hashes', {
	buildId: integer('build_id').notNull().references(() => builds.id, { onDelete: 'cascade' }),

	primary: boolean('primary').notNull(),

	sha1: char('sha1', { length: 40 }).notNull(),
	sha224: char('sha224', { length: 56 }).notNull(),
	sha256: char('sha256', { length: 64 }).notNull(),
	sha384: char('sha384', { length: 96 }).notNull(),
	sha512: char('sha512', { length: 128 }).notNull(),
	md5: char('md5', { length: 32 }).notNull()
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

export const configs = pgTable('configs', {
	id: serial('id').primaryKey().notNull(),

	location: varchar('location', { length: 51 }).unique().notNull(),
	type: typesEnum('type').notNull(),
	format: formatsEnum('format').notNull()
}, (configs) => ({
	typeIdx: index('configs_type_idx').on(configs.type),
	formatIdx: index('configs_format_idx').on(configs.format),
	uniqueLocationIdx: uniqueIndex('configs_unique_location_idx').on(configs.location)
}))

export const configValues = pgTable('config_values', {
	id: serial('id').primaryKey().notNull(),
	configId: integer('config_id').notNull().references(() => configs.id, { onDelete: 'cascade' }),

	sha1: char('sha1', { length: 40 }).notNull(),
	sha224: char('sha224', { length: 56 }).notNull(),
	sha256: char('sha256', { length: 64 }).notNull(),
	sha384: char('sha384', { length: 96 }).notNull(),
	sha512: char('sha512', { length: 128 }).notNull(),
	md5: char('md5', { length: 32 }).notNull(),

	value: text('value').notNull()
}, (configValues) => ({
	configIdx: index('configValues_config_idx').on(configValues.configId),
	uniqueConfigSha512Idx: uniqueIndex('configValues_unique_config_sha512_idx').on(configValues.configId, configValues.sha512)
}))

export const buildConfigs = pgTable('build_configs', {
	buildId: integer('build_id').notNull().references(() => builds.id, { onDelete: 'cascade' }),
	configId: integer('config_id').notNull().references(() => configs.id, { onDelete: 'cascade' }),
	configValueId: integer('config_value_id').notNull().references(() => configValues.id, { onDelete: 'cascade' })
}, (buildConfigs) => ({
	pk: primaryKey({ name: 'buildConfigs_pk', columns: [buildConfigs.buildId, buildConfigs.configId] }),
	buildIdx: index('buildConfigs_build_idx').on(buildConfigs.buildId),
	configIdx: index('buildConfigs_config_idx').on(buildConfigs.configId),
	configValueIdx: index('buildConfigs_config_value_idx').on(buildConfigs.configValueId)
}))