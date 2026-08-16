const DEFAULT_API_VERSION = "2024-05-01-preview";
const DEFAULT_PROMPT =
    "Describe what you see in this webcam snapshot in one or two concise sentences.";

export interface DialChatCompletionParams {
    imageDataUrl: string;
    prompt?: string;
}

export type DialContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

// Loosely typed to match the OpenAI-compatible chat completions shape DIAL returns.
export interface DialMessage {
    role: string;
    content: string | DialContentPart[] | null;
    tool_calls?: DialToolCall[];
    tool_call_id?: string;
    name?: string;
}

export interface DialToolCall {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
}

export interface DialTool {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export class DialConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DialConfigError";
    }
}

function getDialConfig() {
    const host = process.env.DIAL_API_HOST;
    const apiKey = process.env.DIAL_API_KEY;
    const deployment = process.env.DIAL_DEPLOYMENT_NAME;
    const apiVersion = process.env.DIAL_API_VERSION ?? DEFAULT_API_VERSION;

    if (!host || !apiKey || !deployment) {
        throw new DialConfigError(
            "Missing DIAL configuration. Set DIAL_API_HOST, DIAL_API_KEY and DIAL_DEPLOYMENT_NAME.",
        );
    }

    return { host, apiKey, deployment, apiVersion };
}

/**
 * Raw call to EPAM DIAL's OpenAI-compatible chat completions endpoint.
 * Shared by the one-shot vision inference and the multi-turn agent.
 */
export async function callDialChatCompletion(
    messages: DialMessage[],
    options?: { tools?: DialTool[]; maxTokens?: number },
): Promise<DialMessage> {
    const { host, apiKey, deployment, apiVersion } = getDialConfig();
    const url = `${host.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Api-Key": apiKey,
        },
        body: JSON.stringify({
            messages,
            tools: options?.tools,
            max_tokens: options?.maxTokens ?? 300,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`DIAL request failed (${response.status}): ${body}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;

    if (!message) {
        throw new Error("DIAL response did not contain a message.");
    }

    return message;
}

/**
 * Minimal client for EPAM DIAL's OpenAI-compatible chat completions API,
 * used to run vision inference on a single base64-encoded image snapshot.
 */
export async function runDialImageInference({
    imageDataUrl,
    prompt,
}: DialChatCompletionParams): Promise<string> {
    const message = await callDialChatCompletion([
        {
            role: "user",
            content: [
                { type: "text", text: prompt ?? DEFAULT_PROMPT },
                { type: "image_url", image_url: { url: imageDataUrl } },
            ],
        },
    ]);

    const content = message.content;

    if (typeof content !== "string" || content.length === 0) {
        throw new Error("DIAL response did not contain any content.");
    }

    return content;
}
