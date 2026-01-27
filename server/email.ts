import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const fromEmail =
  process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";

export async function sendRsvpConfirmationEmail(guestData: {
  firstName: string;
  lastName: string;
  availability: string;
}) {
  try {
    const availabilityText =
      {
        "19-march": "19 mars uniquement (Mariage coutumier)",
        "21-march":
          "21 mars uniquement (Mariage Civil + Bénédiction nuptiale + Grande fête)",
        both: "Les deux dates (19 et 21 mars)",
        unavailable: "Pas disponible",
      }[guestData.availability] || guestData.availability;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 30px 0;
              border-bottom: 2px solid #C8A96A;
            }
            .header h1 {
              font-family: 'Playfair Display', serif;
              color: #C8A96A;
              margin: 0;
              font-size: 32px;
            }
            .content {
              padding: 30px 0;
            }
            .info-box {
              background: #f9f9f9;
              border-left: 4px solid #C8A96A;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Golden Love 2026</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Ruth & Arnold</p>
          </div>
          
          <div class="content">
            <h2 style="color: #333;">Nouvelle réponse RSVP reçue</h2>
            
            <div class="info-box">
              <p><strong>Invité :</strong> ${guestData.firstName} ${guestData.lastName}</p>
              <p><strong>Disponibilité :</strong> ${availabilityText}</p>
              <p><strong>Date de réponse :</strong> ${new Date().toLocaleDateString(
                "fr-FR",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}</p>
            </div>
            
            <p>Vous pouvez gérer les attributions de tables dans votre espace administrateur.</p>
          </div>
          
          <div class="footer">
            <p>© 2026 Ruth & Arnold - Golden Love</p>
          </div>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: fromEmail,
      to: "we@ar2k26.com",
      subject: `Nouvelle réponse RSVP - ${guestData.firstName} ${guestData.lastName}`,
      html: emailHtml,
    });

    console.log("RSVP confirmation email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send RSVP confirmation email:", error);
    throw error;
  }
}

