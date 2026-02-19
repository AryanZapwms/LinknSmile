import nodemailer from "nodemailer";

const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || GMAIL_EMAIL;

if (!GMAIL_EMAIL || !GMAIL_APP_PASSWORD) {
  console.warn("GMAIL_EMAIL or GMAIL_APP_PASSWORD not set. Emails will fail.");
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_EMAIL,
    pass: GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, 
  },
});

export async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html?: string; text?: string }) {
  if (!transporter) throw new Error("Mail transporter not configured");
  return transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
}

const buildOtpHtml = (name: string, otp: string) => {
  return `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #fafafa; padding: 40px 0; color: #222;">
    <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 14px; box-shadow: 0 3px 12px rgba(0,0,0,0.05); overflow: hidden;">
      <div style="padding: 40px 32px 28px;">
        <div style="text-align:center; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #111;">LinkAndSmile</h1>
          <p style="font-size: 12px; color: #888; letter-spacing: 2px;">PREMIUM SKINCARE</p>
        </div>

        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #111; text-align:center;">
          Verify Your Email Address
        </h2>

        <p style="font-size: 15px; color: #444; text-align:center; margin-bottom: 8px;">
          Hi ${name || "there"},
        </p>
        <p style="font-size: 15px; color: #444; text-align:center; margin-bottom: 20px;">
          Use the following one-time code to verify your account.
        </p>

        <div style="text-align:center; margin: 28px 0;">
          <span style="display:inline-block; font-size: 36px; font-weight:700; letter-spacing: 8px; color:#222; background:#f5f5f5; padding: 12px 20px; border-radius: 10px;">
            ${otp}
          </span>
        </div>

        <p style="font-size: 14px; color: #666; text-align:center;">
          This code will expire in <strong>10 minutes</strong>.
        </p>

        <p style="font-size: 13px; color:#888; text-align:center; margin-top: 30px;">
          Didn’t request this? Just ignore this email.
        </p>
      </div>

      <div style="background:#fafafa; border-top:1px solid #eee; text-align:center; padding:16px;">
        <p style="font-size:12px; color:#aaa; margin:0;">© ${new Date().getFullYear()} LinkAndSmile. All rights reserved.</p>
      </div>
    </div>
  </div>
  `;
}


export function buildWelcomeHtml(name: string) {
  return `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #fafafa; padding: 40px 0; color: #222;">
    <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 14px; box-shadow: 0 3px 12px rgba(0,0,0,0.05); overflow: hidden;">
      <div style="padding: 40px 32px 28px;">
        <div style="text-align:center; margin-bottom: 24px;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #111;">LinkAndSmile</h1>
          <p style="font-size: 12px; color: #888; letter-spacing: 2px;">PREMIUM SKINCARE</p>
        </div>

        <h2 style="font-size: 20px; font-weight: 600; color:#111; text-align:center;">
          Welcome to LinkAndSmile, ${name || "beautiful"}!
        </h2>

        <p style="font-size:15px; color:#444; text-align:center; margin:16px 0 24px;">
          You’ve just joined India’s leading professional skincare brand.  
          We’re thrilled to have you on board!
        </p>

        <div style="text-align:center;">
          <a href="#" style="display:inline-block; background:#111; color:#fff; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:15px; font-weight:600;">
            Verify Email
          </a>
        </div>
      </div>

      <div style="background:#fafafa; border-top:1px solid #eee; text-align:center; padding:16px;">
        <p style="font-size:12px; color:#aaa; margin:0;">© ${new Date().getFullYear()} LinkAndSmile. All rights reserved.</p>
      </div>
    </div>
  </div>
  `;
}


export async function sendOtpEmail(to: string, name: string, otp: string) {
  const html = buildOtpHtml(name, otp);
  return sendEmail({ to, subject: "Your verification code", html });
}

export async function sendWelcomeEmail(to: string, name: string) {
  const html = buildWelcomeHtml(name);
  return sendEmail({ to, subject: "Welcome to LinkAndSmile!", html });
}
