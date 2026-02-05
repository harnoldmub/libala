import express, { type Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertRsvpResponseSchema, updateRsvpResponseSchema, insertContributionSchema, insertGiftSchema } from "@shared/schema";
import { sendRsvpConfirmationEmail, sendPersonalizedInvitation, sendGuestConfirmationEmail, sendContributionNotification, sendContributorThankYou, sendDateChangeApologyEmail } from "./email";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { liveService } from "./live-service";
import authRouter from "./auth-routes";

import { withWedding, requireRole, requirePremium, validateRequest } from "./middleware/guards";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Unified Auth (Magic Link + Sessions)
  setupAuth(app);

  // Auth routes
  app.use("/api/auth", authRouter);

  // Wedding routes
  app.get("/api/weddings", async (req, res) => {
    try {
      // Check if requesting by slug (public access)
      const slug = req.headers['x-wedding-slug'] as string;
      if (slug) {
        const wedding = await storage.getWeddingBySlug(slug);
        if (!wedding) {
          return res.status(404).json({ message: "Mariage non trouvé" });
        }

        // Check if wedding is published (unless user is the owner)
        if (!wedding.isPublished && (!req.user || (req.user as any).id !== wedding.ownerId)) {
          return res.status(404).json({ message: "Ce site n'est pas encore publié" });
        }

        return res.json([wedding]); // Return as array for compatibility with useWedding hook
      }

      // Otherwise, require authentication and return user's weddings
      if (!req.user) {
        return res.status(401).json({ message: "Non authentifié" });
      }

      const ownerId = (req.user as any).id;
      const weddings = await storage.getWeddingsByOwner(ownerId);
      res.json(weddings);
    } catch (error) {
      console.error("Error fetching weddings:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des mariages" });
    }
  });

  app.post("/api/weddings", isAuthenticated, async (req, res) => {
    try {
      const { title, slug, weddingDate, templateId } = req.body;
      const ownerId = (req.user as any).id;

      if (!title || !slug) {
        return res.status(400).json({ message: "Le titre et le slug sont requis" });
      }

      const existing = await storage.getWeddingBySlug(slug);
      if (existing) {
        return res.status(409).json({ message: "Cette URL est déjà utilisée par un autre mariage" });
      }

      const wedding = await storage.createWedding({
        ownerId,
        slug: slug.toLowerCase(),
        title,
        weddingDate: weddingDate ? new Date(weddingDate) : null,
        config: {
          theme: { primaryColor: '#D4AF37', secondaryColor: '#FFFFFF', fontFamily: 'serif' },
          seo: { title: title, description: 'Rejoignez-nous pour célébrer notre union' },
          features: { jokesEnabled: true, giftsEnabled: true, cagnotteEnabled: true }
        },
        currentPlan: 'premium',
        templateId: templateId || 'classic',
      });

      res.status(201).json(wedding);
    } catch (error) {
      console.error("Error creating wedding:", error);
      res.status(500).json({ message: "Erreur lors de la création du mariage" });
    }
  });

  app.patch("/api/weddings/:id", isAuthenticated, async (req, res) => {
    try {
      const weddingId = req.params.id;
      const ownerId = (req.user as any).id;

      // Verify ownership
      const wedding = await storage.getWedding(weddingId);
      if (!wedding || wedding.ownerId !== ownerId) {
        return res.status(403).json({ message: "Non autorisé" });
      }

      const { templateId, currentPlan, title, weddingDate, config } = req.body;
      const updates: any = {};

      if (templateId !== undefined) updates.templateId = templateId;
      if (currentPlan !== undefined) updates.currentPlan = currentPlan;
      if (title !== undefined) updates.title = title;
      if (weddingDate !== undefined) updates.weddingDate = weddingDate ? new Date(weddingDate) : null;
      if (config !== undefined) updates.config = config;

      const updatedWedding = await storage.updateWedding(weddingId, updates);
      res.json(updatedWedding);
    } catch (error) {
      console.error("Error updating wedding:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du mariage" });
    }
  });

  // RSVP routes
  app.post("/api/rsvp", withWedding, async (req, res) => {
    try {
      const validated = insertRsvpResponseSchema.parse(req.body);
      const wedding = (req as any).wedding;

      // Check for duplicates (same email + firstname)
      if (validated.email) {
        const existing = await storage.getRsvpByEmailAndFirstName(wedding.id, validated.email, validated.firstName);
        if (existing) {
          return res.status(409).json({
            message: "Vous êtes déjà inscrit avec cette adresse email et ce prénom."
          });
        }
      }

      const response = await storage.createRsvpResponse(wedding.id, validated);

      // Send email confirmation to couple (non-blocking)
      sendRsvpConfirmationEmail(wedding, {
        firstName: response.firstName,
        lastName: response.lastName,
        availability: response.availability,
      }).catch(err => {
        console.error("Failed to send RSVP confirmation email:", err);
      });

      // Send confirmation email to guest if they provided an email (non-blocking)
      if (response.email) {
        sendGuestConfirmationEmail(wedding, {
          email: response.email,
          firstName: response.firstName,
          lastName: response.lastName,
          availability: response.availability,
        }).catch(err => {
          console.error("Failed to send guest confirmation email:", err);
        });
      }

      res.json(response);

      // Broadcast new RSVP
      liveService.broadcast(wedding.id, 'RSVP_RECEIVED', response);
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

  app.get("/api/rsvp", isAuthenticated, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const responses = await storage.getAllRsvpResponses(wedding.id);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des RSVP" });
    }
  });

  app.patch("/api/rsvp/:id", isAuthenticated, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      const { tableNumber } = req.body;
      const response = await storage.updateRsvpResponse(wedding.id, id, { tableNumber });
      res.json(response);
    } catch (error) {
      console.error("Error updating RSVP:", error);
      res.status(500).json({ message: "Erreur lors de la mise à jour du RSVP" });
    }
  });

  app.delete("/api/rsvp/:id", isAuthenticated, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      await storage.deleteRsvpResponse(wedding.id, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting RSVP:", error);
      res.status(500).json({ message: "Erreur lors de la suppression du RSVP" });
    }
  });

  app.put("/api/rsvp/:id", isAuthenticated, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      console.log("PUT /api/rsvp/:id - Request body:", JSON.stringify(req.body, null, 2));

      // Get the current guest data before update to detect availability changes
      const currentGuest = await storage.getRsvpResponse(wedding.id, id);
      const previousAvailability = currentGuest?.availability;

      const validated = updateRsvpResponseSchema.parse(req.body);
      console.log("PUT /api/rsvp/:id - Validated data:", JSON.stringify(validated, null, 2));
      const response = await storage.updateRsvpResponse(wedding.id, id, validated);

      // Check if availability changed
      const newAvailability = validated.availability;
      if (previousAvailability !== newAvailability && newAvailability === 'declined') {
        // Option to send apology/thank you etc
      }

      // Map publicToken to qrToken for legacy frontend components if needed
      const mappedResponse = {
        ...response,
        publicToken: response.publicToken
      } as any;
      res.json(mappedResponse);
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
  app.post("/api/rsvp/bulk-confirm", isAuthenticated, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "Liste d'identifiants requise" });
      }

      const wedding = (req as any).wedding;
      for (const id of ids) {
        const guest = await storage.getRsvpResponse(wedding.id, id);
        if (guest) {
          // Update status and confirmedAt
          await storage.updateRsvpResponse(wedding.id, id, {
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

  // Bulk Send Invitation Route
  app.post("/api/rsvp/bulk-send-invitation", isAuthenticated, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "Liste d'identifiants requise" });
      }

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      const wedding = (req as any).wedding;
      for (const id of ids) {
        try {
          let guest = await storage.getRsvpResponse(wedding.id, id);
          if (!guest) {
            errors.push(`Invité ${id} non trouvé`);
            failCount++;
            continue;
          }
          if (!guest.email) {
            errors.push(`${guest.firstName} ${guest.lastName}: pas d'email`);
            failCount++;
            continue;
          }

          // Generate token if missing
          let publicToken = guest.publicToken;
          if (!publicToken) {
            publicToken = crypto.randomUUID();
            guest = await storage.updateRsvpResponse(wedding.id, id, {
              ...guest,
              publicToken
            } as any);
          }

          await sendPersonalizedInvitation(wedding, {
            id: guest.id,
            email: guest.email!,
            firstName: guest.firstName,
            lastName: guest.lastName,
            publicToken: publicToken
          } as any);

          // Update Timestamp and set status to confirmed
          await storage.updateRsvpResponse(wedding.id, id, {
            ...guest,
            invitationSentAt: new Date(),
            status: 'confirmed'
          } as any);

          successCount++;
        } catch (err) {
          console.error(`Error sending invitation to ${id}:`, err);
          failCount++;
        }
      }

      res.json({ success: true, sent: successCount, failed: failCount, errors });
    } catch (error) {
      console.error("Error bulk sending invitations:", error);
      res.status(500).json({ message: "Erreur lors de l'envoi des invitations" });
    }
  });

  // Bulk Resend Confirmation Route
  app.post("/api/rsvp/bulk-resend-confirmation", isAuthenticated, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "Liste d'identifiants requise" });
      }

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      const wedding = (req as any).wedding;
      for (const id of ids) {
        try {
          const guest = await storage.getRsvpResponse(wedding.id, id);
          if (!guest) {
            errors.push(`Invité ${id} non trouvé`);
            failCount++;
            continue;
          }
          if (!guest.email) {
            errors.push(`${guest.firstName} ${guest.lastName}: pas d'email`);
            failCount++;
            continue;
          }
          if (!guest.availability || guest.availability === 'pending') {
            errors.push(`${guest.firstName} ${guest.lastName}: n'a pas encore répondu`);
            failCount++;
            continue;
          }

          await sendGuestConfirmationEmail(wedding, {
            email: guest.email,
            firstName: guest.firstName,
            lastName: guest.lastName,
            availability: guest.availability
          });

          successCount++;
        } catch (err) {
          console.error(`Error sending confirmation to ${id}:`, err);
          failCount++;
        }
      }

      res.json({ success: true, sent: successCount, failed: failCount, errors });
    } catch (error) {
      console.error("Error bulk sending confirmations:", error);
      res.status(500).json({ message: "Erreur lors de l'envoi des confirmations" });
    }
  });

  // Site Configuration (for frontend to get production URL)
  app.get("/api/site-config", (req, res) => {
    const siteUrl = process.env.SITE_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000');
    res.json({ siteUrl });
  });

  // Check-in Route
  app.get("/api/checkin", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Token requis" });
      }

      const wedding = (req as any).wedding;
      const guest = await storage.getRsvpResponseByToken(wedding.id, token);
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

  // Get RSVP by public token (for invitation page)
  app.get("/api/rsvp/token/:token", withWedding, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const response = await storage.getRsvpResponseByToken(wedding.id, req.params.token);
      if (!response) {
        return res.status(404).json({ message: "Invitation non trouvée" });
      }
      res.json(response);
    } catch (error) {
      console.error("Error fetching RSVP by token:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de l'invitation" });
    }
  });

  // Mark Guest as Checked In
  app.post("/api/checkin/:id", async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      const guest = await storage.getRsvpResponse(wedding.id, id);
      if (!guest) return res.status(404).json({ message: "Invité non trouvé" });

      await storage.updateRsvpResponse(wedding.id, id, {
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
  app.post("/api/rsvp/:id/send-invitation", isAuthenticated, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      let guest = await storage.getRsvpResponse(wedding.id, id);
      if (!guest) return res.status(404).json({ message: "Invité non trouvé" });

      if (!guest.email) return res.status(400).json({ message: "Email manquant pour cet invité" });

      // Generate token if missing
      let publicToken = guest.publicToken;
      if (!publicToken) {
        publicToken = crypto.randomUUID();
        guest = await storage.updateRsvpResponse(wedding.id, id, {
          ...guest,
          publicToken
        } as any);
      }

      // Send Email
      if (!guest.email) {
        // Should not happen as we checked before, but after update guest is refreshed
        return res.status(400).json({ message: "Email manquant" });
      }

      await sendPersonalizedInvitation(wedding, {
        id: guest.id,
        email: guest.email,
        firstName: guest.firstName,
        lastName: guest.lastName,
        publicToken: publicToken
      } as any);

      // Update Timestamp and set status to confirmed
      await storage.updateRsvpResponse(wedding.id, id, {
        ...guest,
        invitationSentAt: new Date(),
        status: 'confirmed'
      } as any);

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur lors de l'envoi de l'invitation" });
    }
  });

  // Resend Confirmation Email - Specific Guest
  app.post("/api/rsvp/:id/resend-confirmation", isAuthenticated, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      const guest = await storage.getRsvpResponse(wedding.id, id);
      if (!guest) return res.status(404).json({ message: "Invité non trouvé" });

      if (!guest.email) return res.status(400).json({ message: "Email manquant pour cet invité" });

      if (!guest.availability || guest.availability === 'pending') {
        return res.status(400).json({ message: "Cet invité n'a pas encore répondu au RSVP" });
      }

      await sendGuestConfirmationEmail(wedding, {
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
  app.post("/api/rsvp/:id/whatsapp-log", isAuthenticated, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      let guest = await storage.getRsvpResponse(wedding.id, id);
      if (!guest) return res.status(404).json({ message: "Invité non trouvé" });

      // Generate token if missing
      let publicToken = guest.publicToken;
      if (!publicToken) {
        publicToken = crypto.randomUUID();
        guest = await storage.updateRsvpResponse(wedding.id, id, {
          ...guest,
          publicToken
        } as any);
      }

      // Update Timestamp
      await storage.updateRsvpResponse(wedding.id, id, {
        ...guest,
        whatsappInvitationSentAt: new Date()
      } as any);

      res.json({
        success: true,
        phone: guest.phone,
        publicToken
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erreur lors de l'enregistrement WhatsApp" });
    }
  });

  // Public Guest Lookup (for Invitation)
  app.get("/api/guests/:id", async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Identifiant invalide" });
      }

      const response = await storage.getRsvpResponse(wedding.id, id);

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
  app.post("/api/rsvp/bulk", isAuthenticated, async (req, res) => {
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
          const guestData = {
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email || null,
            phone: guest.phone || null,
            partySize: guest.partySize || 1,
            availability: guest.availability || 'pending',
            notes: guest.notes || null,
          };

          const wedding = (req as any).wedding;
          await storage.createRsvpResponse(wedding.id, guestData);
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

  // CSV export route with filtering support
  app.get("/api/rsvp/export/csv", isAuthenticated, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const searchQuery = (req.query.search as string) || '';
      const availabilityFilter = (req.query.availability as string) || '';

      let responses = await storage.getAllRsvpResponses(wedding.id);

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        responses = responses.filter(r =>
          r.firstName.toLowerCase().includes(query) ||
          r.lastName.toLowerCase().includes(query) ||
          (r.email && r.email.toLowerCase().includes(query))
        );
      }

      // Apply availability filter
      if (availabilityFilter) {
        responses = responses.filter(r => r.availability === availabilityFilter);
      }

      // Create CSV content with Personne and Statut columns
      const headers = ['ID', 'Prénom', 'Nom', 'Personne', 'Statut', 'Disponibilité', 'Numéro de table', 'Date de réponse'];
      const csvRows = [headers.join(',')];

      responses.forEach(response => {
        const availabilityText = {
          'confirmed': 'Présent',
          'declined': 'Absent',
          'pending': 'En attente'
        }[response.availability] || response.availability;

        const statusText = {
          'pending': 'En attente',
          'confirmed': 'Confirmé',
          'cancelled': 'Annulé'
        }[response.status || 'pending'] || response.status || 'En attente';

        const row = [
          response.id,
          `"${response.firstName}"`,
          `"${response.lastName}"`,
          response.partySize || 1,
          `"${statusText}"`,
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

  // Guest invitation page - get guest data and matching PDF
  app.get("/api/invitation/guest/:id", async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalide" });
      }

      const response = await storage.getRsvpResponse(wedding.id, id);
      if (!response) {
        return res.status(404).json({ message: "Invité non trouvé" });
      }

      // Find matching PDF in invitations_dot folder
      const fs = await import('fs');
      const path = await import('path');
      const dotFolder = path.join(process.cwd(), 'client', 'public', 'invitations_dot');

      // Helper function to normalize text (trim, remove accents, lowercase)
      const normalizeText = (text: string): string => {
        return text
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics/accents
          .replace(/\s+/g, '_')
          .toLowerCase();
      };

      let pdfUrl: string | null = null;

      if (fs.existsSync(dotFolder)) {
        const files = fs.readdirSync(dotFolder);

        // Build the expected filename following the exact naming convention:
        // 1. Base name: "{firstName} {lastName}"
        // 2. If partySize = 2 and "Couple" not already in firstName: add "Couple " prefix
        // 3. Replace spaces with underscores
        // 4. Add "Invitation_" prefix and ".pdf" suffix

        const firstNameRaw = response.firstName.trim();
        const lastNameRaw = response.lastName.trim();
        const isCouple = response.partySize >= 2;
        const hasCouplePrefixAlready = firstNameRaw.toLowerCase().startsWith('couple');

        let baseName: string;
        if (isCouple && !hasCouplePrefixAlready) {
          // Add "Couple" prefix for couples that don't have it
          baseName = `Couple ${firstNameRaw} ${lastNameRaw}`;
        } else {
          // Solo or couple with "Couple" already in name
          baseName = `${firstNameRaw} ${lastNameRaw}`;
        }

        // Build expected filename (normalize for comparison)
        const expectedFilename = `invitation_${normalizeText(baseName)}.pdf`;

        console.log(`Guest: "${firstNameRaw} ${lastNameRaw}", partySize=${response.partySize}, hasCouple=${hasCouplePrefixAlready}`);
        console.log(`Expected filename: ${expectedFilename}`);

        // Try exact match first
        for (const file of files) {
          const fileNormalized = normalizeText(file);
          if (fileNormalized === expectedFilename) {
            pdfUrl = `/invitations_dot/${file}`;
            console.log(`Found exact match: ${file}`);
            break;
          }
        }

        // Fallback 1: Try without Couple prefix (in case partySize is wrong in DB)
        if (!pdfUrl && isCouple && !hasCouplePrefixAlready) {
          const fallbackName = `invitation_${normalizeText(`${firstNameRaw} ${lastNameRaw}`)}.pdf`;
          for (const file of files) {
            const fileNormalized = normalizeText(file);
            if (fileNormalized === fallbackName) {
              pdfUrl = `/invitations_dot/${file}`;
              console.log(`Found fallback (no Couple): ${file}`);
              break;
            }
          }
        }

        // Fallback 2: Try with Couple prefix (in case partySize is wrong in DB)
        if (!pdfUrl && !isCouple) {
          const fallbackName = `invitation_${normalizeText(`Couple ${firstNameRaw} ${lastNameRaw}`)}.pdf`;
          for (const file of files) {
            const fileNormalized = normalizeText(file);
            if (fileNormalized === fallbackName) {
              pdfUrl = `/invitations_dot/${file}`;
              console.log(`Found fallback (with Couple): ${file}`);
              break;
            }
          }
        }

        // Fallback 3: Search by firstName AND lastName anywhere in filename
        if (!pdfUrl) {
          const firstNameNorm = normalizeText(firstNameRaw);
          const lastNameNorm = normalizeText(lastNameRaw);
          for (const file of files) {
            const fileNormalized = normalizeText(file);
            if (fileNormalized.includes(firstNameNorm) && fileNormalized.includes(lastNameNorm)) {
              pdfUrl = `/invitations_dot/${file}`;
              console.log(`Found by name search: ${file}`);
              break;
            }
          }
        }

        console.log(`Final PDF result: ${pdfUrl || 'NOT FOUND'}`);
      }

      res.json({
        id: response.id,
        firstName: response.firstName,
        lastName: response.lastName,
        availability: response.availability,
        partySize: response.partySize || 1,
        pdfUrl,
      });
    } catch (error) {
      console.error("Error fetching dot guest:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de l'invité" });
    }
  });

  // Send invitation email route (Legacy or Generic)
  app.post("/api/send-invitation", isAuthenticated, async (req, res) => {
    try {
      const { email, firstName, lastName, message } = req.body;

      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, prénom et nom requis" });
      }

      const wedding = (req as any).wedding;
      await sendPersonalizedInvitation(wedding, {
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

  // Get email logs for a wedding
  app.get("/api/admin/email-logs", isAuthenticated, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const logs = await storage.getEmailLogs(wedding.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching email logs:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des logs email" });
    }
  });

  // Stripe Contribution Routes

  // Get Stripe publishable key
  app.get("/api/stripe/config", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe config:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de la configuration Stripe" });
    }
  });

  // Create checkout session for wedding contribution
  app.post("/api/create-checkout-session", withWedding, async (req, res) => {
    try {
      const { donorName, amount, message } = req.body;

      // Validate input
      const validated = insertContributionSchema.parse({ donorName, amount, message });

      const stripe = await getUncachableStripeClient();

      // Get the base URL for success/cancel redirects
      const baseUrl = process.env.SITE_URL || `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;

      // Create Stripe Checkout session with price_data for one-time contributions
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Cagnotte Mariage Ruth & Arnold',
              description: `Contribution de ${validated.donorName}`,
            },
            unit_amount: validated.amount,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/contribution/merci?payment_intent_id={CHECKOUT_SESSION_ID}`, // Use payment_intent_id
        cancel_url: `${baseUrl}/cagnotte`,
        metadata: {
          donorName: validated.donorName,
          message: validated.message || '',
        },
        // Collect customer email for thank you email
        customer_creation: 'if_required',
        billing_address_collection: 'auto',
      });

      const wedding = (req as any).wedding; // Resolved by withWedding middleware

      // Store contribution in database with pending status
      const contribution = await storage.createContribution(wedding.id, {
        ...validated,
        stripePaymentIntentId: session.payment_intent as string,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      if (error.issues) {
        return res.status(400).json({ message: "Données invalides", details: error.issues });
      }
      res.status(500).json({ message: "Erreur lors de la création de la session de paiement" });
    }
  });

  // Verify payment and get contribution details (for thank you page)
  app.get("/api/contribution/verify", withWedding, async (req, res) => {
    try {
      const paymentIntentId = req.query.payment_intent_id as string;

      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment Intent ID requis" });
      }

      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        const wedding = (req as any).wedding;
        let contribution = await storage.getContributionByPaymentIntent(paymentIntentId);

        // Only update and send emails if not already completed
        if (contribution && contribution.status !== 'completed' && contribution.status !== 'paid') {
          const donorName = (paymentIntent.metadata?.donorName || contribution.donorName) as string;
          const amount = (paymentIntent.amount || contribution.amount) as number;
          const currency = (paymentIntent.currency || 'eur') as string;

          // Try to send email notification to couple
          try {
            await sendContributionNotification(wedding, {
              donorName,
              amount,
              currency,
              message: contribution.message,
            });
          } catch (emailError) {
            console.error("Failed to send contribution notification email:", emailError);
          }

          // Try to send thank you email to contributor if we have their email
          const customerEmail = paymentIntent.receipt_email; // PaymentIntent has receipt_email
          if (customerEmail) {
            try {
              await sendContributorThankYou(wedding, {
                email: customerEmail,
                donorName,
                amount,
                currency,
              });
            } catch (emailError) {
              console.error("Failed to send contributor thank you email:", emailError);
            }
          }

          // Update contribution status after email attempts
          contribution = await storage.updateContributionStatus(
            paymentIntentId,
            'paid'
          );

          // Broadcast contribution success
          liveService.broadcast(wedding.id, 'CONTRIBUTION_RECEIVED', contribution);
        }

        res.json({
          success: true,
          donorName: contribution?.donorName,
          amount: contribution?.amount,
          currency: contribution?.currency,
        });
      } else {
        res.status(400).json({ success: false, message: "Paiement non réussi ou en attente" });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Erreur lors de la vérification du paiement" });
    }
  });

  // Get contribution details by payment intent ID (for admin or specific lookup)
  app.get("/api/contributions/payment-intent/:paymentIntentId", isAuthenticated, withWedding, async (req, res) => {
    try {
      const contribution = await storage.getContributionByPaymentIntent(req.params.paymentIntentId);
      if (!contribution) {
        return res.status(404).json({ message: "Contribution non trouvée" });
      }
      res.json(contribution);
    } catch (error) {
      console.error("Error fetching contribution by payment intent:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de la contribution" });
    }
  });

  // Get total contributions (public endpoint for showing on landing page)
  app.get("/api/contributions/total", withWedding, async (req, res) => {
    try {
      const wedding = (req as any).wedding; // Resolved by withWedding middleware
      const total = await storage.getTotalContributions(wedding.id);
      res.json({ total, currency: 'eur' });
    } catch (error) {
      console.error("Error getting total contributions:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du total" });
    }
  });

  // Get live contribution data (for live display during wedding)
  app.get("/api/contributions/live", withWedding, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const total = await storage.getTotalContributions(wedding.id);
      const recent = await storage.getRecentContributions(wedding.id, 10);
      const latest = recent[0] || null;
      res.json({
        total,
        currency: 'eur',
        latest: latest || null,
        recent
      });
    } catch (error) {
      console.error("Error getting live contributions:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des contributions" });
    }
  });

  // GET invitation PDF (public link for email sharing)
  app.get("/api/invitations/:id/pdf", withWedding, async (req, res) => {
    try {
      const { generateInvitationPDF } = await import("./invitation-service");
      const wedding = (req as any).wedding; // Resolved by withWedding middleware
      const id = parseInt(req.params.id);

      const response = await storage.getRsvpResponse(wedding.id, id);
      if (!response) {
        return res.status(404).json({ message: "Invitation non trouvée" });
      }

      const pdfBuffer = await generateInvitationPDF({
        id: response.id,
        firstName: response.firstName,
        lastName: response.lastName,
        tableNumber: response.tableNumber,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="invitation-${response.firstName}-${response.lastName}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error getting invitation PDF:", error);
      res.status(500).json({ message: "Erreur lors de la récupération de l'invitation" });
    }
  });

  // SSE Live Stream
  app.get("/api/live/stream", withWedding, (req, res) => {
    const wedding = (req as any).wedding;
    liveService.addConnection(wedding.id, req, res);
  });

  // Generate invitation PDF (admin)
  app.post("/api/invitation/generate/:id", isAuthenticated, withWedding, async (req, res) => {
    try {
      const { generateInvitationPDF } = await import("./invitation-service");
      const wedding = (req as any).wedding; // Resolved by withWedding middleware
      const id = parseInt(req.params.id);
      const type = req.query.type as '19' | '21' | undefined; // Get type from query

      const response = await storage.getRsvpResponse(wedding.id, id);
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

  // Gift Routes
  app.get("/api/gifts", withWedding, async (req, res) => {
    try {
      const wedding = (req as any).wedding; // Resolved by withWedding middleware
      const gifts = await storage.getGifts(wedding.id);
      res.json(gifts);
    } catch (error) {
      console.error("Error fetching gifts:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des cadeaux" });
    }
  });

  app.post("/api/gifts", isAuthenticated, withWedding, requirePremium, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const validated = insertGiftSchema.parse(req.body);
      const gift = await storage.createGift(wedding.id, validated);
      res.json(gift);
    } catch (error) {
      console.error("Error creating gift:", error);
      res.status(400).json({ message: "Erreur lors de la création du cadeau" });
    }
  });

  app.patch("/api/gifts/:id", isAuthenticated, withWedding, requirePremium, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      const gift = await storage.updateGift(wedding.id, id, req.body);
      res.json(gift);
    } catch (error) {
      console.error("Error updating gift:", error);
      res.status(400).json({ message: "Erreur lors de la mise à jour du cadeau" });
    }
  });

  app.delete("/api/gifts/:id", isAuthenticated, withWedding, requirePremium, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      await storage.deleteGift(wedding.id, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting gift:", error);
      res.status(500).json({ message: "Erreur lors de la suppression du cadeau" });
    }
  });

  // Live Joke Routes
  app.get("/api/jokes", withWedding, requirePremium, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const jokes = await storage.getJokes(wedding.id);
      res.json(jokes);
    } catch (error) {
      console.error("Error fetching jokes:", error);
      res.status(500).json({ message: "Erreur lors de la récupération des blagues" });
    }
  });

  app.post("/api/jokes", isAuthenticated, withWedding, requirePremium, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const joke = await storage.createJoke(wedding.id, req.body);
      res.json(joke);
    } catch (error) {
      console.error("Error creating joke:", error);
      res.status(500).json({ message: "Erreur lors de la création de la blague" });
    }
  });

  app.delete("/api/jokes/:id", isAuthenticated, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const id = parseInt(req.params.id);
      await storage.deleteJoke(wedding.id, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting joke:", error);
      res.status(500).json({ message: "Erreur lors de la suppression de la blague" });
    }
  });

  // Billing Routes
  app.post("/api/billing/checkout", isAuthenticated, withWedding, async (req, res) => {
    try {
      const wedding = (req as any).wedding;
      const stripe = await getUncachableStripeClient();
      const domain = process.env.SITE_URL || `https://${req.get('host')}`;

      // Create checkout session for Premium plan
      // Determine if it's a subscription or one-time based on price type or query
      const isSubscription = req.body.type === 'subscription';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: process.env.STRIPE_PREMIUM_PRICE_ID,
            quantity: 1,
          },
        ],
        mode: isSubscription ? 'subscription' : 'payment',
        success_url: `${domain}/admin/billing?success=true`,
        cancel_url: `${domain}/admin/billing?canceled=true`,
        client_reference_id: wedding.id,
        customer_email: (req.user as any).email,
        metadata: {
          weddingId: wedding.id,
          type: isSubscription ? 'subscription' : 'one_time'
        },
        ...(isSubscription ? {
          subscription_data: {
            metadata: {
              weddingId: wedding.id,
            },
          },
        } : {}),
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating stripe session:", error);
      res.status(500).json({ message: "Erreur lors de la création de la session de paiement" });
    }
  });

  // Stripe Webhook
  app.post("/api/webhooks/stripe", express.raw({ type: 'application/json' }), async (req, res) => {
    const stripe = await getUncachableStripeClient();
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const weddingId = session.client_reference_id || session.metadata?.weddingId;
        if (weddingId) {
          await storage.updateWedding(weddingId, { currentPlan: 'premium' });

          if (session.mode === 'subscription') {
            await storage.upsertStripeSubscription({
              weddingId,
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              status: 'active',
            });
          }
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as any;
        const weddingId = pi.metadata?.weddingId;
        if (weddingId && pi.metadata?.type === 'one_time') {
          await storage.updateWedding(weddingId, { currentPlan: 'premium' });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        // Find wedding by subscription ID (would need a storage method or query)
        // For now, assume we handle it via metadata or searching
        break;
      }
    }

    res.json({ received: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}

