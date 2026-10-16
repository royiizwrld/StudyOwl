import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createGateway, friendlyError, REASONING_OPTIONS } from "@/lib/ai/gateway.server";
import { withLovableAiGatewayRunIdHeader } from "@/lib/ai/run-id.server";

const INSTRUCTIONS = `You are Ollie, a calm, encouraging study coach inside a student's study planner.
You receive a JSON snapshot of the student's data with every message (subjects, topic statuses, flagged topics with how many days ago they were flagged, focus minutes per subject over the last 7 and 30 days, upcoming due dates in days, open tasks, today's focus vs. daily goal, streak, and Pomodoro settings in minutes).

How to help:
- Decide where the student should put more emphasis using these signals: low completion %, many flagged topics, near due dates (due_in_days small or negative), and little recent study time (focus_min_7d). Always explain WHY you recommend a subject or topic, citing the specific signals.
- Study plans for a day or week must be broken into Pomodoro sessions using the student's own focus length and short/long break lengths from "pomodoro". Show sessions as a short list or table.
- Only use numbers present in the snapshot. Never invent data. If something needed is missing (e.g. no subjects, no sessions logged), say so plainly and suggest how to add it.
- Be concise, warm and practical. Use markdown: short headings, bullet lists, bold for key items. No long preambles.
- When concrete changes would help (flagging tricky topics for review, unflagging mastered ones, marking statuses, adding a task), call the propose_actions tool with the exact topic ids from the snapshot. The student must confirm in the UI before anything changes, so describe proposals as suggestions. Only propose when it clearly helps.`;

const actionSchema = z.object({
  type: z.enum(["flag", "unflag", "set_status", "add_task"]),
  topicIds: z.array(z.string()).describe("Topic ids from the snapshot (flag/unflag/set_status). Empty for add_task."),
  status: z.enum(["not_started", "studying", "understood"]).nullable().describe("Only for set_status"),
  taskTitle: z.string().nullable().describe("Only for add_task"),
  subjectId: z.string().nullable().describe("Subject id for add_task, or null"),
  dueDate: z.string().nullable().describe("yyyy-MM-dd for add_task, or null"),
  priority: z.enum(["low", "medium", "high"]).nullable(),
});

const proposeActions = tool({
  description: "Propose changes to the student's planner. Nothing is applied until the student confirms.",
  inputSchema: z.object({
    label: z.string().describe("Short button label, e.g. 'Flag these 3 topics for review'"),
    actions: z.array(actionSchema),
  }),
  execute: async () => ({ proposed: true, note: "Shown to the student for confirmation; not yet applied." }),
});

const bodySchema = z.object({
  messages: z.array(z.any()).max(200),
  summary: z.unknown(),
});

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Invalid request" }, { status: 400 });
        }
        const gw = createGateway(request);
        if (!gw) return Response.json({ error: "The AI service isn't configured." }, { status: 500 });
        const messages = body.messages as UIMessage[];
        const snapshot = JSON.stringify(body.summary ?? {}).slice(0, 60000);
        try {
          const result = streamText({
            model: gw.model,
            instructions: `${INSTRUCTIONS}\n\nCurrent student data snapshot (JSON):\n${snapshot}`,
            messages: await convertToModelMessages(messages),
            tools: { propose_actions: proposeActions },
            stopWhen: stepCountIs(50),
            abortSignal: request.signal,
            providerOptions: REASONING_OPTIONS,
          });
          return withLovableAiGatewayRunIdHeader(
            result.toUIMessageStreamResponse({
              originalMessages: messages,
              sendReasoning: false,
              onError: (err) => {
                console.error("assistant stream error", err);
                return friendlyError(err).message;
              },
            }),
            gw.runIdFetch,
          );
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return new Response(null, { status: 499 });
          const f = friendlyError(err);
          return Response.json({ error: f.message }, { status: f.status });
        }
      },
    },
  },
});
