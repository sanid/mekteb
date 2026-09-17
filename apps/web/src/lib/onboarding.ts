import { randomBytes } from "node:crypto";

// Memorable-enough temporary password: 3 letter-digit chunks.
// Alphabet avoids visually ambiguous characters (0/O, 1/l/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTempPassword(): string {
  const bytes = randomBytes(12);
  const chars: string[] = [];
  for (let i = 0; i < 12; i++) {
    chars.push(ALPHABET[bytes[i] % ALPHABET.length]);
  }
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars
    .slice(8, 12)
    .join("")}`;
}

export const OTP_VALIDITY_DAYS = 7;

export function otpExpiresAt(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + OTP_VALIDITY_DAYS);
  return d.toISOString();
}
