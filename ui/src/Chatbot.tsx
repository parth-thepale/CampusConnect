import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from './api';
import type { ChatMessage, SessionUser } from './types';

type SpeechAlternative = { transcript: string };
type SpeechResult = { 0?: SpeechAlternative };
type SpeechEvent = { results: { length: number; [index: number]: SpeechResult } };
type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => BrowserRecognition;

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const speechWindow = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function Icon({ name, filled = false }: { name: string; filled?: boolean }) {
  return <span className="material-symbols-rounded symbol" data-filled={filled}>{name}</span>;
}

export default function Chatbot({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-msg',
      role: 'assistant',
      text: user.role === 'admin'
        ? `👋 Welcome Administrator **${user.name}**.\n\nYou have **Executive Access** to CampusConnect AI. I can analyze routing configurations, inspect department SLA and workloads, query any campus ticket, and draft operational directives.`
        : `👋 Hello **${user.name}**.\n\nYou are logged in with **Facilities Staff** privileges. I can assist you with ticket triage, location problem lookups, category troubleshooting checklists, and drafting resolution notes.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      accessLevel: user.role === 'admin' ? 'admin' : 'staff',
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = recognitionConstructor();
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript ?? '';
      }
      setInput((prev) => `${prev ? `${prev} ` : ''}${transcript.trim()}`);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || busy) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);

    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
      const result = await api.chat(text, history);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        accessLevel: isAdmin ? 'admin' : 'staff',
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `⚠️ ${err instanceof Error ? err.message : 'Chat service encountered an error.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setBusy(false);
    }
  };

  const staffSuggestions = [
    'Urgent tickets awaiting action',
    'Tickets in Central Library',
    'How do I troubleshoot plumbing leaks?',
    'Cleanliness procedure for lab spill',
  ];

  const adminSuggestions = [
    'Executive campus facilities briefing',
    'Review routing rules & bottlenecks',
    'Department workload & capacity report',
    'Campus SLA compliance analysis',
  ];

  const suggestions = isAdmin ? adminSuggestions : staffSuggestions;

  return (
    <aside className="chatbot-widget-container" aria-label="Campus AI Assistant">
      {!open && (
        <button
          type="button"
          className="chatbot-fab"
          onClick={() => setOpen(true)}
          aria-label="Open AI Assistant"
        >
          <div className="fab-icon-wrap">
            <Icon name="psychology" filled />
          </div>
          <span className="fab-label">
            Campus AI
            <small className="fab-role-badge">{isAdmin ? 'Admin' : 'Staff'}</small>
          </span>
        </button>
      )}

      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="header-left">
              <div className={`chat-avatar ${isAdmin ? 'admin-badge' : 'staff-badge'}`}>
                <Icon name={isAdmin ? 'admin_panel_settings' : 'engineering'} filled />
              </div>
              <div>
                <div className="chat-title-row">
                  <strong>Campus AI</strong>
                  <span className={`access-pill ${isAdmin ? 'admin' : 'staff'}`}>
                    {isAdmin ? 'Admin Clearance' : 'Staff Clearance'}
                  </span>
                </div>
                <small>{isAdmin ? 'Full system & policy oversight' : 'Triage & technical support'}</small>
              </div>
            </div>
            <button
              type="button"
              className="icon-button close-chat-btn"
              onClick={() => setOpen(false)}
              aria-label="Minimize AI Assistant"
            >
              <Icon name="close" />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((m) => (
              <div key={m.id} className={`chat-bubble-row ${m.role}`}>
                <div className="chat-bubble">
                  <div className="bubble-text">{m.text}</div>
                  <span className="bubble-time">{m.timestamp}</span>
                </div>
              </div>
            ))}
            {busy && (
              <div className="chat-bubble-row assistant">
                <div className="chat-bubble thinking">
                  <span className="spinner small" />
                  <span>Analyzing campus records…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-quick-chips">
            {suggestions.map((s) => (
              <button
                type="button"
                key={s}
                className="chip-btn"
                disabled={busy}
                onClick={() => sendMessage(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <form
            className="chatbot-input-row"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <button
              type="button"
              className={`icon-button voice-input-btn ${listening ? 'listening' : ''}`}
              onClick={toggleVoice}
              title={listening ? 'Stop listening' : 'Speak message'}
              aria-pressed={listening}
            >
              <Icon name={listening ? 'graphic_eq' : 'mic'} filled={listening} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? 'Listening… speak now' : 'Ask anything about tickets or campus…'}
              disabled={busy}
              className="chat-text-input"
            />
            <button
              type="submit"
              className="button primary send-btn"
              disabled={busy || !input.trim()}
              aria-label="Send message"
            >
              <Icon name="send" filled />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
