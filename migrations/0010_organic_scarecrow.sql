DROP INDEX IF EXISTS `webhooks_organization_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `webhooks_enabled_idx`;--> statement-breakpoint
DROP TABLE IF EXISTS `webhooks`;--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer,
  `label` text(255),
	`name` text(63) NOT NULL,
	`avatar` text(255) NOT NULL,
	`url` text(255) NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`successful` integer DEFAULT 0 NOT NULL,
	`failed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE restrict
);--> statement-breakpoint
CREATE INDEX `webhooks_organization_idx` ON `webhooks` (`organization_id`) WHERE "webhooks"."organization_id" is not null;--> statement-breakpoint
CREATE INDEX `webhooks_enabled_idx` ON `webhooks` (`enabled`);