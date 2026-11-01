CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `people` ADD `username` text;--> statement-breakpoint
ALTER TABLE `people` ADD `password_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `people_username_unique` ON `people` (`username`);