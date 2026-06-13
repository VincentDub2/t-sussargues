"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Loader2,
  ReceiptText,
  RotateCcw,
  Send,
  X,
} from "lucide-react";

import type { PurchaseDraft } from "@/lib/purchase-agent";
import { PRIORITY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

type PurchaseChatLauncherProps = {
  variant?: "inline";
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type CreatedPurchase = {
  id: string;
  requestNumber: string;
  title: string;
};

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: globalThis.crypto.randomUUID(),
    role,
    content,
  };
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return null;
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

async function readApiResponse(response: Response) {
  const payload = (await response.json()) as {
    error?: string;
    reply?: string;
    draft?: PurchaseDraft;
    purchase?: CreatedPurchase;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "L'assistant est indisponible.");
  }

  return payload;
}

export function PurchaseChatLauncher({
  variant = "inline",
}: PurchaseChatLauncherProps) {
  void variant;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<PurchaseDraft | null>(null);
  const [createdPurchase, setCreatedPurchase] = useState<CreatedPurchase | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage("assistant", "Assistant achat pret."),
  ]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, open, draft, createdPurchase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setInput("");
    setDraft(null);
    setCreatedPurchase(null);
    setLoading(true);
    setMessages((current) => [...current, createMessage("user", message)]);

    try {
      const payload = await fetch("/api/agent/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", message }),
      }).then(readApiResponse);

      if (payload.draft) {
        setDraft(payload.draft);
      }

      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          payload.reply ??
            "J'ai prepare un brouillon. Verifiez les informations avant creation."
        ),
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          error instanceof Error ? error.message : "Une erreur est survenue."
        ),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePurchase() {
    if (!draft || loading) {
      return;
    }

    setLoading(true);

    try {
      const payload = await fetch("/api/agent/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", draft }),
      }).then(readApiResponse);

      if (payload.purchase) {
        setCreatedPurchase(payload.purchase);
      }

      setDraft(null);
      setMessages((current) => [
        ...current,
        createMessage("assistant", payload.reply ?? "Demande creee."),
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          error instanceof Error ? error.message : "Creation impossible."
        ),
      ]);
    } finally {
      setLoading(false);
    }
  }

  const chatPanel = (
    <SheetContent
      showCloseButton={false}
      className="w-full p-0 sm:max-w-xl md:max-w-2xl xl:max-w-3xl"
    >
        <header className="flex items-center justify-between border-b border-border bg-primary px-5 py-4 text-primary-foreground">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <ReceiptText className="size-6" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate text-base font-bold text-primary-foreground">
                Assistant achat
              </SheetTitle>
              <SheetDescription className="text-xs text-primary-foreground/80">
                Sussargues
              </SheetDescription>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-primary-foreground/80 transition hover:bg-primary-deep hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            onClick={() => setOpen(false)}
            aria-label="Fermer l'assistant achat"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[78%]",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-foreground"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}

          {draft ? (
            <div className="rounded-lg border border-primary/20 bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-foreground">Brouillon</h3>
                <Badge variant="outline">{PRIORITY_LABELS[draft.priority]}</Badge>
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-foreground">Objet</dt>
                  <dd className="mt-1 text-muted">{draft.title}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">Budget estime</dt>
                  <dd className="mt-1 text-muted">
                    {formatCurrency(draft.estimatedBudget) ?? "Non renseigne"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-foreground">Besoin</dt>
                  <dd className="mt-1 text-muted">{draft.description}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">Fournisseur</dt>
                  <dd className="mt-1 text-muted">
                    {draft.supplier ?? "Non renseigne"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">Quantite</dt>
                  <dd className="mt-1 text-muted">
                    {draft.quantity ?? "Non renseignee"}
                  </dd>
                </div>
                {draft.serviceName ? (
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    <Badge variant="secondary">{draft.serviceName}</Badge>
                  </div>
                ) : null}
              </dl>
              <div className="mt-5 flex gap-2">
                <Button
                  type="button"
                  onClick={handleCreatePurchase}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Creer la demande
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDraft(null)}
                  disabled={loading}
                  aria-label="Annuler le brouillon"
                >
                  <RotateCcw className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}

          {createdPurchase ? (
            <div className="rounded-lg border border-success/20 bg-card p-4 text-sm shadow-sm">
              <div className="mb-2 flex items-center gap-2 font-bold text-success">
                <CheckCircle2 className="size-4" />
                {createdPurchase.requestNumber}
              </div>
              <p className="mb-3 text-muted">{createdPurchase.title}</p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/achats/${createdPurchase.id}`}>Ouvrir la demande</Link>
              </Button>
            </div>
          ) : null}

          {loading && !draft ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted shadow-sm">
                <Loader2 className="size-4 animate-spin" />
                Analyse en cours
              </div>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border bg-card p-4 lg:p-5">
          <div className="flex items-end gap-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Decrire la demande d'achat..."
              rows={3}
              className="min-h-24 resize-none"
              disabled={loading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              aria-label="Envoyer"
              className="size-11"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        </form>
    </SheetContent>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {chatPanel}
      <SheetTrigger asChild>
        <Button type="button" variant="outline">
          <Bot className="size-4" />
          Assistant
        </Button>
      </SheetTrigger>
    </Sheet>
  );
}
