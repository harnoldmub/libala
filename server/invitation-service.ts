import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export interface InvitationData {
  id: number;
  firstName: string;
  lastName: string;
  tableNumber: number | null;
}

export async function generateInvitationPDF(
  data: InvitationData
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A5",
        margin: 30,
      });

      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => {
        try {
          resolve(Buffer.concat(buffers));
        } catch (e) {
          reject(e);
        }
      });
      doc.on("error", (err) => reject(err));

      // PAGE 1: Save the Date
      doc.fillColor("#f5f1e8").rect(0, 0, doc.page.width, doc.page.height).fill();
      doc.fillColor("#8b7355").rect(0, 0, doc.page.width, 3).fill();

      const centerX = doc.page.width / 2;

      doc
        .font("Helvetica-Bold")
        .fontSize(32)
        .fillColor("#8b7355")
        .text("SAVE", centerX - 20, 80, { width: 40, align: "center" });

      doc
        .font("Helvetica")
        .fontSize(24)
        .fillColor("#8b7355")
        .text("the", centerX - 15, 125, { width: 30, align: "center" });

      doc
        .font("Helvetica-Bold")
        .fontSize(32)
        .fillColor("#8b7355")
        .text("DATE", centerX - 20, 160, { width: 40, align: "center" });

      doc
        .font("Helvetica")
        .fontSize(14)
        .fillColor("#8b7355")
        .text("19 & 21 MARS 2026", centerX - 50, 220, { width: 100, align: "center" });

      doc
        .font("Helvetica-Oblique")
        .fontSize(16)
        .fillColor("#8b7355")
        .text("Ruth & Arnold", centerX - 40, 270, { width: 80, align: "center" });

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#8b7355")
        .text(`Cher(e) ${data.firstName} ${data.lastName.toUpperCase()}`, 30, doc.page.height - 50, {
          width: doc.page.width - 60,
          align: "center",
        });

      // PAGE 2: Program & QR Code
      doc.addPage();
      doc
        .fillColor("#f5f1e8")
        .rect(0, 0, doc.page.width, doc.page.height)
        .fill();
      doc.fillColor("#8b7355").rect(0, 0, doc.page.width, 3).fill();

      doc
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#8b7355")
        .text("PROGRAMME", 30, 30, { width: doc.page.width - 60, align: "center" });

      let yPos = 55;
      const programs = [
        "19 MARS • Dot & Cérémonie",
        "21 MARS • Civil - 10h",
        "21 MARS • Bénédiction - 13h",
        "21 MARS • Soirée - 20h",
      ];

      programs.forEach((prog) => {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#8b7355")
          .text(prog, 30, yPos, { width: doc.page.width - 60 });
        yPos += 16;
      });

      yPos += 5;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#8b7355")
        .text("Accès Événement", 30, yPos, { width: doc.page.width - 60, align: "center" });

      // Generate QR code
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

      const qrX = centerX - 35;
      const qrY = yPos + 12;
      doc.image(qrBuffer, qrX, qrY, { width: 70, height: 70 });

      if (data.tableNumber) {
        doc
          .font("Helvetica-Bold")
          .fontSize(11)
          .fillColor("#8b7355")
          .text(`Table ${data.tableNumber}`, centerX - 25, qrY + 75, {
            width: 50,
            align: "center",
          });
      }

      doc
        .font("Helvetica-Oblique")
        .fontSize(7)
        .fillColor("#999")
        .text(
          "Merci de confirmer votre présence",
          30,
          doc.page.height - 30,
          { width: doc.page.width - 60, align: "center" }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
