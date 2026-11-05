import { createContext, useContext, useState, useCallback } from 'react';
import Ico from '../components/Ico';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const success = useCallback((msg, duration) => show(msg, 'success', duration), [show]);
  const error = useCallback((msg, duration) => show(msg, 'error', duration || 5000), [show]);
  const info = useCallback((msg, duration) => show(msg, 'info', duration), [show]);
  const warning = useCallback((msg, duration) => show(msg, 'warning', duration), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error, info, warning, dismiss }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            onClick={() => dismiss(t.id)}
          >
            <span className="toast-icon">
              {t.type === 'success' && <Ico e="✅" />}
              {t.type === 'error' && <Ico e="⚠" />}
              {t.type === 'info' && <Ico e="ℹ" />}
              {t.type === 'warning' && <Ico e="⚠️" />}
            </span>
            <span className="toast-message">{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)}><Ico e="✕" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
