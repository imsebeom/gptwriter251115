import {
  GoogleAuthProvider,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { UserProfile } from './types';

export async function signOutCurrent() {
  await signOut(auth);
  // Our app only persists state in Firebase Auth (IndexedDB) and Firestore's
  // offline cache, both of which are account-agnostic after signOut. Wipe any
  // stray localStorage entries just in case a future feature starts using it.
  try {
    const keysToStrip: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('getwriter:')) keysToStrip.push(k);
    }
    keysToStrip.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Private-browsing mode or storage disabled — ignore.
  }
}

// ---------------- Google sign-in (students + teachers) ---------------------

/**
 * Pops a Google OAuth window. Does NOT create a user document — callers are
 * expected to look up `users/{uid}` afterwards:
 *  - teachers: if missing, call `ensureTeacherProfile`.
 *  - students: if missing, redirect to the invite-code screen.
 */
export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  // Force the Google account chooser every time so a second user on the same
  // machine (or the same user switching identities) always sees a picker
  // instead of being auto-logged in as whoever signed in last.
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(auth, provider);
}

export async function ensureTeacherProfile(): Promise<UserProfile> {
  const u = auth.currentUser;
  if (!u) throw new Error('로그인이 필요합니다.');
  const ref = doc(db, 'users', u.uid);
  const snap = await getDoc(ref);
  const existing = snap.exists() ? (snap.data() as UserProfile) : null;

  if (existing && existing.userType === 'student') {
    throw new Error('이 계정은 이미 학생으로 가입되어 있습니다.');
  }

  const profile: UserProfile = {
    uid: u.uid,
    name: u.displayName ?? '교사',
    email: u.email ?? '',
    userType: 'teacher',
  };
  await setDoc(
    ref,
    {
      name: profile.name,
      email: profile.email,
      userType: 'teacher',
      createdAt: existing?.createdAt ?? serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    },
    { merge: true },
  );
  return profile;
}

// ---------------- Test user (one-click anonymous sandbox) ------------------

export async function loginAsTest(): Promise<void> {
  await signInAnonymously(auth);
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('anonymous token missing');
  const res = await fetch('/api/seed-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: '{}',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`테스트 준비 실패: ${text || res.statusText}`);
  }
}

// ---------------- Join class (student first-time) --------------------------

export async function joinClass(inviteCode: string): Promise<{ classId: string; className: string }> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const res = await fetch('/api/join-class', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ inviteCode }),
  });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(data?.error ?? `가입 실패 (${res.status})`);
  }
  return { classId: data.classId, className: data.className };
}

// ---------------- Profile hydration ----------------------------------------

export async function loadProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { ...(snap.data() as UserProfile), uid };
}
