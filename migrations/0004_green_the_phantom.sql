CREATE INDEX `buildHashes_primary_idx` ON `buildHashes` (`primary`);--> statement-breakpoint
CREATE INDEX `requests_ip_idx` ON `requests` (`ip`);--> statement-breakpoint
CREATE INDEX `requests_status_idx` ON `requests` (`status`);--> statement-breakpoint
CREATE INDEX `requests_created_idx` ON `requests` (`created`);