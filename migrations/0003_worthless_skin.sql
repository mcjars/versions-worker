CREATE INDEX `builds_experimental_idx` ON `builds` (`experimental`);--> statement-breakpoint
CREATE INDEX `builds_build_number_idx` ON `builds` (`build_number`);--> statement-breakpoint
CREATE INDEX `builds_jar_url_idx` ON `builds` (`jar_url`) WHERE "builds"."jar_url" is not null;--> statement-breakpoint
CREATE INDEX `builds_jar_size_idx` ON `builds` (`jar_size`) WHERE "builds"."jar_size" is not null;--> statement-breakpoint
CREATE INDEX `builds_jar_location_idx` ON `builds` (`jar_location`) WHERE "builds"."jar_location" is not null;--> statement-breakpoint
CREATE INDEX `builds_zip_url_idx` ON `builds` (`zip_url`) WHERE "builds"."zip_url" is not null;--> statement-breakpoint
CREATE INDEX `builds_zip_size_idx` ON `builds` (`zip_size`) WHERE "builds"."zip_size" is not null;--> statement-breakpoint
CREATE INDEX `builds_created_idx` ON `builds` (`created`) WHERE "builds"."created" is not null;