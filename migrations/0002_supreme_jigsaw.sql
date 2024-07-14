ALTER TABLE `organizations` DROP COLUMN `types`;--> statement-breakpoint
ALTER TABLE `organizations` ADD COLUMN `types` text NOT NULL;