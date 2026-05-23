import nodemailer from "nodemailer";

import {
  buildCommentBlock,
  ensureNotificationCatalog,
  getNotificationTestVariables,
  renderNotificationContent,
  type NotificationEventKey,
  type NotificationVariableMap,
} from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

export type EmailDeliveryResult =
  | { status: "sent" }
  | { status: "dev_preview"; previewUrl?: string }
  | { status: "failed"; errorMessage: string }
  | { status: "disabled" }
  | { status: "skipped_no_recipient" };

type SendConfiguredEmailInput = {
  eventKey: NotificationEventKey;
  primaryRecipients?: string[];
  variables: NotificationVariableMap;
  previewUrl?: string;
  previewText?: string;
  forceSend?: boolean;
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
  const secure = isTruthyEnvFlag(process.env.SMTP_SECURE) || port === 465;

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

async function logEmailDelivery({
  event,
  recipient,
  subject,
  result,
  previewText,
  previewUrl,
}: {
  event: string;
  recipient: string;
  subject: string;
  result: EmailDeliveryResult;
  previewText?: string;
  previewUrl?: string;
}) {
  const errorMessage =
    result.status === "dev_preview"
      ? previewUrl
        ? `Preview URL: ${previewUrl}`
        : previewText ?? "Dev preview only."
      : result.status === "failed"
        ? result.errorMessage
        : result.status === "disabled"
          ? "Notification desactivee par configuration."
          : result.status === "skipped_no_recipient"
            ? "Aucun destinataire actif pour cette notification."
            : null;

  await prisma.notificationLog.create({
    data: {
      event,
      recipient,
      subject,
      status: result.status,
      errorMessage,
    },
  });
}

function dedupeRecipients(emails: string[]) {
  return Array.from(
    new Set(
      emails
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

async function sendConfiguredEmail({
  eventKey,
  primaryRecipients = [],
  variables,
  previewUrl,
  previewText,
  forceSend = false,
}: SendConfiguredEmailInput): Promise<EmailDeliveryResult> {
  await ensureNotificationCatalog();

  const event = await prisma.notificationEvent.findUnique({
    where: { key: eventKey },
    include: {
      template: true,
      recipients: {
        where: { isActive: true },
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });

  if (!event?.template) {
    const result: EmailDeliveryResult = {
      status: "failed",
      errorMessage: "Configuration de notification introuvable.",
    };

    await logEmailDelivery({
      event: eventKey,
      recipient: primaryRecipients[0] ?? "aucun-destinataire",
      subject: "(configuration manquante)",
      result,
      previewText,
      previewUrl,
    });

    return result;
  }

  const subject = renderNotificationContent(event.template.subject, variables).trim();
  const bodyText = renderNotificationContent(event.template.bodyText, variables).trim();

  if (!event.isActive && !forceSend) {
    const result: EmailDeliveryResult = { status: "disabled" };

    await logEmailDelivery({
      event: event.key,
      recipient: primaryRecipients[0] ?? "notification-desactivee",
      subject,
      result,
      previewText,
      previewUrl,
    });

    return result;
  }

  const recipients = forceSend
    ? dedupeRecipients(primaryRecipients)
    : dedupeRecipients([
        ...primaryRecipients,
        ...event.recipients.map((recipient) => recipient.email),
      ]);

  if (recipients.length === 0) {
    const result: EmailDeliveryResult = { status: "skipped_no_recipient" };

    await logEmailDelivery({
      event: event.key,
      recipient: "aucun-destinataire",
      subject,
      result,
      previewText,
      previewUrl,
    });

    return result;
  }

  if (!isSmtpConfigured()) {
    const result: EmailDeliveryResult = { status: "dev_preview", previewUrl };

    await Promise.all(
      recipients.map((recipient) =>
        logEmailDelivery({
          event: event.key,
          recipient,
          subject,
          result,
          previewText,
          previewUrl,
        })
      )
    );

    return result;
  }

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: recipients.join(", "),
      subject,
      text: bodyText,
    });

    const result: EmailDeliveryResult = { status: "sent" };

    await Promise.all(
      recipients.map((recipient) =>
        logEmailDelivery({
          event: event.key,
          recipient,
          subject,
          result,
          previewText,
          previewUrl,
        })
      )
    );

    return result;
  } catch (error) {
    const result: EmailDeliveryResult = {
      status: "failed",
      errorMessage:
        error instanceof Error ? error.message : "Envoi de l'email impossible.",
    };

    await Promise.all(
      recipients.map((recipient) =>
        logEmailDelivery({
          event: event.key,
          recipient,
          subject,
          result,
          previewText,
          previewUrl,
        })
      )
    );

    return result;
  }
}

export async function sendTestNotificationEmail(
  eventKey: NotificationEventKey,
  email: string
) {
  return sendConfiguredEmail({
    eventKey,
    primaryRecipients: [email],
    variables: getNotificationTestVariables(eventKey),
    previewText: `Email de test ${eventKey}`,
    forceSend: true,
  });
}

export async function sendInvitationEmail(input: InvitationEmailInput) {
  return sendConfiguredEmail({
    eventKey: "user_invitation",
    primaryRecipients: [input.email],
    variables: {
      firstName: input.firstName,
      invitedByName: input.invitedByName,
      invitationUrl: input.invitationUrl,
    },
    previewUrl: input.invitationUrl,
    previewText: `Invitation: ${input.invitationUrl}`,
  });
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  return sendConfiguredEmail({
    eventKey: "password_reset",
    primaryRecipients: [input.email],
    variables: {
      firstName: input.firstName,
      resetUrl: input.resetUrl,
    },
    previewUrl: input.resetUrl,
    previewText: `Reset: ${input.resetUrl}`,
  });
}

export async function sendInterventionCreatedEmail(
  input: InterventionCreatedEmailInput
) {
  return sendConfiguredEmail({
    eventKey: "intervention_created",
    primaryRecipients: [input.email],
    variables: {
      firstName: input.firstName,
      ticketNumber: input.ticketNumber,
      title: input.title,
    },
    previewText: `Intervention ${input.ticketNumber} creee`,
  });
}

export async function sendInterventionAssignedEmail(
  input: InterventionAssignedEmailInput
) {
  return sendConfiguredEmail({
    eventKey: "intervention_assigned",
    primaryRecipients: [input.email],
    variables: {
      firstName: input.firstName,
      ticketNumber: input.ticketNumber,
      title: input.title,
      assignedByName: input.assignedByName,
    },
    previewText: `Intervention ${input.ticketNumber} assignee`,
  });
}

export async function sendPurchaseValidatedEmail(
  input: PurchaseDecisionEmailInput
) {
  return sendConfiguredEmail({
    eventKey: "purchase_validated",
    primaryRecipients: [input.email],
    variables: {
      firstName: input.firstName,
      requestNumber: input.requestNumber,
      title: input.title,
      decidedByName: input.decidedByName,
      comment: input.comment ?? "",
      commentBlock: buildCommentBlock(input.comment),
    },
    previewText: `Achat ${input.requestNumber} valide`,
  });
}

export async function sendPurchaseRejectedEmail(
  input: PurchaseDecisionEmailInput
) {
  return sendConfiguredEmail({
    eventKey: "purchase_rejected",
    primaryRecipients: [input.email],
    variables: {
      firstName: input.firstName,
      requestNumber: input.requestNumber,
      title: input.title,
      decidedByName: input.decidedByName,
      comment: input.comment ?? "",
      commentBlock: buildCommentBlock(input.comment),
    },
    previewText: `Achat ${input.requestNumber} refuse`,
  });
}
