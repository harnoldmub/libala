import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  uuid,
  serial,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
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
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: text("password_hash"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  emailVerifiedAt: timestamp("email_verified_at"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Weddings storage table (Multi-tenancy)
export const weddings = pgTable("weddings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").references(() => users.id).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default('draft'), // 'draft', 'published', 'archived'
  weddingDate: timestamp("wedding_date"),
  datesConfig: varchar("dates_config", { length: 50 }).notNull().default('both'), // '19', '21', 'both'
  templateId: varchar("template_id", { length: 50 }).default('classic'),
  config: jsonb("config").$type<{
    theme: {
      primaryColor: string;
      secondaryColor: string;
      fontFamily: string;
    };
    seo: {
      title: string;
      description: string;
      ogImage?: string;
    };
    features: {
      jokesEnabled: boolean;
      giftsEnabled: boolean;
      cagnotteEnabled: boolean;
    };
  }>().notNull().default({
    theme: { primaryColor: '#D4AF37', secondaryColor: '#FFFFFF', fontFamily: 'serif' },
    seo: { title: 'Notre Mariage', description: 'Rejoignez-nous pour célébrer notre union' },
    features: { jokesEnabled: true, giftsEnabled: true, cagnotteEnabled: true },
    texts: {
      heroTitle: "", // Default: dynamic from title
      heroSubtitle: "Le Mariage de",
      weddingDate: "", // Default: dynamic from date
      rsvpTitle: "CONFIRMEZ VOTRE PRÉSENCE",
      rsvpDescription: "Nous serions ravis de vous compter parmi nous",
      locationTitle: "LIEU & ACCÈS",
      locationDescription: "Toutes les informations pour nous rejoindre",
      programTitle: "DÉROULEMENT",
      programDescription: "Le programme de notre journée"
    }
  } as Record<string, any>),
  currentPlan: varchar("current_plan", { length: 20 }).notNull().default('free'), // 'free', 'premium'
  isPublished: boolean("is_published").notNull().default(false), // Draft by default
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Wedding = typeof weddings.$inferSelect;
export type InsertWedding = typeof weddings.$inferInsert;

// Memberships (RBAC)
export const memberships = pgTable("memberships", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  weddingId: uuid("wedding_id").references(() => weddings.id).notNull(),
  role: varchar("role", { length: 20 }).notNull().default('editor'), // 'owner', 'admin', 'editor', 'viewer'
  createdAt: timestamp("created_at").defaultNow(),
});

// RSVP Responses table (Guests)
export const rsvpResponses = pgTable("rsvp_responses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  weddingId: uuid("wedding_id").references(() => weddings.id).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  partySize: integer("party_size").notNull().default(1),
  availability: varchar("availability", { length: 50 }).notNull().default('pending'), // 'confirmed', 'declined', 'pending'
  chosenDates: jsonb("chosen_dates").$type<string[]>().default([]),
  tableNumber: integer("table_number"),
  notes: text("notes"),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // 'pending', 'confirmed', 'declined'
  publicToken: varchar("public_token").unique().default(sql`gen_random_uuid()`),
  invitationSentAt: timestamp("invitation_sent_at"),
  whatsappInvitationSentAt: timestamp("whatsapp_invitation_sent_at"),
  confirmedAt: timestamp("confirmed_at"),
  checkedInAt: timestamp("checked_in_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type RsvpResponse = typeof rsvpResponses.$inferSelect;
export type InsertRsvpResponseDb = typeof rsvpResponses.$inferInsert;

// Contributions table
export const contributions = pgTable("contributions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  weddingId: uuid("wedding_id").references(() => weddings.id).notNull(),
  giftId: integer("gift_id").references(() => gifts.id),
  donorName: varchar("donor_name", { length: 255 }),
  donorEmail: varchar("donor_email", { length: 255 }),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default('eur'),
  message: text("message"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // 'pending', 'paid', 'failed', 'refunded'
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type Contribution = typeof contributions.$inferSelect;
export type InsertContributionDb = typeof contributions.$inferInsert;

// Gifts table
export const gifts = pgTable("gifts", {
  id: serial("id").primaryKey(),
  weddingId: uuid("wedding_id").references(() => weddings.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: integer("price"), // Total price of the gift
  contributedAmount: integer("contributed_amount").notNull().default(0),
  isReserved: boolean("is_reserved").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Gift = typeof gifts.$inferSelect;
export type InsertGift = typeof gifts.$inferInsert;

// Live Jokes table
export const liveJokes = pgTable("live_jokes", {
  id: serial("id").primaryKey(),
  weddingId: uuid("wedding_id").references(() => weddings.id).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }).default('funny'),
  tone: varchar("tone", { length: 20 }).default('safe'), // 'safe', 'fun', 'second-degree'
  isActive: boolean("is_active").notNull().default(true),
  frequency: integer("frequency").default(30), // Frequency in seconds
  createdAt: timestamp("created_at").defaultNow(),
});

export type LiveJoke = typeof liveJokes.$inferSelect;
export type InsertLiveJoke = typeof liveJokes.$inferInsert;

// Live Events (Activity Log / SSE)
export const liveEvents = pgTable("live_events", {
  id: serial("id").primaryKey(),
  weddingId: uuid("wedding_id").references(() => weddings.id).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'contribution_created', 'rsvp_updated', 'joke_shown'
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Emails Log
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  weddingId: uuid("wedding_id").references(() => weddings.id),
  guestId: integer("guest_id").references(() => rsvpResponses.id),
  type: varchar("type", { length: 50 }).notNull(),
  to: varchar("to", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull(), // 'sent', 'failed', 'delivered'
  providerId: varchar("provider_id", { length: 255 }),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stripe Subscriptions
export const stripeSubscriptions = pgTable("stripe_subscriptions", {
  id: serial("id").primaryKey(),
  weddingId: uuid("wedding_id").references(() => weddings.id).notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  priceId: varchar("price_id", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull(), // 'active', 'canceled', 'incomplete'
  currentPeriodEnd: timestamp("current_period_end"),
  featureFlags: jsonb("feature_flags").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stripe Webhook Events (Idempotency)
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: varchar("id").primaryKey(), // Stripe event ID
  type: varchar("type", { length: 100 }).notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
});

// Auth Tokens table (Email Verification & Password Reset)
export const authTokens = pgTable("auth_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(), // 'email_verification', 'password_reset'
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AuthToken = typeof authTokens.$inferSelect;
export type InsertAuthToken = typeof authTokens.$inferInsert;

// Zod Schemas for Validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  emailVerifiedAt: true,
  lastLoginAt: true
});
export const insertWeddingSchema = createInsertSchema(weddings).omit({ id: true, createdAt: true, updatedAt: true });

export const signupSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().min(1, "Le prénom est requis"),
});

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
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
  availability: z.enum(['confirmed', 'declined', 'pending'], {
    errorMap: () => ({ message: "Veuillez sélectionner une option" })
  }),
  phone: z.string().optional().nullable().transform(val => !val || val === '' ? null : val),
  notes: z.string().optional().nullable().transform(val => !val || val === '' ? null : val),
});

export type InsertRsvpResponse = z.infer<typeof insertRsvpResponseSchema>;

export const updateRsvpResponseSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().optional().nullable()
    .transform(val => !val || val === '' ? null : val)
    .refine(val => !val || z.string().email().safeParse(val).success, {
      message: "Veuillez entrer une adresse email valide"
    }),
  partySize: z.number().int().min(1).max(5, "Maximum 5 personnes"),
  availability: z.enum(['confirmed', 'declined', 'pending'], {
    errorMap: () => ({ message: "Veuillez sélectionner une option" })
  }),
  tableNumber: z.union([z.number().int().positive(), z.null(), z.undefined()]).optional(),
  notes: z.string().nullable().optional(),
  status: z.string().optional(),
  phone: z.string().optional().nullable(),
  publicToken: z.string().optional().nullable(),
  invitationSentAt: z.union([z.string(), z.date()]).optional().nullable().transform(val => val ? new Date(val) : null),
  whatsappInvitationSentAt: z.union([z.string(), z.date()]).optional().nullable().transform(val => val ? new Date(val) : null),
  confirmedAt: z.union([z.string(), z.date()]).optional().nullable().transform(val => val ? new Date(val) : null),
  checkedInAt: z.union([z.string(), z.date()]).optional().nullable().transform(val => val ? new Date(val) : null),
});

export type UpdateRsvpResponse = z.infer<typeof updateRsvpResponseSchema>;

export const insertContributionSchema = z.object({
  donorName: z.string().min(1, "Le nom est requis"),
  amount: z.number().int().min(100, "Le montant minimum est de 1 euro"),
  message: z.string().optional().nullable().transform(val => !val || val === '' ? null : val),
});

export type InsertContribution = z.infer<typeof insertContributionSchema>;

export const insertGiftSchema = createInsertSchema(gifts).omit({ id: true, createdAt: true });
export const insertLiveJokeSchema = createInsertSchema(liveJokes).omit({ id: true, createdAt: true });
export const insertAuthTokenSchema = createInsertSchema(authTokens).omit({ id: true, createdAt: true });

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, createdAt: true });

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  weddings: many(weddings),
  authTokens: many(authTokens),
  memberships: many(memberships),
}));

