import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import type { Comment, Genre, Topic, UserProfile, Writing } from './types';

// ---------------------------------------------------------------------------
// Topics & Genres (class-scoped)
// ---------------------------------------------------------------------------

export function subscribeTopics(classId: string, cb: (items: Topic[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'topics'), where('classId', '==', classId)),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Topic, 'id'>) }));
      list.sort((a, b) => ((a.createdAt as any)?.toMillis?.() ?? 0) - ((b.createdAt as any)?.toMillis?.() ?? 0));
      cb(list);
    },
  );
}

export function subscribeGenres(classId: string, cb: (items: Genre[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'genres'), where('classId', '==', classId)),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Genre, 'id'>) }));
      list.sort((a, b) => ((a.createdAt as any)?.toMillis?.() ?? 0) - ((b.createdAt as any)?.toMillis?.() ?? 0));
      cb(list);
    },
  );
}

export async function addTopic(classId: string, name: string, paragraphs = 0) {
  return addDoc(collection(db, 'topics'), {
    name,
    classId,
    paragraphs,
    additionalPrompt: '',
    createdAt: serverTimestamp(),
  });
}
export async function addGenre(classId: string, name: string, paragraphs = 0) {
  return addDoc(collection(db, 'genres'), {
    name,
    classId,
    paragraphs,
    additionalPrompt: '',
    createdAt: serverTimestamp(),
  });
}
export async function removeTopic(id: string) {
  return deleteDoc(doc(db, 'topics', id));
}
export async function removeGenre(id: string) {
  return deleteDoc(doc(db, 'genres', id));
}
export async function updateTopicPrompt(id: string, additionalPrompt: string) {
  return updateDoc(doc(db, 'topics', id), { additionalPrompt });
}
export async function updateGenrePrompt(id: string, additionalPrompt: string) {
  return updateDoc(doc(db, 'genres', id), { additionalPrompt });
}
export async function updateTopicParagraphs(id: string, paragraphs: number) {
  return updateDoc(doc(db, 'topics', id), { paragraphs });
}
export async function updateGenreParagraphs(id: string, paragraphs: number) {
  return updateDoc(doc(db, 'genres', id), { paragraphs });
}

// ---------------------------------------------------------------------------
// Writings
// ---------------------------------------------------------------------------

export function subscribeWritings(classId: string, cb: (items: Writing[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'writings'), where('classId', '==', classId)),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Writing, 'id'>) }));
      list.sort((a, b) => ((b.createdAt as any)?.toMillis?.() ?? 0) - ((a.createdAt as any)?.toMillis?.() ?? 0));
      cb(list);
    },
  );
}

export function subscribeWritingsByClasses(classIds: string[], cb: (items: Writing[]) => void): Unsubscribe {
  if (classIds.length === 0) {
    cb([]);
    return () => {};
  }
  // Firestore `in` supports up to 30 values.
  const q = query(collection(db, 'writings'), where('classId', 'in', classIds.slice(0, 30)));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Writing, 'id'>) }));
    list.sort((a, b) => ((b.createdAt as any)?.toMillis?.() ?? 0) - ((a.createdAt as any)?.toMillis?.() ?? 0));
    cb(list);
  });
}

export async function saveWriting(data: Omit<Writing, 'id' | 'createdAt' | 'likes' | 'comments'> & { createdAt?: Timestamp }) {
  return addDoc(collection(db, 'writings'), {
    ...data,
    createdAt: serverTimestamp(),
    likes: 0,
    likedBy: [],
    comments: [],
  });
}

export async function toggleLike(writingId: string, userId: string) {
  const ref = doc(db, 'writings', writingId);
  const snap = await getDoc(ref);
  const likedBy = (snap.data()?.likedBy as string[]) ?? [];
  if (likedBy.includes(userId)) {
    await updateDoc(ref, { likedBy: arrayRemove(userId), likes: increment(-1) });
  } else {
    await updateDoc(ref, { likedBy: arrayUnion(userId), likes: increment(1) });
  }
}

export async function addComment(writingId: string, comment: Omit<Comment, 'createdAt'>) {
  const ref = doc(db, 'writings', writingId);
  await updateDoc(ref, {
    comments: arrayUnion({ ...comment, createdAt: new Date() }),
  });
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function listStudentsInClass(classId: string): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('classId', '==', classId)));
  return snap.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id }));
}

export async function listStudentsForTeacher(teacherId: string): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, 'users'), where('teacherId', '==', teacherId)));
  return snap.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id }));
}

// ---------------------------------------------------------------------------
// Settings (coaching prompt)
// ---------------------------------------------------------------------------

export const DEFAULT_COACHING_PROMPT = `당신은 초등학교 5학년 학생의 'AI 글쓰기 코치'입니다. 친절한 톤을 유지하되, **솔직하고 간결하게** 피드백해주세요.

**중요**: 칭찬할 만한 점이 분명히 있을 때만 칭찬하세요. 없으면 칭찬을 건너뛰어도 됩니다. 억지 칭찬·빈말·과장된 격려는 금지. 내용이 빈약하거나 주제와 맞지 않으면 그렇게 솔직히 말해주세요.

응답 형식:

- (선택) 눈에 띄는 장점이 있으면 한 문장으로 짧게 인정
- 아래 세 항목을 각각 **한두 문장**으로 작성 (절대 길게 쓰지 말 것)
  1. **주제와 내용** — 주제와 얼마나 연결되는가
  2. **생각과 표현** — 생각/느낌이 드러나는가
  3. **더 멋진 글로** — 가장 먼저 고쳐야 할 부분 한 가지
- 마무리: 학생이 스스로 고칠 수 있도록 짧은 질문 1개

전체 응답은 **200자 이내**, 마크다운 형식, 불필요한 서론·장황한 설명 금지.`;

export async function getCoachingPrompt(): Promise<string> {
  const snap = await getDoc(doc(db, 'settings', 'coachingPrompt'));
  return (snap.data()?.content as string) ?? DEFAULT_COACHING_PROMPT;
}

export async function saveCoachingPrompt(content: string) {
  await setDoc(doc(db, 'settings', 'coachingPrompt'), { content });
}

// ---------------------------------------------------------------------------
// React hooks
// ---------------------------------------------------------------------------

export function useCollection<T>(subscribe: (cb: (items: T[]) => void) => Unsubscribe): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => subscribe(setItems), [subscribe]);
  return items;
}
