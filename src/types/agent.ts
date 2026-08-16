export type AgentRole = "user" | "assistant";

export interface AgentMessage {
    role: AgentRole;
    content: string;
}

export interface AgentRequestBody {
    /** Full conversation so far, ending with the newest user message. */
    messages: AgentMessage[];
    /** Optional current webcam snapshot, used only if the agent decides to "look". */
    image?: string;
}

export interface AgentSuccessResponse {
    message: AgentMessage;
    /** Whether the agent invoked the camera tool to answer this turn. */
    usedCamera: boolean;
}

export interface AgentErrorResponse {
    error: string;
}

export type AgentResponse = AgentSuccessResponse | AgentErrorResponse;
