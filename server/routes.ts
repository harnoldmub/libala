import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getSession } from "./replitAuth";
import { setupLocalAuth, isLocallyAuthenticated } from "./localAuth";
import { insertRsvpResponseSchema, updateRsvpResponseSchema } from "@shared/schema";
import { sendRsvpConfirmationEmail, sendPersonalizedInvitation } from "./email";
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
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // RSVP routes
  app.post("/api/rsvp", async (req, res) => {
    try {
      const validated = insertRsvpResponseSchema.parse(req.body);
      const response = await storage.createRsvpResponse(validated);
      
      // Send email confirmation to couple (non-blocking)
      sendRsvpConfirmationEmail({
        firstName: response.firstName,
        lastName: response.lastName,
        availability: response.availability,
      }).catch(err => {
        console.error("Failed to send RSVP confirmation email:", err);
      });
      
      res.json(response);
    } catch (error) {
      console.error("Error creating RSVP:", error);
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.get("/api/rsvp", isLocallyAuthenticated, async (req, res) => {
    try {
      const responses = await storage.getAllRsvpResponses();
      res.json(responses);
    } catch (error) {
      console.error("Error fetching RSVPs:", error);
      res.status(500).json({ message: "Failed to fetch RSVPs" });
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
      res.status(500).json({ message: "Failed to update RSVP" });
    }
  });

  app.delete("/api/rsvp/:id", isLocallyAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRsvpResponse(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting RSVP:", error);
      res.status(500).json({ message: "Failed to delete RSVP" });
    }
  });

  app.put("/api/rsvp/:id", isLocallyAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = updateRsvpResponseSchema.parse(req.body);
      const response = await storage.updateRsvpResponse(id, validated);
      res.json(response);
    } catch (error) {
      console.error("Error updating RSVP:", error);
      res.status(400).json({ message: "Invalid request data" });
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
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  // Send invitation email route
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

  // Generate PDF invitation route
  app.get("/api/invitation/pdf/:id", isLocallyAuthenticated, async (req, res) => {
    try {
      const { generateInvitationPDF } = await import("./pdf-service");
      const id = parseInt(req.params.id);
      
      const response = await storage.getRsvpResponse(id);
      if (!response) {
        return res.status(404).json({ message: "Guest not found" });
      }

      const pdfBuffer = await generateInvitationPDF({
        id: response.id,
        firstName: response.firstName,
        lastName: response.lastName,
        tableNumber: response.tableNumber,
        availability: response.availability,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="invitation-${response.firstName}-${response.lastName}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Preview PDF invitation route (returns as blob)
  app.get("/api/invitation/preview/:id", isLocallyAuthenticated, async (req, res) => {
    try {
      const { generateInvitationPDF } = await import("./pdf-service");
      const id = parseInt(req.params.id);
      
      const response = await storage.getRsvpResponse(id);
      if (!response) {
        return res.status(404).json({ message: "Guest not found" });
      }

      const pdfBuffer = await generateInvitationPDF({
        id: response.id,
        firstName: response.firstName,
        lastName: response.lastName,
        tableNumber: response.tableNumber,
        availability: response.availability,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error previewing PDF:", error);
      res.status(500).json({ message: "Failed to preview PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
