# GetWriter

초등 5학년 글쓰기 교육용 웹앱. [imsebeom/gptwriter251115](https://github.com/imsebeom/gptwriter251115)를 현대 스택으로 재구현한 버전입니다.

## 스택

| 영역 | 기술 |
|---|---|
| 프론트 | Vite · React 18 · TypeScript · Tailwind CSS v4 · React Router v6 |
| 백엔드 | Firebase Hosting · Firestore · Firebase Auth · Cloud Functions (Node 20) |
| AI | OpenAI **gpt-5-mini** (Functions 프록시 — 키가 클라이언트에 노출되지 않음) |
| 차트/PDF | Chart.js · react-chartjs-2 · jsPDF |

## 원본 대비 개선점

- **API 키 노출 제거**: 원본은 Gemini 키를 `firebase-config.js`에 박아 클라이언트 번들에 포함시켰습니다. 이 재구현은 OpenAI 키를 Firebase Functions의 secret으로만 보관하고 Hosting rewrite(`/api/**`)로 프록시합니다. 클라이언트는 Firebase Auth ID 토큰만 보냅니다.
- **TypeScript**: Firestore 문서 타입을 정리해 스키마 드리프트를 줄였습니다.
- **번들 Tailwind**: 원본의 Tailwind CDN을 빌드 파이프라인으로 전환.
- **라우터 기반 네비게이션**: 해시/탭 하이재킹 대신 React Router.

## 기능 (1:1 포팅)

- 3가지 인증: 학생(이메일/비번, SHA-256 — 원본과 동일한 취약 방식), 교사(Google OAuth), 테스트(익명 + 이름)
- 주제/장르 선택 → 문단 수 선택 → 제목/내용 작성 → AI 코칭 → 갤러리 저장
- 갤러리: Firestore 실시간 구독, 필터(작가/주제), 정렬(최신/좋아요/댓글), 좋아요/댓글
- 관리자 5개 탭: 제출 현황·PDF / 주제·장르 CRUD + 추가 프롬프트 / 기본 코칭 프롬프트 편집 / 학생 리포트(Chart.js 4 그래프 + AI 발전 리포트) / 회원 관리(테스트 사용자 전용)

## 디렉터리 구조

```
getwriter/
├── firebase.json           # hosting + functions + firestore
├── .firebaserc
├── firestore.rules
├── firestore.indexes.json
├── package.json            # Vite + React 앱
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx / App.tsx
│   ├── routes/             # Login, Write, Gallery, Admin(+5 sub-tabs)
│   ├── components/Layout.tsx
│   └── lib/                # firebase, auth, authContext, firestore, coach, pdf, markdown, types
├── functions/              # Cloud Functions (OpenAI 프록시)
│   └── src/index.ts        # POST /api/{coach,chat,progress-report}
└── _reference/original/    # 원본 저장소 (참고용, gitignored)
```

## 설정

### 0. 사전 준비

- Node 20+
- Firebase CLI: `npm install -g firebase-tools`
- **Firebase 요금제: Blaze (종량제)** — Cloud Functions가 필요합니다.

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. **Authentication** 활성화:
   - 익명 로그인
   - Google 로그인 (교사용)
3. **Firestore Database** 생성 (프로덕션 모드)
4. **Functions** 활성화

### 2. 프로젝트 ID 연결

`.firebaserc`의 `getwriter-new`를 실제 프로젝트 ID로 교체:

```json
{
  "projects": { "default": "<YOUR_PROJECT_ID>" }
}
```

### 3. 프론트 환경변수

`.env.example`을 `.env.local`로 복사하고 Firebase 콘솔 → 프로젝트 설정 → 웹 앱에서 받은 값을 채웁니다:

```bash
cp .env.example .env.local
```

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
# 로컬 에뮬레이터 사용 시
VITE_USE_EMULATORS=1
```

> ⚠️ Firebase 웹 `apiKey`는 비밀이 아닙니다 — 공개 도메인 식별자입니다. 진짜 비밀은 OpenAI 키이며, 이는 Functions secret에만 저장됩니다.

### 4. OpenAI 키 등록 (Functions Secret)

```bash
firebase functions:secrets:set OPENAI_API_KEY
# 프롬프트가 뜨면 sk-proj-... 값을 붙여넣기
```

모델은 코드에 `gpt-5-mini`로 하드코딩되어 있습니다(`functions/src/index.ts`).

### 5. 의존성 설치

```bash
npm install
cd functions && npm install && cd ..
```

## 로컬 개발

### 에뮬레이터로 전 스택 실행

```bash
firebase emulators:start
```

열리는 포트: Auth 9099, Firestore 8080, Functions 5001, Hosting 5000, UI 4000

별도 터미널에서 Vite dev 서버:

```bash
VITE_USE_EMULATORS=1 npm run dev
```

브라우저: http://localhost:5173
- Vite가 `/api/**` 요청을 Functions 에뮬레이터(`127.0.0.1:5001/<project>/us-central1/api`)로 프록시합니다.

### 프로덕션 빌드

```bash
npm run build          # dist/ 출력
cd functions && npm run build && cd ..
```

## 배포

```bash
npm run build
firebase deploy
```

최초 배포 후 Hosting URL(`https://<project>.web.app`)에 접속해 동작을 확인하세요.

## Firestore 스키마

### users/{uid}
```
name: string
email?: string
passwordHash?: string          # 학생만, SHA-256 (원본 방식 유지)
userType: 'student'|'teacher'|'test'
teacherId?: string             # 학생만
createdAt, lastLoginAt: Timestamp
```

### writings/{id}
```
userId, userName: string
title, content: string
topicOrGenre: string
topic?, genre?: string
topicId?, genreId?: string
paragraphs?: number
likes: number
likedBy: string[]
comments: { userId, userName, text, createdAt }[]
createdAt: Timestamp
```

### topics/{id}, genres/{id}
```
name: string
additionalPrompt?: string       # 이 항목 전용 추가 시스템 프롬프트
createdAt: Timestamp
```

### settings/coachingPrompt
```
content: string                 # 기본 AI 코칭 시스템 프롬프트 (관리자 편집 가능)
```

### sessions/{anonUid}
```
studentDocId: string            # 학생 로그인 시 익명 세션→학생 문서 매핑
createdAt: Timestamp
```

## 보안 주의사항

- **학생 비밀번호 해싱**이 클라이언트 사이드(SHA-256)에서만 이루어지는 원본 방식을 그대로 유지했습니다. 전송은 TLS로만 보호됩니다. 실제 교실에서 쓰기 전 Firebase Auth 이메일/비밀번호 공급자로 마이그레이션하는 것을 권장합니다.
- OpenAI 키는 Functions secret에만 저장합니다. 클라이언트 코드에 절대 넣지 마세요.
- `firestore.rules`가 관리자(교사/테스트) 권한을 강제합니다. 첫 교사는 Google 로그인 즉시 스스로 `users/{uid}`를 생성하므로 별도 부트스트랩이 필요하지 않습니다. 테스트 계정(`userType: 'test'`)이 필요하면 로그인 탭의 "테스트"로 한 번 들어갔다가 Firestore에서 해당 문서의 `userType`을 확인/수정하면 됩니다.
- Functions의 모든 엔드포인트는 Firebase Auth ID 토큰을 검증합니다.

## 원본과의 기능 차이 요약

| 항목 | 원본 | 재구현 |
|---|---|---|
| 스택 | Vanilla JS / CDN Tailwind | Vite + React + TS + 번들 Tailwind |
| AI | Gemini (클라 키 노출) / OpenAI gpt-4* (클라 키 노출) | **OpenAI gpt-5-mini** (Functions 프록시) |
| AI 프롬프트 | 코드에 하드코딩 + `settings/coachingPrompt` | 동일 방식 유지 (프롬프트 원문 포팅) |
| 대화 히스토리 | 클라이언트 메모리에 보관 | 동일 |
| Chart.js 리포트 | 있음 | 있음 (react-chartjs-2) |
| PDF 포트폴리오 | jsPDF 2.5.1 (CDN) | jsPDF 2.5.x (npm) |
| 권한 | Firestore 규칙 없음에 가까움 | 규칙 강화 (userType 기반) |

## 라이선스

교육 목적으로 자유롭게 사용하세요.
