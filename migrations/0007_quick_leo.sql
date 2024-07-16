DROP INDEX IF EXISTS `requests_status_idx`;--> statement-breakpoint
DROP INDEX IF EXISTS `requests_organization_idx`;--> statement-breakpoint
CREATE INDEX `requests_organization_idx` ON `requests` (`organization_id`) WHERE "requests"."organization_id" is not null;