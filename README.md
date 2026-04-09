# GetWriter

초등 5학년 글쓰기 교육용 웹앱. [원본](https://github.com/imsebeom/gptwriter251115)을 현대 스택으로 재구현·확장한 버전입니다.

**라이브**: https://gptwriter-edu.web.app

## 스택

| 영역 | 기술 |
|---|---|
| 프론트 | Vite · React 18 · TypeScript · Tailwind CSS v4 · React Router v6 |
| 백엔드 | Firebase Hosting · Firestore · Firebase Auth · Cloud Functions v2 (Node 20) |
| AI | OpenAI **gpt-5-nano** (Functions 프록시, `reasoning_effort: 'minimal'`) |
| 차트 | Chart.js · react-chartjs-2 (Line, Radar) |
| PDF | jsPDF |
| 아이콘 | Gemini로 생성한 커스텀 PNG 13종 (플랫 네이비 라인) |

## 인증 (3가지)

1. **학생** — Google OAuth → 첫 로그인이면 `/join-class`로 이동해 교사에게 받은 **초대코드** 입력 → `/api/join-class`가 검증 후 프로필 생성
2. **교사** — Google OAuth → 클라이언트에서 `users/{uid}`에 교사 프로필 생성
3. **테스트** — 1클릭 익명 로그인 → `/api/seed-test`가 idempotent하게 **테스트 클래스 + 테스트 과제 + 기본 장르 + 프로필**을 자동 생성해 바로 샌드박스에 진입

> 원본의 이메일/비밀번호 + SHA-256 클라이언트 해싱 방식은 **제거**되었습니다. `sessions` 컬렉션도 함께 삭제.
> 모든 Google 로그인은 `prompt: 'select_account'`로 매번 계정 선택 화면을 띄웁니다.

## 기능

### 학생
- 주제/장르 선택 → 에디터 → AI 코칭 → 저장 → 갤러리 공유
- **문단 수에 따른 에디터 분기**: 교사가 과제에 `paragraphs=3`이면 학생에게 3개의 독립 텍스트 박스가 제공되고 Enter 키가 차단됨 (자동 줄바꿈·가변 높이만 허용). `paragraphs=0`이면 자유 서술(엔터 허용).
- 저장 시 **글의 문법 정확성을 gpt-5-nano가 0~100점으로 채점**해 `writings.grammarScore`에 함께 저장
- AI 코치와 **자유 대화 채팅 UI** (말풍선 스레드, 대화 히스토리 자동 유지)

### 클래스 + 초대코드
- `classes/{id}` — 교사 소유, 8자 초대코드 (혼동 쉬운 I/O/0/1 제외)
- 교사가 **새 클래스 만들면 기본 장르 3종 자동 시딩**:
  - 설명하는 글 (3문단)
  - 주장하는 글 (3문단)
  - 경험에서 사실과 느낌을 표현한 글 (3문단)
- 각 장르에 전용 `additionalPrompt`가 포함되어 AI 코치가 장르 특성에 맞게 평가
- 학생은 자기 `classId`의 주제/장르/writings만 봄, 교사는 자기 소유 모든 클래스의 데이터를 봄

### 갤러리
- Firestore 실시간 구독 (같은 클래스 범위)
- 필터(작가/주제), 정렬(최신/좋아요/댓글) — 이름 필터는 한국어 자연정렬
- 좋아요·댓글 상호작용

### 관리자 (5개 탭)
1. **클래스 관리** — 생성·이름 수정·초대코드 복사/재생성·삭제
2. **주제/장르** — 클래스 선택 후 CRUD, 각 항목에 목표 문단 수·추가 프롬프트 지정
3. **제출 현황** — 학생별 그룹, 개별/전체 포트폴리오 PDF (jsPDF)
4. **학생 리포트** (★이 프로젝트의 하이라이트)
   - **4축 레이더 다이어그램** — 최근 글의 4지표(글 길이·어휘 다양성·평균 문장 길이·**문법 정확성**)를 *클래스 학생들의 개인 최댓값 평균*(=100% 기준)으로 표시. 첫 글을 회색 점선으로 오버레이해 "출발점 vs 현재"를 비교. 100%를 넘으면 또래 평균보다 앞섰음을 의미.
   - **성장 추적 꺾은선 차트** — 4지표를 학생 본인 최댓값 기준 %로 정규화해 시간순으로 겹쳐 표시
   - 지표별 개별 Line 차트 4개
   - "AI 발전 리포트" — gpt-5-nano가 `## / ###` 계층 마크다운 템플릿을 채워 구조화된 보고서 생성
5. **프롬프트** — 기본 코칭 프롬프트 편집 (`settings/coachingPrompt`)

## 원본 대비 주요 개선

| 항목 | 원본 | 재구현 |
|---|---|---|
| AI 모델 | Gemini (클라 키 노출) / OpenAI gpt-4* (클라 키 노출) | **OpenAI gpt-5-nano** (Functions 프록시, 키 미노출) |
| 학생 인증 | 이메일/비번 + 클라이언트 SHA-256 | **Google OAuth + 초대코드** |
| 테스트 사용자 | 이름 입력 후 익명 | **1클릭 자동 샌드박스** (클래스·과제·장르·프로필 자동 생성) |
| 주제/장르 | 전역 컬렉션 | **클래스 스코프** (`classId` 필드) |
| 기본 장르 | 없음 | **3종 자동 시딩** (설명/주장/경험) |
| 문단 제어 | 학생이 선택 (저장만) | **교사가 topic/genre에 지정 → 학생 에디터 UI 분기** |
| 문법 채점 | 없음 | **gpt-5-nano 0~100점 자동 저장** |
| 차트 | 없음에 가까움 | **레이더 + 성장 추적 + 지표별 Line × 4** |
| 아이콘 | 이모지 | **커스텀 PNG 13종** (Gemini 생성, Flat 네이비 라인) |
| Firestore 규칙 | 사실상 무규칙 | **userType/classId 기반 강화**, `diff().hasOnly()` 가드 |
| 법적 페이지 | 없음 | 개인정보 처리방침·이용약관 추가 |

## 디렉터리 구조

```
getwriter/
├── firebase.json / .firebaserc / firestore.rules / firestore.indexes.json
├── package.json / vite.config.ts / index.html / tsconfig*
├── public/icons/          # 13 커스텀 PNG
├── src/
│   ├── main.tsx / App.tsx / index.css
│   ├── routes/            # Login, JoinClass, Write, Gallery, Admin, Privacy, Terms
│   │   └── admin/         # Classes, Submissions, TopicsGenres, PromptEditor, StudentReport
│   ├── components/        # Layout, Icon
│   └── lib/               # firebase, auth, authContext, firestore, classes, coach, pdf, markdown, types
└── functions/
    └── src/index.ts       # POST /api/{coach,chat,progress-report,grammar-score,join-class,seed-test}
```

## Firestore 스키마

### users/{uid}
```
name, email?, userType: 'student'|'teacher'|'test'
classId?, teacherId?, createdAt, lastLoginAt
```

### classes/{id}
```
name, teacherId, inviteCode (8자), createdAt
```

### writings/{id}
```
userId, userName, classId
title, content                    # 문단이 있으면 '\n\n'으로 결합
topicOrGenre, topic?, genre?, topicId?, genreId?, paragraphs?
grammarScore?: number             # 0~100, 저장 시 gpt-5-nano 자동 채점
likes, likedBy[], comments[]
createdAt
```

### topics/{id}, genres/{id}
```
name, classId, paragraphs (0=자유), additionalPrompt?, createdAt
```

### settings/coachingPrompt
```
content: string
```

## 설정 (새 프로젝트에 배포할 때)

### 0. 사전 준비
- Node 20+
- Firebase CLI: `npm install -g firebase-tools`
- **Firebase 요금제: Blaze (종량제) 필수** — Cloud Functions 때문에 Spark로는 배포 불가

### 1. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. **Authentication** 활성화:
   - 익명(Anonymous) 로그인 — 테스트 사용자용
   - Google — 학생/교사 공통
3. **Firestore Database** 생성 (asia-northeast3 권장)
4. 결제 계정 연결(Blaze)

### 2. 프로젝트 ID 연결
`.firebaserc`의 default를 실제 프로젝트 ID로:
```json
{ "projects": { "default": "<YOUR_PROJECT_ID>" } }
```

### 3. 프론트 환경변수
```bash
cp .env.example .env.local
# Firebase 콘솔 → 프로젝트 설정 → 웹 앱 구성값을 채움
```
> `VITE_FIREBASE_API_KEY`는 비밀이 아닙니다(공개 식별자). 진짜 비밀은 OpenAI 키.

### 4. OpenAI 키 등록 (Functions Secret)
```bash
firebase functions:secrets:set OPENAI_API_KEY
# sk-proj-... 붙여넣기
```
모델은 `functions/src/index.ts`에 `gpt-5-nano`로 하드코딩되어 있습니다.

### 5. 의존성 설치
```bash
npm install
cd functions && npm install && cd ..
```

### 6. Cloud Run 공개 호출 허용 (최초 1회)
신규 GCP 프로젝트는 Cloud Run 함수를 기본적으로 비공개로 배포합니다. Hosting rewrite에서 프록시하려면 `allUsers`에 `run.invoker` 권한 필요:
```bash
gcloud run services add-iam-policy-binding api \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --project=<YOUR_PROJECT_ID>
```

### 7. (최초 1회만) Cloud Build 서비스 계정 권한
```bash
gcloud projects add-iam-policy-binding <YOUR_PROJECT_ID> \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder" \
  --condition=None
```

## 로컬 개발

```bash
# 에뮬레이터 전체 스택
firebase emulators:start

# 별도 터미널
VITE_USE_EMULATORS=1 npm run dev
```
포트: Auth 9099, Firestore 8080, Functions 5001, Hosting 5000, UI 4000.
브라우저: http://localhost:5173. Vite가 `/api/**`를 Functions 에뮬레이터로 프록시.

## 배포

```bash
npm run build
firebase deploy
```
전체(Hosting + Firestore 규칙/인덱스 + Functions)가 한 번에 올라갑니다.

일부만:
```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules,firestore:indexes
```

## Functions API

모두 Firebase Auth ID 토큰(`Authorization: Bearer ...`) 필요.

| 엔드포인트 | 용도 |
|---|---|
| `POST /api/coach` | AI 글쓰기 코칭 (대화 히스토리 유지) |
| `POST /api/chat` | 같은 스레드에서 코치와 자유 대화 |
| `POST /api/progress-report` | 학생의 모든 글을 시간순 분석한 마크다운 보고서 |
| `POST /api/grammar-score` | 글 본문의 문법 정확성 0~100점 채점 |
| `POST /api/join-class` | 초대코드로 학생을 클래스에 가입 + 프로필 생성 |
| `POST /api/seed-test` | 테스트 사용자 샌드박스 자동 생성 (idempotent) |

## 보안 메모

- **OpenAI 키는 Functions secret에만 저장**, 클라이언트 번들에 절대 포함되지 않음
- Hosting rewrite `/api/**` → Cloud Run 함수 `api` 하나로 모든 API 라우팅
- Functions는 모든 요청에서 Firebase Auth ID 토큰 검증
- Firestore 규칙:
  - `users/{uid}` — 본인만 write (읽기는 모든 인증 사용자 — 작가 이름 조회 등에 필요)
  - `classes/{id}` — 소유 교사만 write, 가입 학생/교사/테스트만 read
  - `writings/{id}` — 본인만 풀 edit, 타인은 `likes/likedBy/comments`만 수정 가능 (`diff().hasOnly()` 가드)
  - `topics/genres/{id}` — 해당 클래스 소유 교사만 write
  - `settings/{doc}` — 관리자(교사/테스트)만 write
- 원본 저장소의 SHA-256 비밀번호 방식은 **완전히 제거**되었으며, 취약한 클라이언트 해싱이 남아있지 않습니다.

## 알려진 제약

- jsPDF 기본 폰트는 한글 글리프가 제한적이라 포트폴리오 PDF에서 일부 글자가 깨질 수 있음. 필요 시 Noto Sans KR 폰트 임베딩 예정.
- Firestore 오프라인 캐시는 로그아웃 후에도 잔존 (보안 영향 없음, UI만 잠깐 stale할 수 있음).
- 번들이 ~1.2MB로 커서 초기 로드 시간이 다소 있음. vendor chunk 분할로 개선 가능.

## 라이선스

교육 목적으로 자유롭게 사용하세요.
