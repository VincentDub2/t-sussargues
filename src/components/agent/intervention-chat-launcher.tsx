"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Loader2,
  MessageCircle,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { InterventionDraft } from "@/lib/intervention-agent";
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

type InterventionChatLauncherProps = {
  variant?: "floating" | "inline";
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type CreatedIntervention = {
  id: string;
  ticketNumber: string;
  title: string;
};

const initialAssistantMessage =
  "Bienvenue, je suis votre assistant de gestion des interventions.\n\nJe peux vous aider à créer une demande d’intervention, retrouver un ticket existant, consulter ses détails, le modifier ou suivre son statut.\n\nComment puis-je vous aider aujourd’hui ?";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: globalThis.crypto.randomUUID(),
    role,
    content,
  };
}

async function readApiResponse(response: Response) {
  const payload = (await response.json()) as {
    error?: string;
    reply?: string;
    draft?: InterventionDraft;
    intervention?: CreatedIntervention;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? "L'assistant est indisponible.");
  }

  return payload;
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="max-w-full space-y-3 break-words text-sm leading-6 [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_code]:rounded [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_li]:pl-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:m-0 [&_p]:whitespace-pre-wrap [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-secondary [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_ul]:ml-5 [&_ul]:list-disc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="my-3 max-w-full overflow-x-auto rounded-md border border-border">
              <table className="min-w-full border-collapse text-left text-xs leading-5 sm:text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-secondary text-foreground">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-border px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-border px-3 py-2 align-top text-foreground">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "rounded-lg px-4 py-3 shadow-sm",
          isUser
            ? "max-w-[88%] bg-primary text-primary-foreground sm:max-w-[78%]"
            : "max-w-[96%] border border-border bg-card text-foreground sm:max-w-[92%]"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-6">
            {message.content}
          </p>
        ) : (
          <MarkdownMessage content={message.content} />
        )}
      </div>
    </div>
  );
}

export function InterventionChatLauncher({
  variant = "floating",
}: InterventionChatLauncherProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<InterventionDraft | null>(null);
  const [createdIntervention, setCreatedIntervention] =
    useState<CreatedIntervention | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage("assistant", initialAssistantMessage),
  ]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, open, draft, createdIntervention]);

  async function submitMessage() {
    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setInput("");
    setDraft(null);
    setCreatedIntervention(null);
    setLoading(true);
    setMessages((current) => [...current, createMessage("user", message)]);

    try {
      const payload = await fetch("/api/agent/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", message }),
      }).then(readApiResponse);

      if (payload.draft) {
        setDraft(payload.draft);
      }

      if (payload.intervention) {
        setCreatedIntervention(payload.intervention);
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage();
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void submitMessage();
  }

  async function handleCreateIntervention() {
    if (!draft || loading) {
      return;
    }

    setLoading(true);

    try {
      const payload = await fetch("/api/agent/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", draft }),
      }).then(readApiResponse);

      if (payload.intervention) {
        setCreatedIntervention(payload.intervention);
      }

      setDraft(null);
      setMessages((current) => [
        ...current,
        createMessage("assistant", payload.reply ?? "Intervention creee."),
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

  async function handleResetSession() {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      await fetch("/api/agent/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      }).then(readApiResponse);

      setInput("");
      setDraft(null);
      setCreatedIntervention(null);
      setMessages([createMessage("assistant", initialAssistantMessage)]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          error instanceof Error ? error.message : "Impossible de reinitialiser la session."
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
              <Bot className="size-6" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate text-base font-bold text-primary-foreground">
                Assistant intervention
              </SheetTitle>
              <SheetDescription className="text-xs text-primary-foreground/80">
                Sussargues
              </SheetDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="rounded-md p-2 text-primary-foreground/80 transition hover:bg-primary-deep hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleResetSession}
              disabled={loading}
              aria-label="Reinitialiser la conversation"
            >
              <RotateCcw className="size-5" />
            </button>
            <button
              type="button"
              className="rounded-md p-2 text-primary-foreground/80 transition hover:bg-primary-deep hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              onClick={() => setOpen(false)}
              aria-label="Fermer l'assistant"
            >
              <X className="size-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}

          {draft ? (
            <div className="rounded-lg border border-primary/20 bg-card p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-foreground">Brouillon</h3>
                <Badge variant="outline">{PRIORITY_LABELS[draft.priority]}</Badge>
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-foreground">Titre</dt>
                  <dd className="mt-1 text-muted">{draft.title}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground">Lieu</dt>
                  <dd className="mt-1 text-muted">{draft.location}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-foreground">Description</dt>
                  <dd className="mt-1 text-muted">{draft.description}</dd>
                </div>
                {draft.categoryName || draft.serviceName ? (
                  <div className="flex flex-wrap gap-2 sm:col-span-2">
                    {draft.categoryName ? (
                      <Badge variant="secondary">{draft.categoryName}</Badge>
                    ) : null}
                    {draft.serviceName ? (
                      <Badge variant="secondary">{draft.serviceName}</Badge>
                    ) : null}
                  </div>
                ) : null}
              </dl>
              <div className="mt-5 flex gap-2">
                <Button
                  type="button"
                  onClick={handleCreateIntervention}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Creer le ticket
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

          {createdIntervention ? (
            <div className="rounded-lg border border-success/20 bg-card p-4 text-sm shadow-sm">
              <div className="mb-2 flex items-center gap-2 font-bold text-success">
                <CheckCircle2 className="size-4" />
                {createdIntervention.ticketNumber}
              </div>
              <p className="mb-3 text-muted">{createdIntervention.title}</p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/interventions/${createdIntervention.id}`}>
                  Ouvrir le ticket
                </Link>
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
              onKeyDown={handleInputKeyDown}
              placeholder="Decrire l'intervention..."
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

  if (variant === "inline") {
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

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <Sheet open={open} onOpenChange={setOpen}>
        {chatPanel}
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
            aria-label="Ouvrir l'assistant intervention"
          >
            <MessageCircle className="size-6" />
          </button>
        </SheetTrigger>
      </Sheet>
    </div>
  );
}
