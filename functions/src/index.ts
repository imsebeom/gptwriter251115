import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) initializeApp();

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const OPENAI_MODEL = 'gpt-5-nano';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_CLASS_ID = 'test-class';
const TEST_TEACHER_ID = 'system';
const TEST_TOPIC_ID = 'test-topic';
const TEST_TOPIC_ARGUMENT_ID = 'test-topic-argumentative';

const DEFAULT_GENRES = [
  {
    id: 'genre-explanatory',
    name: '설명하는 글',
    paragraphs: 3,
    additionalPrompt:
      '이 글은 "설명하는 글"입니다. 어떤 대상·현상·개념을 독자가 이해하기 쉽도록 풀어 쓴 글인지 평가해주세요. 관점: (1) 설명 대상이 분명히 드러나는가, (2) 순서가 논리적인가, (3) 예시·비교·정의 같은 설명 방법이 효과적으로 쓰였는가, (4) 의견이나 주장과 섞이지 않고 사실 중심인가.',
  },
  {
    id: 'genre-argument',
    name: '주장하는 글',
    paragraphs: 3,
    additionalPrompt:
      '이 글은 "주장하는 글(논설문)"입니다. 초등 수준에서 평가해주세요. 관점: (1) 주장이 분명한가, (2) 이유와 근거가 주장을 뒷받침하는가, (3) 근거가 구체적인 경험·사실·자료에 기대는가, (4) 마지막에 주장을 다시 강조하며 마무리되는가.',
  },
  {
    id: 'genre-experience',
    name: '경험에서 사실과 느낌을 표현한 글',
    paragraphs: 3,
    additionalPrompt:
      '이 글은 "경험을 바탕으로 사실과 느낌을 표현한 글"입니다. 관점: (1) 어떤 경험인지 사실이 분명한가, (2) 그때의 느낌·생각이 솔직하게 드러나는가, (3) 사실과 느낌이 잘 구분되어 표현되는가, (4) 감각적 표현이 살아 있는가.',
  },
];

// ---------------------------------------------------------------------------
// Prompts (ported verbatim from original js/openai.js / js/firebase.js)
// ---------------------------------------------------------------------------

const DEFAULT_COACHING_PROMPT = `당신은 초등학교 5학년 학생의 'AI 글쓰기 코치'입니다. 친절한 톤을 유지하되, **솔직하고 간결하게** 피드백해주세요.

**중요**: 칭찬할 만한 점이 분명히 있을 때만 칭찬하세요. 없으면 칭찬을 건너뛰어도 됩니다. 억지 칭찬·빈말·과장된 격려는 금지. 내용이 빈약하거나 주제와 맞지 않으면 그렇게 솔직히 말해주세요.

응답 형식:

- (선택) 눈에 띄는 장점이 있으면 한 문장으로 짧게 인정
- 아래 세 항목을 각각 **한두 문장**으로 작성 (절대 길게 쓰지 말 것)
  1. **주제와 내용** — 주제와 얼마나 연결되는가
  2. **생각과 표현** — 생각/느낌이 드러나는가
  3. **더 멋진 글로** — 가장 먼저 고쳐야 할 부분 한 가지
- 마무리: 학생이 스스로 고칠 수 있도록 짧은 질문 1개

전체 응답은 **200자 이내**, 마크다운 형식, 불필요한 서론·장황한 설명 금지.`;

const CHAT_SYSTEM_PROMPT = `당신은 초등학생의 글쓰기 실력을 칭찬하고 격려하며 성장시키는 'AI 글쓰기 코치'입니다. 초등학교 5학년 학생과 대화하고 있습니다. 친절하고 격려하는 톤으로 답변해주세요.`;

