DROP INDEX `idx_dict_term`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_dict_term_lower` ON `dict` (lower("term"));--> statement-breakpoint
ALTER TABLE `dict` DROP COLUMN `term_type`;--> statement-breakpoint
ALTER TABLE `dict` DROP COLUMN `ec`;--> statement-breakpoint
ALTER TABLE `dict` DROP COLUMN `collins`;--> statement-breakpoint
ALTER TABLE `dict` DROP COLUMN `syno`;--> statement-breakpoint
ALTER TABLE `dict` DROP COLUMN `rel_word`;--> statement-breakpoint
ALTER TABLE `dict` DROP COLUMN `phrs`;--> statement-breakpoint
ALTER TABLE `dict` DROP COLUMN `individual`;--> statement-breakpoint
ALTER TABLE `dict` DROP COLUMN `example_sentence`;