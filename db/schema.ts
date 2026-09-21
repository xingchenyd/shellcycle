export * from "./entities";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const records = sqliteTable(
  "business_records",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    data: text("data").notNull(),
  },
  (t) => [index("records_kind").on(t.kind)],
);
export const revision = sqliteTable("business_revision", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull(),
});
export const guard = sqliteTable("transaction_guard", {
  id: text("id").primaryKey(),
  valid: integer("valid").notNull(),
});
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  scope: text("scope").notNull(),
  hash: text("hash").notNull(),
  salt: text("salt").notNull(),
  active: integer("active").notNull().default(1),
});
export const sessions = sqliteTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    expires: integer("expires").notNull(),
  },
  (t) => [index("sessions_user").on(t.userId)],
);
export const attempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  until: integer("until").notNull(),
});
export const commands = sqliteTable("commands", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  result: text("result").notNull(),
  created: text("created").notNull(),
});