const PROGRESS_REPORT_SYSTEM_PROMPT = `당신은 초등학교 5학년 학생의 글쓰기 능력 향상을 분석하는 전문 교육 평가자입니다.
학생이 작성한 여러 글을 시간순으로 분석하여, 글쓰기 능력의 발전 과정을 평가하고 구체적인 피드백을 제공해야 합니다.

분석 시 다음 항목을 포함하여 리포트를 작성해주세요:

1. **전체적인 발전 추이**
   - 초기 글과 최근 글의 비교
   - 글쓰기 능력이 어떻게 향상되었는지 구체적으로 설명

2. **강점 분석**
   - 학생의 글쓰기 강점과 잘 표현한 부분
   - 특히 개선된 부분

3. **개선 영역**
   - 더 발전할 수 있는 부분
   - 구체적인 개선 방안 제시

4. **주제/장르 다양성**
   - 다양한 주제나 장르를 시도했는지
   - 각 주제/장르에서의 표현력 평가

5. **격려와 제안**
   - 학생을 격려하는 메시지
   - 앞으로의 글쓰기 방향 제안

리포트는 교사가 학생에게 전달할 수 있도록, 친절하고 격려하는 톤으로 작성하되, 구체적이고 실용적인 피드백을 제공해주세요.
마크다운 형식으로 작성해주세요.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function loadCoachingPrompt(): Promise<string> {
  try {
    const doc = await getFirestore().doc('settings/coachingPrompt').get();
    const data = doc.data();
    if (data?.content) return data.content as string;
  } catch (err) {
    console.error('loadCoachingPrompt failed', err);
  }
  return DEFAULT_COACHING_PROMPT;
}

async function loadAdditionalPrompt(collection: 'topics' | 'genres', id: string | null): Promise<string | null> {
  if (!id) return null;
  try {
    const snap = await getFirestore().collection(collection).doc(id).get();
    const data = snap.data();
    return (data?.additionalPrompt as string) || null;
  } catch {
    return null;
  }
}

interface AuthedUser {
  uid: string;
  email?: string;
  name?: string;
  isAnonymous: boolean;
}

async function requireAuthUser(req: any): Promise<AuthedUser> {
  const header = (req.headers.authorization || req.headers.Authorization || '') as string;
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) throw new Error('missing bearer token');
  const decoded = await getAuth().verifyIdToken(match[1]);
  return {
    uid: decoded.uid,
    email: decoded.email,
    name: decoded.name,
    isAnonymous: decoded.firebase?.sign_in_provider === 'anonymous',
  };
}

async function callOpenAI(messages: ChatMessage[], maxTokens = 8000): Promise<string> {
  const apiKey = OPENAI_API_KEY.value();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      // gpt-5 family are reasoning models. `max_completion_tokens` covers
      // reasoning + visible output, so pick a generous budget. `minimal`
      // reasoning effort keeps latency/cost down for simple coaching.
      max_completion_tokens: maxTokens,
      reasoning_effort: 'minimal',
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('OpenAI error', res.status, text);
    throw new Error(`OpenAI ${res.status}: ${text}`);
  }
  const data = (await res.json()) as any;
  const content = data.choices?.[0]?.message?.content ?? '';
  const finishReason = data.choices?.[0]?.finish_reason;
  const usage = data.usage;
  if (!content) {
    console.error('OpenAI returned empty content', { finishReason, usage, raw: JSON.stringify(data).slice(0, 800) });
  }
  return content;
}

function setCors(res: any) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ---------------------------------------------------------------------------
// Unified handler mounted under /api/**
// ---------------------------------------------------------------------------

export const api = onRequest(
  { secrets: [OPENAI_API_KEY], cors: true, region: 'us-central1' },
  async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method not allowed' });
      return;
    }

    const path = (req.path || req.url || '').replace(/^\/api/, '').replace(/^\//, '');

    let user: AuthedUser;
    try {
      user = await requireAuthUser(req);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'unauthorized' });
      return;
    }

    try {
      switch (path) {
        case 'coach':
          return await handleCoach(req, res);
        case 'chat':
          return await handleChat(req, res);
        case 'progress-report':
          return await handleProgressReport(req, res);
        case 'join-class':
          return await handleJoinClass(req, res, user);
        case 'seed-test':
          return await handleSeedTest(req, res, user);
        default:
          res.status(404).json({ error: `unknown endpoint: ${path}` });
          return;
      }
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err?.message ?? 'internal error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /api/coach — writing coaching with conversation history
// ---------------------------------------------------------------------------

async function handleCoach(req: any, res: any) {
  const {
    title,
    content,
    topicOrGenre,
    conversationHistory = [],
    topicId = null,
    genreId = null,
    paragraphGoal = 0,
  } = req.body ?? {};
  if (!title || !content) {
    res.status(400).json({ error: 'title and content are required' });
    return;
  }

  let history: ChatMessage[] = Array.isArray(conversationHistory) ? [...conversationHistory] : [];

  if (history.length === 0) {
    let systemPrompt = await loadCoachingPrompt();
    const additional: string[] = [];
    const topicAdd = await loadAdditionalPrompt('topics', topicId);
    if (topicAdd) additional.push(`[주제별 추가 프롬프트]\n${topicAdd}`);
    const genreAdd = await loadAdditionalPrompt('genres', genreId);
    if (genreAdd) additional.push(`[장르별 추가 프롬프트]\n${genreAdd}`);
    if (paragraphGoal && paragraphGoal > 0) {
      additional.push(
        `[문단 요구 수] 이 과제는 ${paragraphGoal}문단으로 써야 합니다. 문단 개수가 맞는지, 각 문단의 역할이 뚜렷한지 간단히 언급해주세요. (현재 제출된 글은 '\\n\\n' 기준으로 문단이 분리되어 있습니다.)`,
      );
    }
    if (additional.length) systemPrompt += '\n\n' + additional.join('\n\n');

    systemPrompt = systemPrompt
      .replace(/\{title\}/g, title)
      .replace(/\{content\}/g, content)
      .replace(/\{topicOrGenre\}/g, topicOrGenre ?? '');

    const userMessage = `이 글은 '${topicOrGenre ?? ''}'라는 주제(혹은 장르)로 쓴 글입니다.