export const weddingsRelations = relations(weddings, ({ one, many }) => ({
  owner: one(users, {
    fields: [weddings.ownerId],
    references: [users.id],
  }),
  rsvpResponses: many(rsvpResponses),
  contributions: many(contributions),
  gifts: many(gifts),
  liveJokes: many(liveJokes),
  memberships: many(memberships),
  subscriptions: many(stripeSubscriptions),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  wedding: one(weddings, {
    fields: [memberships.weddingId],
    references: [weddings.id],
  }),
}));

export const rsvpResponsesRelations = relations(rsvpResponses, ({ one }) => ({
  wedding: one(weddings, {
    fields: [rsvpResponses.weddingId],
    references: [weddings.id],
  }),
}));

export const contributionsRelations = relations(contributions, ({ one }) => ({
  wedding: one(weddings, {
    fields: [contributions.weddingId],
    references: [weddings.id],
  }),
  gift: one(gifts, {
    fields: [contributions.giftId],
    references: [gifts.id],
  }),
}));

export const giftsRelations = relations(gifts, ({ one, many }) => ({
  wedding: one(weddings, {
    fields: [gifts.weddingId],
    references: [weddings.id],
  }),
  contributions: many(contributions),
}));

export const liveJokesRelations = relations(liveJokes, ({ one }) => ({
  wedding: one(weddings, {
    fields: [liveJokes.weddingId],
    references: [weddings.id],
  }),
}));

export const stripeSubscriptionsRelations = relations(stripeSubscriptions, ({ one }) => ({
  wedding: one(weddings, {
    fields: [stripeSubscriptions.weddingId],
    references: [weddings.id],
  }),
}));
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, {
    fields: [authTokens.userId],
    references: [users.id],
  }),
}));
