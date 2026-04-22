export type SSEEvent<T = unknown> = {
  type: string;
  data: T;
};

export type SSEOptions<T = unknown> = {
  onEvent: (event: SSEEvent<T>) => void;
  signal?: AbortSignal;
};

export async function streamSSE<T = unknown>(
  url: string,
  body: unknown,
  opts: SSEOptions<T>
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errData.error ?? `HTTP ${res.status}`);
  }
  if (!res.body) throw new Error("响应无 body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let splitIdx;
    while ((splitIdx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, splitIdx);
      buffer = buffer.slice(splitIdx + 2);
      if (!block || block.startsWith(":")) continue;
      let eventType = "message";
      let dataStr = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) eventType = line.slice(7).trim();
        else if (line.startsWith("data: ")) dataStr += line.slice(6);
      }
      if (!dataStr) continue;
      try {
        const data = JSON.parse(dataStr) as T;
        opts.onEvent({ type: eventType, data });
      } catch {
        // malformed chunk
      }
    }
  }
}
