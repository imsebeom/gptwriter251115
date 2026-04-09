# GetWriter — 작업 기록

초등 5학년 글쓰기 교육용 웹앱. Vite+React+TS+Firebase+OpenAI gpt-5-nano 스택.

## 스택

- **프론트**: Vite · React 18 · TypeScript · Tailwind v4 · React Router v6 · Chart.js(react-chartjs-2) · jsPDF
- **백엔드**: Firebase Hosting · Firestore · Firebase Auth · Cloud Functions v2 (Node 20)
- **AI**: OpenAI `gpt-5-nano` (Functions 프록시, `reasoning_effort: 'minimal'`)
- **배포**: Firebase 프로젝트 (Blaze 요금제, Seoul asia-northeast3 리전). 실제 프로젝트 ID는 `.firebaserc`·`.env.local` 참조.

## 주요 구조

```
getwriter/
├── firebase.json / .firebaserc / firestore.rules / firestore.indexes.json
├── package.json / vite.config.ts / index.html
├── public/icons/          # 13개 커스텀 PNG 아이콘 (Gemini 생성)
├── src/
│   ├── App.tsx            # 라우팅 + Protected/Home 가드
│   ├── routes/            # Login, JoinClass, Write, Gallery, Admin, Privacy, Terms
│   │   └── admin/         # Classes, Submissions, TopicsGenres, PromptEditor, StudentReport
│   ├── components/        # Layout, Icon
│   └── lib/               # firebase, auth, authContext, firestore, classes, coach, pdf, markdown, types
├── functions/src/index.ts # /api/{coach,chat,progress-report,join-class,seed-test}
└── _reference/            # 시드/유틸 스크립트, 로컬 실험 (gitignored)
```

## 기능

### 인증 (3가지)
1. **학생**: Google OAuth → 첫 로그인이면 `/join-class`로 자동 이동, 초대코드 입력 → `/api/join-class`가 검증·프로필 생성
2. **교사**: Google OAuth → 클라이언트에서 `ensureTeacherProfile`로 `users/{uid}` 생성
3. **테스트**: 1클릭 익명 로그인 → `/api/seed-test`가 idempotent하게 테스트 클래스·과제·장르·프로필 자동 생성

`signInWithGoogle`은 `prompt: 'select_account'`로 매번 계정 선택 강제. 로그아웃 시 Firebase Auth 세션 + `getwriter:` 접두사 localStorage 키 정리.

### 클래스 + 초대코드
- `classes/{id}`: `{name, teacherId, inviteCode(8자), createdAt}`
- 교사가 새 클래스 만들면 `classes.ts`의 `createClass`가 **기본 장르 3종 자동 시딩** (설명하는 글 / 주장하는 글 / 경험에서 사실과 느낌을 표현한 글, 각 3문단 + 전용 프롬프트)
- 테스트 클래스에도 같은 3개 장르가 `genre-explanatory`, `genre-argument`, `genre-experience` 고정 ID로 시딩됨
- 학생은 자기 `classId`의 데이터만 보고, 교사는 자기 소유 클래스의 데이터만 봄

### 글쓰기 에디터
- 주제/장르 선택 후 편집기 진입
- **문단 수 > 0**: N개의 `<AutoGrowTextarea>` (각 1문단, **엔터 차단**, 자동 줄바꿈 + 콘텐츠에 따라 가변 높이, 최소 3줄)
- **문단 수 = 0**: 단일 `<textarea>` (자유 서술, 엔터 허용)
- 저장·AI 코칭 전송 시 `paragraphs.map(trim).filter(Boolean).join('\n\n')`로 합쳐서 `content` 한 덩어리로

### AI 코칭 (`/api/coach`)
- **시스템 프롬프트 조립**: `settings/coachingPrompt` (없으면 `DEFAULT_COACHING_PROMPT`) + 주제/장르의 `additionalPrompt` + `paragraphGoal > 0`이면 문단 요구 안내
- 기본 프롬프트는 **200자 이내, 간결, 억지 칭찬 금지** (장점 있을 때만 칭찬, 없으면 솔직). `{topicOrGenre}`는 기본 프롬프트에서 치환 사용.
- 대화 히스토리 유지: `/api/coach`가 첫 응답 history를 반환, 이후 `/api/chat`으로 자유 대화가 같은 스레드에 이어짐 — UI도 말풍선 채팅 형태
- OpenAI 호출: `max_completion_tokens: 8000`, `reasoning_effort: 'minimal'` (gpt-5-nano가 reasoning 모델이라 minimal 없으면 출력이 0일 수 있음)

### 문법 정확성 채점 (`/api/grammar-score`)
- 글 저장 시 Write.tsx가 먼저 `requestGrammarScore` 호출 → 0~100 정수 반환 → `writings.grammarScore` 필드에 같이 저장
- 시스템 프롬프트가 **맞춤법·띄어쓰기·조사·시제·문장 완결성만** 평가하고 내용/창의성은 절대 평가하지 않도록 엄격히 지시. `{"score": N}` JSON 반환.
- 레이더 4번째 축 + 성장 추적 4번째 시리즈 + 개별 Line 차트 하나가 모두 `grammarScore` 사용
- 원래 있던 "문단 수" 지표는 교사가 과제로 제약하는 값이라 매번 100% 고정 → 성장 추적 의미가 없어서 교체함

