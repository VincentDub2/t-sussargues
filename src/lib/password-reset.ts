import { createHash, randomBytes } from "node:crypto";

export const PASSWORD_RESET_EXPIRATION_HOURS = 2;

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generatePasswordResetToken() {
  const token = randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: hashPasswordResetToken(token),
  };
}

export function getPasswordResetExpiryDate() {
  return new Date(
    Date.now() + PASSWORD_RESET_EXPIRATION_HOURS * 60 * 60 * 1000
  );
}

export function getPasswordResetUrl(token: string) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return new URL(`/reset-password/${token}`, appUrl).toString();
}
