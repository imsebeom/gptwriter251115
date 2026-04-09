# GetWriter

초등 5학년 글쓰기 교육용 웹앱. 학생이 주제/장르에 맞춰 글을 쓰고 AI 글쓰기 코치의 피드백을 받아 실력을 키우며, 교사는 클래스별로 과제·피드백·학생 성장 데이터를 관리합니다.

## 스택

| 영역 | 기술 |
|---|---|
| 프론트 | Vite · React 18 · TypeScript · Tailwind CSS v4 · React Router v6 |
| 백엔드 | Firebase Hosting · Firestore · Firebase Auth · Cloud Functions v2 (Node 20) |
| AI | OpenAI **gpt-5-nano** (Functions 프록시, `reasoning_effort: 'minimal'`) |
| 차트 | Chart.js · react-chartjs-2 (Line, Radar) |
| PDF | jsPDF |
| 아이콘 | 커스텀 PNG 13종 (플랫 네이비 라인 스타일) |

## 인증 (3가지)

1. **학생** — Google OAuth → 첫 로그인이면 초대코드 입력 화면으로 이동 → 교사에게 받은 클래스 초대코드를 검증받아 프로필 생성
2. **교사** — Google OAuth → `users/{uid}`에 교사 프로필 자동 생성, 관리자 페이지 접근
3. **테스트** — 1클릭 익명 로그인 → 서버가 idempotent하게 **테스트 클래스 + 테스트 과제 + 기본 장르 + 프로필**을 자동 생성해 바로 샌드박스에 진입

모든 Google 로그인은 `prompt: 'select_account'`로 매번 계정 선택 화면을 띄워 다계정 전환이 쉽습니다.

## 기능

### 학생
- **주제/장르 선택** → 에디터 → AI 코칭 → 저장 → 갤러리 공유
- **문단 수에 따른 에디터 UI 분기**
  - 교사가 과제의 `paragraphs`를 N으로 지정하면 학생 화면에 **N개의 독립 텍스트박스**가 제공되고 **Enter 키가 차단**됩니다. 자동 줄바꿈(soft wrap)과 콘텐츠에 따른 가변 높이(최소 3줄)만 허용.
  - `paragraphs=0`이면 단일 textarea로 자유 서술(Enter 허용).
- **문법 자동 채점** — 저장 시 gpt-5-nano가 글 본문의 문법·맞춤법·띄어쓰기·조사·시제·문장 완결성을 0~100점으로 채점해 `writings.grammarScore`에 저장. 내용·창의성은 평가 대상이 아닙니다.
- **AI 코치 자유 대화** — 첫 코칭 후 오른쪽 패널이 말풍선 스레드로 전환되어 학생이 코치에게 자유롭게 후속 질문할 수 있습니다. 대화 히스토리가 자동 유지되고, "대화 초기화" 버튼으로 새로 시작 가능.

### 갤러리
- 같은 클래스 범위에서 Firestore 실시간 구독
- 필터(작가, 주제/장르) · 정렬(최신/좋아요/댓글)
- 이름 필터는 한국어 자연정렬 (데모학생1, 2, …, 10 순)
- 좋아요·댓글 상호작용

### 클래스 + 초대코드
- `classes/{id}` — 교사 소유, 8자 초대코드 (혼동 쉬운 `I/O/0/1` 제외한 알파벳+숫자)
- 교사가 **새 클래스를 만들면 기본 장르 3종이 자동 시딩**됩니다:
  - **설명하는 글** (3문단) — 설명 대상·순서·설명 방법·사실 중심 평가
  - **주장하는 글** (3문단) — 주장 명확성·이유와 근거·마무리 평가
  - **경험에서 사실과 느낌을 표현한 글** (3문단) — 사실/느낌 구분·감각 표현 평가
- 각 장르는 AI 코치용 전용 `additionalPrompt`가 포함되어 장르 특성에 맞는 피드백을 제공합니다
- 학생은 자기 `classId`의 데이터만 보고, 교사는 자기 소유 모든 클래스의 데이터를 봅니다

### 관리자 페이지 (5개 탭)

#### 1. 클래스 관리
- 클래스 생성 · 이름 수정 · 초대코드 클릭-복사 · 초대코드 재생성 · 삭제

#### 2. 주제/장르
- 클래스 선택 후 주제·장르 CRUD
- 각 항목에 **목표 문단 수**와 **추가 AI 프롬프트** 설정 가능
- 기존 항목의 문단 수도 즉석에서 드롭다운으로 변경 가능

