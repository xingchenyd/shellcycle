import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";
export const partners = sqliteTable(
  "partners",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    name: text("name").notNull(),
    contact: text("contact").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    active: integer("active").notNull(),
  },
  (t) => [check("partners_active_ck", sql`${t.active} IN (0,1)`)],
);
export const sites = sqliteTable(
  "sites",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    name: text("name").notNull(),
    address: text("address").notNull(),
    capacity: integer("capacity").notNull(),
    active: integer("active").notNull(),
    zones: text("zones").notNull(),
  },
  (t) => [
    check("sites_capacity_ck", sql`${t.capacity} > 0`),
    check("sites_active_ck", sql`${t.active} IN (0,1)`),
  ],
);
export const vehicles = sqliteTable(
  "vehicles",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    name: text("name").notNull(),
    capacity: integer("capacity").notNull(),
    active: integer("active").notNull(),
  },
  (t) => [
    check("vehicles_capacity_ck", sql`${t.capacity} > 0`),
    check("vehicles_active_ck", sql`${t.active} IN (0,1)`),
  ],
);
export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    name: text("name").notNull(),
    location: text("location").notNull(),
    target: integer("target").notNull(),
    manager: text("manager").notNull(),
    status: text("status").notNull(),
  },
  (t) => [check("projects_target_ck", sql`${t.target} > 0`)],
);
export const curing_rules = sqliteTable(
  "curing_rules",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    days: integer("days").notNull(),
    version: integer("version").notNull(),
    reason: text("reason").notNull(),
  },
  (t) => [
    check("curing_rules_days_ck", sql`${t.days} > 0`),
    check("curing_rules_version_ck", sql`${t.version} > 0`),
  ],
);
export const trips = sqliteTable(
  "trips",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    name: text("name").notNull(),
    driverId: text("driverId").notNull(),
    vehicleId: text("vehicleId")
      .references(() => vehicles.id)
      .notNull(),
    scheduled: text("scheduled").notNull(),
    status: text("status").notNull(),
    pickupIds: text("pickupIds").notNull(),
  },
  (t) => [index("trips_vehicleId_idx").on(t.vehicleId)],
);
export const pickups = sqliteTable(
  "pickups",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    partnerId: text("partnerId")
      .references(() => partners.id)
      .notNull(),
    expected: integer("expected").notNull(),
    scheduled: text("scheduled").notNull(),
    buckets: integer("buckets").notNull(),
    status: text("status").notNull(),
    tripId: text("tripId"),
    collectedWeight: integer("collectedWeight"),
    collectedAt: text("collectedAt"),
    externalRef: text("externalRef"),
    notes: text("notes"),
  },
  (t) => [
    index("pickups_partnerId_idx").on(t.partnerId),
    check("pickups_expected_ck", sql`${t.expected} > 0`),
    check("pickups_buckets_ck", sql`${t.buckets} > 0`),
    check("pickups_collectedWeight_ck", sql`${t.collectedWeight} >= 0`),
    uniqueIndex("pickups_external_unique").on(t.partnerId, t.externalRef),
  ],
);
export const receipts = sqliteTable(
  "receipts",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    pickupId: text("pickupId")
      .references(() => pickups.id)
      .notNull(),
    partnerId: text("partnerId")
      .references(() => partners.id)
      .notNull(),
    siteId: text("siteId")
      .references(() => sites.id)
      .notNull(),
    gross: integer("gross").notNull(),
    tare: integer("tare").notNull(),
    reject: integer("reject").notNull(),
    accepted: integer("accepted").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull(),
  },
  (t) => [
    index("receipts_pickupId_idx").on(t.pickupId),
    index("receipts_partnerId_idx").on(t.partnerId),
    index("receipts_siteId_idx").on(t.siteId),
    check("receipts_gross_ck", sql`${t.gross} > 0`),
    check("receipts_tare_ck", sql`${t.tare} >= 0`),
    check("receipts_reject_ck", sql`${t.reject} >= 0`),
    check("receipts_accepted_ck", sql`${t.accepted} >= 0`),
    uniqueIndex("receipts_pickup_unique").on(t.pickupId),
    check(
      "receipt_mass_balance",
      sql`${t.accepted} = ${t.gross} - ${t.tare} - ${t.reject}`,
    ),
  ],
);
export const batches = sqliteTable(
  "batches",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    name: text("name").notNull(),
    siteId: text("siteId")
      .references(() => sites.id)
      .notNull(),
    zone: text("zone").notNull(),
    status: text("status").notNull(),
    quality: text("quality").notNull(),
    sealedAt: text("sealedAt"),
    due: text("due"),
    days: integer("days"),
    ruleVersion: integer("ruleVersion"),
    releasedAt: text("releasedAt"),
  },
  (t) => [
    index("batches_siteId_idx").on(t.siteId),
    check("batches_days_ck", sql`${t.days} > 0`),
    check("batches_ruleVersion_ck", sql`${t.ruleVersion} > 0`),
  ],
);
export const batch_inputs = sqliteTable(
  "batch_inputs",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    batchId: text("batchId")
      .references(() => batches.id)
      .notNull(),
    receiptId: text("receiptId")
      .references(() => receipts.id)
      .notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [
    index("batch_inputs_batchId_idx").on(t.batchId),
    index("batch_inputs_receiptId_idx").on(t.receiptId),
    check("batch_inputs_qty_ck", sql`${t.qty} > 0`),
  ],
);
export const inspections = sqliteTable(
  "inspections",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    batchId: text("batchId")
      .references(() => batches.id)
      .notNull(),
    result: text("result").notNull(),
    notes: text("notes").notNull(),
    actor: text("actor").notNull(),
  },
  (t) => [index("inspections_batchId_idx").on(t.batchId)],
);
export const demands = sqliteTable(
  "demands",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    projectId: text("projectId")
      .references(() => projects.id)
      .notNull(),
    qty: integer("qty").notNull(),
    due: text("due").notNull(),
    notes: text("notes").notNull(),
    status: text("status").notNull(),
  },
  (t) => [
    index("demands_projectId_idx").on(t.projectId),
    check("demands_qty_ck", sql`${t.qty} > 0`),
  ],
);
export const reservations = sqliteTable(
  "reservations",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    demandId: text("demandId")
      .references(() => demands.id)
      .notNull(),
    projectId: text("projectId")
      .references(() => projects.id)
      .notNull(),
    batchId: text("batchId")
      .references(() => batches.id)
      .notNull(),
    qty: integer("qty").notNull(),
    shipped: integer("shipped").notNull(),
    status: text("status").notNull(),
    reason: text("reason"),
  },
  (t) => [
    index("reservations_demandId_idx").on(t.demandId),
    index("reservations_projectId_idx").on(t.projectId),
    index("reservations_batchId_idx").on(t.batchId),
    check("reservations_qty_ck", sql`${t.qty} > 0`),
    check("reservations_shipped_ck", sql`${t.shipped} >= 0`),
    check("reservation_shipped_bound", sql`${t.shipped} <= ${t.qty}`),
  ],
);
export const dispatches = sqliteTable(
  "dispatches",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    reservationId: text("reservationId")
      .references(() => reservations.id)
      .notNull(),
    demandId: text("demandId")
      .references(() => demands.id)
      .notNull(),
    projectId: text("projectId")
      .references(() => projects.id)
      .notNull(),
    batchId: text("batchId")
      .references(() => batches.id)
      .notNull(),
    siteId: text("siteId")
      .references(() => sites.id)
      .notNull(),
    qty: integer("qty").notNull(),
    vehicle: text("vehicle").notNull(),
    status: text("status").notNull(),
    received: integer("received"),
    receivedAt: text("receivedAt"),
    reason: text("reason"),
  },
  (t) => [
    index("dispatches_reservationId_idx").on(t.reservationId),
    index("dispatches_demandId_idx").on(t.demandId),
    index("dispatches_projectId_idx").on(t.projectId),
    index("dispatches_batchId_idx").on(t.batchId),
    index("dispatches_siteId_idx").on(t.siteId),
    check("dispatches_qty_ck", sql`${t.qty} > 0`),
    check("dispatches_received_ck", sql`${t.received} >= 0`),
    check(
      "dispatch_received_bound",
      sql`${t.received} IS NULL OR ${t.received} <= ${t.qty}`,
    ),
  ],
);
export const deployments = sqliteTable(
  "deployments",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    dispatchId: text("dispatchId")
      .references(() => dispatches.id)
      .notNull(),
    batchId: text("batchId")
      .references(() => batches.id)
      .notNull(),
    projectId: text("projectId")
      .references(() => projects.id)
      .notNull(),
    qty: integer("qty").notNull(),
    date: text("date").notNull(),
    location: text("location").notNull(),
    notes: text("notes").notNull(),
  },
  (t) => [
    index("deployments_dispatchId_idx").on(t.dispatchId),
    index("deployments_batchId_idx").on(t.batchId),
    index("deployments_projectId_idx").on(t.projectId),
    check("deployments_qty_ck", sql`${t.qty} > 0`),
  ],
);
export const adjustments = sqliteTable(
  "adjustments",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    batchId: text("batchId")
      .references(() => batches.id)
      .notNull(),
    siteId: text("siteId")
      .references(() => sites.id)
      .notNull(),
    type: text("type").notNull(),
    qty: integer("qty").notNull(),
    reason: text("reason").notNull(),
    status: text("status").notNull(),
    requester: text("requester").notNull(),
    approver: text("approver"),
    dispatchId: text("dispatchId").references(() => dispatches.id),
    projectId: text("projectId").references(() => projects.id),
  },
  (t) => [
    index("adjustments_batchId_idx").on(t.batchId),
    index("adjustments_siteId_idx").on(t.siteId),
    check("adjustments_qty_ck", sql`${t.qty} > 0`),
    index("adjustments_dispatchId_idx").on(t.dispatchId),
    index("adjustments_projectId_idx").on(t.projectId),
  ],
);
export const inventory_entries = sqliteTable(
  "inventory_entries",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    batchId: text("batchId")
      .references(() => batches.id)
      .notNull(),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    ref: text("ref").notNull(),
    actor: text("actor").notNull(),
  },
  (t) => [index("inventory_entries_batchId_idx").on(t.batchId)],
);
export const attachments = sqliteTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    targetId: text("targetId").notNull(),
    name: text("name").notNull(),
    size: integer("size").notNull(),
    mime: text("mime").notNull(),
    actor: text("actor").notNull(),
  },
  (t) => [check("attachments_size_ck", sql`${t.size} > 0`)],
);
export const audit_events = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    action: text("action").notNull(),
    actor: text("actor").notNull(),
    actorName: text("actorName"),
    target: text("target"),
    details: text("details"),
  },
  (t) => [],
);
export const weighing_corrections = sqliteTable(
  "weighing_corrections",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    receiptId: text("receiptId")
      .references(() => receipts.id)
      .notNull(),
    siteId: text("siteId")
      .references(() => sites.id)
      .notNull(),
    reason: text("reason").notNull(),
    actor: text("actor").notNull(),
    oldGross: integer("oldGross").notNull(),
    oldTare: integer("oldTare").notNull(),
    oldReject: integer("oldReject").notNull(),
    newGross: integer("newGross").notNull(),
    newTare: integer("newTare").notNull(),
    newReject: integer("newReject").notNull(),
  },
  (t) => [
    index("weighing_corrections_receiptId_idx").on(t.receiptId),
    index("weighing_corrections_siteId_idx").on(t.siteId),
    check("weighing_corrections_oldGross_ck", sql`${t.oldGross} >= 0`),
    check("weighing_corrections_oldTare_ck", sql`${t.oldTare} >= 0`),
    check("weighing_corrections_oldReject_ck", sql`${t.oldReject} >= 0`),
    check("weighing_corrections_newGross_ck", sql`${t.newGross} >= 0`),
    check("weighing_corrections_newTare_ck", sql`${t.newTare} >= 0`),
    check("weighing_corrections_newReject_ck", sql`${t.newReject} >= 0`),
  ],
);
export const rule_versions = sqliteTable(
  "rule_versions",
  {
    id: text("id").primaryKey(),
    created: text("created"),
    extra: text("extra").notNull().default("{}"),
    days: integer("days").notNull(),
    version: integer("version").notNull(),
    reason: text("reason").notNull(),
    actor: text("actor").notNull(),
  },
  (t) => [
    check("rule_versions_days_ck", sql`${t.days} > 0`),
    check("rule_versions_version_ck", sql`${t.version} > 0`),
  ],
);
export const relationalRevision = sqliteTable("relational_revision", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull(),
  migratedAt: text("migrated_at").notNull(),
});
export const commandFingerprints = sqliteTable("command_fingerprints", {
  id: text("id").primaryKey(),
  fingerprint: text("fingerprint").notNull(),
});
