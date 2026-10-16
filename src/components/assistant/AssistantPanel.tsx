import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Check, ListChecks, Trash2, X } from "lucide-react";
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

const CHAT_KEY = "study-planner:chat";
const APPLIED_KEY = "study-planner:chat-applied";

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

function ChatBody() {
  const store = useStudy();
  const storeRef = useRef(store);
  storeRef.current = store;
  const [initial] = useState<UIMessage[]>(() => loadJSON(CHAT_KEY, []));
  const [applied, setApplied] = useState<string[]>(() => loadJSON(APPLIED_KEY, []));
  const [text, setText] = useState("");
  const { messages, sendMessage, status, stop, setMessages, error } = useChat({
    id: "study-assistant",
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
    if (status === "ready" || status === "error") localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  }, [messages, status]);

  const send = (t: string) => {
    if (!t.trim() || busy) return;
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
    localStorage.removeItem(CHAT_KEY);
    localStorage.removeItem(APPLIED_KEY);
    setApplied([]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex justify-end px-4">
        {messages.length > 0 && (
          <Button variant="ghost" size="xs" onClick={clear} className="text-muted-foreground">
            <Trash2 /> Clear chat
          </Button>
        )}
      </div>
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
          <PromptInputTextarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about your studies…" autoFocus />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !text.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open study assistant"
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary py-2 pl-2 pr-4 font-display text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-105 md:bottom-6 md:right-6"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-card">
          <img src={owl} alt="" width={28} height={28} className="size-7" />
        </span>
        Ask Ollie
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md [&>button]:hidden">
          <SheetHeader className="flex-row items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <img src={owl} alt="" width={32} height={32} className="size-8" />
              <div className="text-left">
                <SheetTitle className="font-display">Ollie · study coach</SheetTitle>
                <SheetDescription className="text-xs">Answers from your planner data only</SheetDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close">
              <X />
            </Button>
          </SheetHeader>
          {open && <ChatBody />}
        </SheetContent>
      </Sheet>
    </>
  );
}
