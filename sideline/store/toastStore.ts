"use client";

import { create } from "zustand";

export type ToastType = "success" | "error" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

const MAX_TOASTS = 3;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type) =>
    set((state) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const next = [...state.toasts, { id, message, type }];
      return { toasts: next.slice(-MAX_TOASTS) };
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
