import { createFileRoute } from "@tanstack/react-router";
import { NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
import { z } from "zod";
import { createGateway, friendlyError, REASONING_OPTIONS } from "@/lib/ai/gateway.server";

const schema = z.object({
  subjects: z.array(z.object({ name: z.string(), topics: z.array(z.string()) })),
});

const bodySchema = z.object({
  text: z.string().max(60000).optional(),
  existingSubjects: z.array(z.string()).max(200).optional(),
  file: z
    .object({ dataUrl: z.string().max(15_000_000), mediaType: z.string(), name: z.string() })
    .optional(),
});

const INSTRUCTIONS = `You turn messy study notes or syllabi into a clean list of subjects and their units/topics.
Rules:
- Each subject has a short name (e.g. "Chemistry") and a list of concise topic titles.
- Expand parenthesised sub-items into separate topics when they are distinct topics (e.g. "calculus (limits, derivatives)" -> "Limits", "Derivatives"). Use sensible Title Case.
- If a subject name closely matches one of the user's existing subjects, use that exact existing name.
- Ignore dates, grading info, instructor names and other non-topic text.
- Never invent topics that aren't in the input. If nothing usable is found, return an empty subjects array.`;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export const Route = createFileRoute("/api/bulk-parse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return json(400, { error: "That input couldn't be read. Try pasting the text instead." });
        }
        if (!body.text?.trim() && !body.file) return json(400, { error: "Paste some text or upload a file first." });
        const gw = createGateway(request);
        if (!gw) return json(500, { error: "The AI service isn't configured." });

        const parts: Array<
          { type: "text"; text: string } | { type: "file"; data: string; mediaType: string; filename?: string }
        > = [];
        parts.push({
          type: "text",
          text: `Existing subjects: ${(body.existingSubjects ?? []).join(", ") || "(none)"}\n\nInput:\n${body.text ?? "(see attached file)"}`,
        });
        if (body.file) {
          parts.push({ type: "file", data: body.file.dataUrl, mediaType: body.file.mediaType, filename: body.file.name });
        }

        try {
          const result = streamText({
            model: gw.model,
            instructions: INSTRUCTIONS,
            messages: [{ role: "user", content: parts }],
            output: Output.object({ schema }),
            abortSignal: request.signal,
            providerOptions: REASONING_OPTIONS,
          });
          let parsed: z.infer<typeof schema> | null = null;
          try {
            parsed = schema.parse(await result.output);
          } catch (err) {
            if (NoObjectGeneratedError.isInstance(err) && err.text) {
              try {
                const m = err.text.match(/\{[\s\S]*\}/);
                parsed = m ? schema.parse(JSON.parse(m[0])) : null;
              } catch {
                parsed = null;
              }
            } else throw err;
          }
          if (!parsed) return json(422, { error: "The AI returned something we couldn't understand. Please try again or simplify the list." });
          const subjects = parsed.subjects
            .map((s) => ({ name: s.name.trim().slice(0, 80), topics: s.topics.map((t) => t.trim().slice(0, 140)).filter(Boolean) }))
            .filter((s) => s.name);
          return json(200, { subjects });
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return new Response(null, { status: 499 });
          console.error("bulk-parse error", err);
          const f = friendlyError(err);
          return json(f.status, { error: f.message });
        }
      },
    },
  },
});