#### 3. 제출 현황
- 학생별 글 그룹 · 통계(글 수, 좋아요, 댓글)
- 학생별/전체 **포트폴리오 PDF** 다운로드 (jsPDF)

#### 4. 학생 리포트 ★
하나의 학생을 선택하면 다음이 모두 한 화면에 표시됩니다:
- **4축 레이더 다이어그램 (현재 상태)**
  - 4지표: 글 길이 · 어휘 다양성 · 평균 문장 길이 · **문법 정확성**
  - 100% 기준 = *클래스 학생들의 개인 최댓값 평균* (또래 peer best)
  - 파란 실선 = 최근 글, 회색 점선 = 첫 글. 겹쳐 보며 성장을 한눈에 비교.
  - 100%를 넘으면 또래 평균보다 앞섰음을 의미
- **성장 추적 꺾은선 차트** — 4지표를 학생 본인 최댓값 기준 %로 정규화해 시간순으로 겹쳐 표시
- **지표별 개별 Line 차트 4개**
- **AI 발전 리포트 생성** — gpt-5-nano가 `## / ###` 계층 마크다운 템플릿을 채워 구조화된 보고서(전체 추이·강점·개선 영역·장르 다양성·격려와 제안) 생성

#### 5. 프롬프트
- 기본 AI 코칭 프롬프트 편집 (`settings/coachingPrompt`)
- 기본 프롬프트는 `{topicOrGenre}` 치환 변수를 사용해 장르 맥락을 시스템 메시지에 자동 주입
- 교사가 커스텀 프롬프트에 `{title}`, `{content}`, `{topicOrGenre}` 모두 사용 가능

### 모바일 레이아웃
- 좌측 사이드바가 `lg` 미만 화면에서 햄버거 드로어로 전환
- 라우트 이동 시 드로어 자동 닫힘
- 모든 페이지가 뷰포트 고정(`h-screen`) + 자식 영역 독립 스크롤로 긴 콘텐츠가 페이지 전체 높이를 밀어내지 않음

### 법적 페이지
- `/privacy` — 개인정보 처리방침
- `/terms` — 이용약관

## 디렉터리 구조

```
getwriter/
├── firebase.json / firestore.rules / firestore.indexes.json
├── .firebaserc.example        # 복사 후 실제 프로젝트 ID로 .firebaserc 생성
├── .env.example
├── package.json / vite.config.ts / tsconfig*
├── index.html
├── public/icons/              # 13 커스텀 PNG
├── src/
│   ├── main.tsx / App.tsx / index.css
│   ├── routes/                # Login, JoinClass, Write, Gallery, Admin, Privacy, Terms
│   │   └── admin/             # Classes, Submissions, TopicsGenres, PromptEditor, StudentReport
│   ├── components/            # Layout, Icon
│   └── lib/                   # firebase, auth, authContext, firestore, classes, coach, pdf, markdown, types
└── functions/
    └── src/index.ts           # POST /api/{coach,chat,progress-report,grammar-score,join-class,seed-test}
```

## Firestore 스키마

### users/{uid}
```
name, email?, userType: 'student'|'teacher'|'test'
classId?, teacherId?, createdAt, lastLoginAt
```

### classes/{id}
```
name, teacherId, inviteCode (8자 대문자+숫자), createdAt
```

