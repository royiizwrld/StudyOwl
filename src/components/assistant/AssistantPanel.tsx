import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Check, History, ListChecks, MessageSquarePlus, Mic, Square, Trash2, X } from "lucide-react";
import { useVoiceInput } from "./useVoiceInput";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useStudy } from "@/lib/store";
import { buildSummary } from "@/lib/summary";
import { STATUS_LABEL, type Priority, type TopicStatus } from "@/lib/types";
import owl from "@/assets/owl.png";

const CHAT_KEY = "study-planner:chat"; // legacy single chat
const APPLIED_KEY = "study-planner:chat-applied";
const SESSIONS_KEY = "study-planner:chat-sessions";

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UIMessage[];
}

function loadSessions(): ChatSession[] {
  const list = loadJSON<ChatSession[]>(SESSIONS_KEY, []);
  if (list.length) return list;
  const legacy = loadJSON<UIMessage[]>(CHAT_KEY, []);
  if (!legacy.length) return [];
  const now = Date.now();
  const migrated = [{ id: crypto.randomUUID(), title: titleFrom(legacy), createdAt: now, updatedAt: now, messages: legacy }];
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(migrated));
  localStorage.removeItem(CHAT_KEY);
  return migrated;
}
function titleFrom(msgs: UIMessage[]) {
  const first = msgs.find((m) => m.role === "user");
  const t = first?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim() ?? "";
  return t ? (t.length > 48 ? t.slice(0, 48) + "…" : t) : "New chat";
}
function groupLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 864e5;
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "This week";
  return "Earlier";
}

const STARTERS = [
  "Which subjects should I focus on?",
  "What should I study today?",
  "Which flagged topics have been waiting longest?",
  "How is my study time spread across subjects?",
  "Plan my week in Pomodoro sessions",
];

interface ProposedAction {
  type: "flag" | "unflag" | "set_status" | "add_task";
  topicIds: string[];
  status: TopicStatus | null;
  taskTitle: string | null;
  subjectId: string | null;
  dueDate: string | null;
  priority: Priority | null;
}
interface ProposalInput {
  label: string;
  actions: ProposedAction[];
}

