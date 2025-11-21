import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export interface InvitationData {
  id: number;
  firstName: string;
  lastName: string;
  tableNumber: number | null;
  availability: string;
}

export async function generateInvitationPDF(
  data: InvitationData
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A5",
        margin: 40,
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // PAGE 1: Save the Date
      // Background color
      doc.fillColor("#f5f1e8").rect(0, 0, doc.page.width, doc.page.height).fill();

      // Gold accent line at top
      doc.fillColor("#8b7355").rect(0, 0, doc.page.width, 3).fill();

      // Centered content
      const centerX = doc.page.width / 2;

      // Title
      doc
        .font("Helvetica-Bold")
        .fontSize(32)
        .fillColor("#8b7355")
        .text("SAVE", centerX - 20, 80, { width: 40, align: "center" });

      doc
        .font("Helvetica-Light")
        .fontSize(24)
        .fillColor("#8b7355")
        .text("the", centerX - 15, 125, { width: 30, align: "center" });

      doc
        .font("Helvetica-Bold")
        .fontSize(32)
        .fillColor("#8b7355")
        .text("DATE", centerX - 20, 160, { width: 40, align: "center" });

      // Date
      doc
        .font("Helvetica")
        .fontSize(14)
        .fillColor("#8b7355")
        .text("19 & 21 MARS 2026", centerX - 50, 220, { width: 100, align: "center" });

      // Couple names
      doc
        .font("Helvetica-Oblique")
        .fontSize(16)
        .fillColor("#8b7355")
        .text("Ruth & Arnold", centerX - 40, 270, { width: 80, align: "center" });

      // Guest name at bottom
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#8b7355")
        .text(`Cher(e) ${data.firstName} ${data.lastName.toUpperCase()}`, 40, doc.page.height - 60, {
          width: doc.page.width - 80,
          align: "center",
        });

      // PAGE 2: Program & Details
      doc.addPage();

      // Background color
      doc
        .fillColor("#f5f1e8")
        .rect(0, 0, doc.page.width, doc.page.height)
        .fill();

      // Gold accent line at top
      doc.fillColor("#8b7355").rect(0, 0, doc.page.width, 3).fill();

      // Program title
      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor("#8b7355")
        .text("PROGRAMME", 40, 30, { width: doc.page.width - 80, align: "center" });

      // Program details
      let yPos = 55;
      const programs = [
        { date: "19 MARS", label: "Dot & Cérémonie", details: "Lieu & Heure: À confirmer" },
        {
          date: "21 MARS",
          label: "CIVIL - 10h",
          details: "Mariage Civil",
        },
        { date: "21 MARS", label: "BÉNÉDICTION - 13h", details: "Cérémonie religieuse" },
        { date: "21 MARS", label: "SOIRÉE - 20h", details: "Réception & dîner" },
      ];

      programs.forEach((prog) => {
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("#8b7355")
          .text(`${prog.date} • ${prog.label}`, 40, yPos, {
            width: doc.page.width - 80,
          });
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#666")
          .text(prog.details, 40, yPos + 14, { width: doc.page.width - 80 });
        yPos += 28;
      });

      // QR Code section
      yPos += 10;
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#8b7355")
        .text("Code d'accès", 40, yPos, { width: doc.page.width - 80, align: "center" });

      // Generate QR code with guest ID
      const qrDataUrl = await QRCode.toDataURL(data.id.toString(), {
        errorCorrectionLevel: "H",
        type: "image/png",
        width: 150,
        margin: 1,
        color: { dark: "#8b7355", light: "#f5f1e8" },
      });

      const qrBuffer = Buffer.from(
        qrDataUrl.replace(/^data:image\/png;base64,/, ""),
        "base64"
      );

      const qrX = centerX - 40;
      const qrY = yPos + 15;
      doc.image(qrBuffer, qrX, qrY, { width: 80, height: 80 });

      // Table assignment if available
      if (data.tableNumber) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#8b7355")
          .text(`Table n° ${data.tableNumber}`, centerX - 30, qrY + 85, {
            width: 60,
            align: "center",
          });
      }

      // Footer message
      doc
        .font("Helvetica-Oblique")
        .fontSize(8)
        .fillColor("#999")
        .text(
          "Merci de confirmer votre présence et de communiquer vos préférences culinaires.",
          40,
          doc.page.height - 40,
          { width: doc.page.width - 80, align: "center" }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
