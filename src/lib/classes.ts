import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ClassRoom } from './types';

/**
 * Default genres auto-seeded into every new class. Teachers can edit or
 * delete any of them afterwards. Prompts are injected as
 * `additionalPrompt` so the AI coach receives genre-specific guidance.
 */
export const DEFAULT_GENRE_SEEDS: Array<{ name: string; paragraphs: number; additionalPrompt: string }> = [
  {
    name: '설명하는 글',
    paragraphs: 3,
    additionalPrompt:
      '이 글은 "설명하는 글"입니다. 어떤 대상·현상·개념을 독자가 이해하기 쉽도록 풀어 쓴 글인지 평가해주세요. 관점: (1) 설명 대상이 분명히 드러나는가, (2) 순서(시간·공간·원인-결과 등)가 논리적인가, (3) 예시·비교·정의 같은 설명 방법이 효과적으로 쓰였는가, (4) 의견이나 주장과 섞이지 않고 사실 중심인가.',
  },
  {
    name: '주장하는 글',
    paragraphs: 3,
    additionalPrompt:
      '이 글은 "주장하는 글(논설문)"입니다. 초등 수준에서 평가해주세요. 관점: (1) 주장이 분명한가, (2) 이유와 근거가 주장을 뒷받침하는가, (3) 근거가 구체적인 경험·사실·자료에 기대는가, (4) 마지막에 주장을 다시 강조하며 마무리되는가. 너무 감정적이거나 근거 없이 우기는 부분이 있으면 짚어주세요.',
  },
  {
    name: '경험에서 사실과 느낌을 표현한 글',
    paragraphs: 3,
    additionalPrompt:
      '이 글은 "경험을 바탕으로 사실과 느낌을 표현한 글"입니다. 관점: (1) 어떤 경험인지 사실(언제·어디서·누구와·무엇을)이 분명한가, (2) 그때의 느낌·생각이 솔직하게 드러나는가, (3) 사실과 느낌이 잘 구분되어 표현되는가, (4) 감각적 표현(보고·듣고·느낀 것)이 살아 있는가. 사실만 있고 느낌이 없거나, 느낌만 있고 사실이 없으면 지적해주세요.',
  },
];

async function seedDefaultGenres(classId: string): Promise<void> {
  const batch = writeBatch(db);
  for (const g of DEFAULT_GENRE_SEEDS) {
    const ref = doc(collection(db, 'genres'));
    batch.set(ref, {
      name: g.name,
      classId,
      paragraphs: g.paragraphs,
      additionalPrompt: g.additionalPrompt,
      createdAt: serverTimestamp(),
    });
  }
  await batch.commit();
}

// 혼동을 줄이기 위해 I, O, 0, 1 제외.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(length = 8): string {
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[arr[i] % CODE_ALPHABET.length];
  return out;
}

export function subscribeTeacherClasses(teacherId: string, cb: (items: ClassRoom[]) => void): Unsubscribe {
  const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClassRoom, 'id'>) })));
  });
}

export async function listTeacherClasses(teacherId: string): Promise<ClassRoom[]> {
  const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ClassRoom, 'id'>) }));
}

export async function createClass(teacherId: string, name: string): Promise<ClassRoom> {
  const inviteCode = generateInviteCode();
  const ref = await addDoc(collection(db, 'classes'), {
    name,
    teacherId,
    inviteCode,
    createdAt: serverTimestamp(),
  });
  // Seed the three default genres. Best-effort — a failure here shouldn't
  // block class creation.
  try {
    await seedDefaultGenres(ref.id);
  } catch (err) {
    console.warn('기본 장르 시딩 실패', err);
  }
  return { id: ref.id, name, teacherId, inviteCode };
}

export async function deleteClass(classId: string) {
  await deleteDoc(doc(db, 'classes', classId));
}

export async function regenerateInviteCode(classId: string): Promise<string> {
  const code = generateInviteCode();
  await updateDoc(doc(db, 'classes', classId), { inviteCode: code });
  return code;
}

export async function renameClass(classId: string, name: string) {
  await updateDoc(doc(db, 'classes', classId), { name });
}
