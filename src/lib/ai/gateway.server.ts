import { createOpenAI } from "@ai-sdk/openai";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./run-id.server";

export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
export const MODEL = "openai/gpt-6-astra";

export const REASONING_OPTIONS = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
    include: ["reasoning.encrypted_content"],
  },
} as const;

/** Create a per-request Responses provider. Returns null when the key is missing. */
export function createGateway(request: Request) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return { model: provider.responses(MODEL), runIdFetch };
}

/** Map gateway/SDK errors to a friendly status + message. */
export function friendlyError(err: unknown): { status: number; message: string } {
  const e = err as { statusCode?: number; status?: number; message?: string; lastError?: { statusCode?: number } };
  const status = e?.statusCode ?? e?.status ?? e?.lastError?.statusCode ?? 500;
  if (status === 429) return { status, message: "The AI is getting a lot of requests right now. Please wait a moment and try again." };
  if (status === 402) return { status, message: "AI credits have run out for this workspace. Add credits in workspace billing to keep using AI features." };
  if (status === 403) return { status, message: "AI access is currently blocked for this workspace." };
  if (status === 401) return { status, message: "The AI service isn't configured correctly." };
  return { status: status >= 400 && status < 600 ? status : 500, message: "Something went wrong talking to the AI. Please try again." };
}
