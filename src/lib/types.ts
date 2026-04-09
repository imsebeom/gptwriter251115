import type { Timestamp } from 'firebase/firestore';

export type UserType = 'student' | 'teacher' | 'test';

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  userType: UserType;
  classId?: string | null;
  teacherId?: string | null;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface ClassRoom {
  id: string;
  name: string;
  teacherId: string;
  inviteCode: string;
  createdAt?: Timestamp;
}

export interface Topic {
  id: string;
  name: string;
  classId: string;
  /** 목표 문단 수. 0 또는 미설정이면 제한 없음(자유 서술, 엔터 허용). */
  paragraphs?: number;
  additionalPrompt?: string;
  createdAt?: Timestamp;
}

export interface Genre {
  id: string;
  name: string;
  classId: string;
  /** 목표 문단 수. 0 또는 미설정이면 제한 없음(자유 서술, 엔터 허용). */
  paragraphs?: number;
  additionalPrompt?: string;
  createdAt?: Timestamp;
}

export interface Comment {
  userId: string;
  userName: string;
  text: string;
  createdAt: Timestamp | Date;
}

export interface Writing {
  id: string;
  userId: string;
  userName: string;
  classId: string;
  title: string;
  content: string;
  topicOrGenre: string;
  topic?: string | null;
  genre?: string | null;
  topicId?: string | null;
  genreId?: string | null;
  paragraphs?: number;
  likes: number;
  likedBy?: string[];
  comments?: Comment[];
  createdAt: Timestamp;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Sentinel identifiers used by the test-user sandbox.
export const TEST_CLASS_ID = 'test-class';
export const TEST_TEACHER_ID = 'system';
