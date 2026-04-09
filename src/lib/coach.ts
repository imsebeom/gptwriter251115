import { auth } from './firebase';
import type { ChatMessage, Writing } from './types';

async function idToken(): Promise<string> {
  const u = auth.currentUser;
  if (!u) throw new Error('로그인이 필요합니다.');
  return u.getIdToken();
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const token = await idToken();
  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export interface CoachResponse {
  response: string;
  conversationHistory: ChatMessage[];
}

export async function requestCoaching(args: {
  title: string;
  content: string;
  topicOrGenre: string;
  conversationHistory?: ChatMessage[];
  topicId?: string | null;
  genreId?: string | null;
  paragraphGoal?: number;
}): Promise<CoachResponse> {
  return postJson<CoachResponse>('coach', args);
}

export async function sendChatMessage(message: string, history: ChatMessage[] = []): Promise<CoachResponse> {
  return postJson<CoachResponse>('chat', { message, conversationHistory: history });
}

export async function requestProgressReport(userName: string, writings: Writing[]): Promise<string> {
  const payload = writings.map((w) => ({
    title: w.title,
    content: w.content,
    topicOrGenre: w.topicOrGenre,
    createdAt: (w.createdAt as any)?.toDate?.()?.toISOString?.() ?? null,
  }));
  const { report } = await postJson<{ report: string }>('progress-report', { userName, writings: payload });
  return report;
}
