import { type APICallError } from "ai";
import { isString, isObject } from "radash";

interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

export function parseError(err: unknown): string {
  let errorMessage: string = "Unknown Error";
  if (isString(err)) errorMessage = err;
  if (isObject(err)) {
    const { error } = err as { error: APICallError };
    if (error?.responseBody) {
      try {
        const response = JSON.parse(error.responseBody) as Partial<GeminiError>;
        const status = response?.error?.status || "API_ERROR";
        const message = response?.error?.message || error.message || "Unknown Error";
        errorMessage = `[${status}]: ${message}`;
      } catch {
        errorMessage = `[${error.name}]: ${error.message}`;
      }
    } else if (error?.name || error?.message) {
      errorMessage = `[${error.name}]: ${error.message}`;
    }
  }
  return errorMessage;
}
