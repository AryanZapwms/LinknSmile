import crypto from "crypto";
import { sendEmail } from "./EmailOtp";

export function generateNumericOtp(length = 6) {
  const digits = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * digits.length);
    result += digits[idx];
  }
  return result;
}

export function hashOtp(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export function isExpired(date: Date) {
  return new Date() > date;
}

export async function sendOTP(email: string) {
  const otp = generateNumericOtp();
  const hashedOtp = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await sendEmail({
    to: email,
    subject: "Your LinkAndSmile Verification Code",
    html: `
      <div style="font-family: sans-serif; padding: 20px; text-align: center;">
        <h2>Verify Your Email</h2>
        <p>Use the following code to complete your registration:</p>
        <div style="font-size: 32px; font-weight: bold; margin: 20px; letter-spacing: 5px;">${otp}</div>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `
  });
  
  return { hashedOtp, expiresAt };
}
