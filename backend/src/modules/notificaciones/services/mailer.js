// /backend/src/modules/notificaciones/services/mailer.js
// RUTA: /backend/src/modules/notificaciones/services/mailer.js
import nodemailer from 'nodemailer';

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  SMTP_FROM_EMAIL, SMTP_FROM_NAME
} = process.env;

// Pool para mejorar throughput si hay varias notificaciones
export const transporter = nodemailer.createTransport({
  host: SMTP_HOST || 'smtp.gmail.com',
  port: Number(SMTP_PORT) || 465,
  secure: true,
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

export const sendMail = async ({ to, subject, html }) => {
  const info = await transporter.sendMail({
    from: `"${SMTP_FROM_NAME || 'FedesHub'}" <${SMTP_FROM_EMAIL || SMTP_USER}>`,
    to, subject, html
  });
  return info.messageId || null;
};