### 학생 리포트
- `StudentReport.tsx`: 클래스 선택 → 학생 목록(한국어 자연정렬) → 상세
- **4축 레이더 다이어그램 (현재 상태)**: 가장 최근 글의 4개 지표를 **클래스 학생들의 개인 최댓값 평균**(100% 기준)으로 표시. 글이 2편 이상이면 회색 점선으로 첫 글도 오버레이 → 출발점과 현재를 한눈에 비교. 100% 초과(최대 120%까지) 허용 → 또래 평균보다 앞섰음을 시각화.
- **성장 추적 종합 차트**: 4개 지표(글 길이·어휘 다양성·평균 문장 길이·문법 정확성)를 각자 최댓값 기준 %로 정규화해 한 Line 차트에 겹침
- 지표별 개별 Line 차트 4개
- **"AI 발전 리포트 생성"** → `/api/progress-report` → gpt-5-nano가 `## / ###` 계층 마크다운 템플릿을 복사해 채우도록 프롬프트로 강제. 볼드로 제목 대체 금지.
- 테스트 클래스에 **데모학생 10명 × 4편 = 40편 시드** (정상분포: 약함 2 / 중간 6 / 강함 2). 각 학생의 4편은 content 길이 오름차순으로 시간순 배치 → 최근 글이 첫 글보다 풍부하게 나옴. grammarScore도 티어 범위 내에서 점진 상승.

### 갤러리
- `writings` 실시간 구독 (classId 기반), 학생은 자기 클래스만, 교사는 자기 소유 모든 클래스
- 필터(작가/주제)·정렬(최신/좋아요/댓글), 좋아요는 `arrayUnion/Remove + increment`, 댓글은 `arrayUnion`

### 관리자 (5개 탭)
1. **클래스 관리**: CRUD + 초대코드 복사/재생성
2. **주제/장르**: 클래스 선택 후 CRUD + 추가 프롬프트 편집 + 문단 수 설정
3. **제출 현황**: 학생별 그룹, 개별/전체 포트폴리오 PDF (jsPDF)
4. **학생 리포트**: 위 설명
5. **프롬프트**: 기본 코칭 프롬프트 편집 (`settings/coachingPrompt`)

### 모바일 레이아웃
- `h-screen overflow-hidden` 루트 → 전체 페이지는 뷰포트 고정, 자식 섹션만 독립 스크롤
- `lg` 미만에서 사이드바 숨김 + 햄버거 드로어 + 배경 오버레이
- 라우트 변경 시 드로어 자동 닫힘

## Firestore 스키마

### users/{uid}
```
name, email?, userType: 'student'|'teacher'|'test'
classId?, teacherId?, createdAt, lastLoginAt
```

### classes/{id}
```
name, teacherId, inviteCode (8자 대문자+숫자, I/O/0/1 제외), createdAt
```

