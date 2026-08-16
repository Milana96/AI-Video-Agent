"use client";

import { useCallback, useState } from "react";
import type { AgentMessage, AgentResponse } from "@/types/agent";
import styles from "./AgentChat.module.css";

export interface AgentChatProps {
    /** Returns the current webcam frame as a data URL, or null if unavailable. */
    getSnapshot: () => string | null;
}

export default function AgentChat({ getSnapshot }: AgentChatProps) {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text || isThinking) {
            return;
        }

        const nextMessages: AgentMessage[] = [...messages, { role: "user", content: text }];
        setMessages(nextMessages);
        setInput("");
        setError(null);
        setIsThinking(true);

        try {
            const image = getSnapshot() ?? undefined;
            const response = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: nextMessages, image }),
            });

            const data: AgentResponse = await response.json();

            if (!response.ok || "error" in data) {
                throw new Error("error" in data ? data.error : "Agent request failed.");
            }

            setMessages((prev) => [...prev, data.message]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Agent request failed.");
        } finally {
            setIsThinking(false);
        }
    }, [input, isThinking, messages, getSnapshot]);

    return (
        <div className={styles.container}>
            <h2>Agent</h2>
            <div className={styles.history}>
                {messages.length === 0 && (
                    <p className={styles.hint}>Ask me anything, or ask what I currently see on camera.</p>
                )}
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={message.role === "user" ? styles.userMessage : styles.agentMessage}
                    >
                        <strong>{message.role === "user" ? "You" : "Agent"}:</strong> {message.content}
                    </div>
                ))}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <form
                className={styles.form}
                onSubmit={(event) => {
                    event.preventDefault();
                    void sendMessage();
                }}
            >
                <input
                    type="text"
                    className={styles.input}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Message the agent…"
                    disabled={isThinking}
                />
                <button type="submit" disabled={isThinking || !input.trim()}>
                    {isThinking ? "Thinking…" : "Send"}
                </button>
            </form>
        </div>
    );
}
