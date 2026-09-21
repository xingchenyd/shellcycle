CREATE TABLE `adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`batchId` text NOT NULL,
	`siteId` text NOT NULL,
	`type` text NOT NULL,
	`qty` integer NOT NULL,
	`reason` text NOT NULL,
	`status` text NOT NULL,
	`requester` text NOT NULL,
	`approver` text,
	`dispatchId` text,
	`projectId` text,
	FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`siteId`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`dispatchId`) REFERENCES `dispatches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "adjustments_qty_ck" CHECK("adjustments"."qty" > 0)
);
--> statement-breakpoint
CREATE INDEX `adjustments_batchId_idx` ON `adjustments` (`batchId`);--> statement-breakpoint
CREATE INDEX `adjustments_siteId_idx` ON `adjustments` (`siteId`);--> statement-breakpoint
CREATE INDEX `adjustments_dispatchId_idx` ON `adjustments` (`dispatchId`);--> statement-breakpoint
CREATE INDEX `adjustments_projectId_idx` ON `adjustments` (`projectId`);--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`targetId` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`mime` text NOT NULL,
	`actor` text NOT NULL,
	CONSTRAINT "attachments_size_ck" CHECK("attachments"."size" > 0)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`action` text NOT NULL,
	`actor` text NOT NULL,
	`actorName` text,
	`target` text,
	`details` text
);
--> statement-breakpoint
CREATE TABLE `batch_inputs` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`batchId` text NOT NULL,
	`receiptId` text NOT NULL,
	`qty` integer NOT NULL,
	FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`receiptId`) REFERENCES `receipts`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "batch_inputs_qty_ck" CHECK("batch_inputs"."qty" > 0)
);
--> statement-breakpoint
CREATE INDEX `batch_inputs_batchId_idx` ON `batch_inputs` (`batchId`);--> statement-breakpoint
CREATE INDEX `batch_inputs_receiptId_idx` ON `batch_inputs` (`receiptId`);--> statement-breakpoint
CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`siteId` text NOT NULL,
	`zone` text NOT NULL,
	`status` text NOT NULL,
	`quality` text NOT NULL,
	`sealedAt` text,
	`due` text,
	`days` integer,
	`ruleVersion` integer,
	`releasedAt` text,
	FOREIGN KEY (`siteId`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "batches_days_ck" CHECK("batches"."days" > 0),
	CONSTRAINT "batches_ruleVersion_ck" CHECK("batches"."ruleVersion" > 0)
);
--> statement-breakpoint
CREATE INDEX `batches_siteId_idx` ON `batches` (`siteId`);--> statement-breakpoint
CREATE TABLE `command_fingerprints` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `curing_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`days` integer NOT NULL,
	`version` integer NOT NULL,
	`reason` text NOT NULL,
	CONSTRAINT "curing_rules_days_ck" CHECK("curing_rules"."days" > 0),
	CONSTRAINT "curing_rules_version_ck" CHECK("curing_rules"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE `demands` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`projectId` text NOT NULL,
	`qty` integer NOT NULL,
	`due` text NOT NULL,
	`notes` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "demands_qty_ck" CHECK("demands"."qty" > 0)
);
--> statement-breakpoint
CREATE INDEX `demands_projectId_idx` ON `demands` (`projectId`);--> statement-breakpoint
CREATE TABLE `deployments` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`dispatchId` text NOT NULL,
	`batchId` text NOT NULL,
	`projectId` text NOT NULL,
	`qty` integer NOT NULL,
	`date` text NOT NULL,
	`location` text NOT NULL,
	`notes` text NOT NULL,
	FOREIGN KEY (`dispatchId`) REFERENCES `dispatches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "deployments_qty_ck" CHECK("deployments"."qty" > 0)
);
--> statement-breakpoint
CREATE INDEX `deployments_dispatchId_idx` ON `deployments` (`dispatchId`);--> statement-breakpoint
CREATE INDEX `deployments_batchId_idx` ON `deployments` (`batchId`);--> statement-breakpoint
CREATE INDEX `deployments_projectId_idx` ON `deployments` (`projectId`);--> statement-breakpoint
CREATE TABLE `dispatches` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`reservationId` text NOT NULL,
	`demandId` text NOT NULL,
	`projectId` text NOT NULL,
	`batchId` text NOT NULL,
	`siteId` text NOT NULL,
	`qty` integer NOT NULL,
	`vehicle` text NOT NULL,
	`status` text NOT NULL,
	`received` integer,
	`receivedAt` text,
	`reason` text,
	FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`demandId`) REFERENCES `demands`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`siteId`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "dispatches_qty_ck" CHECK("dispatches"."qty" > 0),
	CONSTRAINT "dispatches_received_ck" CHECK("dispatches"."received" >= 0),
	CONSTRAINT "dispatch_received_bound" CHECK("dispatches"."received" IS NULL OR "dispatches"."received" <= "dispatches"."qty")
);
--> statement-breakpoint
CREATE INDEX `dispatches_reservationId_idx` ON `dispatches` (`reservationId`);--> statement-breakpoint
CREATE INDEX `dispatches_demandId_idx` ON `dispatches` (`demandId`);--> statement-breakpoint
CREATE INDEX `dispatches_projectId_idx` ON `dispatches` (`projectId`);--> statement-breakpoint
CREATE INDEX `dispatches_batchId_idx` ON `dispatches` (`batchId`);--> statement-breakpoint
CREATE INDEX `dispatches_siteId_idx` ON `dispatches` (`siteId`);--> statement-breakpoint
CREATE TABLE `inspections` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`batchId` text NOT NULL,
	`result` text NOT NULL,
	`notes` text NOT NULL,
	`actor` text NOT NULL,
	FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `inspections_batchId_idx` ON `inspections` (`batchId`);--> statement-breakpoint
