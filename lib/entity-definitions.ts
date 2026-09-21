// Authoritative typed columns. Extra contains only optional, evolving display metadata.
export const entityDefinitions = [
  {
    kind: "partner",
    table: "partners",
    fields: [
      {
        name: "name",
        type: "t",
      },
      {
        name: "contact",
        type: "t",
      },
      {
        name: "phone",
        type: "t",
      },
      {
        name: "address",
        type: "t",
      },
      {
        name: "active",
        type: "b",
      },
    ],
  },
  {
    kind: "site",
    table: "sites",
    fields: [
      {
        name: "name",
        type: "t",
      },
      {
        name: "address",
        type: "t",
      },
      {
        name: "capacity",
        type: "p",
      },
      {
        name: "active",
        type: "b",
      },
      {
        name: "zones",
        type: "j",
      },
    ],
  },
  {
    kind: "vehicle",
    table: "vehicles",
    fields: [
      {
        name: "name",
        type: "t",
      },
      {
        name: "capacity",
        type: "p",
      },
      {
        name: "active",
        type: "b",
      },
    ],
  },
  {
    kind: "project",
    table: "projects",
    fields: [
      {
        name: "name",
        type: "t",
      },
      {
        name: "location",
        type: "t",
      },
      {
        name: "target",
        type: "p",
      },
      {
        name: "manager",
        type: "t",
      },
      {
        name: "status",
        type: "t",
      },
    ],
  },
  {
    kind: "rule",
    table: "curing_rules",
    fields: [
      {
        name: "days",
        type: "p",
      },
      {
        name: "version",
        type: "p",
      },
      {
        name: "reason",
        type: "t",
      },
    ],
  },
  {
    kind: "trip",
    table: "trips",
    fields: [
      {
        name: "name",
        type: "t",
      },
      {
        name: "driverId",
        type: "t",
      },
      {
        name: "vehicleId",
        type: "@vehicle",
      },
      {
        name: "scheduled",
        type: "t",
      },
      {
        name: "status",
        type: "t",
      },
      {
        name: "pickupIds",
        type: "j",
      },
    ],
  },
  {
    kind: "pickup",
    table: "pickups",
    fields: [
      {
        name: "partnerId",
        type: "@partner",
      },
      {
        name: "expected",
        type: "p",
      },
      {
        name: "scheduled",
        type: "t",
      },
      {
        name: "buckets",
        type: "p",
      },
      {
        name: "status",
        type: "t",
      },
      {
        name: "tripId",
        type: "?t",
      },
      {
        name: "collectedWeight",
        type: "?n",
      },
      {
        name: "collectedAt",
        type: "?t",
      },
      {
        name: "externalRef",
        type: "?t",
      },
      {
        name: "notes",
        type: "?t",
      },
    ],
  },
  {
    kind: "receipt",
    table: "receipts",
    fields: [
      {
        name: "pickupId",
        type: "@pickup",
      },
      {
        name: "partnerId",
        type: "@partner",
      },
      {
        name: "siteId",
        type: "@site",
      },
      {
        name: "gross",
        type: "p",
      },
      {
        name: "tare",
        type: "n",
      },
      {
        name: "reject",
        type: "n",
      },
      {
        name: "accepted",
        type: "n",
      },
      {
        name: "reason",
        type: "t",
      },
      {
        name: "status",
        type: "t",
      },
    ],
  },
  {
    kind: "batch",
    table: "batches",
    fields: [
      {
        name: "name",
        type: "t",
      },
      {
        name: "siteId",
        type: "@site",
      },
      {
        name: "zone",
        type: "t",
      },
      {
        name: "status",
        type: "t",
      },
      {
        name: "quality",
        type: "t",
      },
      {
        name: "sealedAt",
        type: "?t",
      },
      {
        name: "due",
        type: "?t",
      },
      {
        name: "days",
        type: "?p",
      },
      {
        name: "ruleVersion",
        type: "?p",
      },
      {
        name: "releasedAt",
        type: "?t",
      },
    ],
  },
  {
    kind: "input",
    table: "batch_inputs",
    fields: [
      {
        name: "batchId",
        type: "@batch",
      },
      {
        name: "receiptId",
        type: "@receipt",
      },
      {
        name: "qty",
        type: "p",
      },
    ],
  },
  {
    kind: "inspection",
    table: "inspections",
    fields: [
      {
        name: "batchId",
        type: "@batch",
      },
      {
        name: "result",
        type: "t",
      },
      {
        name: "notes",
        type: "t",
      },
      {
        name: "actor",
        type: "t",
      },
    ],
  },
  {
    kind: "demand",
    table: "demands",
    fields: [
      {
        name: "projectId",
        type: "@project",
      },
      {
        name: "qty",
        type: "p",
      },
      {
        name: "due",
        type: "t",
      },
      {
        name: "notes",
        type: "t",
      },
      {
        name: "status",
        type: "t",
      },
    ],
  },
  {
    kind: "reservation",
    table: "reservations",
    fields: [
      {
        name: "demandId",
        type: "@demand",
      },
      {
        name: "projectId",
        type: "@project",
      },
      {
        name: "batchId",
        type: "@batch",
      },
      {
        name: "qty",
        type: "p",
      },
      {
        name: "shipped",
        type: "n",
      },
      {
        name: "status",
        type: "t",
      },
      {
        name: "reason",
        type: "?t",
      },
    ],
  },
  {
    kind: "dispatch",
    table: "dispatches",
    fields: [
      {
        name: "reservationId",
        type: "@reservation",
      },
      {
        name: "demandId",
        type: "@demand",
      },
      {
        name: "projectId",
        type: "@project",
      },
      {
        name: "batchId",
        type: "@batch",
      },
      {
        name: "siteId",
        type: "@site",
      },
      {
        name: "qty",
        type: "p",
      },
      {
        name: "vehicle",
        type: "t",
      },
      {
        name: "status",
        type: "t",
      },
      {
        name: "received",
        type: "?n",
      },
      {
        name: "receivedAt",
        type: "?t",
      },
      {
        name: "reason",
        type: "?t",
      },
    ],
  },
  {
    kind: "deployment",
    table: "deployments",
    fields: [
      {
        name: "dispatchId",
        type: "@dispatch",
      },
      {
        name: "batchId",
        type: "@batch",
      },
      {
        name: "projectId",
        type: "@project",
      },
      {
        name: "qty",
        type: "p",
      },
      {
        name: "date",
        type: "t",
      },
      {
        name: "location",
        type: "t",
      },
      {
        name: "notes",
        type: "t",
      },
    ],
  },
  {
    kind: "adjustment",
    table: "adjustments",
    fields: [
      {
        name: "batchId",
        type: "@batch",
      },
      {
        name: "siteId",
        type: "@site",
      },
      {
        name: "type",
        type: "t",
      },
      {
        name: "qty",
        type: "p",
      },
      {
        name: "reason",
        type: "t",
      },
      {
        name: "status",
        type: "t",
      },
      {
        name: "requester",
        type: "t",
      },
      {
        name: "approver",
        type: "?t",
      },
      {
        name: "dispatchId",
        type: "?@dispatch",
      },
      {
        name: "projectId",
        type: "?@project",
      },
    ],
  },
  {
    kind: "ledger",
    table: "inventory_entries",
    fields: [
      {
        name: "batchId",
        type: "@batch",
      },
      {
        name: "delta",
        type: "i",
      },
      {
        name: "reason",
        type: "t",
      },
      {
        name: "ref",
        type: "t",
      },
      {
        name: "actor",
        type: "t",
      },
    ],
  },
  {
    kind: "attachment",
    table: "attachments",
    fields: [
      {
        name: "targetId",
        type: "t",
      },
      {
        name: "name",
        type: "t",
      },
      {
        name: "size",
        type: "p",
      },
      {
        name: "mime",
        type: "t",
      },
      {
        name: "actor",
        type: "t",
      },
    ],
  },
  {
    kind: "audit",
    table: "audit_events",
    fields: [
      {
        name: "action",
        type: "t",
      },
      {
        name: "actor",
        type: "t",
      },
      {
        name: "actorName",
        type: "?t",
      },
      {
        name: "target",
        type: "?t",
      },
      {
        name: "details",
        type: "?t",
      },
    ],
  },
  {
    kind: "correction",
    table: "weighing_corrections",
    fields: [
      {
        name: "receiptId",
        type: "@receipt",
      },
      {
        name: "siteId",
        type: "@site",
      },
      {
        name: "reason",
        type: "t",
      },
      {
        name: "actor",
        type: "t",
      },
      {
        name: "oldGross",
        type: "n",
      },
      {
        name: "oldTare",
        type: "n",
      },
      {
        name: "oldReject",
        type: "n",
      },
      {
        name: "newGross",
        type: "n",
      },
      {
        name: "newTare",
        type: "n",
      },
      {
        name: "newReject",
        type: "n",
      },
    ],
  },
  {
    kind: "ruleHistory",
    table: "rule_versions",
    fields: [
      {
        name: "days",
        type: "p",
      },
      {
        name: "version",
        type: "p",
      },
      {
        name: "reason",
        type: "t",
      },
      {
        name: "actor",
        type: "t",
      },
    ],
  },
] as const;
