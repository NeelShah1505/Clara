"use client";

import { useState, useRef, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/utils/fetcher";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ClaraWidget() {
  const { data } = useSWR("/api/settings", fetcher);
  const { mutate } = useSWRConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm Clara, your AI Wealth Management Assistant. I can analyze your transactions, answer financial questions, or perform live updates (e.g. *'Add 450 expense for Starbucks'*, *'Set dining budget to 10000'*). How can I help you today?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const settings = data?.settings;
  const isEnabled = settings?.claraEnabled;
  const hasApiKey = (!!settings?.claraApiKey && settings.claraApiKey.trim() !== "") || (!!settings?.geminiApiKey && settings.geminiApiKey.trim() !== "");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isLoading]);

  if (!isEnabled || !hasApiKey) {
    return null;
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/clara/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (res.ok) {
        const resData = await res.json();
        setMessages(prev => [...prev, { role: "assistant", content: resData.reply }]);
        
        // Automatically revalidate all active SWR caches if a CRUD action took place!
        if (resData.actionExecuted) {
          mutate(() => true, undefined, { revalidate: true });
        }
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Sorry, I encountered an error communicating with the database." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Network error occurred." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: "2rem", right: "2rem", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      {isOpen && (
        <div className="card reveal" style={{ 
          width: 360, height: 480, marginBottom: "1rem", 
          display: "flex", flexDirection: "column", 
          boxShadow: "0 12px 48px rgba(0,0,0,0.25)", border: "1px solid var(--border)",
          overflow: "hidden", borderRadius: "1.25rem", background: "var(--surface-container-lowest)"
        }}>
          {/* Header */}
          <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", background: "var(--primary-container)", color: "var(--on-primary)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--tertiary-fixed)", fontSize: 24 }}>token</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>Clara AI Wealth Agent</p>
              <p style={{ fontSize: 11, opacity: 0.8 }}>Live CRUD & Analytics Enabled</p>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "var(--on-primary)", cursor: "pointer", opacity: 0.8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: "1rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", background: "var(--surface)" }}>
            {messages.map((m, index) => (
              <div key={index} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? "var(--primary)" : "var(--surface-variant)",
                color: m.role === "user" ? "white" : "var(--on-surface)",
                padding: "0.75rem 1rem",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                maxWidth: "85%", fontSize: 13, lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
              }}>
                {m.content}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: "flex-start", background: "var(--surface-variant)", padding: "0.5rem 1rem", borderRadius: "16px 16px 16px 4px", fontSize: 12, display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--on-surface-variant)" }}>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>sync</span>
                Clara is calculating & executing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} style={{ padding: "0.75rem", borderTop: "1px solid var(--border)", display: "flex", gap: "0.5rem", background: "var(--surface-container-lowest)" }}>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask or tell Clara to add an expense..." 
              className="input" 
              style={{ flex: 1, padding: "0.6rem 1rem", fontSize: 13, borderRadius: 24, border: "1px solid var(--outline-variant)" }}
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="btn" style={{ borderRadius: "50%", width: 40, height: 40, padding: 0, background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
            </button>
          </form>
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 58, height: 58, borderRadius: "50%", 
          background: "var(--primary)", color: "white",
          border: "2px solid var(--surface)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: isOpen ? "scale(0.92)" : "scale(1)"
        }}
        title="Chat with Clara AI"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 30, color: "var(--tertiary-fixed)" }}>
          {isOpen ? "close" : "token"}
        </span>
      </button>
    </div>
  );
}
