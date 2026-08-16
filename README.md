# AI-Video-Agent

A Next.js app that captures webcam snapshots in the browser and runs vision inference on them via [DIAL](https://epam-rail.com/) (EPAM's OpenAI-compatible AI orchestration layer).

## How it works

1. The browser requests webcam access (`getUserMedia`) and streams the feed to a `<video>` element.
2. On demand (or on a 5s auto-capture interval), a frame is drawn to a hidden `<canvas>` and exported as a base64 JPEG.
3. The snapshot is POSTed to the `/api/inference` route, which forwards it to a DIAL chat completions deployment as an image message and returns the model's description.

## Getting started

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your DIAL connection details:

| Variable | Description |
| --- | --- |
| `DIAL_API_HOST` | Base URL of your DIAL deployment |
| `DIAL_API_KEY` | DIAL API key |
| `DIAL_DEPLOYMENT_NAME` | Vision-capable model deployment name (e.g. `gpt-4o`) |
| `DIAL_API_VERSION` | Optional, defaults to `2024-05-01-preview` |

Then run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and allow camera access to start capturing and analyzing snapshots.

## Project structure

- `src/app/page.tsx` – home page rendering the webcam UI.
- `src/components/WebcamCapture.tsx` – client component handling camera stream, snapshot capture, and calling the inference API.
- `src/app/api/inference/route.ts` – server route validating requests and forwarding snapshots to DIAL.
- `src/lib/dialClient.ts` – DIAL chat completions client for image inference.
