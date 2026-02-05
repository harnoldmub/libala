import bcrypt from "bcryptjs";
import crypto from "crypto";
import { type AuthToken, type User } from "@shared/schema";

/**
 * AuthService handles security-sensitive operations:
 * - Password hashing and verification
 * - Secure token generation and hashing
 */
export const authService = {
    /**
     * Hash a plain-text password.
     */
    async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    },

    /**
     * Comparative check for password verification.
     */
    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(password, hash);
    },

    /**
     * Generates a secure random token and its SHA-256 hash for database storage.
     * NEVER store the raw token in the DB.
     */
    generateToken(): { rawToken: string; hashedToken: string } {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = authService.hashToken(rawToken);
        return { rawToken, hashedToken };
    },

    /**
     * Deterministic SHA-256 hash of a token.
     */
    hashToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex");
    },

    /**
     * Validates if a token matches its hashed version and is not expired/used.
     */
    isTokenValid(token: string, authToken: AuthToken): boolean {
        const hashedInput = authService.hashToken(token);
        const matches = hashedInput === authToken.tokenHash;
        const isExpired = authToken.expiresAt < new Date();
        const isUsed = !!authToken.usedAt;

        return matches && !isExpired && !isUsed;
    }
};
