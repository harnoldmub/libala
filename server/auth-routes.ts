import { Router } from "express";
import { storage } from "./storage";
import { authService } from "./auth-service";
import { authEmails } from "./auth-emails";
import { signupSchema, loginSchema } from "@shared/schema";
import { validateRequest } from "./middleware/guards";
import passport from "passport";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiters for auth safety
const signupLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: "Trop de tentatives d'inscription. Réessayez dans une minute." });
const loginLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: "Trop de tentatives de connexion." });
const resendLimiter = rateLimit({ windowMs: 60 * 1000, max: 3 });

/**
 * SIGNUP
 */
router.post("/signup", signupLimiter, validateRequest(signupSchema), async (req, res) => {
    try {
        const { email, password, firstName } = req.body;
        const existing = await storage.getUserByEmail(email);

        if (existing) {
            // Don't leak if user exists, but give generic error or handle case
            return res.status(400).json({ message: "Cet email est déjà utilisé." });
        }

        const passwordHash = await authService.hashPassword(password);
        const user = await storage.upsertUser({
            email: email.toLowerCase(),
            passwordHash,
            firstName,
            isAdmin: false
        });

        // Create verification token
        const { rawToken, hashedToken } = authService.generateToken();
        await storage.createAuthToken({
            userId: user.id,
            tokenHash: hashedToken,
            type: "email_verification",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        });

        // Send email
        await authEmails.sendVerificationEmail(user.email, user.firstName || "Inconnu", rawToken);

        res.status(201).json({
            message: "Inscription réussie. Vérifiez vos emails pour activer votre compte.",
            user: { id: user.id, email: user.email }
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ message: "Erreur lors de l'inscription." });
    }
});

/**
 * LOGIN
 */
router.post("/login", loginLimiter, validateRequest(loginSchema), (req, res, next) => {
    return passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) return next(err);
        if (!user) {
            return res.status(401).json({ message: info?.message || "Identifiants invalides." });
        }

        if (!user.emailVerifiedAt) {
            return res.status(403).json({
                message: "Compte non vérifié. Veuillez confirmer votre adresse email.",
                canResend: true,
                email: user.email
            });
        }

        req.login(user, (err) => {
            if (err) return next(err);
            return res.json({ message: "Connexion réussie.", user });
        });
    })(req, res, next);
});

/**
 * EMAIL VERIFICATION
 */
router.get("/verify-email", async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Token manquant." });
    }

    try {
        const hashedToken = authService.hashToken(token);
        const authToken = await storage.getAuthTokenByHash(hashedToken);

        if (!authToken || authToken.type !== "email_verification" || authToken.usedAt || authToken.expiresAt < new Date()) {
            return res.status(400).json({ message: "Lien invalide ou expiré." });
        }

        await storage.updateUser(authToken.userId, { emailVerifiedAt: new Date() });
        await storage.consumeAuthToken(authToken.id);

        res.json({ message: "Votre email a été vérifié avec succès. Vous pouvez maintenant vous connecter." });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ message: "Erreur lors de la vérification." });
    }
});

/**
 * RESEND VERIFICATION
 */
router.post("/resend-verification", resendLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requis." });

    try {
        const user = await storage.getUserByEmail(email);
        if (!user || user.emailVerifiedAt) {
            return res.json({ message: "Si le compte existe et n'est pas vérifié, un email a été envoyé." });
        }

        const { rawToken, hashedToken } = authService.generateToken();
        await storage.createAuthToken({
            userId: user.id,
            tokenHash: hashedToken,
            type: "email_verification",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        await authEmails.sendVerificationEmail(user.email, user.firstName || "Inconnu", rawToken);
        res.json({ message: "Nouvel email envoyé." });
    } catch (error) {
        res.status(500).json({ message: "Erreur de serveur." });
    }
});

/**
 * FORGOT PASSWORD
 */
router.post("/forgot-password", resendLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requis." });

    try {
        const user = await storage.getUserByEmail(email);
        // Anti-enumeration: always return success
        if (user) {
            const { rawToken, hashedToken } = authService.generateToken();
            await storage.createAuthToken({
                userId: user.id,
                tokenHash: hashedToken,
                type: "password_reset",
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
            });
            await authEmails.sendPasswordResetEmail(user.email, rawToken);
        }
        res.json({ message: "Si un compte est associé à cet email, vous recevrez un lien de réinitialisation." });
    } catch (error) {
        res.status(500).json({ message: "Erreur de serveur." });
    }
});

/**
 * RESET PASSWORD
 */
router.post("/reset-password", async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Données manquantes." });

    try {
        const hashedToken = authService.hashToken(token);
        const authToken = await storage.getAuthTokenByHash(hashedToken);

        if (!authToken || authToken.type !== "password_reset" || authToken.usedAt || authToken.expiresAt < new Date()) {
            return res.status(400).json({ message: "Lien invalide ou expiré." });
        }

        const passwordHash = await authService.hashPassword(password);
        await storage.updateUser(authToken.userId, { passwordHash });
        await storage.consumeAuthToken(authToken.id);

        res.json({ message: "Votre mot de passe a été réinitialisé avec succès." });
    } catch (error) {
        res.status(500).json({ message: "Erreur de serveur." });
    }
});

/**
 * LOGOUT
 */
router.post("/logout", (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ message: "Erreur lors de la déconnexion." });
        res.json({ success: true });
    });
});

/**
 * CURRENT USER (ME)
 */
router.get("/me", (req, res) => {
    if (!req.isAuthenticated()) return res.json(null);
    res.json(req.user);
});

export default router;
