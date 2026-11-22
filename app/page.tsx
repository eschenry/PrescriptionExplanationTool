"use client";

import { useChat, type Message } from "@ai-sdk/react";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import { parseClientError, USER_MESSAGES } from "@/lib/errors";
import type { SafetyResult } from "@/lib/safety";

const MAX_UPLOAD_BYTES = 50 * 1024;

const EXAMPLE = `Amoxicillin 500 mg capsules - 1 cap PO TID x7d (chest infection)
Ibuprofen 400 mg tablets - 1 tab PO TID PRN pain, pc
Warfarin 5 mg tablets - 1 tab PO daily (atrial fibrillation)`;

const DISCLAIMER = "Draft for clinician review. Check before giving to a patient.";

function safetyFrom(message: Message): SafetyResult | null {
  for (const part of message.parts ?? []) {
    if (
      part.type === "tool-invocation" &&
      part.toolInvocation.toolName === "checkSafety" &&
      part.toolInvocation.state === "result"
    ) {
      return part.toolInvocation.result as SafetyResult;
    }
  }
  return null;
}

function SafetyPanel({ result }: { result: SafetyResult }) {
  const empty = result.highAlert.length === 0 && result.interactions.length === 0;
  return (
    <section className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm" aria-label="Safety checks">
      <h3 className="mb-1 font-semibold text-amber-900">Safety checks (fixed list)</h3>
      {empty ? (
        <p className="text-amber-900">No medicines on the fixed high-alert list were found.</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-amber-950">
          {result.highAlert.map((h) => (
            <li key={`h-${h.medication}`}>
              <strong>{h.medication}:</strong> {h.warning}
            </li>
          ))}
          {result.interactions.map((i) => (
            <li key={`i-${i.pair.join("+")}`}>
              <strong>
                {i.pair[0]} + {i.pair[1]}:
              </strong>{" "}
              {i.warning}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Home() {
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const { messages, input, setInput, handleInputChange, handleSubmit, status, error, setMessages, stop, reload } =
    useChat({ api: "/api/chat" });

  const busy = status === "submitted" || status === "streaming";
  const started = messages.length > 0;
  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const errorCode = error ? parseClientError(error.message) : null;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setUploadNote("Only .txt files are supported for now.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadNote("That file is larger than 50 KB.");
      return;
    }
    setInput(await file.text());
    setUploadNote(`Loaded ${file.name}. Check the text, then click Explain prescription.`);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    setUploadNote(null);
    handleSubmit(e);
  }

  async function copy(m: Message) {
    await navigator.clipboard.writeText(m.content);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function startOver() {
    stop();
    setMessages([]);
    setInput("");
    setUploadNote(null);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:p-0">
      <header className="mb-6 print:hidden">
        <h1 className="text-2xl font-semibold text-teal-900">Prescription Explanation Tool</h1>
        <p className="mt-1 text-slate-600">
          Paste a prescription and get a plain-language handout for your patient. Review it, ask for changes, then
          print or copy.
        </p>
        <p className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900">
          Do not enter patient names, dates of birth or other identifiers. Nothing you type is stored.
        </p>
      </header>

      <div className="space-y-4">
        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <div key={m.id} className="ml-auto max-w-[85%] rounded-lg bg-teal-700 px-4 py-2 text-white print:hidden">
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              </div>
            );
          }
          const safety = safetyFrom(m);
          const isLatest = m.id === lastAssistantId;
          return (
            <article
              key={m.id}
              className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:border-0 print:p-0 print:shadow-none ${
                isLatest ? "" : "print:hidden"
              }`}
            >
              {safety && <SafetyPanel result={safety} />}
              {m.content ? (
                <div className="handout">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Working on it...</p>
              )}
              <p className="mt-4 border-t border-slate-100 pt-2 text-xs text-slate-500">{DISCLAIMER}</p>
              {isLatest && !busy && m.content && (
                <div className="mt-3 flex gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => copy(m)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    {copiedId === m.id ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    Print
                  </button>
                </div>
              )}
            </article>
          );
        })}

        {status === "submitted" && <p className="text-sm text-slate-500 print:hidden">Reading the prescription...</p>}

        {errorCode && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 print:hidden">
            <p>
              {USER_MESSAGES[errorCode]} <span className="font-mono text-xs">({errorCode})</span>
            </p>
            {errorCode !== "AI-400" && (
              <button type="button" onClick={() => reload()} className="mt-2 underline">
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-2 print:hidden">
        <label htmlFor="prompt" className="block text-sm font-medium text-slate-700">
          {started ? "Follow-up (e.g. make it simpler, translate to Spanish, she is 80 years old)" : "Prescription"}
        </label>
        <textarea
          id="prompt"
          value={input}
          onChange={handleInputChange}
          rows={started ? 3 : 7}
          maxLength={8000}
          placeholder={started ? "Ask for a change..." : "e.g. Metformin 500 mg tab - 1 tab PO BID with meals"}
          className="w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {started ? "Send" : "Explain prescription"}
          </button>
          {busy && (
            <button type="button" onClick={stop} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              Stop
            </button>
          )}
          {!started && (
            <>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
              >
                Upload .txt
              </button>
              <input ref={fileInput} type="file" accept=".txt,text/plain" onChange={onFile} className="hidden" />
              <button
                type="button"
                onClick={() => setInput(EXAMPLE)}
                className="rounded-md px-3 py-2 text-sm text-teal-800 underline"
              >
                Load example
              </button>
            </>
          )}
          {started && (
            <button type="button" onClick={startOver} className="ml-auto rounded-md px-3 py-2 text-sm text-slate-600 underline">
              Start over
            </button>
          )}
        </div>
        {uploadNote && <p className="text-sm text-slate-600">{uploadNote}</p>}
      </form>

      <footer className="mt-10 text-xs text-slate-400 print:hidden">
        For use by clinicians. Not a substitute for professional judgement.
      </footer>
    </main>
  );
}