### writings/{id}
```
userId, userName, classId
title, content (문단 \n\n 결합)
topicOrGenre, topic?, genre?, topicId?, genreId?, paragraphs?
grammarScore?: number (0~100, gpt-5-nano 저장 시 채점)
likes: number, likedBy: string[], comments: {...}[]
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

## 보안 규칙 요지
- `users/{uid}` — 본인만 read/write (read는 모든 인증 사용자 허용 — 갤러리 작가 이름 표시 등 필요)
- `classes/{id}` — 소속 학생/교사/테스트만 read, 교사만 write (소유자 한정)
- `writings/{id}` — 인증자 read, 본인만 풀 edit, 타인은 `likes/likedBy/comments`만 가능 (`diff().hasOnly()` 가드)
- `topics/genres/{id}` — 인증자 read, 해당 클래스 소유 교사만 write
- `settings/{doc}` — 인증자 read, 관리자(교사/테스트)만 write

## OpenAI 프록시 안전장치
- `OPENAI_API_KEY`는 `defineSecret`으로 Functions에만 저장
- Hosting rewrite `/api/**` → Functions `api`로 프록시 (클라이언트에 키 노출 0)
- Functions는 Firebase Auth ID 토큰 검증 (`requireAuthUser`)
- Cloud Run `api` 서비스에 `allUsers → run.invoker` 바인딩 필요 (신규 GCP 프로젝트 기본 제약 회피)
- Cloud Build 서비스 계정(`654886087121-compute@developer.gserviceaccount.com`)에 `roles/cloudbuild.builds.builder` 필요

## 아이콘 자산
- 13개 PNG (`public/icons/*.png`) — Gemini `gemini-3.1-flash-image-preview`로 4×4 시트 한 번에 생성 후 PIL로 4×4 분할·리사이즈
- 스타일: flat line, navy `#1e3a8a`, 8px round stroke, 플랫 2D, 흰 배경
- `<Icon name={...} />` 컴포넌트로 사용, 다크 배경에서는 `className="invert"`로 밝게
- 생성 스크립트: `_reference/gen_icons.py` (재생성 가능)

## 시드 스크립트 (`_reference/`)
- `gen_icons.py` — Gemini 아이콘 시트 생성 + 분할
- `seed-demo-writings.py` — 테스트 클래스에 데모학생 6편 시드 (성장 차트 시연용)
- `seed-default-genres.py` — 테스트 클래스에 기본 장르 3개 시드 (`seed-test` 함수 배포 전 수동 시딩용)
- `fix-topic.json` — 초기 REST 시딩 시 Windows 셸 UTF-8 문제로 깨진 문서를 파일 기반 PATCH로 수정한 흔적

## 주요 의사결정 메모

- **Firebase Hosting + Functions**: 사용자 요구사항. Spark 불가 → Blaze 전제.
- **gpt-5-nano**: 사용자 요청. reasoning model이라 `reasoning_effort: 'minimal'` + `max_completion_tokens: 8000` 필수.
- **Functions v2 `onRequest` 단일 엔드포인트**: `/api/**` 전부를 `api` 함수 하나에서 path로 분기. 신규 함수 추가 시 배포 부담 최소.
- **Icon은 SVG 대신 PNG**: Gemini가 SVG를 안정적으로 내보내지 못함. PNG + invert 트릭으로 다크/라이트 모두 대응.
- **LibreOffice/jsPDF 한글**: jsPDF 기본 폰트는 한글 글리프 제한이 있어 포트폴리오 PDF에서 일부 문자가 깨질 수 있음. 이슈 발생 시 Noto Sans KR 임베딩 필요 (아직 미적용).
- **`diff().hasOnly()` 가드**: writings의 타인 업데이트를 likes/comments만 허용하는 핵심. 다른 필드 수정은 차단.
- **치환 변수 정책**: `{title}`, `{content}`, `{topicOrGenre}` 세 변수 모두 Functions에서 치환 지원하지만, **기본 프롬프트에는 `{topicOrGenre}`만** 사용. 제목/본문은 이미 user 메시지 템플릿(`이 글은 '...' 주제로 쓴 글입니다 --- 제목: ... 내용: ... ---`)에 자동 포함되므로 system 프롬프트에 또 박으면 중복 전송 + 토큰 낭비. 교사가 커스텀 프롬프트에서 `{title}`/`{content}`를 쓰고 싶으면 그때만 사용하는 opt-in 방식.
- **문단 수 지표 폐기**: 교사가 과제로 강제하는 값이라 성장 추적에서 매번 100% 고정 → 무의미. gpt-5-nano 기반 `grammarScore`(0~100)로 교체. 비용 trade-off: 저장당 소액 OpenAI 호출 1회 추가.
- **AI 발전 리포트 템플릿 강제**: 초기 프롬프트가 "마크다운 형식"만 요구 → 모델이 볼드/평문으로 소제목을 출력 → 계층이 납작해짐. 해결: 시스템 프롬프트에 `## / ###` 템플릿을 코드블록으로 박아 복사하도록 유도 + 볼드 대체 금지 명시. `mdToHtml`에 `h4` 지원 추가, `.prose-coach` CSS로 h1 border, h2 파란색 등 시각 계층 강조.
- **한국어 자연정렬**: 학생 명단·작가 필터 등 모든 이름 정렬에 `localeCompare('ko', { numeric: true })` 사용 → 데모학생1 → 10 순서. 기본 `.sort()`는 "데모학생10"이 "데모학생2"보다 먼저 옴.
- **데모 시드 성장 진행**: 초기 시드에서 `random.choice`로 템플릿을 뽑아 성장 순서가 섞였음. 해결: 각 학생이 뽑은 4편을 content 길이 오름차순 정렬해 오래된 글 → 최근 글 순서로 배치. `grammarScore`도 티어 내에서 선형 증가(작은 지터 포함). 결과적으로 레이더의 최근 글(파란 실선)이 첫 글(회색 점선)보다 넉넉히 바깥에 위치.

## 미완·향후 TODO

- jsPDF에 한글 폰트 임베딩 (Noto Sans KR)
- Firestore 오프라인 캐시 clear (로그아웃 시 stale 데이터 브리프 노출 가능, 보안 영향은 없음)
- 모바일에서 Google sign-in popup이 불안할 경우 `signInWithRedirect`로 폴백
- `node_modules` chunk가 1.2MB — vendor chunk 분할로 초기 로드 개선 가능
- 사이드바 아이콘 hover 색/현재 라우트 강조 개선

## 자주 쓰는 명령

```bash
# 로컬 개발
npm run dev

# 프로덕션 빌드
npm run build

# 배포 (hosting+functions+firestore rules/indexes)
firebase deploy --project $PROJECT_ID

# 일부만
firebase deploy --only hosting --project $PROJECT_ID
firebase deploy --only functions --project $PROJECT_ID
firebase deploy --only firestore:rules --project $PROJECT_ID

# Functions secret 등록 (최초 1회)
firebase functions:secrets:set OPENAI_API_KEY --project $PROJECT_ID

# 로그
firebase functions:log --project $PROJECT_ID --only api
gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=api AND severity>=WARNING' --limit=20 --project=$PROJECT_ID --format=json
```
