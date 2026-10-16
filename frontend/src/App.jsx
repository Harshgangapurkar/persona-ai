import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";
import {
  ArrowLeft, ArrowRight, Bot, Brain, Check, ChevronDown, CircleHelp, Copy,
  Code2, Compass, GraduationCap, KeyRound, LoaderCircle, LockKeyhole,
  MessageCircle, Plus, RefreshCw, Send, ShieldCheck, Sparkles, UserRound,
  Users, WandSparkles, X
} from "lucide-react";

function normalizeMarkdown(source = "") {
  // Some models accidentally emit two-backtick fences; repair those before parsing.
  return source
    // Unescape Markdown markers some models emit literally (\**bold** / \### heading).
    .replace(/\\([*#_`])/g, "$1")
    // Normalize common two-backtick fences to standard Markdown fences.
    .replace(/^\s*``(python|javascript|js|typescript|ts|bash|sh|json|html|css|sql|java|cpp|c|go|rust|yaml|yml|powershell)\s*$/gim, "```$1")
    .replace(/^\s*``\s*$/gm, "```")
    // Convert LaTeX delimiters into the dollar delimiters understood by remark-math.
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$")
    .replace(/\\\[/g, "\n$$$$\n")
    .replace(/\\\]/g, "\n$$$$\n");
}

function MarkdownCode({ className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const codeText = String(children ?? "").replace(/\n$/, "");
  const language = /language-([\w+-]+)/.exec(className || "")?.[1];
  const isBlock = Boolean(language) || codeText.includes("\n");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  if (!isBlock) return <code className={className} {...props}>{children}</code>;

  return (
    <div className="code-card">
      <div className="code-card-header">
        <span className="code-language"><span className="code-language-dot" />{language || "Code"}</span>
        <button type="button" className="copy-code-button" onClick={copyCode} aria-label="Copy code">
          {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre className="code-card-pre"><code className={className} {...props}>{children}</code></pre>
    </div>
  );
}

function MarkdownPre({ children }) {
  // The custom code renderer owns the code-block shell and header.
  return <>{children}</>;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const PROVIDER_GROUPS = [
  { label: "Popular", ids: ["gemini", "openai", "anthropic", "openrouter", "groq"] },
  { label: "More providers", ids: ["deepseek", "mistral", "xai", "together", "fireworks", "cerebras", "deepinfra", "perplexity", "nvidia", "qwen", "cohere"] }
];

const PERSONA_META = {
  teacher: { icon: GraduationCap, tint: "violet", tagline: "Patient, visual, step-by-step learning", example: "Teach me a difficult concept from first principles." },
  python_expert: { icon: Code2, tint: "blue", tagline: "Debug, design, and write better Python", example: "Help me debug a Python error and explain the root cause." },
  travel_guide: { icon: Compass, tint: "green", tagline: "Practical trips with local character", example: "Plan a thoughtful weekend trip on a budget." },
  motivational_coach: { icon: Sparkles, tint: "orange", tagline: "Turn goals into achievable action", example: "Help me get unstuck and choose my next step." },
  interviewer: { icon: Users, tint: "pink", tagline: "Practice interviews with candid feedback", example: "Start a mock interview for an AI internship." },
  researcher: { icon: Brain, tint: "cyan", tagline: "Evidence, comparisons, and clear reasoning", example: "Compare two approaches and explain the trade-offs." },
  writing_coach: { icon: WandSparkles, tint: "yellow", tagline: "Sharpen writing without losing your voice", example: "Improve this draft while keeping my natural tone." },
  productivity_partner: { icon: Check, tint: "green", tagline: "Priorities, focus, and realistic plans", example: "Help me prioritize a busy week realistically." },
  custom: { icon: Plus, tint: "violet", tagline: "Create a personality that fits your needs", example: "A concise, skeptical product strategist who challenges assumptions." }
};

async function apiRequest(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "The request could not be completed.";
    throw new Error(detail);
  }
  return data;
}

export default function App() {
  const [providers, setProviders] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [connection, setConnection] = useState(null);
  const [keyError, setKeyError] = useState("");
  const [personaId, setPersonaId] = useState("teacher");
  const [customPersona, setCustomPersona] = useState("");
  const [view, setView] = useState("connect");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    Promise.all([apiRequest("/api/providers"), apiRequest("/api/personas")])
      .then(([providerData, personaData]) => {
        setProviders(providerData.providers || []);
        setPersonas(personaData.personas || []);
      })
      .catch(() => {
        setKeyError(`Cannot reach Persona AI backend at ${API_BASE}. Start the backend and refresh.`);
      });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const providerMap = useMemo(() => Object.fromEntries(providers.map(p => [p.id, p])), [providers]);
  const personaMap = useMemo(() => Object.fromEntries(personas.map(p => [p.id, p])), [personas]);
  const selectedPersona = personaMap[personaId] || { label: personaId };
  const selectedMeta = PERSONA_META[personaId] || PERSONA_META.custom;

  function startProgram(event) {
    event.preventDefault();
    setKeyError("");
    setChatError("");
    if (!apiKey.trim()) {
      setKeyError("Paste your API key to continue.");
      return;
    }
    const selectedProvider = providerMap[provider];
    if (!selectedProvider) {
      setKeyError("Provider list is still loading. Please wait a moment and try again.");
      return;
    }
    setConnection({
      provider,
      provider_label: selectedProvider.label,
      model: selectedProvider.model,
    });
    setView("personas");
  }

  function choosePersona(id) {
    setPersonaId(id);
    setMessages([]);
    setChatError("");
    setView("chat");
  }

  async function sendMessage(event) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;
    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setChatError("");
    setIsSending(true);
    try {
      const result = await apiRequest("/api/chat", {
        provider,
        api_key: apiKey.trim(),
        model: connection?.model || providerMap[provider]?.model,
        persona_id: personaId,
        custom_persona: personaId === "custom" ? customPersona : "",
        messages: nextMessages
      });
      setMessages([...nextMessages, { role: "assistant", content: result.reply || "I couldn't generate a response." }]);
    } catch (error) {
      setChatError(error.message || "Message failed. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  function resetConnection() {
    setApiKey("");
    setConnection(null);
    setMessages([]);
    setDraft("");
    setKeyError("");
    setChatError("");
    setView("connect");
  }

  const progress = view === "connect" ? 1 : view === "personas" ? 2 : 3;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView(connection ? "personas" : "connect")} aria-label="Persona AI home">
          <span className="brand-mark"><Sparkles size={19} /></span>
          <span><strong>persona</strong><small>AI WORKSPACE</small></span>
        </button>
        <div className="side-label">YOUR WORKSPACE</div>
        <button className={`nav-item ${view === "connect" ? "active" : ""}`} onClick={() => setView("connect")}><KeyRound size={17} /> Connect provider</button>
        <button className={`nav-item ${view === "personas" ? "active" : ""}`} onClick={() => connection && setView("personas")}><Users size={17} /> Personalities</button>
        <button className={`nav-item ${view === "chat" ? "active" : ""}`} onClick={() => connection && setView("chat")}><MessageCircle size={17} /> Conversation</button>
        <div className="sidebar-bottom">
          <div className="privacy-card"><LockKeyhole size={17} /><div><strong>Private by design</strong><p>Your key is used for requests and is not saved to a database or browser storage by this app.</p></div></div>
          <button className="nav-item" onClick={resetConnection}><RefreshCw size={16} /> Disconnect & clear session</button>
          <div className="sidebar-footer">PERSONA AI <span>•</span> LOCAL WORKSPACE</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{view === "connect" ? "Connect provider" : view === "personas" ? "Personalities" : "Conversation"}</strong></div>
          <div className="topbar-right"><span className="secure-dot" /> Session-only key <span className="top-divider" /><span className="step-counter">STEP {progress} OF 3</span></div>
        </header>

        {view === "connect" && (
          <section className="connect-view">
            <div className="hero-eyebrow"><span className="eyebrow-line" /> YOUR AI, YOUR RULES</div>
            <h1>One workspace.<br /><span>Distinct minds.</span></h1>
            <p className="hero-copy">Choose the AI provider you trust, then bring an assistant to life with a personality that actually feels different.</p>
            <div className="connect-card">
              <div className="card-heading"><div className="card-icon"><KeyRound size={19} /></div><div><h2>Start your AI workspace</h2><p>Choose a provider, paste your API key, and start chatting.</p></div></div>
              <form onSubmit={startProgram}>
                <label htmlFor="provider">AI PROVIDER</label>
                <div className="select-wrap"><select id="provider" value={provider} onChange={e => { setProvider(e.target.value); setKeyError(""); setConnection(null); }} required>
                  {PROVIDER_GROUPS.map(group => <optgroup label={group.label} key={group.label}>
                    {group.ids.filter(id => providerMap[id]).map(id => <option key={id} value={id}>{providerMap[id].label}</option>)}
                  </optgroup>)}
                </select><ChevronDown size={16} /></div>
                <label htmlFor="apiKey">API KEY</label>
                <div className="key-input-wrap"><KeyRound size={17} /><input id="apiKey" type="password" autoComplete="off" spellCheck="false" placeholder="Paste your provider API key" value={apiKey} onChange={e => { setApiKey(e.target.value); setKeyError(""); }} /></div>
                <div className="key-help"><LockKeyhole size={14} /><span>Used for this session only. Never display or share your key.</span><button type="button" className="text-button" onClick={() => window.open("https://aistudio.google.com/apikey", "_blank", "noopener,noreferrer")}>Get a key <ArrowRight size={13} /></button></div>
                {keyError && <div className="error-banner" role="alert"><CircleHelp size={16} /><span>{keyError}</span></div>}
                <button className="primary-button" type="submit" disabled={!apiKey.trim() || !providers.length}>Start using AI <ArrowRight size={17} /></button>
              </form>
              <div className="supported-note"><ShieldCheck size={15} /> No connection test. The key is used when you send your first message.</div>
            </div>
            <div className="trust-row"><div><Check size={15} /> No database storage</div><div><Check size={15} /> No browser persistence</div><div><Check size={15} /> Disconnect anytime</div></div>
          </section>
        )}

        {view === "personas" && (
          <section className="personas-view">
            <button className="back-link" onClick={() => setView("connect")}><ArrowLeft size={15} /> Change provider</button>
            <div className="hero-eyebrow"><span className="eyebrow-line" /> STEP 02 · PERSONALITY</div>
            <h1>Choose a mind.<br /><span>Shape the conversation.</span></h1>
            <p className="hero-copy">Each personality has its own approach, communication style, and way of helping. Pick one—or create your own.</p>
            <div className="persona-grid">
              {personas.filter(p => p.id !== "custom").map(persona => {
                const meta = PERSONA_META[persona.id] || PERSONA_META.teacher;
                const Icon = meta.icon;
                return <button className="persona-card" key={persona.id} onClick={() => choosePersona(persona.id)}>
                  <div className={`persona-icon ${meta.tint}`}><Icon size={21} /></div><div className="persona-card-title">{persona.label}</div><p>{meta.tagline}</p><span className="persona-card-link">Choose personality <ArrowRight size={14} /></span>
                </button>;
              })}
              <button className="persona-card custom-card" onClick={() => { setPersonaId("custom"); setView("custom"); }}>
                <div className="persona-icon violet"><Plus size={21} /></div><div className="persona-card-title">Create your own</div><p>Define a unique role, voice, and behavior.</p><span className="persona-card-link">Build a personality <ArrowRight size={14} /></span>
              </button>
            </div>
            <div className="connected-strip"><span className="secure-dot" /> Connected to <strong>{connection?.provider_label}</strong><span className="strip-model">{connection?.model}</span></div>
          </section>
        )}

        {view === "custom" && (
          <section className="custom-view">
            <button className="back-link" onClick={() => setView("personas")}><ArrowLeft size={15} /> All personalities</button>
            <div className="hero-eyebrow"><span className="eyebrow-line" /> CUSTOM PERSONALITY</div>
            <h1>Design your own<br /><span>way of thinking.</span></h1>
            <p className="hero-copy">Describe the role, expertise, tone, methods, and behaviors you want. Your instructions cannot disable safety or honesty rules.</p>
            <div className="connect-card custom-builder">
              <label htmlFor="customPersona">PERSONALITY INSTRUCTIONS</label>
              <textarea id="customPersona" rows={7} maxLength={3000} value={customPersona} onChange={e => setCustomPersona(e.target.value)} placeholder="Example: You are a rigorous startup advisor. Challenge vague assumptions, ask for evidence, compare options using clear criteria, and finish with the highest-impact next step. Be candid, not rude." />
              <div className="character-count">{customPersona.length}/3000 characters</div>
              <button className="primary-button" disabled={!customPersona.trim()} onClick={() => choosePersona("custom")}>Bring this personality to life <ArrowRight size={17} /></button>
            </div>
          </section>
        )}

        {view === "chat" && (
          <section className="chat-view">
            <div className="chat-heading">
              <div className={`persona-icon large ${selectedMeta.tint}`}><selectedMeta.icon size={22} /></div>
              <div className="chat-heading-text"><div className="hero-eyebrow compact"><span className="secure-dot" /> ACTIVE PERSONALITY</div><h1>{selectedPersona.label}</h1><p>{selectedMeta.tagline}</p></div>
              <button className="secondary-button" onClick={() => setView("personas")}><Users size={15} /> Change</button>
            </div>
            <div className="chat-messages">
              {messages.length === 0 && <div className="welcome-card"><div className="welcome-spark"><Sparkles size={22} /></div><h2>Let's make this useful.</h2><p>{selectedMeta.example}</p><button className="suggestion-chip" onClick={() => setDraft(selectedMeta.example)}>Use this as a starting point <ArrowRight size={14} /></button></div>}
              {messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${index}-${message.role}`}><div className="message-avatar">{message.role === "assistant" ? <Bot size={17} /> : <UserRound size={17} />}</div><div className="message-bubble"><div className="message-author">{message.role === "assistant" ? selectedPersona.label : "You"}</div><div className="message-content"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]} components={{ code: MarkdownCode, pre: MarkdownPre }}>{normalizeMarkdown(message.content)}</ReactMarkdown></div></div></div>)}
              {isSending && <div className="message-row assistant"><div className="message-avatar"><Bot size={17} /></div><div className="message-bubble"><div className="message-author">{selectedPersona.label}</div><div className="typing"><span /><span /><span /></div></div></div>}
              <div ref={bottomRef} />
            </div>
            {chatError && <div className="error-banner chat-error" role="alert"><CircleHelp size={16} />{chatError}</div>}
            <form className="composer" onSubmit={sendMessage}><textarea value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} rows={1} maxLength={12000} placeholder={`Message ${selectedPersona.label}…`} /><button type="submit" disabled={isSending || !draft.trim()} aria-label="Send message"><Send size={18} /></button></form>
            <div className="composer-foot"><span><LockKeyhole size={13} /> Key held in this page's memory for the session</span><span>Enter to send · Shift+Enter for newline</span></div>
          </section>
        )}
      </main>
    </div>
  );
}
