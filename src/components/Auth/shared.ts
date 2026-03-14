export function resolveNextPath(nextPath: string | null | undefined) {
  if (!nextPath || !nextPath.startsWith("/")) return "/";
  if (nextPath.startsWith("//")) return "/";
  return nextPath;
}

export function getAuthErrorMessage(
  fallbackMessage: string,
  message: string | undefined,
) {
  if (!message) return fallbackMessage;

  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes("invalid login credentials")) {
    return fallbackMessage;
  }
  if (normalizedMessage.includes("email not confirmed")) {
    return fallbackMessage;
  }
  if (normalizedMessage.includes("session_not_found")) {
    return fallbackMessage;
  }

  return message;
}
