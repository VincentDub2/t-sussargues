import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";

type EmailDeliveryResult =
  | { status: "sent" }
  | { status: "dev_preview"; previewUrl?: string }
  | { status: "failed"; errorMessage: string };

type SendAppEmailInput = {
  event: string;
  recipient: string;
  subject: string;
  text: string;
  previewUrl?: string;
  previewText?: string;
};

type InvitationEmailInput = {
  email: string;
  firstName: string;
  invitationUrl: string;
  invitedByName: string;
};

type PasswordResetEmailInput = {
  email: string;
  firstName: string;
  resetUrl: string;
};

type InterventionCreatedEmailInput = {
  email: string;
  firstName: string;
  ticketNumber: string;
  title: string;
};

type InterventionAssignedEmailInput = {
  email: string;
  firstName: string;
  ticketNumber: string;
  title: string;
  assignedByName: string;
};

type PurchaseDecisionEmailInput = {
  email: string;
  firstName: string;
  requestNumber: string;
  title: string;
  decidedByName: string;
  comment?: string | null;
};

function isSmtpConfigured() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  return Boolean(
    host &&
      port &&
      user &&
      password &&
      host !== "smtp.example.com" &&
      user !== "user@example.com" &&
      password !== "replace-with-your-smtp-password"
  );
}

function isTruthyEnvFlag(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase());
}

function getTransporter() {
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure =
    isTruthyEnvFlag(process.env.SMTP_SECURE) || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    requireTLS:
      String(process.env.SMTP_TLS ?? "").toUpperCase() === "STARTTLS" && !secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

async function logEmailDelivery(
  input: SendAppEmailInput,
  result: EmailDeliveryResult
) {
  const errorMessage =
    result.status === "dev_preview"
      ? result.previewUrl
        ? `Preview URL: ${result.previewUrl}`
        : input.previewText ?? "Dev preview only."
      : result.status === "failed"
        ? result.errorMessage
        : null;

  await prisma.notificationLog.create({
    data: {
      event: input.event,
      recipient: input.recipient,
      subject: input.subject,
      status: result.status,
      errorMessage,
    },
  });
}

async function sendAppEmail(
  input: SendAppEmailInput
): Promise<EmailDeliveryResult> {
  if (!isSmtpConfigured()) {
    const result: EmailDeliveryResult = {
      status: "dev_preview",
      previewUrl: input.previewUrl,
    };

    await logEmailDelivery(input, result);
    return result;
  }

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: input.recipient,
      subject: input.subject,
      text: input.text,
    });

    const result: EmailDeliveryResult = { status: "sent" };
    await logEmailDelivery(input, result);
    return result;
  } catch (error) {
    const result: EmailDeliveryResult = {
      status: "failed",
      errorMessage:
        error instanceof Error ? error.message : "Envoi de l'email impossible.",
    };

    await logEmailDelivery(input, result);
    return result;
  }
}

function getInvitationSubject() {
  return "Invitation a rejoindre l'application T-Sussargues";
}

function getInvitationText({
  firstName,
  invitationUrl,
  invitedByName,
}: InvitationEmailInput) {
  return [
    `Bonjour ${firstName},`,
    "",
    `${invitedByName} vous a invite a rejoindre l'application T-Sussargues.`,
    "",
    "Cliquez sur le lien suivant pour definir votre mot de passe :",
    invitationUrl,
    "",
    "Ce lien expire dans 7 jours.",
  ].join("\n");
}

export async function sendInvitationEmail(input: InvitationEmailInput) {
  return sendAppEmail({
    event: "user_invitation",
    recipient: input.email,
    subject: getInvitationSubject(),
    text: getInvitationText(input),
    previewUrl: input.invitationUrl,
    previewText: `Invitation: ${input.invitationUrl}`,
  });
}

function getPasswordResetSubject() {
  return "Reinitialisation de votre mot de passe T-Sussargues";
}

