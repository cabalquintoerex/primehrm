import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import type { ModuleKey, ModuleMemory } from '@/lib/modules';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  moduleMemory: ModuleMemory | null;
  setAuth: (user: User, token: string) => void;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  rememberModule: (userId: number, module: ModuleKey) => void;
  forgetModule: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      moduleMemory: null,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      rememberModule: (userId, module) => set({ moduleMemory: { userId, module } }),
      forgetModule: () => set({ moduleMemory: null }),
      // moduleMemory deliberately survives logout — it is a device preference, not session state.
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'primehrm-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        moduleMemory: state.moduleMemory,
      }),
    }
  )
);
