import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { getSession } from "./replitAuth";
import { setupLocalAuth, isLocallyAuthenticated } from "./localAuth";
import { insertRsvpResponseSchema, updateRsvpResponseSchema, insertContributionSchema } from "@shared/schema";
import { sendRsvpConfirmationEmail, sendPersonalizedInvitation, sendGuestConfirmationEmail, sendContributionNotification, sendContributorThankYou, sendDateChangeApologyEmail } from "./email";
import passport from "passport";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

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
      
      // Get the current guest data before update to detect availability changes
      const currentGuest = await storage.getRsvpResponse(id);
      const previousAvailability = currentGuest?.availability;
      
      const validated = updateRsvpResponseSchema.parse(req.body);
      console.log("PUT /api/rsvp/:id - Validated data:", JSON.stringify(validated, null, 2));
      const response = await storage.updateRsvpResponse(id, validated);
      
      // Check if availability changed from "both" to "21-march" only
      const newAvailability = validated.availability;
      if (previousAvailability === 'both' && newAvailability === '21-march') {
        // Send apology email if the guest has an email
        if (response && response.email) {
          try {
            await sendDateChangeApologyEmail({
              email: response.email,
              firstName: response.firstName,
              lastName: response.lastName,
            });
            console.log(`Date change apology email sent to ${response.email}`);
          } catch (emailError) {
            console.error("Failed to send date change apology email:", emailError);
            // Don't fail the update if email fails
          }
        }
      }
      
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

  // Bulk Send Invitation Route
  app.post("/api/rsvp/bulk-send-invitation", isLocallyAuthenticated, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "Liste d'identifiants requise" });
      }

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const id of ids) {
        try {
          let guest = await storage.getRsvpResponse(id);
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
          let qrToken = guest.qrToken;
          if (!qrToken) {
            qrToken = crypto.randomUUID();
            guest = await storage.updateRsvpResponse(id, {
              ...guest,
              qrToken
            } as any);
          }

          await sendPersonalizedInvitation({
            id: guest.id,
            email: guest.email!,
            firstName: guest.firstName,
            lastName: guest.lastName,
            qrToken: qrToken
          });

          // Update Timestamp and set status to confirmed
          await storage.updateRsvpResponse(id, {
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
  app.post("/api/rsvp/bulk-resend-confirmation", isLocallyAuthenticated, async (req, res) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        return res.status(400).json({ message: "Liste d'identifiants requise" });
      }

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const id of ids) {
        try {
          const guest = await storage.getRsvpResponse(id);
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

          await sendGuestConfirmationEmail({
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
        id: guest.id,
        email: guest.email,
        firstName: guest.firstName,
        lastName: guest.lastName,
        qrToken: qrToken
      });

      // Update Timestamp and set status to confirmed
      await storage.updateRsvpResponse(id, {
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
          const guestData = {
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email || null,
            phone: guest.phone || null,
            partySize: guest.partySize || 1,
            availability: guest.availability || 'pending',
            notes: guest.notes || null,
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

  // CSV export route with filtering support
  app.get("/api/rsvp/export/csv", isLocallyAuthenticated, async (req, res) => {
    try {
      const searchQuery = (req.query.search as string) || '';
      const availabilityFilter = (req.query.availability as string) || '';
      
      let responses = await storage.getAllRsvpResponses();

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
        responses = responses.filter(r => {
          if (availabilityFilter === '19-march') {
            return r.availability === '19-march' || r.availability === 'both';
          }
          if (availabilityFilter === '21-march') {
            return r.availability === '21-march' || r.availability === 'both';
          }
          return r.availability === availabilityFilter;
        });
      }

      // Create CSV content with Personne and Statut columns
      const headers = ['ID', 'Prénom', 'Nom', 'Personne', 'Statut', 'Disponibilité', 'Numéro de table', 'Date de réponse'];
      const csvRows = [headers.join(',')];

      responses.forEach(response => {
        const availabilityText = {
          '19-march': '19 mars',
          '21-march': '21 mars',
          'both': 'Les deux dates',
          'unavailable': 'Pas disponible'
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
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalide" });
      }

      const response = await storage.getRsvpResponse(id);
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
          .trim() // Remove leading/trailing whitespace
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove diacritics/accents
          .replace(/\s+/g, '_')
          .toLowerCase();
      };
      
      let pdfUrl: string | null = null;
      
      if (fs.existsSync(dotFolder)) {
        const files = fs.readdirSync(dotFolder);
        // Normalize names for matching (remove accents, spaces -> underscores, lowercase)
        const firstName = normalizeText(response.firstName);
        const lastName = normalizeText(response.lastName);
        const isCouple = response.partySize >= 2;
        
        // Build expected filename patterns (all lowercase for comparison)
        const expectedSolo = `invitation_${firstName}_${lastName}.pdf`;
        const expectedCouple = `invitation_couple_${firstName}_${lastName}.pdf`;
        
        console.log(`Looking for PDF: firstName="${firstName}", lastName="${lastName}", isCouple=${isCouple}`);
        console.log(`Expected patterns: solo="${expectedSolo}", couple="${expectedCouple}"`);
        
        // Try exact match first (prioritize based on partySize)
        for (const file of files) {
          const fileNormalized = normalizeText(file);
          
          // Try the expected format first
          if (isCouple && fileNormalized === expectedCouple) {
            pdfUrl = `/invitations_dot/${file}`;
            console.log(`Found exact couple match: ${file}`);
            break;
          }
          if (!isCouple && fileNormalized === expectedSolo) {
            pdfUrl = `/invitations_dot/${file}`;
            console.log(`Found exact solo match: ${file}`);
            break;
          }
        }
        
        // Fallback 1: Try the OTHER format (in case partySize is wrong)
        if (!pdfUrl) {
          for (const file of files) {
            const fileNormalized = normalizeText(file);
            if (isCouple && fileNormalized === expectedSolo) {
              pdfUrl = `/invitations_dot/${file}`;
              console.log(`Found solo match for couple: ${file}`);
              break;
            }
            if (!isCouple && fileNormalized === expectedCouple) {
              pdfUrl = `/invitations_dot/${file}`;
              console.log(`Found couple match for solo: ${file}`);
              break;
            }
          }
        }
        
        // Fallback 2: Search by firstName AND lastName anywhere in filename
        if (!pdfUrl) {
          for (const file of files) {
            const fileNormalized = normalizeText(file);
            if (fileNormalized.includes(firstName) && fileNormalized.includes(lastName)) {
              pdfUrl = `/invitations_dot/${file}`;
              console.log(`Found by name match: ${file}`);
              break;
            }
          }
        }
        
        // Fallback 3: Search by lastName only (careful - might match wrong person)
        if (!pdfUrl) {
          for (const file of files) {
            const fileNormalized = normalizeText(file);
            if (fileNormalized.includes(lastName) && lastName.length > 3) {
              pdfUrl = `/invitations_dot/${file}`;
              console.log(`Found by lastName only: ${file}`);
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
  app.post("/api/create-checkout-session", async (req, res) => {
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
        success_url: `${baseUrl}/contribution/merci?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/cagnotte`,
        metadata: {
          donorName: validated.donorName,
          message: validated.message || '',
        },
        // Collect customer email for thank you email
        customer_creation: 'if_required',
        billing_address_collection: 'auto',
      });

      // Store contribution in database with pending status
      await storage.createContribution({
        donorName: validated.donorName,
        amount: validated.amount,
        message: validated.message,
        stripeSessionId: session.id,
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
  app.get("/api/contribution/verify", async (req, res) => {
    try {
      const sessionId = req.query.session_id as string;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID requis" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      // Get contribution details
      const contribution = await storage.getContributionBySessionId(sessionId);
      
      if (session.payment_status === 'paid') {
        // Only update and send emails if not already completed
        if (contribution && contribution.status !== 'completed') {
          const donorName = session.metadata?.donorName || contribution.donorName;
          const amount = session.amount_total || contribution.amount;
          const currency = session.currency || 'eur';
          
          // Try to send email notification to couple
          try {
            await sendContributionNotification({
              donorName,
              amount,
              currency,
              message: contribution.message,
            });
          } catch (emailError) {
            console.error("Failed to send contribution notification email:", emailError);
          }
          
          // Try to send thank you email to contributor if we have their email
          const customerEmail = session.customer_details?.email;
          if (customerEmail) {
            try {
              await sendContributorThankYou({
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
          await storage.updateContributionStatus(
            sessionId, 
            'completed',
            session.payment_intent as string
          );
        }
      }
      
      res.json({
        success: session.payment_status === 'paid',
        donorName: session.metadata?.donorName || contribution?.donorName,
        amount: session.amount_total,
        currency: session.currency,
      });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Erreur lors de la vérification du paiement" });
    }
  });

  // Get total contributions (public endpoint for showing on landing page)
  app.get("/api/contributions/total", async (req, res) => {
    try {
      const total = await storage.getTotalContributions();
      res.json({ total, currency: 'eur' });
    } catch (error) {
      console.error("Error getting total contributions:", error);
      res.status(500).json({ message: "Erreur lors de la récupération du total" });
    }
  });

  // Get live contribution data (for live display during wedding)
  app.get("/api/contributions/live", async (req, res) => {
    try {
      const total = await storage.getTotalContributions();
      const latest = await storage.getLatestContribution();
      const recent = await storage.getRecentContributions(10);
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
  app.get("/api/invitations/:id/pdf", async (req, res) => {
    try {
      const { generateInvitationPDF } = await import("./invitation-service");
      const id = parseInt(req.params.id);

      const response = await storage.getRsvpResponse(id);
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

  // Generate invitation PDF (admin)
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

