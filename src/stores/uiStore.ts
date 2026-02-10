import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
}

interface UIStore {
  // State
  isConnectModalOpen: boolean;
  isMobileMenuOpen: boolean;
  toasts: Toast[];

  // Actions
  openConnectModal: () => void;
  closeConnectModal: () => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  isConnectModalOpen: false,
  isMobileMenuOpen: false,
  toasts: [],

  // Actions
  openConnectModal: () =>
    set({ isConnectModalOpen: true }),

  closeConnectModal: () =>
    set({ isConnectModalOpen: false }),

  toggleMobileMenu: () =>
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

  closeMobileMenu: () =>
    set({ isMobileMenuOpen: false }),

  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () =>
    set({ toasts: [] }),
}));
