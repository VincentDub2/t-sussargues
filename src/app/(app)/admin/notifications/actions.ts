"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { sendTestNotificationEmail } from "@/lib/email";
import { ensureNotificationCatalog, isNotificationEventKey } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

type NotificationFormState = {
  error?: string;
  success?: string;
  deliveryStatus?: "sent" | "dev_preview" | "disabled" | "skipped_no_recipient";
};

async function requireAdmin() {
  const session = await auth();

  if (session?.user.role !== "admin") {
    throw new Error("Acces reserve a l'administration.");
  }

  return session;
}

export async function toggleNotificationEvent(eventId: string) {
  await requireAdmin();
  await ensureNotificationCatalog();

  const event = await prisma.notificationEvent.findUnique({
    where: { id: eventId },
    select: { id: true, isActive: true },
  });

  if (!event) {
    throw new Error("Evenement de notification introuvable.");
  }

  await prisma.notificationEvent.update({
    where: { id: eventId },
    data: {
      isActive: !event.isActive,
    },
  });

  revalidatePath("/admin/notifications");
}

export async function updateNotificationTemplate(
  eventId: string,
  _previousState: NotificationFormState,
  formData: FormData
): Promise<NotificationFormState> {
  void _previousState;
  await requireAdmin();
  await ensureNotificationCatalog();

  const subject = String(formData.get("subject") ?? "").trim();
  const bodyText = String(formData.get("bodyText") ?? "").trim();

  if (!subject || !bodyText) {
    return { error: "Le sujet et le template sont obligatoires." };
  }

  const event = await prisma.notificationEvent.findUnique({
    where: { id: eventId },
    select: { id: true, template: { select: { id: true } } },
  });

  if (!event?.template) {
    return { error: "Template de notification introuvable." };
  }

  await prisma.notificationTemplate.update({
    where: { id: event.template.id },
    data: {
      subject,
      bodyText,
    },
  });

  revalidatePath("/admin/notifications");

  return { success: "Template mis a jour." };
}

export async function createNotificationRecipient(
  eventId: string,
  _previousState: NotificationFormState,
  formData: FormData
): Promise<NotificationFormState> {
  void _previousState;
  await requireAdmin();
  await ensureNotificationCatalog();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const label = String(formData.get("label") ?? "").trim();

  if (!email) {
    return { error: "Veuillez renseigner un email." };
  }

  const event = await prisma.notificationEvent.findUnique({
    where: { id: eventId },
    select: { id: true },
  });

  if (!event) {
    return { error: "Evenement de notification introuvable." };
  }

  await prisma.notificationRecipient.create({
    data: {
      eventId,
      email,
      label: label || null,
    },
  });

  revalidatePath("/admin/notifications");

  return { success: "Destinataire ajoute." };
}

export async function toggleNotificationRecipient(recipientId: string) {
  await requireAdmin();

  const recipient = await prisma.notificationRecipient.findUnique({
    where: { id: recipientId },
    select: { id: true, isActive: true },
  });

  if (!recipient) {
    throw new Error("Destinataire introuvable.");
  }

  await prisma.notificationRecipient.update({
    where: { id: recipientId },
    data: {
      isActive: !recipient.isActive,
    },
  });

  revalidatePath("/admin/notifications");
}

export async function deleteNotificationRecipient(recipientId: string) {
  await requireAdmin();

  await prisma.notificationRecipient.delete({
    where: { id: recipientId },
  });

  revalidatePath("/admin/notifications");
}

export async function sendNotificationTest(
  eventId: string,
  _previousState: NotificationFormState,
  formData: FormData
): Promise<NotificationFormState> {
  void _previousState;
  await requireAdmin();
  await ensureNotificationCatalog();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "Veuillez renseigner un email de test." };
  }

  const event = await prisma.notificationEvent.findUnique({
    where: { id: eventId },
    select: {
      key: true,
    },
  });

  if (!event || !isNotificationEventKey(event.key)) {
    return { error: "Evenement de notification introuvable." };
  }

  const delivery = await sendTestNotificationEmail(event.key, email);

  revalidatePath("/admin/notifications");

  if (delivery.status === "failed") {
    return { error: delivery.errorMessage };
  }

  if (delivery.status === "disabled") {
    return {
      success: "Email de test prepare avec une notification desactivee.",
      deliveryStatus: "disabled",
    };
  }

  if (delivery.status === "skipped_no_recipient") {
    return {
      success: "Aucun destinataire actif n'a pu etre determine pour ce test.",
      deliveryStatus: "skipped_no_recipient",
    };
  }

  return {
    success:
      delivery.status === "sent"
        ? "Email de test envoye."
        : "Email de test genere en mode previsualisation.",
    deliveryStatus: delivery.status,
  };
}
