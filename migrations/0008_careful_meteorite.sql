DROP INDEX IF EXISTS `buildConfigs_build_idx`;--> statement-breakpoint
DROP TABLE IF EXISTS `buildConfigs`;--> statement-breakpoint
CREATE TABLE `buildConfigs` (
	`build_id` integer NOT NULL,
	`config_value_id` integer NOT NULL,
	PRIMARY KEY(`build_id`, `config_value_id`),
	FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`config_value_id`) REFERENCES `configValues`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `buildConfigs_build_idx` ON `buildConfigs` (`build_id`);