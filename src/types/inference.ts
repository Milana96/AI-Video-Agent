export interface InferenceRequestBody {
    /** Base64-encoded JPEG snapshot, including the data URL prefix. */
    image: string;
    /** Optional instruction to guide the model's analysis of the frame. */
    prompt?: string;
}

export interface InferenceSuccessResponse {
    result: string;
}

export interface InferenceErrorResponse {
    error: string;
}

export type InferenceResponse = InferenceSuccessResponse | InferenceErrorResponse;