---
제목: ${title}
내용: ${content}
---
이 글을 검토해주세요.`;

    history = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
  } else {
    const userMessage = `제가 글을 수정했습니다. 다시 검토해주세요.
---
제목: ${title}
내용: ${content}
---`;
    history.push({ role: 'user', content: userMessage });
  }

  const answer = await callOpenAI(history, 2000);
  history.push({ role: 'assistant', content: answer });
  res.json({ response: answer, conversationHistory: history });
}

async function handleChat(req: any, res: any) {
  const { message, conversationHistory = [] } = req.body ?? {};
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  let history: ChatMessage[] = Array.isArray(conversationHistory) ? [...conversationHistory] : [];
  if (history.length === 0 || history[0].role !== 'system') {
    history.unshift({ role: 'system', content: CHAT_SYSTEM_PROMPT });
  }
  history.push({ role: 'user', content: message });
  const answer = await callOpenAI(history, 2000);
  history.push({ role: 'assistant', content: answer });
  res.json({ response: answer, conversationHistory: history });
}

async function handleProgressReport(req: any, res: any) {
  const { userName, writings } = req.body ?? {};
  if (!Array.isArray(writings) || writings.length === 0) {
    res.status(400).json({ error: 'writings array required' });
    return;
  }

  const sorted = [...writings].sort((a: any, b: any) => {
    const da = new Date(a.createdAt ?? 0).getTime();
    const db = new Date(b.createdAt ?? 0).getTime();
    return da - db;
  });

  const writingsText = sorted
    .map((w: any, i: number) => {
      const dateStr = w.createdAt ? new Date(w.createdAt).toLocaleDateString('ko-KR') : '';
      return `
