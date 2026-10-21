import { createFileRoute } from "@tanstack/react-router";
import { NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
import { z } from "zod";
import { createGateway, friendlyError, REASONING_OPTIONS } from "@/lib/ai/gateway.server";

const schema = z.object({
  weeks: z.array(z.object({ title: z.string(), subject: z.string().nullable(), objectives: z.array(z.string()) })),
});

const bodySchema = z.object({
  text: z.string().max(60000).optional(),
  existingSubjects: z.array(z.string()).max(200).optional(),
  file: z
    .object({ dataUrl: z.string().max(15_000_000), mediaType: z.string(), name: z.string() })
    .optional(),
});

const INSTRUCTIONS = `You extract weekly learning objectives from course guides, syllabi and objective lists (often medical school blocks).
Rules:
- Return weeks in the order they appear. Each week has a short title (e.g. "Week 3: Renal physiology"), an optional subject name, and its objectives.
- Keep each objective as one clear statement, close to the original wording; drop numbering and bullets.
- If a week clearly belongs to one of the user's existing subjects, use that exact name; otherwise use null or a short new name.
- Ignore timetables, venues, lecturer names, assessment rules and other non-objective text.
- Never invent objectives. If there are no week headings, put everything in one week titled "Week 1". If nothing usable is found, return an empty weeks array.`;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export const Route = createFileRoute("/api/objectives-parse")({
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
          const weeks = parsed.weeks
            .map((w) => ({ title: w.title.trim().slice(0, 100) || "Week", subject: w.subject?.trim().slice(0, 80) || null, objectives: w.objectives.map((t) => t.trim().slice(0, 300)).filter(Boolean) }))
            .filter((w) => w.objectives.length);
          if (!weeks.length) return json(422, { error: "No objectives were found in that file. Try pasting the list instead." });
          return json(200, { weeks });
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return new Response(null, { status: 499 });
          console.error("objectives-parse error", err);
          const f = friendlyError(err);
          return json(f.status, { error: f.message });
        }
      },
    },
  },
});
