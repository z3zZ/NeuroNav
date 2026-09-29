import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

interface FeedbackContextValue {
  /** Sends a short message to screen readers. Use sparingly. */
  announce: (message: string, urgency?: 'polite' | 'assertive') => void;
  /** Shows a visible message, optionally with an undo-style action. */
  notify: (message: string, action?: Toast['action']) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const hovered = useRef(false);

  const announce = useCallback((message: string, urgency: 'polite' | 'assertive' = 'polite') => {
    const set = urgency === 'assertive' ? setAssertive : setPolite;
    // Clearing first makes repeated identical messages announce again.
    set('');
    window.setTimeout(() => set(message), 50);
  }, []);

  const scheduleHide = useCallback(() => {
    window.clearTimeout(hideTimer.current);
    // Long enough to read and reach the action; paused while hovered or focused.
    hideTimer.current = window.setTimeout(() => {
      if (!hovered.current) setToast(null);
    }, 12000);
  }, []);

  const notify = useCallback(
    (message: string, action?: Toast['action']) => {
      setToast({ id: Date.now(), message, action });
      scheduleHide();
    },
    [scheduleHide],
  );

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const value = useMemo(() => ({ announce, notify }), [announce, notify]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {polite}
      </div>
      <div className="visually-hidden" aria-live="assertive" aria-atomic="true">
        {assertive}
      </div>
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div
            className="toast"
            key={toast.id}
            onMouseEnter={() => (hovered.current = true)}
            onMouseLeave={() => {
              hovered.current = false;
              scheduleHide();
            }}
            onFocus={() => (hovered.current = true)}
            onBlur={() => {
              hovered.current = false;
              scheduleHide();
            }}
          >
            <p className="toast__message">{toast.message}</p>
            {toast.action && (
              <button
                type="button"
                className="btn btn--small btn--on-dark"
                onClick={() => {
                  toast.action?.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button type="button" className="icon-btn icon-btn--on-dark" onClick={() => setToast(null)}>
              <X size={18} aria-hidden="true" />
              <span className="visually-hidden">Dismiss message</span>
            </button>
          </div>
        )}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}
