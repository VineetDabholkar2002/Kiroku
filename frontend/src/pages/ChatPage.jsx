import { useEffect, useRef, useState } from "react";
import Navbar from "../skeletons/Navbar";
import { PageShell } from "./PopularPage";
import { FaArrowUp, FaComments } from "react-icons/fa6";

const CHAT_API_BASE =
  import.meta.env.VITE_CHAT_API_URL ||
  (import.meta.env.DEV ? "/chat-api" : "http://127.0.0.1:8000");

const SUGGESTED_PROMPTS = [
  "Best anime starters for someone new",
  "Top psychological anime ranked",
  "Most slept-on Madhouse shows",
  "Best Spring 2025 anime",
];

const formatMessageText = (text) =>
  text
    .replace(/:\s+(?=\d+\.\s+\*\*)/g, ":\n")
    .replace(/\s+(?=\d+\.\s+\*\*)/g, "\n")
    .replace(/\s+(?=Note that\b)/g, "\n\n");

const renderInlineFormatting = (text) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
};

const renderFormattedMessage = (text) => {
  const normalized = formatMessageText(text);
  const lines = normalized.split("\n").filter((line, index, arr) => !(line === "" && arr[index - 1] === ""));

  return lines.map((line, index) => (
    <div key={`${line}-${index}`} className={line ? "" : "h-3"}>
      {line ? renderInlineFormatting(line) : null}
    </div>
  ));
};

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isStreaming]);

  const handleSend = async (preset) => {
    const value = (preset ?? input).trim();
    if (!value || isStreaming) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      text: value,
    };
    const assistantMessageId = Date.now() + 1;
    const history = messages.map((message) => ({
      role: message.role,
      content: message.text,
    }));

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantMessageId, role: "assistant", text: "" },
    ]);
    setInput("");
    setError("");
    setIsStreaming(true);

    try {
      const response = await fetch(`${CHAT_API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: value,
          history,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat service did not return a streaming response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        buffer += decoder.decode(result.value || new Uint8Array(), { stream: !done });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event
            .split("\n")
            .find((entry) => entry.startsWith("data: "));

          if (!line) continue;

          const payload = line.slice(6);
          if (payload === "[DONE]") {
            done = true;
            break;
          }

          const parsed = JSON.parse(payload);
          const chunk = parsed.text || "";
          if (!chunk) continue;

          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, text: message.text + chunk }
                : message
            )
          );
        }
      }
    } catch (streamError) {
      console.error(streamError);
      setError("Chat service unavailable. Check Kiroku.Chat, Ollama, and the backend startup logs.");
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? { ...message, text: "I only talk about anime." }
            : message
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <PageShell>
      <Navbar />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
            Assistant
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Anime Chat
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Ask about anime, manga, studios, seasons, rankings, or voice actors.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">Streaming replies</span>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">Anime only</span>
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.035] shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="border-b border-white/[0.08] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-200">
                <FaComments />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">KirokuBot</p>
                <p className="text-xs text-slate-500">Streaming chat</p>
              </div>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex min-h-[520px] max-h-[60vh] flex-col gap-4 overflow-y-auto px-5 py-6 sm:px-6"
          >
            {messages.length === 0 && (
              <div className="flex flex-1 items-center justify-center">
                <div className="w-full max-w-3xl">
                  <div className="mb-8 text-center">
                    <h2 className="text-2xl font-semibold text-white">Start a conversation</h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Try one of these prompts.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        disabled={isStreaming}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-left text-sm text-slate-300 transition hover:border-cyan-300/25 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] rounded-[26px] px-5 py-4 text-sm leading-7 shadow-[0_18px_45px_rgba(0,0,0,0.18)] ${
                    message.role === "user"
                      ? "bg-[linear-gradient(135deg,#0891b2,#2563eb)] text-white"
                      : "border border-white/[0.08] bg-slate-900/70 text-slate-200"
                  }`}
                >
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    {message.role === "user" ? "You" : "KirokuBot"}
                  </div>
                  <div className="space-y-2 whitespace-pre-wrap break-words">
                    {message.text
                      ? renderFormattedMessage(message.text)
                      : (isStreaming && message.role === "assistant" ? "..." : "")}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/[0.08] bg-black/10 px-5 py-5 sm:px-6">
            {error && <p className="mb-3 text-sm text-rose-300">{error}</p>}
            <div className="rounded-[24px] border border-white/[0.08] bg-slate-950/80 p-3">
              <div className="flex items-end gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask about top-rated anime, best arcs, studio rankings, hidden gems..."
                  disabled={isStreaming}
                  rows={1}
                  className="max-h-40 min-h-[56px] flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-7 text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={isStreaming || !input.trim()}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500 text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
                >
                  <FaArrowUp />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
};

export default ChatPage;