function getPasswordResetText({
  firstName,
  resetUrl,
}: PasswordResetEmailInput) {
  return [
    `Bonjour ${firstName},`,
    "",
    "Une demande de reinitialisation de mot de passe a ete effectuee pour votre compte T-Sussargues.",
    "",
    "Cliquez sur le lien suivant pour definir un nouveau mot de passe :",
    resetUrl,
    "",
    "Ce lien expire dans 2 heures.",
    "Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email.",
  ].join("\n");
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  return sendAppEmail({
    event: "password_reset",
    recipient: input.email,
    subject: getPasswordResetSubject(),
    text: getPasswordResetText(input),
    previewUrl: input.resetUrl,
    previewText: `Reset: ${input.resetUrl}`,
  });
}

function getInterventionCreatedSubject(ticketNumber: string) {
  return `Intervention creee - ${ticketNumber}`;
}

function getInterventionCreatedText({
  firstName,
  ticketNumber,
  title,
}: InterventionCreatedEmailInput) {
  return [
    `Bonjour ${firstName},`,
    "",
    `Votre intervention ${ticketNumber} a bien ete creee.`,
    `Objet: ${title}`,
    "",
    "Vous pourrez suivre son avancement dans l'application T-Sussargues.",
  ].join("\n");
}

export async function sendInterventionCreatedEmail(
  input: InterventionCreatedEmailInput
) {
  return sendAppEmail({
    event: "intervention_created",
    recipient: input.email,
    subject: getInterventionCreatedSubject(input.ticketNumber),
    text: getInterventionCreatedText(input),
    previewText: `Intervention ${input.ticketNumber} creee`,
  });
}

function getInterventionAssignedSubject(ticketNumber: string) {
  return `Intervention assignee - ${ticketNumber}`;
}

function getInterventionAssignedText({
  firstName,
  ticketNumber,
  title,
  assignedByName,
}: InterventionAssignedEmailInput) {
  return [
    `Bonjour ${firstName},`,
    "",
    `${assignedByName} vous a assigne l'intervention ${ticketNumber}.`,
    `Objet: ${title}`,
    "",
    "Merci de consulter le detail dans l'application T-Sussargues.",
  ].join("\n");
}

export async function sendInterventionAssignedEmail(
  input: InterventionAssignedEmailInput
) {
  return sendAppEmail({
    event: "intervention_assigned",
    recipient: input.email,
    subject: getInterventionAssignedSubject(input.ticketNumber),
    text: getInterventionAssignedText(input),
    previewText: `Intervention ${input.ticketNumber} assignee`,
  });
}

function getPurchaseValidatedSubject(requestNumber: string) {
  return `Demande d'achat validee - ${requestNumber}`;
}

function getPurchaseValidatedText({
  firstName,
  requestNumber,
  title,
  decidedByName,
  comment,
}: PurchaseDecisionEmailInput) {
  return [
    `Bonjour ${firstName},`,
    "",
    `${decidedByName} a valide votre demande d'achat ${requestNumber}.`,
    `Objet: ${title}`,
    ...(comment ? ["", `Commentaire: ${comment}`] : []),
    "",
    "Vous pouvez consulter le detail dans l'application T-Sussargues.",
  ].join("\n");
}

export async function sendPurchaseValidatedEmail(
  input: PurchaseDecisionEmailInput
) {
  return sendAppEmail({
    event: "purchase_validated",
    recipient: input.email,
    subject: getPurchaseValidatedSubject(input.requestNumber),
    text: getPurchaseValidatedText(input),
    previewText: `Achat ${input.requestNumber} valide`,
  });
}

function getPurchaseRejectedSubject(requestNumber: string) {
  return `Demande d'achat refusee - ${requestNumber}`;
}

function getPurchaseRejectedText({
  firstName,
  requestNumber,
  title,
  decidedByName,
  comment,
}: PurchaseDecisionEmailInput) {
  return [
    `Bonjour ${firstName},`,
    "",
    `${decidedByName} a refuse votre demande d'achat ${requestNumber}.`,
    `Objet: ${title}`,
    ...(comment ? ["", `Commentaire: ${comment}`] : []),
    "",
    "Vous pouvez consulter le detail dans l'application T-Sussargues.",
  ].join("\n");
}

export async function sendPurchaseRejectedEmail(
  input: PurchaseDecisionEmailInput
) {
  return sendAppEmail({
    event: "purchase_rejected",
    recipient: input.email,
    subject: getPurchaseRejectedSubject(input.requestNumber),
    text: getPurchaseRejectedText(input),
    previewText: `Achat ${input.requestNumber} refuse`,
  });
}
