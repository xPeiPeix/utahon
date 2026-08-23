import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  type ModelParams,
  type RequestOptions,
} from "@google/generative-ai";

type GeminiConnection = {
  apiKey: string;
  requestOptions?: RequestOptions;
};

function getGatewayConnection(): GeminiConnection | null {
  const baseUrl = process.env.AI_GATEWAY_BASE_URL?.trim();
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();

  if (!baseUrl && !apiKey) return null;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "AI_GATEWAY_BASE_URL 和 AI_GATEWAY_API_KEY 必须同时设置"
    );
  }

  return {
    apiKey,
    requestOptions: {
      apiVersion: "v1beta",
      baseUrl: baseUrl.replace(/\/+$/, ""),
    },
  };
}

function getConnection(): GeminiConnection {
  const gateway = getGatewayConnection();
  if (gateway) return gateway;

  const apiKey = process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "AI_GATEWAY_API_KEY 或 GOOGLE_AI_API_KEY 未设置"
    );
  }
  return { apiKey };
}

export function getGeminiModel(
  modelParams: ModelParams,
  timeoutMs = 60_000
) {
  const { apiKey, requestOptions } = getConnection();
  return new GoogleGenerativeAI(apiKey).getGenerativeModel(
    modelParams,
    { ...requestOptions, timeout: timeoutMs }
  );
}

export function isGeminiTimeoutError(err: unknown): boolean {
  return err instanceof GoogleGenerativeAIAbortError;
}
