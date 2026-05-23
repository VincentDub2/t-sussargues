"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createNotificationRecipient,
  deleteNotificationRecipient,
  sendNotificationTest,
  toggleNotificationEvent,
  toggleNotificationRecipient,
  updateNotificationTemplate,
} from "@/app/(app)/admin/notifications/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type NotificationEventCardProps = {
  event: {
    id: string;
    key: string;
    label: string;
    description: string;
    isActive: boolean;
    template: {
      subject: string;
      bodyText: string;
    } | null;
    recipients: Array<{
      id: string;
      label: string | null;
      email: string;
      isActive: boolean;
    }>;
  };
  placeholders: string[];
};

type FormState = {
  error?: string;
  success?: string;
  deliveryStatus?: "sent" | "dev_preview" | "disabled" | "skipped_no_recipient";
};

const initialState: FormState = {};

function SubmitButton({
  idleLabel,
  pendingLabel,
  variant = "default",
}: {
  idleLabel: string;
  pendingLabel: string;
  variant?: "default" | "outline" | "secondary";
}) {
  const { pending } = useFormStatus();

  return (
    <Button variant={variant} disabled={pending}>
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

function ToggleButton({ isActive }: { isActive: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button variant="outline" disabled={pending}>
      {pending ? "Mise a jour..." : isActive ? "Desactiver" : "Activer"}
    </Button>
  );
}

export function NotificationEventCard({
  event,
  placeholders,
}: NotificationEventCardProps) {
  const updateTemplateAction = updateNotificationTemplate.bind(null, event.id);
  const createRecipientAction = createNotificationRecipient.bind(null, event.id);
  const sendTestAction = sendNotificationTest.bind(null, event.id);
  const [templateState, templateFormAction] = useActionState(
    updateTemplateAction,
    initialState
  );
  const [recipientState, recipientFormAction] = useActionState(
    createRecipientAction,
    initialState
  );
  const [testState, testFormAction] = useActionState(sendTestAction, initialState);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{event.label}</CardTitle>
            <Badge variant="outline">{event.key}</Badge>
            <Badge className={event.isActive ? "bg-success text-white" : "bg-secondary text-foreground"}>
              {event.isActive ? "Actif" : "Desactive"}
            </Badge>
          </div>
          <CardDescription>{event.description}</CardDescription>
        </div>

        <form action={toggleNotificationEvent.bind(null, event.id)}>
          <ToggleButton isActive={event.isActive} />
        </form>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">Template email</p>
              <p className="mt-1 text-sm text-muted">
                Placeholders disponibles :{" "}
                {placeholders.map((placeholder) => `{{${placeholder}}}`).join(", ")}
              </p>
            </div>

            <form action={templateFormAction} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor={`subject-${event.id}`} className="text-sm font-medium text-foreground">
                  Sujet
                </label>
                <Input
                  id={`subject-${event.id}`}
                  name="subject"
                  defaultValue={event.template?.subject ?? ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor={`body-${event.id}`} className="text-sm font-medium text-foreground">
                  Template texte
                </label>
                <Textarea
                  id={`body-${event.id}`}
                  name="bodyText"
                  defaultValue={event.template?.bodyText ?? ""}
                  rows={10}
                  required
                />
              </div>

              {templateState.error ? (
                <p className="text-sm text-danger">{templateState.error}</p>
              ) : null}
              {templateState.success ? (
                <p className="text-sm text-success">{templateState.success}</p>
              ) : null}

              <SubmitButton
                idleLabel="Enregistrer le template"
                pendingLabel="Enregistrement..."
              />
            </form>
          </div>

          <div className="space-y-5">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">Destinataires additionnels</p>
                <p className="mt-1 text-sm text-muted">
                  Ils s&apos;ajoutent aux destinataires metier deja determines par l&apos;application.
                </p>
              </div>

              {event.recipients.length > 0 ? (
                <div className="space-y-3">
                  {event.recipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      className="rounded-lg border border-border p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {recipient.label || "Destinataire"}
                          </p>
                          <p className="text-sm text-muted">{recipient.email}</p>
                        </div>
                        <Badge variant="outline">
                          {recipient.isActive ? "Actif" : "Desactive"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <form action={toggleNotificationRecipient.bind(null, recipient.id)}>
                          <SubmitButton
                            idleLabel={recipient.isActive ? "Desactiver" : "Activer"}
                            pendingLabel="Mise a jour..."
                            variant="outline"
                          />
                        </form>
                        <form action={deleteNotificationRecipient.bind(null, recipient.id)}>
                          <SubmitButton
                            idleLabel="Supprimer"
                            pendingLabel="Suppression..."
                            variant="outline"
                          />
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-secondary p-4 text-sm text-muted">
                  Aucun destinataire additionnel configure pour cet evenement.
                </div>
              )}
            </div>

            <form action={recipientFormAction} className="space-y-4 rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">Ajouter un destinataire</p>
              <div className="space-y-2">
                <label htmlFor={`recipient-label-${event.id}`} className="text-sm font-medium text-foreground">
                  Libelle
                </label>
                <Input
                  id={`recipient-label-${event.id}`}
                  name="label"
                  placeholder="Ex: Responsable mairie"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor={`recipient-email-${event.id}`} className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id={`recipient-email-${event.id}`}
                  name="email"
                  type="email"
                  placeholder="alerte@exemple.fr"
                  required
                />
              </div>

              {recipientState.error ? (
                <p className="text-sm text-danger">{recipientState.error}</p>
              ) : null}
              {recipientState.success ? (
                <p className="text-sm text-success">{recipientState.success}</p>
              ) : null}

              <SubmitButton
                idleLabel="Ajouter"
                pendingLabel="Ajout..."
                variant="secondary"
              />
            </form>

            <form action={testFormAction} className="space-y-4 rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">Envoyer un email de test</p>
              <div className="space-y-2">
                <label htmlFor={`test-email-${event.id}`} className="text-sm font-medium text-foreground">
                  Email de test
                </label>
                <Input
                  id={`test-email-${event.id}`}
                  name="email"
                  type="email"
                  placeholder="test@exemple.fr"
                  required
                />
              </div>

              {testState.error ? <p className="text-sm text-danger">{testState.error}</p> : null}
              {testState.success ? (
                <div className="space-y-1">
                  <p className="text-sm text-success">{testState.success}</p>
                  {testState.deliveryStatus === "dev_preview" ? (
                    <p className="text-xs text-muted">
                      SMTP non configure : l&apos;envoi est journalise en previsualisation.
                    </p>
                  ) : null}
                  {testState.deliveryStatus === "disabled" ? (
                    <p className="text-xs text-muted">
                      Le test contourne l&apos;activation globale, mais l&apos;evenement reste desactive en production.
                    </p>
                  ) : null}
                  {testState.deliveryStatus === "skipped_no_recipient" ? (
                    <p className="text-xs text-muted">
                      Aucun destinataire actif n&apos;a pu etre determine pour cet essai.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <SubmitButton
                idleLabel="Envoyer le test"
                pendingLabel="Envoi..."
                variant="secondary"
              />
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
