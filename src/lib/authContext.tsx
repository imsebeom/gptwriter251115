import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';
import { loadProfile } from './auth';
import type { UserProfile } from './types';

type AuthCtx = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  /** Refresh the Firestore-backed profile (call after join/seed). */
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  profile: null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrate = async (u: User | null) => {
    if (!u) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const p = await loadProfile(u.uid);
    setProfile(p);
    setLoading(false);
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(true);
      await hydrate(u);
    });
  }, []);

  const refresh = async () => {
    if (!auth.currentUser) return;
    await hydrate(auth.currentUser);
  };

  return <Ctx.Provider value={{ user, profile, loading, refresh }}>{children}</Ctx.Provider>;
}

export function useAuthCtx() {
  return useContext(Ctx);
}
