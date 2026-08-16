import { callDialChatCompletion, runDialImageInference, type DialMessage, type DialTool } from "./dialClient";
import type { AgentMessage } from "@/types/agent";

const SYSTEM_PROMPT =
    "You are a concise on-screen assistant embedded inside a webcam app. " +
    "Answer the user's questions directly. Only use the 'look_at_camera' tool when the user " +
    "asks what you currently see, asks you to look/check the camera, or otherwise needs live " +
    "visual context you don't already have. Never invent what the camera shows without calling the tool.";

const LOOK_AT_CAMERA_TOOL: DialTool = {
    type: "function",
    function: {
        name: "look_at_camera",
        description:
            "Capture and analyze the user's current webcam frame. Use this whenever the user asks " +
            "about what is currently visible on camera.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
    },
};

export interface AgentTurnResult {
    message: AgentMessage;
    usedCamera: boolean;
}

/**
 * Runs one turn of a small tool-using agent: it either answers directly, or calls the
 * look_at_camera tool to get a fresh vision description before producing a final reply.
 */
export async function runAgentTurn(history: AgentMessage[], image?: string): Promise<AgentTurnResult> {
    const messages: DialMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    const first = await callDialChatCompletion(messages, { tools: [LOOK_AT_CAMERA_TOOL] });
    const toolCall = first.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "look_at_camera") {
        return { message: { role: "assistant", content: first.content as string ?? "" }, usedCamera: false };
    }

    if (!image) {
        return {
            message: {
                role: "assistant",
                content: "I don't have a current camera frame to look at. Please make sure the camera is streaming.",
            },
            usedCamera: false,
        };
    }

    const snapshotDescription = await runDialImageInference({
        imageDataUrl: image,
        prompt: "Describe precisely and concisely what is currently visible in this webcam frame.",
    });

    const followUp: DialMessage[] = [
        ...messages,
        { role: "assistant", content: first.content, tool_calls: first.tool_calls },
        { role: "tool", tool_call_id: toolCall.id, name: "look_at_camera", content: snapshotDescription },
    ];

    const final = await callDialChatCompletion(followUp, { tools: [LOOK_AT_CAMERA_TOOL] });

    return {
        message: { role: "assistant", content: (final.content as string) ?? snapshotDescription },
        usedCamera: true,
    };
}
