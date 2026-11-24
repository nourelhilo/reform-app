import { useEffect, useRef, useState } from 'react';

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
export const voiceCommandsSupported = Boolean(Recognition);

// Words people actually say mid-workout, mapped to an action.
const COMMANDS = [
  [/\b(pause|wait|hold on)\b/, 'pause'],
  [/\b(resume|continue|go|start|play)\b/, 'resume'],
  [/\b(skip|skip rest)\b/, 'skip'],
  [/\b(next|next exercise)\b/, 'next'],
  // Not "done"/"complete": the app's own voice says those, and the mic would hear it.
  [/\b(stop|end|finish)\b/, 'end'],
];

export function commandFor(transcript) {
  const text = transcript.toLowerCase();
  return COMMANDS.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

/**
 * Listens for short spoken commands while `enabled`. `handlers` maps
 * pause/resume/skip/next/end to callbacks. Browsers without speech
 * recognition (e.g. Firefox) simply never call a handler.
 */
export function useVoiceCommands(enabled, handlers) {
  const latest = useRef(handlers);
  latest.current = handlers;
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState(null);

  useEffect(() => {
    if (!enabled || !Recognition) return;
    let stopped = false;
    let recognition;
    let restart;
    const start = () => {
      recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = navigator.language || 'en-US';
      recognition.onstart = () => setListening(true);
      recognition.onresult = event => {
        const result = event.results[event.results.length - 1];
        const command = commandFor(result[0].transcript);
        if (!command) return;
        setHeard(command);
        latest.current[command]?.();
      };
      recognition.onerror = event => {
        // Microphone denied: stop trying instead of looping.
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') stopped = true;
      };
      // Browsers end recognition after silence; keep it going while enabled.
      recognition.onend = () => {
        setListening(false);
        if (!stopped) restart = setTimeout(start, 300);
      };
      try { recognition.start(); } catch { /* already started */ }
    };
    start();
    return () => {
      stopped = true;
      clearTimeout(restart);
      try { recognition?.abort(); } catch { /* ignore */ }
      setListening(false);
    };
  }, [enabled]);

  return { listening, heard, supported: voiceCommandsSupported };
}
