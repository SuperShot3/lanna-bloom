'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

export type ToastOptions = {
  variant?: 'default' | 'error';
  durationMs?: number;
};

type ToastState = {
  message: string;
  variant: 'default' | 'error';
  durationMs: number;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 2500;
const ERROR_DURATION_MS = 4200;
const TOAST_EXIT_MS = 480;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDismissTimers = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (removeTimerRef.current) {
      clearTimeout(removeTimerRef.current);
      removeTimerRef.current = null;
    }
  }, []);

  const scheduleDismiss = useCallback(
    (durationMs: number) => {
      clearDismissTimers();
      const exitAt = Math.max(0, durationMs - TOAST_EXIT_MS);
      dismissTimerRef.current = setTimeout(() => {
        setExiting(true);
        removeTimerRef.current = setTimeout(() => {
          setToast(null);
          setExiting(false);
        }, TOAST_EXIT_MS);
      }, exitAt);
    },
    [clearDismissTimers]
  );

  const showToast = useCallback(
    (msg: string, options?: ToastOptions) => {
      clearDismissTimers();
      setExiting(false);
      const variant = options?.variant ?? 'default';
      const durationMs =
        options?.durationMs ?? (variant === 'error' ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);
      setToast({ message: msg, variant, durationMs });
      scheduleDismiss(durationMs);
    },
    [clearDismissTimers, scheduleDismiss]
  );

  useEffect(() => {
    setMounted(true);
    return () => clearDismissTimers();
  }, [clearDismissTimers]);

  const isError = toast?.variant === 'error';

  const toastNode =
    mounted && toast ? (
      <div
        className={[
          'app-toast',
          isError ? 'app-toast--error' : '',
          exiting ? 'app-toast--exiting' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role={isError ? 'alert' : 'status'}
        aria-live={isError ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        <span className="app-toast__message">{toast.message}</span>
        {isError && (
          <span
            className="app-toast__progress"
            style={{ animationDuration: `${toast.durationMs - TOAST_EXIT_MS}ms` }}
            aria-hidden
          />
        )}
      </div>
    ) : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastNode && typeof document !== 'undefined'
        ? createPortal(toastNode, document.body)
        : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: () => {},
    };
  }
  return ctx;
}
