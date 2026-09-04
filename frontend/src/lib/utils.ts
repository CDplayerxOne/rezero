import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const parseSSE = (
  data: string,
  message_id: string,
  response_id: string,
  onEvent: (
    event: string,
    data: string,
    message_id: string,
    response_id: string,
  ) => void,
): void => {
  // Split the data by newlines
  const lines = data.split("\n");
  let eventType = "message";
  data = "";

  // Process each line
  for (const line of lines) {
    if (line.startsWith("event:")) {
      const event = line.substring(6).trim();
      eventType = event;
    } else if (line.startsWith("data:")) {
      const jsonData = line.substring(5).trim();
      data += jsonData;
    }
  }
  onEvent(eventType, data, message_id, response_id);
};

export async function readSSE(
  response: Response,
  message_id: string,
  response_id: string,
  onEvent: (
    event: string,
    data: string,
    message_id: string,
    response_id: string,
  ) => void,
) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder("utf-8");
  // We will use a buffer to store incomplete data chunks
  let buffer = "";
  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    // Append the new chunk to the buffer and decode it
    buffer += decoder.decode(value);
    const events = buffer.split("\n\n");
    // The last event might be incomplete, so we keep it in the buffer for the next iteration
    buffer = events.pop() || "";
    for (const event of events) {
      parseSSE(event, message_id, response_id, onEvent);
    }
  }
}
