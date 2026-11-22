// Turns a streamed assistant message into the handout text we show, copy and print.
// Safe for the client: no server imports.

export interface MessagePartLike {
  type: string;
  text?: string;
}

/**
 * With tool calling, the model sometimes writes a sentence before calling the
 * tools ("I'll expand the dosing instructions..."). That text belongs to an
 * earlier step and is not part of the handout. Keep only the text written
 * after the last tool call. Messages without tool calls are returned whole.
 */
export function handoutText(parts: MessagePartLike[] | undefined, fallback: string): string {
  if (!parts || parts.length === 0) return fallback;
  const lastTool = parts.map((p) => p.type).lastIndexOf("tool-invocation");
  const text = parts
    .slice(lastTool + 1)
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  return lastTool === -1 && text === "" ? fallback : text.trim();
}

/**
 * Markdown joins lines separated by a single newline into one paragraph, which
 * runs "What it is for:" and "How and when to take it:" together. Turn single
 * newlines into hard line breaks. Blank lines, headings and list items are
 * unaffected because they are already separate blocks.
 */
export function preserveLineBreaks(markdown: string): string {
  return markdown.replace(/\r\n/g, "\n").replace(/([^\n])\n(?!\n)/g, "$1  \n");
}
