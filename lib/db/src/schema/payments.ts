import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const paymentRequestsTable = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  slotType: text("slot_type").notNull(),
  status: text("status").notNull().default("pending"),
  amount: integer("amount").notNull().default(5000),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const paymentMessagesTable = pgTable("payment_messages", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => paymentRequestsTable.id, { onDelete: "cascade" }),
  isAdmin: boolean("is_admin").notNull().default(false),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaymentRequest = typeof paymentRequestsTable.$inferSelect;
export type PaymentMessage = typeof paymentMessagesTable.$inferSelect;
