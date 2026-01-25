import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

export interface InvitationData {
  id: number;
  firstName: string;
  lastName: string;
  tableNumber: number | null;
  type?: '19' | '21';
}

// Coordinates for text placement on the PDF template
// These may need fine-tuning based on the actual PDF layout
const POS_NAME = { x: 297.5, y: 735 }; // Center-top area for guest name
const POS_TABLE = { x: 297.5, y: 115 }; // "Votre table" area near bottom

export async function generateInvitationPDF(
  data: InvitationData
): Promise<Buffer> {
  try {
    // Load the template PDF
    const templatePath = path.join(process.cwd(), "templates", "invitation.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // Embed fonts
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Get the first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    // Full name
    const fullName = `${data.firstName} ${data.lastName.toUpperCase()}`;
    
    // Draw the guest name (centered)
    const nameSize = 16;
    const nameWidth = helveticaBoldFont.widthOfTextAtSize(fullName, nameSize);
    firstPage.drawText(fullName, {
      x: (width - nameWidth) / 2,
      y: POS_NAME.y,
      size: nameSize,
      font: helveticaBoldFont,
      color: rgb(0.545, 0.451, 0.333), // Gold/brown color #8b7355
    });
    
    // Table number or "à communiquer"
    const tableText = data.tableNumber 
      ? `Table ${data.tableNumber}` 
      : "Table à communiquer";
    
    const tableSize = 14;
    const tableWidth = helveticaFont.widthOfTextAtSize(tableText, tableSize);
    firstPage.drawText(tableText, {
      x: (width - tableWidth) / 2,
      y: POS_TABLE.y,
      size: tableSize,
      font: helveticaFont,
      color: rgb(0.545, 0.451, 0.333), // Gold/brown color
    });
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Error generating invitation PDF:", error);
    throw error;
  }
}