[${i + 1}번째 글] 작성일: ${dateStr}
제목: ${w.title}
주제/장르: ${w.topicOrGenre}
내용:
${w.content}
---`;
    })
    .join('\n\n');

  const userMessage = `다음은 '${userName}' 학생이 작성한 ${sorted.length}개의 글입니다. 시간순으로 정렬되어 있으며, 첫 번째 글부터 마지막 글까지의 발전 과정을 분석해주세요.\n\n${writingsText}\n\n위 글들을 분석하여 글쓰기 능력 향상 리포트를 작성해주세요.`;

  const answer = await callOpenAI(
    [
      { role: 'system', content: PROGRESS_REPORT_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    3000,
  );

  res.json({ report: answer });
}

// ---------------------------------------------------------------------------
// POST /api/join-class — student joins a class via invite code
// ---------------------------------------------------------------------------

async function handleJoinClass(req: any, res: any, user: AuthedUser) {
  const { inviteCode } = req.body ?? {};
  if (!inviteCode || typeof inviteCode !== 'string') {
    res.status(400).json({ error: 'inviteCode is required' });
    return;
  }
  if (user.isAnonymous) {
    res.status(400).json({ error: '학생 가입은 Google 로그인이 필요합니다.' });
    return;
  }

  const db = getFirestore();
  const code = inviteCode.trim().toUpperCase();
  const snap = await db.collection('classes').where('inviteCode', '==', code).limit(1).get();
  if (snap.empty) {
    res.status(404).json({ error: '초대코드가 올바르지 않습니다.' });
    return;
  }
  const classDoc = snap.docs[0];
  const classData = classDoc.data();

  await db.doc(`users/${user.uid}`).set(
    {
      name: user.name ?? '학생',
      email: user.email ?? '',
      userType: 'student',
      classId: classDoc.id,
      teacherId: classData.teacherId ?? null,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  res.json({
    ok: true,
    classId: classDoc.id,
    className: classData.name,
    teacherId: classData.teacherId ?? null,
  });
}

// ---------------------------------------------------------------------------
// POST /api/seed-test — idempotent sandbox setup for one-click test users
// ---------------------------------------------------------------------------

async function handleSeedTest(_req: any, res: any, user: AuthedUser) {
  if (!user.isAnonymous) {
    res.status(400).json({ error: '테스트 사용자는 익명 로그인만 가능합니다.' });
    return;
  }
  const db = getFirestore();

  // 1) Ensure the shared test class exists.
  const classRef = db.doc(`classes/${TEST_CLASS_ID}`);
  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    await classRef.set({
      name: '테스트 클래스',
      teacherId: TEST_TEACHER_ID,
      inviteCode: 'TESTCODE',
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // 2) Ensure seeded test topics exist (idempotent).
  const topicRef = db.doc(`topics/${TEST_TOPIC_ID}`);
  const topicSnap = await topicRef.get();
  if (!topicSnap.exists) {
    await topicRef.set({
      name: '테스트 과제: 내가 좋아하는 것 소개하기',
      classId: TEST_CLASS_ID,
      paragraphs: 0,
      additionalPrompt: '',
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const argumentRef = db.doc(`topics/${TEST_TOPIC_ARGUMENT_ID}`);
  const argumentSnap = await argumentRef.get();
  if (!argumentSnap.exists) {
    await argumentRef.set({
      name: '테스트 과제: 3문단 논설문 — 우리 반 규칙 제안',
      classId: TEST_CLASS_ID,
      paragraphs: 3,
      additionalPrompt:
        '이 글은 3문단 논설문입니다. 1문단: 주장, 2문단: 이유와 근거, 3문단: 마무리(다시 주장 강조) 구성으로 평가해주세요.',
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // 2b) Seed the default 3 genres into the test class.
  for (const g of DEFAULT_GENRES) {
    const gRef = db.doc(`genres/${g.id}`);
    const gSnap = await gRef.get();
    if (!gSnap.exists) {
      await gRef.set({
        name: g.name,
        classId: TEST_CLASS_ID,
        paragraphs: g.paragraphs,
        additionalPrompt: g.additionalPrompt,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // 3) Write the test user's profile, auto-joined to the test class.
  await db.doc(`users/${user.uid}`).set(
    {
      name: '테스트 사용자',
      userType: 'test',
      classId: TEST_CLASS_ID,
      teacherId: TEST_TEACHER_ID,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  res.json({ ok: true, classId: TEST_CLASS_ID });
}