function ProposalCard({ id, input, applied, onApplied }: { id: string; input: ProposalInput; applied: boolean; onApplied: (id: string) => void }) {
  const store = useStudy();
  const [dismissed, setDismissed] = useState(false);
  const name = (tid: string) => store.topics.find((t) => t.id === tid)?.title;
  const describe = (a: ProposedAction) => {
    const names = a.topicIds.map(name).filter(Boolean).join(", ");
    if (a.type === "flag") return `Flag for review: ${names}`;
    if (a.type === "unflag") return `Unflag: ${names}`;
    if (a.type === "set_status") return `Mark ${STATUS_LABEL[a.status ?? "studying"]}: ${names}`;
    return `Add task: ${a.taskTitle}${a.dueDate ? ` (due ${a.dueDate})` : ""}`;
  };
  const apply = () => {
    for (const a of input.actions) {
      const ids = a.topicIds.filter((x) => store.topics.some((t) => t.id === x));
      if (a.type === "flag") store.setFlag(ids, true);
      else if (a.type === "unflag") store.setFlag(ids, false);
      else if (a.type === "set_status" && a.status) store.setStatus(ids, a.status);
      else if (a.type === "add_task" && a.taskTitle)
        store.addTask({
          title: a.taskTitle,
          subjectId: store.subjects.some((s) => s.id === a.subjectId) ? a.subjectId : null,
          dueDate: a.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(a.dueDate) ? a.dueDate : null,
          priority: a.priority ?? "medium",
        });
    }
    onApplied(id);
    toast.success("Changes applied");
  };
  if (dismissed && !applied) return null;
  return (
    <div className="rounded-xl border bg-secondary/60 p-3 text-sm">
      <p className="mb-2 flex items-center gap-2 font-semibold">
        <ListChecks className="size-4 text-primary" /> {input.label}
      </p>
      <ul className="mb-3 space-y-1 text-xs text-muted-foreground">
        {input.actions?.map((a, i) => <li key={i}>• {describe(a)}</li>)}
      </ul>
      {applied ? (
        <p className="flex items-center gap-1 text-xs font-semibold text-success">
          <Check className="size-3.5" /> Applied
        </p>
      ) : (
        <div className="flex gap-2">
          <Button size="xs" onClick={apply}>
            Confirm
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setDismissed(true)}>
            Not now
          </Button>
        </div>
      )}
    </div>
  );
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function ChatBody({ session, onSave }: { session: ChatSession; onSave: (msgs: UIMessage[]) => void }) {
  const store = useStudy();
  const storeRef = useRef(store);
  storeRef.current = store;
  const [initial] = useState<UIMessage[]>(() => session.messages);
  const [applied, setApplied] = useState<string[]>(() => loadJSON(APPLIED_KEY, []));
  const [text, setText] = useState("");
  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    id: session.id,
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/assistant" }),
    onError: (e) => {
      let msg = e.message;
      try {
        msg = JSON.parse(e.message).error ?? msg;
      } catch {
        /* plain text */
      }
      toast.error(msg || "The assistant couldn't respond. Please try again.");
    },
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if ((status === "ready" || status === "error") && messages.length) onSave(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, status]);

  const baseText = useRef("");
  const voice = useVoiceInput((t) => setText((baseText.current ? baseText.current + " " : "") + t));
  const toggleMic = () => {
    if (voice.listening) return voice.stop();
    baseText.current = text.trim();
    voice.start((m) => toast.error(m));
  };

  const send = (t: string) => {
    if (!t.trim() || busy) return;
    if (voice.listening) voice.stop();
    sendMessage({ text: t.trim() }, { body: { summary: buildSummary(storeRef.current) } });
    setText("");
  };
  const markApplied = (id: string) => {
    const next = [...applied, id];
    setApplied(next);
    localStorage.setItem(APPLIED_KEY, JSON.stringify(next));
  };
  const clear = () => {
    stop();
    setMessages([]);
    onSave([]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {messages.length > 0 && (
        <div className="flex justify-end px-4 pt-1">
          <Button variant="ghost" size="xs" onClick={clear} className="text-muted-foreground">
            <Trash2 /> Clear this chat
          </Button>
        </div>
      )}
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-5 px-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center pt-6 text-center">
              <img src={owl} alt="" width={72} height={72} className="size-18" />
              <p className="mt-3 font-display font-semibold">Hi, I'm Ollie</p>
              <p className="mb-5 max-w-xs text-sm text-muted-foreground">I look at your progress, review list and study time to help you decide what's next.</p>
              <div className="flex flex-col gap-2">
                {STARTERS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className={m.role === "user" ? "bg-primary text-primary-foreground" : "bg-transparent"}>
                {m.parts.map((p, i) => {
                  if (p.type === "text")
                    return m.role === "user" ? <span key={i}>{p.text}</span> : <MessageResponse key={i}>{p.text}</MessageResponse>;
                  if (p.type === "tool-propose_actions") {
                    const input = p.input as ProposalInput | undefined;
                    return (
                      <div key={i} className="space-y-2">
                        {input?.actions && p.state !== "input-streaming" && (
                          <ProposalCard id={p.toolCallId} input={input} applied={applied.includes(p.toolCallId)} onApplied={markApplied} />
                        )}
                        <Tool defaultOpen={false}>
                          <ToolHeader type={p.type} state={p.state} title="Suggested changes" />
                          <ToolContent>
                            <ToolInput input={p.input} />
                          </ToolContent>
                        </Tool>
                      </div>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent className="bg-transparent">
                <Shimmer>Ollie is thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
          {error && status === "error" && <p className="text-center text-xs text-destructive">Something went wrong — try sending again.</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t p-3">
        <PromptInput onSubmit={(msg) => send(msg.text)}>
          <PromptInputTextarea value={text} onChange={(e) => setText(e.target.value)} placeholder={voice.listening ? "Listening… speak now" : "Ask about your studies…"} />
          <PromptInputFooter className="justify-between">
            <Button
              type="button"
              size="icon-sm"
              variant={voice.listening ? "default" : "ghost"}
              onClick={toggleMic}
              aria-label={voice.listening ? "Stop voice input" : "Speak your question"}
              className={voice.listening ? "animate-pulse rounded-full" : "rounded-full"}
            >
              {voice.listening ? <Square /> : <Mic />}
            </Button>
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !text.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

function HistoryList({ sessions, activeId, onOpen, onDelete, onClearAll }: { sessions: ChatSession[]; activeId: string | null; onOpen: (id: string) => void; onDelete: (id: string) => void; onClearAll: () => void }) {
  const sorted = [...sessions].filter((x) => x.messages.length).sort((a, b) => b.updatedAt - a.updatedAt);
  if (!sorted.length) return <p className="p-8 text-center text-sm text-muted-foreground">No past chats yet. Your conversations with Ollie will appear here.</p>;
  const groups: Record<string, ChatSession[]> = {};
  for (const c of sorted) (groups[groupLabel(c.updatedAt)] ??= []).push(c);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {Object.entries(groups).map(([label, list]) => (
        <div key={label} className="mb-4">
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          {list.map((c) => (
            <div key={c.id} className={`group flex items-center gap-1 rounded-lg ${c.id === activeId ? "bg-secondary" : "hover:bg-accent"}`}>
              <button onClick={() => onOpen(c.id)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                <p className="truncate text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {c.messages.length} messages
                </p>
              </button>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete chat ${c.title}`} onClick={() => onDelete(c.id)}>
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      ))}
      <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={onClearAll}>
        Delete all chats
      </Button>
    </div>
  );
}

function newSession(): ChatSession {
  const now = Date.now();
  return { id: crypto.randomUUID(), title: "New chat", createdAt: now, updatedAt: now, messages: [] };
}

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || activeId) return;
    const list = loadSessions();
    const latest = [...list].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    if (latest) {
      setSessions(list);
      setActiveId(latest.id);
    } else {
      const s = newSession();
      setSessions([s]);
      setActiveId(s.id);
    }
  }, [open, activeId]);

  const persist = (list: ChatSession[]) => {
    setSessions(list);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(list.filter((x) => x.messages.length)));
  };
  const save = (id: string, msgs: UIMessage[]) => {
    setSessions((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, messages: msgs, title: titleFrom(msgs), updatedAt: Date.now() } : x));
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(next.filter((x) => x.messages.length)));
      return next;
    });
  };
  const startNew = () => {
    const s = newSession();
    persist([...sessions.filter((x) => x.messages.length), s]);
    setActiveId(s.id);
    setView("chat");
  };
  const remove = (id: string) => {
    const next = sessions.filter((x) => x.id !== id);
    persist(next);
    if (id === activeId) setActiveId(null);
  };
  const clearAll = () => {
    persist([]);
    localStorage.removeItem(APPLIED_KEY);
    setActiveId(null);
    setView("chat");
  };
  const active = sessions.find((x) => x.id === activeId);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open study assistant"
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-40 flex items-center gap-2 rounded-full bg-primary py-2 pl-2 pr-4 font-display text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-105 md:bottom-6 md:right-6"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-card">
          <img src={owl} alt="" width={28} height={28} className="size-7" />
        </span>
        Ask Ollie
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md [&>button]:hidden">
          <SheetHeader className="flex-row items-center justify-between gap-2 border-b p-3">
            <div className="flex min-w-0 items-center gap-2">
              <img src={owl} alt="" width={32} height={32} className="size-8" />
              <div className="min-w-0 text-left">
                <SheetTitle className="font-display">{view === "history" ? "Chat history" : "Ollie · study coach"}</SheetTitle>
                <SheetDescription className="truncate text-xs">{view === "history" ? "Pick a past chat to continue" : "Answers from your planner data only"}</SheetDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <Button variant={view === "history" ? "secondary" : "ghost"} size="icon-sm" onClick={() => setView(view === "history" ? "chat" : "history")} aria-label="Chat history">
                <History />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={startNew} aria-label="New chat">
                <MessageSquarePlus />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close">
                <X />
              </Button>
            </div>
          </SheetHeader>
          {open && view === "history" && (
            <HistoryList sessions={sessions} activeId={activeId} onOpen={(id) => { setActiveId(id); setView("chat"); }} onDelete={remove} onClearAll={clearAll} />
          )}
          {open && view === "chat" && active && <ChatBody key={active.id} session={active} onSave={(m) => save(active.id, m)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
