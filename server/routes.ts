import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { getSession } from "./replitAuth";
import { setupLocalAuth, isLocallyAuthenticated } from "./localAuth";
import { insertRsvpResponseSchema, updateRsvpResponseSchema } from "@shared/schema";
import { sendRsvpConfirmationEmail, sendPersonalizedInvitation, sendGuestConfirmationEmail } from "./email";
import passport from "passport";

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize/deserialize user
  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));

  // Local auth setup
  setupLocalAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Return null if not authenticated instead of 401
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.json(null);
      }

      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de l'utilisateur" });
    }
  });

  // RSVP routes
  app.post("/api/rsvp", async (req, res) => {
    try {
      console.log("POST /api/rsvp - Request body:", JSON.stringify(req.body, null, 2));
      const validated = insertRsvpResponseSchema.parse(req.body);
      console.log("POST /api/rsvp - Validated data:", JSON.stringify(validated, null, 2));

      // Check for duplicates (same email + firstname)
      if (validated.email) {
        const existing = await storage.getRsvpByEmailAndFirstName(validated.email, validated.firstName);
        if (existing) {
          return res.status(409).json({
            message: "Vous êtes déjà inscrit avec cette adresse email et ce prénom."
          });
        }
      }

      const response = await storage.createRsvpResponse(validated);

      // Send email confirmation to couple (non-blocking)
      sendRsvpConfirmationEmail({
        firstName: response.firstName,
        lastName: response.lastName,
        availability: response.availability,
      }).catch(err => {
        console.error("Failed to send RSVP confirmation email:", err);
      });

      // Send confirmation email to guest if they provided an email (non-blocking)
      if (response.email) {
        sendGuestConfirmationEmail({
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName,
          availability: response.availability,
        }).catch(err => {
          console.error("Failed to send guest confirmation email:", err);
        });
      }

      res.json(response);
    } catch (error) {
      console.error("Error creating RSVP:", error);
      // If it's a Zod error, log the issues
      if (error && typeof error === 'object' && 'issues' in error) {
        console.error("Zod validation issues:", JSON.stringify((error as any).issues, null, 2));
        return res.status(400).json({
          message: "Données invalides",
          details: (error as any).issues
        });
      }
      res.status(400).json({ message: "Données de requête invalides" });
    }
  });

  app.get("/api/rsvp", isLocallyAuthenticated, async (req, res) => {
    try {
      const responses = await storage.getAllRsvpResponses();
      res.json(responses);
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des RSVP" });
    }
  });

  app.patch("/api/rsvp/:id", isLocallyAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { tableNumber } = req.body;
      const response = await storage.updateRsvpTableNumber(id, tableNumber);
      res.json(response);
    } catch (error) {
      console.error("Error updating RSVP:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du RSVP" });
    }
  });

  app.delete("/api/rsvp/:id", isLocallyAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRsvpResponse(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting RSVP:", error);
      res.status(500).json({ message: "Erreur lors de la suppression du RSVP" });
    }
  });

  app.put("/api/rsvp/:id", isLocallyAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("PUT /api/rsvp/:id - Request body:", JSON.stringify(req.body, null, 2));
      const validated = updateRsvpResponseSchema.parse(req.body);
      console.log("PUT /api/rsvp/:id - Validated data:", JSON.stringify(validated, null, 2));
      const response = await storage.updateRsvpResponse(id, validated);
      res.json(response);
    } catch (error) {
      console.error("Error updating RSVP:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
      // If it's a Zod error, log the issues
      if (error && typeof error === 'object' && 'issues' in error) {
        console.error("Zod validation issues:", JSON.stringify((error as any).issues, null, 2));
      }
      res.status(400).json({
        message: "Données de requête invalides",
        error: error instanceof Error ? error.message : String(error),
        details: error && typeof error === 'object' && 'issues' in error ? (error as any).issues : undefined
      });
    }
  });
  // Bulk Confirm Route
  app.post("/api/rsvp/bulk-confirm", isLocallyAuthenticated, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "Liste d'identifiants requise" });
      }

      for (const id of ids) {
        const guest = await storage.getRsvpResponse(id);
        if (guest) {
          // Update status and confirmedAt
          await storage.updateRsvpResponse(id, {
            firstName: guest.firstName,
            lastName: guest.lastName,
            partySize: guest.partySize,
            availability: guest.availability,
            status: 'confirmed',
            confirmedAt: new Date()
          } as any);
        }
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error bulk confirming:", error);
      res.status(500).json({ message: "Erreur lors de la confirmation" });
    }
  });

  // Check-in Route
  app.get("/api/checkin", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Token requis" });
      }

      const guest = await storage.getRsvpResponseByQrToken(token);
      if (!guest) {
        return res.status(404).json({ message: "Invité non trouvé ou token invalide" });
      }

      res.json({
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
        partySize: guest.partySize,
        tableNumber: guest.tableNumber,
        status: guest.status,
        availability: guest.availability,
        checkedInAt: guest.checkedInAt,
        groupType: guest.partySize > 1 ? 'Couple' : 'Solo'
      });
    } catch (error) {
      console.error("Check-in error:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Mark Guest as Checked In
  app.post("/api/checkin/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const guest = await storage.getRsvpResponse(id);
      if (!guest) return res.status(404).json({ message: "Invité non trouvé" });

      await storage.updateRsvpResponse(id, {
        ...guest,
        checkedInAt: new Date(),
        status: 'confirmed' // Ensure they are confirmed if checking in
      } as any);

      res.json({ success: true });
    } catch (error) {
      console.error("Check-in confirmation error:", error);
      res.status(500).json({ message: "Erreur lors de l'enregistrement" });
    }
  });

  // Send Invitation (Email) - Specific Guest
  app.post("/api/rsvp/:id/send-invitation", isLocallyAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      let guest = await storage.getRsvpResponse(id);
      if (!guest) return res.status(404).json({ message: "Invité non trouvé" });

      if (!guest.email) return res.status(400).json({ message: "Email manquant pour cet invité" });

      // Generate token if missing
      let qrToken = guest.qrToken;
      if (!qrToken) {
        qrToken = crypto.randomUUID();
        guest = await storage.updateRsvpResponse(id, {
          ...guest,
          qrToken
        } as any);
      }

      // Send Email
      if (!guest.email) {
        // Should not happen as we checked before, but after update guest is refreshed
        return res.status(400).json({ message: "Email manquant" });
      }

      await sendPersonalizedInvitation({
        email: guest.email,
        firstName: guest.firstName,
        lastName: guest.lastName,
        qrToken: qrToken
      });

      // Update Timestamp
      await storage.updateRsvpResponse(id, {
        ...guest,
        invitationSentAt: new Date()
      } as any);

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur lors de l'envoi de l'invitation" });
    }
  });

  // Resend Confirmation Email - Specific Guest
  app.post("/api/rsvp/:id/resend-confirmation", isLocallyAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const guest = await storage.getRsvpResponse(id);
      if (!guest) return res.status(404).json({ message: "Invité non trouvé" });

      if (!guest.email) return res.status(400).json({ message: "Email manquant pour cet invité" });

      if (!guest.availability || guest.availability === 'pending') {
        return res.status(400).json({ message: "Cet invité n'a pas encore répondu au RSVP" });
      }

      await sendGuestConfirmationEmail({
        email: guest.email,
        firstName: guest.firstName,
        lastName: guest.lastName,
        availability: guest.availability
      });

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur lors de l'envoi du mail de confirmation" });
    }
  });

  // WhatsApp Log Route
  app.post("/api/rsvp/:id/whatsapp-log", isLocallyAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      let guest = await storage.getRsvpResponse(id);
      if (!guest) return res.status(404).json({ message: "Invité non trouvé" });

      // Generate token if missing
      let qrToken = guest.qrToken;
      if (!qrToken) {
        qrToken = crypto.randomUUID();
        guest = await storage.updateRsvpResponse(id, {
          ...guest,
          qrToken
        } as any);
      }

      // Update Timestamp
      await storage.updateRsvpResponse(id, {
        ...guest,
        whatsappInvitationSentAt: new Date()
      } as any);

      res.json({
        success: true,
        phone: guest.phone,
        qrToken
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur lors de l'enregistrement WhatsApp" });
    }
  });

  // Public Guest Lookup (for Invitation)
  app.get("/api/guests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Identifiant invalide" });
      }

      const response = await storage.getRsvpResponse(id);

      // Check if guest exists
      if (!response) {
        return res.status(404).json({ message: "Invité non trouvé" });
      }

      // Check if table is assigned (Confirmation logic) - DISABLED per user request
      /* if (!response.tableNumber) {
        return res.status(403).json({ message: "Votre invitation est en cours de traitement. Veuillez réessayer plus tard." });
      } */

      // Return public info only
      res.json({
        firstName: response.firstName,
        lastName: response.lastName,
        tableNumber: response.tableNumber,
        partySize: response.partySize,
        availability: response.availability
      });
    } catch (error) {
      console.error("Error fetching guest:", error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  });

  // Bulk Import Route
  app.post("/api/rsvp/bulk", isLocallyAuthenticated, async (req, res) => {
    try {
      const guests = req.body;
      if (!Array.isArray(guests)) {
        return res.status(400).json({ message: "L'entrée doit être un tableau" });
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (const guest of guests) {
        try {
          // Default values for bulk import
          const guestData = {
            ...guest,
            email: guest.email || null,
            availability: 'pending', // Default to pending
          };

          await storage.createRsvpResponse(guestData);
          results.success++;
        } catch (error: any) {
          console.error("Error importing guest:", guest, error);
          results.failed++;
          results.errors.push(`Guest ${guest.firstName} ${guest.lastName}: ${error.message}`);
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error in bulk import:", error);
      res.status(500).json({ message: "Erreur lors de l'import en masse" });
    }
  });

  // CSV export route
  app.get("/api/rsvp/export/csv", isLocallyAuthenticated, async (req, res) => {
    try {
      const responses = await storage.getAllRsvpResponses();

      // Create CSV content
      const headers = ['ID', 'Prénom', 'Nom', 'Disponibilité', 'Numéro de table', 'Date de réponse'];
      const csvRows = [headers.join(',')];

      responses.forEach(response => {
        const availabilityText = {
          '19-march': '19 mars',
          '21-march': '21 mars',
          'both': 'Les deux dates',
          'unavailable': 'Pas disponible'
        }[response.availability] || response.availability;

        const row = [
          response.id,
          `"${response.firstName}"`,
          `"${response.lastName}"`,
          `"${availabilityText}"`,
          response.tableNumber || '',
          response.createdAt ? new Date(response.createdAt).toLocaleDateString('fr-FR') : ''
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="rsvp-golden-love-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\uFEFF' + csvContent); // BOM for Excel UTF-8 support
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ message: "Erreur lors de l'export CSV" });
    }
  });

  // Send invitation email route (Legacy or Generic)
  app.post("/api/send-invitation", isLocallyAuthenticated, async (req, res) => {
    try {
      const { email, firstName, lastName, message } = req.body;

      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, prénom et nom requis" });
      }

      await sendPersonalizedInvitation({
        email,
        firstName,
        lastName,
        message,
      });

      res.json({ success: true, message: "Invitation envoyée avec succès" });
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: "Échec de l'envoi de l'invitation" });
    }
  });

  // Generate invitation PDF
  app.post("/api/invitation/generate/:id", isLocallyAuthenticated, async (req, res) => {
    try {
      const { generateInvitationPDF } = await import("./invitation-service");
      const id = parseInt(req.params.id);
      const type = req.query.type as '19' | '21' | undefined; // Get type from query

      const response = await storage.getRsvpResponse(id);
      if (!response) {
        return res.status(404).json({ message: "Guest not found" });
      }

      const pdfBuffer = await generateInvitationPDF({
        id: response.id,
        firstName: response.firstName,
        lastName: response.lastName,
        tableNumber: response.tableNumber,
        type // Pass to service
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="invitation-${response.firstName}-${response.lastName}-${type || 'full'}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating invitation:", error);
      res.status(500).json({ message: "Erreur lors de la génération de l'invitation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

