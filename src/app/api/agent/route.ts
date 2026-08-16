import { NextResponse } from "next/server";
import { runAgentTurn } from "@/lib/agentClient";
import { DialConfigError } from "@/lib/dialClient";
import type { AgentRequestBody, AgentResponse } from "@/types/agent";

const MAX_HISTORY = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_IMAGE_LENGTH = 5_000_000;
const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp);base64,/;

export async function POST(request: Request): Promise<NextResponse<AgentResponse>> {
    let body: AgentRequestBody;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const { messages, image } = body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json({ error: "Field 'messages' must be a non-empty array." }, { status: 400 });
    }

    const validRoles = new Set(["user", "assistant"]);
    const isValid = messages.every(
        (m) =>
            m &&
            validRoles.has(m.role) &&
            typeof m.content === "string" &&
            m.content.length > 0 &&
            m.content.length <= MAX_MESSAGE_LENGTH,
    );

    if (!isValid) {
        return NextResponse.json({ error: "Each message needs a valid role and content." }, { status: 400 });
    }

    if (image !== undefined) {
        if (typeof image !== "string" || !IMAGE_DATA_URL_PATTERN.test(image)) {
            return NextResponse.json(
                { error: "Field 'image' must be a base64 image data URL (png/jpeg/webp)." },
                { status: 400 },
            );
        }
        if (image.length > MAX_IMAGE_LENGTH) {
            return NextResponse.json({ error: "Image payload is too large." }, { status: 413 });
        }
    }

    const trimmedHistory = messages.slice(-MAX_HISTORY);

    try {
        const { message, usedCamera } = await runAgentTurn(trimmedHistory, image);
        return NextResponse.json({ message, usedCamera });
    } catch (error) {
        if (error instanceof DialConfigError) {
            return NextResponse.json({ error: error.message }, { status: 503 });
        }
        console.error("Agent turn failed", error);
        return NextResponse.json({ error: "Agent request failed." }, { status: 502 });
    }
}
