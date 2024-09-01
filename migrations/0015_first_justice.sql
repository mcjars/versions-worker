CREATE INDEX `requests_continent_idx` ON `requests` (`continent`) WHERE "requests"."continent" is not null;--> statement-breakpoint
CREATE INDEX `requests_country_idx` ON `requests` (`country`) WHERE "requests"."country" is not null;--> statement-breakpoint
CREATE INDEX `requests_data_idx` ON `requests` (`data`) WHERE "requests"."data" is not null;