### writings/{id}
```
userId, userName, classId
title, content                    # 여러 문단이 있으면 '\n\n'으로 결합
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

## Functions API

모든 엔드포인트는 Firebase Auth ID 토큰(`Authorization: Bearer ...`)을 요구합니다. Hosting rewrite `/api/**`를 통해 클라이언트가 호출합니다.

| 엔드포인트 | 용도 |
|---|---|
| `POST /api/coach` | AI 글쓰기 코칭 (첫 호출 시 대화 히스토리 반환) |
| `POST /api/chat` | 같은 스레드에서 코치와 자유 대화 |
| `POST /api/progress-report` | 학생의 모든 글을 시간순 분석한 마크다운 발전 보고서 |
| `POST /api/grammar-score` | 글 본문의 문법 정확성 0~100점 채점 |
| `POST /api/join-class` | 초대코드로 학생을 클래스에 가입 + 프로필 생성 |
| `POST /api/seed-test` | 테스트 사용자 샌드박스 자동 생성 (idempotent) |

## 설정 (새 Firebase 프로젝트에 배포)

### 0. 사전 준비
- Node 20+
- Firebase CLI: `npm install -g firebase-tools`
- **Firebase 요금제: Blaze (종량제) 필수** — Cloud Functions가 포함되므로 Spark로는 배포 불가

### 1. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. **Authentication** 활성화:
   - 익명(Anonymous) 로그인 — 테스트 사용자용
   - Google — 학생/교사 공통
3. **Firestore Database** 생성 (asia-northeast3 권장)
4. 결제 계정 연결 (Blaze)

### 2. 프로젝트 ID 설정
```bash
cp .firebaserc.example .firebaserc
# .firebaserc를 열어 <YOUR_FIREBASE_PROJECT_ID>를 실제 프로젝트 ID로 교체
```
`.firebaserc`는 gitignore 대상이므로 로컬에만 존재합니다.

### 3. 프론트 환경변수
```bash
cp .env.example .env.local
# Firebase 콘솔 → 프로젝트 설정 → 웹 앱 구성값을 .env.local에 채움
```
> `VITE_FIREBASE_API_KEY`는 비밀이 아닙니다 (공개 도메인 식별자). 진짜 비밀은 OpenAI 키로, Functions Secret에만 저장됩니다.

### 4. OpenAI 키 등록 (Functions Secret)
```bash
firebase functions:secrets:set OPENAI_API_KEY
# sk-proj-... 값을 붙여넣기
```
모델은 `functions/src/index.ts`에 `gpt-5-nano`로 하드코딩되어 있습니다.

### 5. 의존성 설치
```bash
npm install
cd functions && npm install && cd ..
```

### 6. Cloud Run 공개 호출 허용 (최초 1회)
신규 GCP 프로젝트는 Cloud Run 함수를 기본적으로 비공개로 배포합니다. Hosting rewrite에서 프록시하려면 `allUsers`에 `run.invoker` 권한이 필요:
```bash
gcloud run services add-iam-policy-binding api \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker" \
  --project=<YOUR_PROJECT_ID>
```
이 함수는 내부에서 Firebase Auth ID 토큰을 검증하므로 `allUsers` 허용은 토큰 없는 요청을 수락한다는 뜻이 아닙니다 — 네트워크 수준에서 프록시가 가능하도록 허용하는 것뿐입니다.

### 7. Cloud Build 서비스 계정 권한 (최초 1회)
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

# 별도 터미널에서 Vite dev 서버
VITE_USE_EMULATORS=1 npm run dev
```
에뮬레이터 포트: Auth 9099, Firestore 8080, Functions 5001, Hosting 5000, UI 4000.
브라우저: http://localhost:5173. Vite 설정이 `/api/**`를 Functions 에뮬레이터로 프록시합니다.

## 배포

```bash
npm run build
firebase deploy
```
Hosting + Firestore 규칙/인덱스 + Functions가 한 번에 배포됩니다.

일부만:
```bash
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules,firestore:indexes
```

## 보안

- **OpenAI 키는 Functions Secret에만 저장**, 클라이언트 번들에 절대 포함되지 않음
- Hosting rewrite `/api/**` → Cloud Run 함수 `api`가 단일 진입점
- Functions는 모든 요청에서 Firebase Auth ID 토큰 검증
- Firestore 규칙:
  - `users/{uid}` — 본인만 write. 읽기는 모든 인증 사용자 허용 (작가 이름 조회 등)
  - `classes/{id}` — 소유 교사만 write. 가입 학생/교사/테스트만 read
  - `writings/{id}` — 본인만 풀 edit. 타인은 `likes/likedBy/comments`만 수정 가능 (`diff().hasOnly()` 가드)
  - `topics/genres/{id}` — 해당 클래스 소유 교사만 write
  - `settings/{doc}` — 관리자(교사/테스트)만 write

## 알려진 제약

- jsPDF 기본 폰트는 한글 글리프가 제한적이라 포트폴리오 PDF에서 일부 글자가 깨질 수 있음. 필요 시 Noto Sans KR 폰트 임베딩 예정.
- Firestore 오프라인 캐시는 로그아웃 후에도 잔존 (보안 영향 없음, UI가 잠깐 stale할 수 있음).
- 번들이 ~1.2MB로 커서 초기 로드 시간이 다소 있음. vendor chunk 분할로 개선 가능.

## 라이선스

교육 목적으로 자유롭게 사용하세요.
