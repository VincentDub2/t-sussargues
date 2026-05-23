import { prisma } from "@/lib/prisma";

export const NOTIFICATION_EVENT_KEYS = [
  "user_invitation",
  "password_reset",
  "intervention_created",
  "intervention_assigned",
  "purchase_validated",
  "purchase_rejected",
] as const;

export type NotificationEventKey = (typeof NOTIFICATION_EVENT_KEYS)[number];

export type NotificationVariableMap = Record<
  string,
  string | number | null | undefined
>;

export const NOTIFICATION_EVENT_DEFINITIONS: Array<{
  key: NotificationEventKey;
  label: string;
  description: string;
  defaultSubject: string;
  defaultBodyText: string;
  placeholders: string[];
  testVariables: NotificationVariableMap;
}> = [
  {
    key: "user_invitation",
    label: "Invitation utilisateur",
    description: "Envoi du lien d'activation pour un nouvel utilisateur invite.",
    defaultSubject: "Invitation a rejoindre l'application T-Sussargues",
    defaultBodyText: [
      "Bonjour {{firstName}},",
      "",
      "{{invitedByName}} vous a invite a rejoindre l'application T-Sussargues.",
      "",
      "Cliquez sur le lien suivant pour definir votre mot de passe :",
      "{{invitationUrl}}",
      "",
      "Ce lien expire dans 7 jours.",
    ].join("\n"),
    placeholders: ["firstName", "invitedByName", "invitationUrl"],
    testVariables: {
      firstName: "Camille",
      invitedByName: "Admin T-Sussargues",
      invitationUrl: "http://localhost:3000/invitation/demo",
    },
  },
  {
    key: "password_reset",
    label: "Reset mot de passe",
    description: "Envoi du lien de reinitialisation de mot de passe.",
    defaultSubject: "Reinitialisation de votre mot de passe T-Sussargues",
    defaultBodyText: [
      "Bonjour {{firstName}},",
      "",
      "Une demande de reinitialisation de mot de passe a ete effectuee pour votre compte T-Sussargues.",
      "",
      "Cliquez sur le lien suivant pour definir un nouveau mot de passe :",
      "{{resetUrl}}",
      "",
      "Ce lien expire dans 2 heures.",
      "Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer cet email.",
    ].join("\n"),
    placeholders: ["firstName", "resetUrl"],
    testVariables: {
      firstName: "Camille",
      resetUrl: "http://localhost:3000/reset-password/demo",
    },
  },
  {
    key: "intervention_created",
    label: "Creation intervention",
    description: "Confirmation envoyee au demandeur lors de la creation d'une intervention.",
    defaultSubject: "Intervention creee - {{ticketNumber}}",
    defaultBodyText: [
      "Bonjour {{firstName}},",
      "",
      "Votre intervention {{ticketNumber}} a bien ete creee.",
      "Objet: {{title}}",
      "",
      "Vous pourrez suivre son avancement dans l'application T-Sussargues.",
    ].join("\n"),
    placeholders: ["firstName", "ticketNumber", "title"],
    testVariables: {
      firstName: "Camille",
      ticketNumber: "INT-2026-001",
      title: "Fuite sur reseau d'arrosage",
    },
  },
  {
    key: "intervention_assigned",
    label: "Affectation intervention",
    description: "Message envoye a l'agent assigne a une intervention.",
    defaultSubject: "Intervention assignee - {{ticketNumber}}",
    defaultBodyText: [
      "Bonjour {{firstName}},",
      "",
      "{{assignedByName}} vous a assigne l'intervention {{ticketNumber}}.",
      "Objet: {{title}}",
      "",
      "Merci de consulter le detail dans l'application T-Sussargues.",
    ].join("\n"),
    placeholders: ["firstName", "ticketNumber", "title", "assignedByName"],
    testVariables: {
      firstName: "Camille",
      ticketNumber: "INT-2026-014",
      title: "Eclairage public a verifier",
      assignedByName: "Responsable Service",
    },
  },
  {
    key: "purchase_validated",
    label: "Achat valide",
    description: "Notification envoyee au demandeur quand une demande d'achat est validee.",
    defaultSubject: "Demande d'achat validee - {{requestNumber}}",
    defaultBodyText: [
      "Bonjour {{firstName}},",
      "",
      "{{decidedByName}} a valide votre demande d'achat {{requestNumber}}.",
      "Objet: {{title}}",
      "{{commentBlock}}",
      "",
      "Vous pouvez consulter le detail dans l'application T-Sussargues.",
    ].join("\n"),
    placeholders: ["firstName", "requestNumber", "title", "decidedByName", "comment", "commentBlock"],
    testVariables: {
      firstName: "Camille",
      requestNumber: "ACH-2026-045",
      title: "Renouvellement de materiel informatique",
      decidedByName: "Responsable Service",
      comment: "Budget valide.",
      commentBlock: "Commentaire: Budget valide.",
    },
  },
  {
    key: "purchase_rejected",
    label: "Achat refuse",
    description: "Notification envoyee au demandeur quand une demande d'achat est refusee.",
    defaultSubject: "Demande d'achat refusee - {{requestNumber}}",
    defaultBodyText: [
      "Bonjour {{firstName}},",
      "",
      "{{decidedByName}} a refuse votre demande d'achat {{requestNumber}}.",
      "Objet: {{title}}",
      "{{commentBlock}}",
      "",
      "Vous pouvez consulter le detail dans l'application T-Sussargues.",
    ].join("\n"),
    placeholders: ["firstName", "requestNumber", "title", "decidedByName", "comment", "commentBlock"],
    testVariables: {
      firstName: "Camille",
      requestNumber: "ACH-2026-046",
      title: "Mobilier de bureau",
      decidedByName: "Responsable Service",
      comment: "Budget indisponible cette annee.",
      commentBlock: "Commentaire: Budget indisponible cette annee.",
    },
  },
];

export function isNotificationEventKey(value: string): value is NotificationEventKey {
  return NOTIFICATION_EVENT_KEYS.includes(value as NotificationEventKey);
}

export function getNotificationDefinition(eventKey: NotificationEventKey) {
  const definition = NOTIFICATION_EVENT_DEFINITIONS.find(
    (item) => item.key === eventKey
  );

  if (!definition) {
    throw new Error(`Unknown notification event key: ${eventKey}`);
  }

  return definition;
}

export async function ensureNotificationCatalog() {
  for (const definition of NOTIFICATION_EVENT_DEFINITIONS) {
    const event = await prisma.notificationEvent.upsert({
      where: { key: definition.key },
      update: {
        label: definition.label,
        description: definition.description,
      },
      create: {
        key: definition.key,
        label: definition.label,
        description: definition.description,
      },
      select: {
        id: true,
      },
    });

    await prisma.notificationTemplate.upsert({
      where: { eventId: event.id },
      update: {},
      create: {
        eventId: event.id,
        subject: definition.defaultSubject,
        bodyText: definition.defaultBodyText,
      },
    });
  }
}

export function renderNotificationContent(
  template: string,
  variables: NotificationVariableMap
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const value = variables[key];
    return value == null ? "" : String(value);
  });
}

export function buildCommentBlock(comment?: string | null) {
  return comment ? `Commentaire: ${comment}` : "";
}

export function getNotificationTestVariables(eventKey: NotificationEventKey) {
  return getNotificationDefinition(eventKey).testVariables;
}
