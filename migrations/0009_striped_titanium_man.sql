DROP INDEX IF EXISTS `buildConfigs_build_idx`;--> statement-breakpoint
DROP TABLE IF EXISTS `buildConfigs`;--> statement-breakpoint
CREATE TABLE `buildConfigs` (
	`build_id` integer NOT NULL,
	`config_id` integer NOT NULL,
	`config_value_id` integer NOT NULL,
	PRIMARY KEY(`build_id`, `config_value_id`),
	FOREIGN KEY (`build_id`) REFERENCES `builds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`config_id`) REFERENCES `configs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`config_value_id`) REFERENCES `configValues`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `buildConfigs_build_idx` ON `buildConfigs` (`build_id`);--> statement-breakpoint
CREATE INDEX `buildConfigs_config_idx` ON `buildConfigs` (`config_id`);--> statement-breakpoint
CREATE INDEX `buildConfigs_config_value_idx` ON `buildConfigs` (`config_value_id`);