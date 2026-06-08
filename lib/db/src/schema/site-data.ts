import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const siteDataTable = pgTable("site_data", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type SiteData = typeof siteDataTable.$inferSelect;
