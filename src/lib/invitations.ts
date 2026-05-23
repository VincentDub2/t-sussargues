import { createHash, randomBytes } from "node:crypto";

export const INVITATION_EXPIRATION_DAYS = 7;

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateInvitationToken() {
  const token = randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: hashInvitationToken(token),
  };
}

export function getInvitationExpiryDate() {
  return new Date(Date.now() + INVITATION_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
}

export function getInvitationUrl(token: string) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return new URL(`/invitation/${token}`, appUrl).toString();
}
