import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { api } from './api';

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

export interface SmartTextAreaProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
  label?: string;
  type?: 'issue' | 'resolution' | 'note' | 'general' | 'feedback';
  category?: string;
  location?: string;
  summary?: string;
  hint?: string;
}

export default function SmartTextArea({
  id,
  name,
  value,
  onChange,
  placeholder,
  rows = 4,
  minLength,
  maxLength,
  required,
  disabled,
  label,
  type = 'general',
  category,
  location,
  summary,
  hint,
}: SmartTextAreaProps) {
  const [listening, setListening] = useState(false);
  const [speechMsg, setSpeechMsg] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const recognitionRef = useRef<BrowserRecognition | null>(null);
  const speechPrefix = useRef('');
  const voiceAvailable = Boolean(recognitionConstructor());

  useEffect(() => () => {
    recognitionRef.current?.abort();
  }, []);

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = recognitionConstructor();
    if (!Recognition) {
      setSpeechMsg('Voice dictation is not supported in this browser.');
      return;
    }

    const recognition = new Recognition();
    speechPrefix.current = value.trim();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setListening(true);
      setSpeechMsg('Listening… speak naturally. Tap stop when finished.');
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript ?? '';
      }
      const prefix = speechPrefix.current;
      const combined = `${prefix}${prefix && transcript.trim() ? ' ' : ''}${transcript.trim()}`;
      onChange(combined);
    };

    recognition.onerror = (event) => {
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone access denied.',
        'audio-capture': 'No microphone detected.',
        'no-speech': 'No speech detected.',
      };
      setSpeechMsg(messages[event.error] ?? 'Dictation interrupted.');
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListening(false);
      setSpeechMsg('Dictation could not start. Please try again.');
    }
  };

  const autoWrite = async (mode: 'expand' | 'polish') => {
    setWriting(true);
    setSpeechMsg(null);
    try {
      const result = await api.autoWrite({
        type: mode === 'polish' ? 'general' : type,
        text: value.trim() || undefined,
        category,
        location,
        summary,
      });
      onChange(result.text);
      setSpeechMsg(mode === 'polish' ? 'Text polished for clarity.' : 'Auto-written with AI.');
    } catch {
      setSpeechMsg('AI auto-write unavailable right now.');
    } finally {
      setWriting(false);
    }
  };

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="smart-textarea-container">
      {label && (
        <div className="field-label-row">
          <label htmlFor={id}>{label}</label>
          <span className="field-meta">
            {wordCount ? `${wordCount} words` : hint ?? 'Type, dictate, or auto-write'}
          </span>
        </div>
      )}
      <div className="smart-textarea-wrapper">
        <textarea
          id={id}
          name={name}
          value={value}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          minLength={minLength}
          maxLength={maxLength}
          required={required}
          disabled={disabled || writing}
          className={`smart-textarea-field ${listening ? 'listening-active' : ''}`}
        />
        <div className="smart-textarea-toolbar">
          <div className="toolbar-left">
            {listening ? (
              <span className="listening-badge">
                <span className="audio-wave" aria-hidden="true" />
                Listening live…
              </span>
            ) : (
              <span className="toolbar-hint">
                <Icon name="edit_note" />
                Voice dictation & AI write available
              </span>
            )}
          </div>
          <div className="toolbar-actions">
            {voiceAvailable && (
              <button
                type="button"
                className={`button-chip voice-chip ${listening ? 'active' : ''}`}
                onClick={toggleVoice}
                title={listening ? 'Stop voice dictation' : 'Start voice dictation'}
                aria-pressed={listening}
              >
                <Icon name={listening ? 'stop_circle' : 'mic'} filled={listening} />
                <span>{listening ? 'Stop' : 'Dictate'}</span>
              </button>
            )}
            <button
              type="button"
              className="button-chip ai-chip"
              onClick={() => autoWrite(value.trim().length > 6 ? 'polish' : 'expand')}
              disabled={writing || disabled}
              title={value.trim().length > 6 ? 'Refine and polish grammar with AI' : 'Auto-write text using AI'}
            >
              {writing ? (
                <>
                  <span className="spinner" />
                  <span>Writing…</span>
                </>
              ) : (
                <>
                  <Icon name="auto_awesome" filled />
                  <span>{value.trim().length > 6 ? 'AI Polish' : 'Auto-write'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {speechMsg && (
        <p className={`textarea-status-msg ${listening ? 'live' : ''}`} role="status">
          <Icon name={listening ? 'graphic_eq' : 'info'} />
          <span>{speechMsg}</span>
        </p>
      )}
    </div>
  );
}
