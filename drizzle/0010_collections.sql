CREATE TABLE `collection` (
	`collection_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_collection_name_lower` ON `collection` (lower("name"));--> statement-breakpoint
CREATE TABLE `collection_word` (
	`collection_id` integer NOT NULL,
	`dict_id` integer NOT NULL,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`collection_id`, `dict_id`)
);
--> statement-breakpoint
CREATE INDEX `idx_cw_dict` ON `collection_word` (`dict_id`);