CREATE TABLE `invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`host_id` text NOT NULL,
	`title` text NOT NULL,
	`place` text NOT NULL,
	`starts_at` integer NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `joins` (
	`invite_id` integer NOT NULL,
	`person_id` text NOT NULL,
	`joined_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`invite_id`, `person_id`),
	FOREIGN KEY (`invite_id`) REFERENCES `invites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
