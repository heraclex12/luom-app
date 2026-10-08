CREATE TABLE `speech_attempt` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dict_id` integer NOT NULL,
	`target` text NOT NULL,
	`heard` text NOT NULL,
	`ok` integer NOT NULL,
	`confidence` real,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sa_time` ON `speech_attempt` (`created_at`);--> statement-breakpoint
CREATE TABLE `user_sentence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dict_id` integer NOT NULL,
	`text` text NOT NULL,
	`better` text DEFAULT '' NOT NULL,
	`verdict` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_us_dict` ON `user_sentence` (`dict_id`,`created_at`);