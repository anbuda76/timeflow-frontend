import { create } from 'zustand';
import { getUser, isAuthenticated } from '../api/auth';

const useAuthStore = create((set) => ({
  user: getUser(),
  authenticated: isAuthenticated(),

  setUser: (user) => set({ user, authenticated: true }),
  clearUser: () => set({ user: null, authenticated: false }),
}));

export default useAuthStore;