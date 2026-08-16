"use client";

import { useCallback, useRef } from "react";
import WebcamCapture, { type WebcamCaptureHandle } from "@/components/WebcamCapture";
import AgentChat from "@/components/AgentChat";
import styles from "./page.module.css";

export default function Home() {
  const webcamRef = useRef<WebcamCaptureHandle>(null);

  const getSnapshot = useCallback(() => webcamRef.current?.captureSnapshot() ?? null, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>AI Video Agent</h1>
        <p>Capture a webcam snapshot and run DIAL-based vision inference on it.</p>
        <WebcamCapture ref={webcamRef} />
        <AgentChat getSnapshot={getSnapshot} />
      </main>
    </div>
  );
}
