"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { InferenceResponse } from "@/types/inference";
import styles from "./WebcamCapture.module.css";

const SNAPSHOT_TYPE = "image/jpeg";
const SNAPSHOT_QUALITY = 0.8;

type Status = "idle" | "starting" | "streaming" | "error";

export interface WebcamCaptureHandle {
    /** Captures the current frame as a base64 JPEG data URL, or null if the camera isn't streaming. */
    captureSnapshot: () => string | null;
}

const WebcamCapture = forwardRef<WebcamCaptureHandle>(function WebcamCapture(_props, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [autoCapture, setAutoCapture] = useState(false);

    const stopStream = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStatus("idle");
    }, []);

    const startStream = useCallback(async () => {
        setError(null);
        setStatus("starting");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setStatus("streaming");
        } catch (err) {
            setStatus("error");
            setError(err instanceof Error ? err.message : "Unable to access the webcam.");
        }
    }, []);

    const captureSnapshot = useCallback((): string | null => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) {
            return null;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) {
            return null;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL(SNAPSHOT_TYPE, SNAPSHOT_QUALITY);
    }, []);

    useImperativeHandle(ref, () => ({ captureSnapshot }), [captureSnapshot]);

    const analyzeSnapshot = useCallback(async () => {
        const image = captureSnapshot();
        if (!image) {
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            const response = await fetch("/api/inference", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image }),
            });

            const data: InferenceResponse = await response.json();

            if (!response.ok || "error" in data) {
                throw new Error("error" in data ? data.error : "Inference request failed.");
            }

            setResult(data.result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Inference request failed.");
        } finally {
            setIsAnalyzing(false);
        }
    }, [captureSnapshot]);

    useEffect(() => {
        return () => {
            stopStream();
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [stopStream]);

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (autoCapture && status === "streaming") {
            intervalRef.current = setInterval(() => {
                void analyzeSnapshot();
            }, 5000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoCapture, status, analyzeSnapshot]);

    return (
        <div className={styles.container}>
            <div className={styles.preview}>
                <video ref={videoRef} className={styles.video} autoPlay playsInline muted />
                <canvas ref={canvasRef} className={styles.hiddenCanvas} />
            </div>

            <div className={styles.controls}>
                {status === "streaming" ? (
                    <button type="button" onClick={stopStream}>
                        Stop Camera
                    </button>
                ) : (
                    <button type="button" onClick={() => void startStream()} disabled={status === "starting"}>
                        {status === "starting" ? "Starting…" : "Start Camera"}
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => void analyzeSnapshot()}
                    disabled={status !== "streaming" || isAnalyzing}
                >
                    {isAnalyzing ? "Analyzing…" : "Capture & Analyze"}
                </button>

                <label className={styles.autoCaptureLabel}>
                    <input
                        type="checkbox"
                        checked={autoCapture}
                        onChange={(event) => setAutoCapture(event.target.checked)}
                        disabled={status !== "streaming"}
                    />
                    Auto-analyze every 5s
                </label>
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {result && (
                <div className={styles.result}>
                    <h2>Inference result</h2>
                    <p>{result}</p>
                </div>
            )}
        </div>
    );
});

export default WebcamCapture;
