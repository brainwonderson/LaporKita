'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast() {
  const { toast, hideToast } = useAuth();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      hideToast();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div className="toast-container">
      <div
        className="toast-box"
        style={{
          borderLeft: `4px solid ${
            toast.type === 'success'
              ? 'var(--success-solid)'
              : toast.type === 'error'
              ? 'var(--danger-solid)'
              : 'var(--info-solid)'
          }`,
        }}
      >
        <div style={{ marginTop: 2 }}>
          {toast.type === 'success' && <CheckCircle2 size={20} color="var(--success-solid)" />}
          {toast.type === 'error' && <AlertCircle size={20} color="var(--danger-solid)" />}
          {toast.type === 'info' && <Info size={20} color="var(--info-solid)" />}
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            {toast.title}
          </h4>
          <p style={{ fontSize: '0.8125rem', color: 'var(--slate-600)', marginTop: 2 }}>
            {toast.message}
          </p>
        </div>
        <button
          onClick={hideToast}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--slate-400)',
            cursor: 'pointer',
            padding: 2,
          }}
          aria-label="Tutup notifikasi"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
