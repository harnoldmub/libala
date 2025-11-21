import {
  users,
  rsvpResponses,
  type User,
  type UpsertUser,
  type RsvpResponse,
  type InsertRsvpResponse,
  type UpdateRsvpResponse,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ne } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT - mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // RSVP operations
  createRsvpResponse(response: InsertRsvpResponse): Promise<RsvpResponse>;
  getRsvpResponse(id: number): Promise<RsvpResponse | undefined>;
  getAllRsvpResponses(): Promise<RsvpResponse[]>;
  updateRsvpTableNumber(id: number, tableNumber: number | null): Promise<RsvpResponse>;
  deleteRsvpResponse(id: number): Promise<void>;
  updateRsvpResponse(id: number, response: UpdateRsvpResponse): Promise<RsvpResponse>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT - mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Proper upsert handling for Replit Auth:
    // - ID (sub) is the primary identity and source of truth
    // - Email can change for the same user
    // - If email collision occurs with different ID, clear that user's email first
    
    return await db.transaction(async (tx) => {
      // If userData has an email, check for email conflicts with different IDs
      if (userData.email && userData.id) {
        // Clear email from any other user that has this email
        await tx
          .update(users)
          .set({ email: null })
          .where(
            and(
              eq(users.email, userData.email),
              ne(users.id, userData.id)
            )
          );
      }
      
      // Now safely upsert by ID (primary key)
      const [user] = await tx
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      return user;
    });
  }

  // RSVP operations
  async createRsvpResponse(responseData: InsertRsvpResponse): Promise<RsvpResponse> {
    const [response] = await db
      .insert(rsvpResponses)
      .values(responseData)
      .returning();
    return response;
  }

  async getRsvpResponse(id: number): Promise<RsvpResponse | undefined> {
    const [response] = await db
      .select()
      .from(rsvpResponses)
      .where(eq(rsvpResponses.id, id));
    return response;
  }

  async getAllRsvpResponses(): Promise<RsvpResponse[]> {
    return await db.select().from(rsvpResponses);
  }

  async updateRsvpTableNumber(id: number, tableNumber: number | null): Promise<RsvpResponse> {
    const [response] = await db
      .update(rsvpResponses)
      .set({ tableNumber })
      .where(eq(rsvpResponses.id, id))
      .returning();
    return response;
  }

  async deleteRsvpResponse(id: number): Promise<void> {
    await db.delete(rsvpResponses).where(eq(rsvpResponses.id, id));
  }

  async updateRsvpResponse(id: number, responseData: UpdateRsvpResponse): Promise<RsvpResponse> {
    const [response] = await db
      .update(rsvpResponses)
      .set(responseData)
      .where(eq(rsvpResponses.id, id))
      .returning();
    return response;
  }
}

export const storage = new DatabaseStorage();
