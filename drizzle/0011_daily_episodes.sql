CREATE TABLE `story_episode` (
	`season_id` integer NOT NULL,
	`number` integer NOT NULL,
	`day` text NOT NULL,
	`content` text NOT NULL,
	`word_ids` text NOT NULL,
	`read_at` integer,
	`quiz_correct` integer,
	`quiz_total` integer,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`season_id`, `number`)
);
--> statement-breakpoint
CREATE TABLE `story_season` (
	`season_id` integer PRIMARY KEY NOT NULL,
	`genre` text NOT NULL,
	`level` text NOT NULL,
	`start_day` text NOT NULL,
	`bible` text NOT NULL,
	`created_at` integer NOT NULL
);
