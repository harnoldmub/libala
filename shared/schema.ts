import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// RSVP Responses table
export const rsvpResponses = pgTable("rsvp_responses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  partySize: integer("party_size").notNull().default(1), // 1 for Solo, 2 for Couple
  availability: varchar("availability", { length: 50 }).notNull().default('pending'), // '19-march', '21-march', 'both', 'unavailable', 'pending'
  tableNumber: integer("table_number"), // For seat assignment
  notes: text("notes"),

  // Guest Management Fields
  status: varchar("status", { length: 50 }).notNull().default('pending'), // 'pending', 'confirmed', 'declined'
  qrToken: varchar("qr_token").unique(), // Unique token for QR Code
  phone: varchar("phone", { length: 50 }), // International format

  // Timestamps
  invitationSentAt: timestamp("invitation_sent_at"),
  whatsappInvitationSentAt: timestamp("whatsapp_invitation_sent_at"),
  confirmedAt: timestamp("confirmed_at"),
  checkedInAt: timestamp("checked_in_at"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRsvpResponseSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().optional().nullable()
    .transform(val => !val || val === '' ? null : val)
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: "Veuillez entrer une adresse email valide"
    }),
  partySize: z.number().int().min(1).max(2, "Sélectionnez Solo (1) ou Couple (2)"),
  availability: z.enum(['19-march', '21-march', 'both', 'unavailable', 'pending'], {
    errorMap: () => ({ message: "Veuillez sélectionner une option" })
  }),
  phone: z.string().optional().nullable().transform(val => !val || val === '' ? null : val),
});

export const updateRsvpResponseSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().optional().nullable()
    .transform(val => !val || val === '' ? null : val)
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: "Veuillez entrer une adresse email valide"
    }),
  partySize: z.number().int().min(1).max(5, "Maximum 5 personnes"),
  availability: z.enum(['19-march', '21-march', 'both', 'unavailable', 'pending'], {
    errorMap: () => ({ message: "Veuillez sélectionner une option" })
  }),
  tableNumber: z.union([z.number().int().positive(), z.null(), z.undefined()]).optional(),
  notes: z.string().nullable().optional(),
  // Admin fields - accept strings and convert to dates
  status: z.string().optional(),
  phone: z.string().optional().nullable(),
  qrToken: z.string().optional().nullable(),
  invitationSentAt: z.union([z.string(), z.date()]).optional().nullable().transform(val => val ? new Date(val) : null),
  whatsappInvitationSentAt: z.union([z.string(), z.date()]).optional().nullable().transform(val => val ? new Date(val) : null),
  confirmedAt: z.union([z.string(), z.date()]).optional().nullable().transform(val => val ? new Date(val) : null),
  checkedInAt: z.union([z.string(), z.date()]).optional().nullable().transform(val => val ? new Date(val) : null),
});

export type InsertRsvpResponse = z.infer<typeof insertRsvpResponseSchema>;
export type UpdateRsvpResponse = z.infer<typeof updateRsvpResponseSchema>;
export type RsvpResponse = typeof rsvpResponses.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  rsvpResponses: many(rsvpResponses),
}));

export const rsvpResponsesRelations = relations(rsvpResponses, ({ one }) => ({
  assignedBy: one(users),
}));
