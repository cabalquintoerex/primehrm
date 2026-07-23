import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import type { ModuleKey, ModuleMemory } from '@/lib/modules';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  moduleMemory: ModuleMemory | null;
  /** Slug of the last LGU signed in on this device. Survives logout so the branded login sticks. */
  lastLguSlug: string | null;
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
      lastLguSlug: null,
      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          // Remember the LGU so sign-out and session expiry can return to its branded login.
          ...(user.lgu?.slug ? { lastLguSlug: user.lgu.slug } : {}),
        }),
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      rememberModule: (userId, module) => set({ moduleMemory: { userId, module } }),
      forgetModule: () => set({ moduleMemory: null }),
      // moduleMemory and lastLguSlug deliberately survive logout — both are device preferences,
      // not session state. lastLguSlug is what sends an LGU user back to their own login page.
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'primehrm-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        moduleMemory: state.moduleMemory,
        lastLguSlug: state.lastLguSlug,
      }),
    }
  )
);
