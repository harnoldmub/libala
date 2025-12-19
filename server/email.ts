import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';

export async function sendRsvpConfirmationEmail(guestData: {
  firstName: string;
  lastName: string;
  availability: string;
}) {
  try {
    const availabilityText = {
      '19-march': '19 mars uniquement',
      '21-march': '21 mars uniquement',
      'both': 'Civil + Bénédiction nuptiale + Grande fête',
      'unavailable': 'Pas disponible'
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
              <p><strong>Date de réponse :</strong> ${new Date().toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</p>
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
      to: 'contact@ar2k26.com',
      subject: `Nouvelle réponse RSVP - ${guestData.firstName} ${guestData.lastName}`,
      html: emailHtml,
    });

    console.log('RSVP confirmation email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send RSVP confirmation email:', error);
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
    const availabilityText = {
      '19-march': '19 mars uniquement',
      '21-march': '21 mars uniquement',
      'both': 'Civil + Bénédiction nuptiale + Grande fête',
      'unavailable': 'Pas disponible'
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

    console.log('Guest confirmation email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send guest confirmation email:', error);
    throw error;
  }
}

export async function sendPersonalizedInvitation(recipientData: {
  email: string;
  firstName: string;
  lastName: string;
  message?: string;
  qrToken?: string;
}) {
  try {
    const customMessage = recipientData.message || `Nous serions honorés de votre présence à notre mariage.`;
    const domain = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000';
    const link = recipientData.qrToken ? `${domain}/checkin?token=${recipientData.qrToken}` : `${domain}/invitation/viewer`;

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
                <p style="margin: 5px 0;">Mariage civil + Fête de la Dot</p>
              </div>
              
              <div class="date-item">
                <div class="date-title">Samedi 21 Mars 2026</div>
                <p style="margin: 5px 0;">Bénédiction nuptiale + Grande fête</p>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}" class="cta-button">
                 ${recipientData.qrToken ? 'Accéder à mon Pass / QR Code' : 'Voir les détails'}
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

    console.log('Personalized invitation sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send personalized invitation:', error);
    throw error;
  }
}
