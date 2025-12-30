import PDFDocument from "pdfkit";
import QRCode from "qrcode";

export interface InvitationData {
  id: number;
  firstName: string;
  lastName: string;
  tableNumber: number | null;
  type?: '19' | '21';
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
      doc.on("error", (err: any) => reject(err));

      // PAGE 1: Save the Date
      doc.fillColor("#f5f1e8").rect(0, 0, doc.page.width, doc.page.height).fill();
      doc.fillColor("#8b7355").rect(0, 0, doc.page.width, 3).fill();

      const centerX = doc.page.width / 2;

      // Header Date
      const dateText = data.type === '19' ? "19 MARS 2026" : data.type === '21' ? "21 MARS 2026" : "19 & 21 MARS 2026";
      const titleText = data.type === '19' ? "MARIAGE COUTUMIER" : "MARIAGE";

      doc
        .font("Helvetica-Bold")
        .fontSize(32)
        .fillColor("#8b7355")
        .text(titleText, 30, 80, { width: doc.page.width - 60, align: "center" });

      doc
        .font("Helvetica")
        .fontSize(14)
        .fillColor("#8b7355")
        .text(dateText, centerX - 50, 140, { width: 100, align: "center" });

      doc
        .font("Helvetica-Oblique")
        .fontSize(16)
        .fillColor("#8b7355")
        .text("Ruth & Arnold", centerX - 40, 180, { width: 80, align: "center" });

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
      let programs: string[] = [];

      if (data.type === '19') {
        programs = [
          "19h30 • Accueil",
          "20h00 • Mariage coutumier",
          "22h00 • Dîner",
        ];
      } else if (data.type === '21') {
        programs = [
          "10h00 • Cérémonie Civile",
          "12h00 • Bénédiction Nuptiale",
          "15h00 • Photos & Cocktail",
          "19h00 • Réception & Dîner",
          "22h00 • Soirée Dansante"
        ];
      } else {
        // Fallback or combined
        programs = [
          "19 MARS • Remise de dot et Mariage coutumier",
          "21 MARS • Civil - 10h",
          "21 MARS • Bénédiction - 12h",
          "21 MARS • Soirée - 19h",
        ];
      }

      programs.forEach((prog) => {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor("#8b7355")
          .text(prog, 30, yPos, { width: doc.page.width - 60 });
        yPos += 16;
      });

      yPos += 20;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#8b7355")
        .text("Accès Événement", 30, yPos, { width: doc.page.width - 60, align: "center" });

      const locationText = data.type === '19' ? "Yeni Yaşam - 19 Mars" : "21 Mars - Bruxelles";
      doc
        .font("Helvetica")
        .fontSize(8)
        .text(locationText, 30, yPos + 12, { width: doc.page.width - 60, align: "center" });

      // Generate QR code
      const qrPayload = data.type ? `${data.id}-${data.type}` : data.id.toString();
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
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
      const qrY = yPos + 35;
      doc.image(qrBuffer, qrX, qrY, { width: 70, height: 70 });

      if (data.tableNumber && data.type !== '19') {
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
          "Merci de présenter ce code à l'entrée",
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
