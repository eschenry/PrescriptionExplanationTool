// Cheap heuristic for spotting prompt-injection attempts. It only sets a log
// flag; the system prompt does the refusing. Blocking on regexes would
// misfire on real clinical text too often.

const PATTERNS: RegExp[] = [
  /ignore\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts?)/i,
  /disregard\s+(all\s+|the\s+|your\s+)?(previous|prior|above|system)?\s*(instructions|rules|prompt)/i,
  /\byou\s+are\s+now\b/i,
  /\b(reveal|show|print|repeat)\b.{0,30}\b(system\s+prompt|instructions|hidden\s+prompt)/i,
  /\bsystem\s+prompt\b/i,
  /\b(jailbreak|dan\s+mode|developer\s+mode)\b/i,
  /\bpretend\s+(you\s+are|to\s+be)\b/i,
];

export function looksLikeInjection(text: string): boolean {
  return PATTERNS.some((p) => p.test(text));
}
