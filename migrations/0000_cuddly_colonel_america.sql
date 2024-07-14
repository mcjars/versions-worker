CREATE TABLE `buildConfigs` (
	`build_id` integer NOT NULL,
	`config_id` integer NOT NULL,
	PRIMARY KEY(`build_id`, `config_id`),
	FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`config_id`) REFERENCES `configs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `buildHashes` (
	`build_id` integer NOT NULL,
	`primary` integer NOT NULL,
	`sha1` text(40) NOT NULL,
	`sha224` text(56) NOT NULL,
	`sha256` text(64) NOT NULL,
	`sha384` text(96) NOT NULL,
	`sha512` text(128) NOT NULL,
	`md5` text(32) NOT NULL,
	FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `builds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version_id` text(31) NOT NULL,
	`project_version_id` text(31) NOT NULL,
	`type` text NOT NULL,
	`rehash` integer DEFAULT false NOT NULL,
	`build_number` integer NOT NULL,
	`jar_url` text(255) NOT NULL,
	`jar_size` integer NOT NULL,
	`jar_location` text(51),
	`zip_url` text(255),
	`zip_size` integer,
	`metadata` text NOT NULL,
	`installation` text NOT NULL,
	`changes` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`version_id`) REFERENCES `minecraftVersions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_version_id`) REFERENCES `projectVersions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `configValues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`config_id` integer NOT NULL,
	`sha1` text(40) NOT NULL,
	`sha224` text(56) NOT NULL,
	`sha256` text(64) NOT NULL,
	`sha384` text(96) NOT NULL,
	`sha512` text(128) NOT NULL,
	`md5` text(32) NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`config_id`) REFERENCES `configs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `configs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`location` text(51) NOT NULL,
	`type` text NOT NULL,
	`format` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `minecraftVersions` (
	`id` text(31) PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`supported` integer NOT NULL,
	`java` integer DEFAULT 21 NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `organizationKeys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`key` text(64) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(255) NOT NULL,
	`icon` text(255) NOT NULL,
	`types` text
);
--> statement-breakpoint
CREATE TABLE `projectVersions` (
	`id` text(31) PRIMARY KEY NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `requests` (
	`id` text(12) PRIMARY KEY NOT NULL,
	`organization_id` integer,
	`method` text(7) NOT NULL,
	`path` text(255) NOT NULL,
	`time` integer NOT NULL,
	`status` integer NOT NULL,
	`body` text,
	`ip` text(45) NOT NULL,
	`user_agent` text(255) NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`name` text(63) NOT NULL,
	`avatar` text(255) NOT NULL,
	`url` text(255) NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`successful` integer DEFAULT 0 NOT NULL,
	`failed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `buildConfigs_build_idx` ON `buildConfigs` (`build_id`);--> statement-breakpoint
CREATE INDEX `buildHashes_build_idx` ON `buildHashes` (`build_id`);--> statement-breakpoint
CREATE INDEX `buildHashes_sha1_idx` ON `buildHashes` (`sha1`);--> statement-breakpoint
CREATE INDEX `buildHashes_sha224_idx` ON `buildHashes` (`sha224`);--> statement-breakpoint
CREATE INDEX `buildHashes_sha256_idx` ON `buildHashes` (`sha256`);--> statement-breakpoint
CREATE INDEX `buildHashes_sha384_idx` ON `buildHashes` (`sha384`);--> statement-breakpoint
CREATE INDEX `buildHashes_sha512_idx` ON `buildHashes` (`sha512`);--> statement-breakpoint
CREATE INDEX `buildHashes_md5_idx` ON `buildHashes` (`md5`);--> statement-breakpoint
CREATE INDEX `builds_type_idx` ON `builds` (`type`);--> statement-breakpoint
CREATE INDEX `builds_type_version_idx` ON `builds` (`type`,`version_id`) WHERE "builds"."version_id" is not null;--> statement-breakpoint
CREATE INDEX `builds_type_project_version_idx` ON `builds` (`type`,`project_version_id`) WHERE "builds"."project_version_id" is not null;--> statement-breakpoint
CREATE INDEX `builds_version_idx` ON `builds` (`version_id`) WHERE "builds"."version_id" is not null;--> statement-breakpoint
CREATE INDEX `configValues_config_idx` ON `configValues` (`config_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `configValues_unique_config_value_idx` ON `configValues` (`config_id`,`sha1`,`sha224`,`sha256`,`sha384`,`sha512`,`md5`);--> statement-breakpoint
CREATE UNIQUE INDEX `configs_location_unique` ON `configs` (`location`);--> statement-breakpoint
CREATE INDEX `configs_type_idx` ON `configs` (`type`);--> statement-breakpoint
CREATE INDEX `configs_format_idx` ON `configs` (`format`);--> statement-breakpoint
CREATE UNIQUE INDEX `configs_unique_location_idx` ON `configs` (`location`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_id_idx` ON `minecraftVersions` (`id`);--> statement-breakpoint
CREATE INDEX `minecraftVersions_type_idx` ON `minecraftVersions` (`type`);--> statement-breakpoint
CREATE INDEX `minecraftVersions_java_idx` ON `minecraftVersions` (`java`);--> statement-breakpoint
CREATE INDEX `organizationKeys_organization_idx` ON `organizationKeys` (`organization_id`);--> statement-breakpoint
CREATE INDEX `organizationKeys_key_idx` ON `organizationKeys` (`key`);--> statement-breakpoint
CREATE INDEX `organizations_name_idx` ON `organizations` (`name`);--> statement-breakpoint
CREATE INDEX `projectVersions_type_idx` ON `projectVersions` (`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `projectVersions_unique_id_type_idx` ON `projectVersions` (`type`,`id`);--> statement-breakpoint
CREATE INDEX `requests_organization_idx` ON `requests` (`organization_id`) WHERE "requests"."organization_id" is not null;--> statement-breakpoint
CREATE INDEX `webhooks_organization_idx` ON `webhooks` (`organization_id`) WHERE "webhooks"."organization_id" is not null;--> statement-breakpoint
CREATE INDEX `webhooks_enabled_idx` ON `webhooks` (`enabled`);