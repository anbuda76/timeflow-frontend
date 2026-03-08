import { create } from 'zustand';
import { getUser, isAuthenticated } from '../api/auth';

const useAuthStore = create((set) => ({
  user: (() => { try { return getUser(); } catch { return null; } })(),
  authenticated: (() => { try { return isAuthenticated(); } catch { return false; } })(),

  setUser: (user) => set({ user, authenticated: true }),
  clearUser: () => set({ user: null, authenticated: false }),
}));

export default useAuthStore;