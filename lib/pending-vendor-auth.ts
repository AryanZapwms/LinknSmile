// lib/pending-vendor-auth.ts
//
// Bridges the vendor OTP-registration flow (app/auth/register-vendor →
// app/auth/verify-otp): verify-otp only confirms the email, it doesn't sign
// the user in, and the plaintext password isn't available there otherwise.
// Stashing it here (sessionStorage — per-tab, gone once the tab closes)
// lets verify-otp auto sign the vendor in right after OTP success instead
// of bouncing them through a manual login before they ever reach the MOU
// gate. Read once and removed immediately after (see verify-otp/page.tsx).

function storageKey(email: string): string {
  return `pendingVendorPassword:${email.trim().toLowerCase()}`;
}

export function stashPendingVendorPassword(email: string, password: string) {
  try {
    sessionStorage.setItem(storageKey(email), password);
  } catch {
    // sessionStorage unavailable (privacy mode, etc.) — verify-otp just
    // falls back to sending the vendor to the manual login page.
  }
}

export function consumePendingVendorPassword(email: string): string | null {
  const key = storageKey(email);
  try {
    const value = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}