CREATE TABLE `inventory_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`batchId` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`ref` text NOT NULL,
	`actor` text NOT NULL,
	FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `inventory_entries_batchId_idx` ON `inventory_entries` (`batchId`);--> statement-breakpoint
CREATE TABLE `partners` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`contact` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`active` integer NOT NULL,
	CONSTRAINT "partners_active_ck" CHECK("partners"."active" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `pickups` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`partnerId` text NOT NULL,
	`expected` integer NOT NULL,
	`scheduled` text NOT NULL,
	`buckets` integer NOT NULL,
	`status` text NOT NULL,
	`tripId` text,
	`collectedWeight` integer,
	`collectedAt` text,
	`externalRef` text,
	`notes` text,
	FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "pickups_expected_ck" CHECK("pickups"."expected" > 0),
	CONSTRAINT "pickups_buckets_ck" CHECK("pickups"."buckets" > 0),
	CONSTRAINT "pickups_collectedWeight_ck" CHECK("pickups"."collectedWeight" >= 0)
);
--> statement-breakpoint
CREATE INDEX `pickups_partnerId_idx` ON `pickups` (`partnerId`);--> statement-breakpoint
CREATE UNIQUE INDEX `pickups_external_unique` ON `pickups` (`partnerId`,`externalRef`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`location` text NOT NULL,
	`target` integer NOT NULL,
	`manager` text NOT NULL,
	`status` text NOT NULL,
	CONSTRAINT "projects_target_ck" CHECK("projects"."target" > 0)
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`pickupId` text NOT NULL,
	`partnerId` text NOT NULL,
	`siteId` text NOT NULL,
	`gross` integer NOT NULL,
	`tare` integer NOT NULL,
	`reject` integer NOT NULL,
	`accepted` integer NOT NULL,
	`reason` text NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`pickupId`) REFERENCES `pickups`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`siteId`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "receipts_gross_ck" CHECK("receipts"."gross" > 0),
	CONSTRAINT "receipts_tare_ck" CHECK("receipts"."tare" >= 0),
	CONSTRAINT "receipts_reject_ck" CHECK("receipts"."reject" >= 0),
	CONSTRAINT "receipts_accepted_ck" CHECK("receipts"."accepted" >= 0),
	CONSTRAINT "receipt_mass_balance" CHECK("receipts"."accepted" = "receipts"."gross" - "receipts"."tare" - "receipts"."reject")
);
--> statement-breakpoint
CREATE INDEX `receipts_pickupId_idx` ON `receipts` (`pickupId`);--> statement-breakpoint
CREATE INDEX `receipts_partnerId_idx` ON `receipts` (`partnerId`);--> statement-breakpoint
CREATE INDEX `receipts_siteId_idx` ON `receipts` (`siteId`);--> statement-breakpoint
CREATE UNIQUE INDEX `receipts_pickup_unique` ON `receipts` (`pickupId`);--> statement-breakpoint
CREATE TABLE `relational_revision` (
	`id` integer PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`migrated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`demandId` text NOT NULL,
	`projectId` text NOT NULL,
	`batchId` text NOT NULL,
	`qty` integer NOT NULL,
	`shipped` integer NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	FOREIGN KEY (`demandId`) REFERENCES `demands`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batchId`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reservations_qty_ck" CHECK("reservations"."qty" > 0),
	CONSTRAINT "reservations_shipped_ck" CHECK("reservations"."shipped" >= 0),
	CONSTRAINT "reservation_shipped_bound" CHECK("reservations"."shipped" <= "reservations"."qty")
);
--> statement-breakpoint
CREATE INDEX `reservations_demandId_idx` ON `reservations` (`demandId`);--> statement-breakpoint
CREATE INDEX `reservations_projectId_idx` ON `reservations` (`projectId`);--> statement-breakpoint
CREATE INDEX `reservations_batchId_idx` ON `reservations` (`batchId`);--> statement-breakpoint
CREATE TABLE `rule_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`days` integer NOT NULL,
	`version` integer NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	CONSTRAINT "rule_versions_days_ck" CHECK("rule_versions"."days" > 0),
	CONSTRAINT "rule_versions_version_ck" CHECK("rule_versions"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`capacity` integer NOT NULL,
	`active` integer NOT NULL,
	`zones` text NOT NULL,
	CONSTRAINT "sites_capacity_ck" CHECK("sites"."capacity" > 0),
	CONSTRAINT "sites_active_ck" CHECK("sites"."active" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`driverId` text NOT NULL,
	`vehicleId` text NOT NULL,
	`scheduled` text NOT NULL,
	`status` text NOT NULL,
	`pickupIds` text NOT NULL,
	FOREIGN KEY (`vehicleId`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `trips_vehicleId_idx` ON `trips` (`vehicleId`);--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`name` text NOT NULL,
	`capacity` integer NOT NULL,
	`active` integer NOT NULL,
	CONSTRAINT "vehicles_capacity_ck" CHECK("vehicles"."capacity" > 0),
	CONSTRAINT "vehicles_active_ck" CHECK("vehicles"."active" IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `weighing_corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`created` text,
	`extra` text DEFAULT '{}' NOT NULL,
	`receiptId` text NOT NULL,
	`siteId` text NOT NULL,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`oldGross` integer NOT NULL,
	`oldTare` integer NOT NULL,
	`oldReject` integer NOT NULL,
	`newGross` integer NOT NULL,
	`newTare` integer NOT NULL,
	`newReject` integer NOT NULL,
	FOREIGN KEY (`receiptId`) REFERENCES `receipts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`siteId`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "weighing_corrections_oldGross_ck" CHECK("weighing_corrections"."oldGross" >= 0),
	CONSTRAINT "weighing_corrections_oldTare_ck" CHECK("weighing_corrections"."oldTare" >= 0),
	CONSTRAINT "weighing_corrections_oldReject_ck" CHECK("weighing_corrections"."oldReject" >= 0),
	CONSTRAINT "weighing_corrections_newGross_ck" CHECK("weighing_corrections"."newGross" >= 0),
	CONSTRAINT "weighing_corrections_newTare_ck" CHECK("weighing_corrections"."newTare" >= 0),
	CONSTRAINT "weighing_corrections_newReject_ck" CHECK("weighing_corrections"."newReject" >= 0)
);
--> statement-breakpoint
CREATE INDEX `weighing_corrections_receiptId_idx` ON `weighing_corrections` (`receiptId`);--> statement-breakpoint
CREATE INDEX `weighing_corrections_siteId_idx` ON `weighing_corrections` (`siteId`);