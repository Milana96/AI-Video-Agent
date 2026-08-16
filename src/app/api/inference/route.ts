import { NextResponse } from "next/server";
import { runDialImageInference, DialConfigError } from "@/lib/dialClient";
import type { InferenceRequestBody, InferenceResponse } from "@/types/inference";

const MAX_IMAGE_LENGTH = 5_000_000; // ~3.7MB decoded, generous limit for a single JPEG snapshot
const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp);base64,/;

export async function POST(request: Request): Promise<NextResponse<InferenceResponse>> {
    let body: InferenceRequestBody;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    const { image, prompt } = body ?? {};

    if (typeof image !== "string" || !IMAGE_DATA_URL_PATTERN.test(image)) {
        return NextResponse.json(
            { error: "Field 'image' must be a base64 image data URL (png/jpeg/webp)." },
            { status: 400 },
        );
    }

    if (image.length > MAX_IMAGE_LENGTH) {
        return NextResponse.json({ error: "Image payload is too large." }, { status: 413 });
    }

    if (prompt !== undefined && (typeof prompt !== "string" || prompt.length > 2000)) {
        return NextResponse.json({ error: "Field 'prompt' must be a short string." }, { status: 400 });
    }

    try {
        const result = await runDialImageInference({ imageDataUrl: image, prompt });
        return NextResponse.json({ result });
    } catch (error) {
        if (error instanceof DialConfigError) {
            return NextResponse.json({ error: error.message }, { status: 503 });
        }
        console.error("DIAL inference failed", error);
        return NextResponse.json({ error: "Inference request failed." }, { status: 502 });
    }
}
