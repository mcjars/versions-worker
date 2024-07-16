DROP INDEX IF EXISTS `builds_jar_url_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `builds_jar_size_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `builds_jar_location_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `builds_zip_url_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `builds_zip_size_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `builds_created_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `builds_type_version_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `builds_type_project_version_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `builds_version_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `requests_organization_idx`;--> statement-breakpoint
CREATE INDEX `builds_jar_url_idx` ON `builds` (`jar_url`);--> statement-breakpoint
CREATE INDEX `builds_jar_size_idx` ON `builds` (`jar_size`);--> statement-breakpoint
CREATE INDEX `builds_jar_location_idx` ON `builds` (`jar_location`);--> statement-breakpoint
CREATE INDEX `builds_zip_url_idx` ON `builds` (`zip_url`);--> statement-breakpoint
CREATE INDEX `builds_zip_size_idx` ON `builds` (`zip_size`);--> statement-breakpoint
CREATE INDEX `builds_created_idx` ON `builds` (`created`);--> statement-breakpoint
CREATE INDEX `builds_type_version_idx` ON `builds` (`type`,`version_id`);--> statement-breakpoint
CREATE INDEX `builds_type_project_version_idx` ON `builds` (`type`,`project_version_id`);--> statement-breakpoint
CREATE INDEX `builds_version_idx` ON `builds` (`version_id`);--> statement-breakpoint
CREATE INDEX `requests_organization_idx` ON `requests` (`organization_id`);