export async function sendGuestConfirmationEmail(guestData: {
  email: string;
  firstName: string;
  lastName: string;
  availability: string;
}) {
  try {
    const availabilityText =
      {
        "19-march": "19 mars uniquement (Mariage coutumier)",
        "21-march":
          "21 mars uniquement (Mariage Civil + Bénédiction nuptiale + Grande fête)",
        both: "Les deux dates (19 et 21 mars)",
        unavailable: "Pas disponible",
      }[guestData.availability] || guestData.availability;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: #fff;
            }
            .header {
              text-align: center;
              padding: 40px 0;
              background: linear-gradient(135deg, #f5f5f0 0%, #fff 100%);
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-family: 'Playfair Display', serif;
              color: #C8A96A;
              margin: 0;
              font-size: 36px;
              letter-spacing: 2px;
            }
            .content {
              padding: 20px 0;
            }
            .confirmation-box {
              background: linear-gradient(135deg, #C8A96A 0%, #D4AF37 100%);
              color: white;
              padding: 25px;
              border-radius: 8px;
              text-align: center;
              margin: 25px 0;
            }
            .confirmation-box h2 {
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .info-box {
              background: #f9f9f9;
              border-left: 4px solid #C8A96A;
              padding: 20px;
              margin: 25px 0;
            }
            .dates-section {
              background: #fff;
              border: 2px solid #C8A96A;
              border-radius: 8px;
              padding: 25px;
              margin: 30px 0;
            }
            .date-item {
              padding: 12px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .date-item:last-child {
              border-bottom: none;
            }
            .date-title {
              color: #C8A96A;
              font-weight: bold;
              font-size: 16px;
            }
            .footer {
              text-align: center;
              padding-top: 30px;
              border-top: 2px solid #C8A96A;
              color: #666;
              font-size: 14px;
              margin-top: 40px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Golden Love 2026</h1>
            <p style="color: #666; margin: 15px 0 0 0; font-size: 18px;">Ruth & Arnold</p>
          </div>
          
          <div class="content">
            <div class="confirmation-box">
              <h2>Merci ${guestData.firstName} !</h2>
              <p style="margin: 0;">Votre réponse a bien été enregistrée</p>
            </div>
            
            <p>Cher(e) ${guestData.firstName} ${guestData.lastName},</p>
            
            <p>Nous avons bien reçu votre réponse et nous vous remercions chaleureusement d'avoir pris le temps de nous répondre.</p>
            
            <div class="info-box">
              <p style="margin: 0;"><strong>Votre disponibilité :</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 18px; color: #C8A96A;">${availabilityText}</p>
            </div>
            
            <p style="background: #fff8e7; border: 1px solid #C8A96A; border-radius: 6px; padding: 15px; font-size: 14px; color: #666;">
              <strong style="color: #C8A96A;">Important :</strong> Votre réponse a bien été enregistrée, mais celle-ci ne constitue pas une confirmation définitive de votre présence. Votre invitation officielle vous sera envoyée avant le mariage.
            </p>
            
            <p>Nous avons hâte de partager ces moments précieux avec vous !</p>
            
            <p style="margin-top: 30px;">
              Avec toute notre affection,<br>
              <strong>Ruth & Arnold</strong>
            </p>
          </div>
          
          <div class="footer">
            <p>© 2026 Ruth & Arnold - Golden Love</p>
          </div>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: fromEmail,
      to: guestData.email,
      subject: `Merci ${guestData.firstName} ! Votre réponse a bien été enregistrée - Ruth & Arnold`,
      html: emailHtml,
    });

    console.log("Guest confirmation email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send guest confirmation email:", error);
    throw error;
  }
}

export async function sendContributionNotification(contributionData: {
  donorName: string;
  amount: number;
  currency: string;
  message?: string | null;
}) {
  try {
    const formattedAmount = (contributionData.amount / 100).toFixed(2);
    const currencySymbol = contributionData.currency === 'eur' ? '€' : contributionData.currency.toUpperCase();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 30px 0;
              border-bottom: 2px solid #C8A96A;
            }
            .header h1 {
              font-family: 'Playfair Display', serif;
              color: #C8A96A;
              margin: 0;
              font-size: 32px;
            }
            .content {
              padding: 30px 0;
            }
            .amount-box {
              background: linear-gradient(135deg, #C8A96A 0%, #D4AF37 100%);
              color: white;
              padding: 25px;
              border-radius: 8px;
              text-align: center;
              margin: 25px 0;
            }
            .amount-box h2 {
              margin: 0;
              font-size: 36px;
            }
            .info-box {
              background: #f9f9f9;
              border-left: 4px solid #C8A96A;
              padding: 15px;
              margin: 20px 0;
            }
            .message-box {
              background: #fff8e7;
              border: 1px solid #C8A96A;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              font-style: italic;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Golden Love 2026</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Ruth & Arnold</p>
          </div>
          
          <div class="content">
            <h2 style="color: #333;">Nouvelle contribution reçue !</h2>
            
            <div class="amount-box">
              <p style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.9;">Montant de la contribution</p>
              <h2>${formattedAmount} ${currencySymbol}</h2>
            </div>
            
            <div class="info-box">
              <p><strong>Donateur :</strong> ${contributionData.donorName}</p>
              <p><strong>Date :</strong> ${new Date().toLocaleDateString(
                "fr-FR",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}</p>
            </div>
            
            ${contributionData.message ? `
            <div class="message-box">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #C8A96A;">Message du donateur :</p>
              <p style="margin: 0;">"${contributionData.message}"</p>
            </div>
            ` : ''}
            
            <p>Félicitations ! Une nouvelle contribution a été effectuée pour votre cagnotte de mariage.</p>
          </div>
          
          <div class="footer">
            <p>© 2026 Ruth & Arnold - Golden Love</p>
          </div>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: fromEmail,
      to: "we@ar2k26.com",
      subject: `Nouvelle contribution - ${contributionData.donorName} : ${formattedAmount}${currencySymbol}`,
      html: emailHtml,
    });

    console.log("Contribution notification email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send contribution notification email:", error);
    throw error;
  }
}

export async function sendContributorThankYou(contributorData: {
  email: string;
  donorName: string;
  amount: number;
  currency: string;
}) {
  try {
    const formattedAmount = (contributorData.amount / 100).toFixed(2);
    const currencySymbol = contributorData.currency === 'eur' ? '€' : contributorData.currency.toUpperCase();

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.8;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background: #fff;
            }
            .header {
              text-align: center;
              padding: 40px 0;
              background: linear-gradient(135deg, #f5f5f0 0%, #fff 100%);
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-family: 'Playfair Display', serif;
              color: #C8A96A;
              margin: 0;
              font-size: 36px;
              letter-spacing: 2px;
            }
            .content {
              padding: 20px 0;
            }
            .heart-icon {
              text-align: center;
              font-size: 48px;
              margin: 20px 0;
            }
            .thank-you-box {
              background: linear-gradient(135deg, #C8A96A 0%, #D4AF37 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              text-align: center;
              margin: 25px 0;
            }
            .thank-you-box h2 {
              margin: 0 0 10px 0;
              font-size: 28px;
              font-family: 'Playfair Display', serif;
            }
            .amount-display {
              background: rgba(255,255,255,0.2);
              padding: 15px 25px;
              border-radius: 8px;
              display: inline-block;
              margin-top: 15px;
            }
            .amount-display span {
              font-size: 24px;
              font-weight: bold;
            }
            .message-section {
              background: #fff8e7;
              border: 2px solid #C8A96A;
              border-radius: 12px;
              padding: 25px;
              margin: 30px 0;
              text-align: center;
            }
            .signature {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #C8A96A;
            }
            .signature p {
              font-family: 'Great Vibes', cursive;
              font-size: 28px;
              color: #C8A96A;
              margin: 10px 0;
            }
            .footer {
              text-align: center;
              padding-top: 20px;
              color: #666;
              font-size: 14px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Golden Love 2026</h1>
            <p style="color: #666; margin: 15px 0 0 0; font-size: 18px;">Ruth & Arnold</p>
          </div>
          
          <div class="content">
            <div class="heart-icon">💕</div>
            
            <div class="thank-you-box">
              <h2>Merci infiniment, ${contributorData.donorName} !</h2>
              <p style="margin: 10px 0 0 0; opacity: 0.95;">Votre générosité nous touche profondément</p>
              <div class="amount-display">
                <span>${formattedAmount} ${currencySymbol}</span>
              </div>
            </div>
            
            <div class="message-section">
              <p style="font-size: 18px; margin: 0; color: #333;">
                Cher(e) ${contributorData.donorName},
              </p>
              <p style="margin: 15px 0; color: #555;">
                Du fond du cœur, nous tenons à vous remercier pour votre précieuse contribution à notre cagnotte de mariage.
              </p>
              <p style="margin: 15px 0; color: #555;">
                Votre geste d'amour et de générosité nous aide à construire les plus beaux souvenirs pour notre nouvelle vie ensemble. Chaque contribution est un témoignage de votre affection qui nous accompagnera pour toujours.
              </p>
              <p style="margin: 15px 0 0 0; color: #555;">
                Nous avons hâte de partager ces moments magiques avec vous les 19 et 21 mars 2026 !
              </p>
            </div>
            
            <div class="signature">
              <p>Avec tout notre amour,</p>
              <p style="font-size: 24px; margin-top: 5px;"><strong>Ruth & Arnold</strong></p>
            </div>
          </div>
          
          <div class="footer">
            <p>© 2026 Ruth & Arnold - Golden Love</p>
            <p style="font-size: 12px; color: #999; margin-top: 10px;">
              Ce message a été envoyé suite à votre contribution sur notre site de mariage.
            </p>
          </div>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: fromEmail,
      to: contributorData.email,
      subject: `Merci ${contributorData.donorName} ! 💕 Votre contribution nous touche - Ruth & Arnold`,
      html: emailHtml,
    });

    console.log("Contributor thank you email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send contributor thank you email:", error);
    throw error;
  }
}

export async function sendPersonalizedInvitation(recipientData: {
  id?: number;
  email: string;
  firstName: string;
  lastName: string;
  message?: string;
  qrToken?: string;
}) {
  try {
    const customMessage =
      recipientData.message ||
      `Nous serions honorés de votre présence à notre mariage.`;
    const domain =
      process.env.SITE_URL ||
      (process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000");
    const link = recipientData.qrToken
      ? `${domain}/checkin?token=${recipientData.qrToken}`
      : `${domain}/invitation/viewer`;
    const pdfLink = recipientData.id 
      ? `${domain}/api/invitations/${recipientData.id}/pdf` 
      : null;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.8;
              color: #333;
              max-width: 650px;
              margin: 0 auto;
              padding: 20px;
              background: #fff;
            }
            .header {
              text-align: center;
              padding: 40px 0;
              background: linear-gradient(135deg, #f5f5f0 0%, #fff 100%);
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-family: 'Playfair Display', serif;
              color: #C8A96A;
              margin: 0;
              font-size: 42px;
              letter-spacing: 2px;
            }
            .subtitle {
              font-family: 'Great Vibes', cursive;
              color: #666;
              font-size: 24px;
              margin: 10px 0 0 0;
            }
            .content {
              padding: 20px 0;
            }
            .greeting {
              font-size: 18px;
              margin-bottom: 20px;
            }
            .message-box {
              background: #f9f9f9;
              border-left: 4px solid #C8A96A;
              padding: 20px;
              margin: 25px 0;
              font-style: italic;
            }
            .dates-section {
              background: #fff;
              border: 2px solid #C8A96A;
              border-radius: 8px;
              padding: 25px;
              margin: 30px 0;
            }
            .date-item {
              padding: 15px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .date-item:last-child {
              border-bottom: none;
            }
            .date-title {
              color: #C8A96A;
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 5px;
            }
            .cta-button {
              display: inline-block;
              background: #C8A96A;
              color: white;
              padding: 15px 40px;
              text-decoration: none;
              border-radius: 30px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              padding-top: 30px;
              border-top: 2px solid #C8A96A;
              color: #666;
              font-size: 14px;
              margin-top: 40px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Golden Love 2026</h1>
            <p class="subtitle">Deux dates, un seul amour</p>
            <p style="color: #666; margin: 15px 0 0 0; font-size: 20px;">Ruth & Arnold</p>
          </div>
          
          <div class="content">
            <p class="greeting">Cher(e) ${recipientData.firstName} ${recipientData.lastName},</p>
            
            <div class="message-box">
              ${customMessage}
            </div>
            
            <div class="dates-section">
              <h2 style="color: #C8A96A; text-align: center; margin-top: 0;">Nos dates importantes</h2>
              
              <div class="date-item">
                <div class="date-title">Jeudi 19 Mars 2026</div>
                <p style="margin: 5px 0;">Remise de dot et Mariage coutumier</p>
              </div>
              
              <div class="date-item">
                <div class="date-title">Samedi 21 Mars 2026</div>
                <p style="margin: 5px 0;">Mariage civil + Bénédiction nuptiale + Grande fête</p>
              </div>
            </div>
            
            ${pdfLink ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${pdfLink}" class="cta-button" style="background: #C8A96A;">
                Télécharger mon invitation PDF
              </a>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${link}" class="cta-button" style="background: transparent; border: 2px solid #C8A96A; color: #C8A96A;">
                 ${recipientData.qrToken ? "Accéder à mon Pass / QR Code" : "Voir les détails"}
              </a>
            </div>

            
            <p style="margin-top: 25px;">
              Nous attendons votre réponse avec impatience !
            </p>
            
            <p style="margin-top: 30px;">
              Avec toute notre affection,<br>
              <strong>Ruth & Arnold</strong>
            </p>
          </div>
          
          <div class="footer">
            <p>© 2026 Ruth & Arnold - Golden Love</p>
          </div>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: fromEmail,
      to: recipientData.email,
      subject: `Vous êtes invité(e) à notre mariage - Ruth & Arnold`,
      html: emailHtml,
    });

    console.log("Personalized invitation sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send personalized invitation:", error);
    throw error;
  }
}

// Email for when availability is changed from "both" to "21-march" only
export async function sendDateChangeApologyEmail(guestData: {
  email: string;
  firstName: string;
  lastName: string;
}) {
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              line-height: 1.8;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #faf8f5;
            }
            .container {
              background: linear-gradient(135deg, #fffef9 0%, #faf5eb 100%);
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 20px rgba(200, 169, 106, 0.15);
            }
            .header {
              text-align: center;
              padding-bottom: 25px;
              border-bottom: 2px solid #C8A96A;
              margin-bottom: 30px;
            }
            .header h1 {
              font-family: 'Playfair Display', Georgia, serif;
              color: #C8A96A;
              font-size: 28px;
              margin: 0;
              font-weight: 400;
            }
            .content {
              padding: 20px 0;
            }
            .content p {
              margin: 15px 0;
              font-size: 16px;
              color: #555;
            }
            .highlight {
              background: linear-gradient(135deg, #C8A96A 0%, #d4b87a 100%);
              color: white;
              padding: 20px 25px;
              border-radius: 10px;
              text-align: center;
              margin: 25px 0;
            }
            .highlight strong {
              font-size: 20px;
              display: block;
              margin-bottom: 5px;
            }
            .footer {
              text-align: center;
              padding-top: 25px;
              border-top: 1px solid #e8e0d0;
              margin-top: 30px;
              color: #888;
              font-size: 14px;
            }
            .signature {
              font-family: 'Great Vibes', cursive;
              font-size: 24px;
              color: #C8A96A;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Ruth & Arnold</h1>
            </div>
            <div class="content">
              <p>Cher(e) ${guestData.firstName} ${guestData.lastName},</p>
              
              <p>Nous vous remercions sincèrement d'avoir répondu à notre invitation et d'avoir exprimé votre souhait d'être présent(e) aux deux dates de notre mariage.</p>
              
              <p>Cependant, en raison du <strong>nombre de places limité</strong> pour la cérémonie du 19 mars, nous avons dû faire des choix difficiles pour l'organisation.</p>
              
              <p>Nous vous prions de bien vouloir nous excuser pour ce changement. Nous comptons sur votre compréhension, car comme mentionné dans notre invitation initiale, ces informations nous servaient principalement à mieux nous organiser.</p>
              
              <div class="highlight">
                <strong>Nous vous attendons avec joie</strong>
                Le 21 mars 2026<br>
                Mariage Civil + Bénédiction Nuptiale + Grande Fête
              </div>
              
              <p>Votre présence à cette journée exceptionnelle compte énormément pour nous, et nous avons hâte de célébrer ce moment unique avec vous.</p>
              
              <p>Avec toute notre affection,</p>
              <p class="signature">Ruth & Arnold</p>
            </div>
            <div class="footer">
              <p>21 Mars 2026 • Bruxelles, Belgique</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"Ruth & Arnold - Mariage 2026" <${fromEmail}>`,
      to: guestData.email,
      subject: `Information importante concernant notre mariage - Ruth & Arnold`,
      html: emailHtml,
    });

    console.log("Date change apology email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send date change apology email:", error);
    throw error;
  }
}
