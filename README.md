# 글쓰기 교육 웹 애플리케이션

초등학교 5학년 학생들을 위한 다양한 주제/장르 글쓰기 교육용 웹 애플리케이션입니다.

## 주요 기능

1. **사용자 인증**: 이름만 입력하여 간편하게 로그인 (익명 인증)
2. **주제/장르 선택**: 교사가 설정한 주제 또는 장르 목록에서 선택
3. **글 작성**: 선택한 주제/장르에 맞춰 글 작성
4. **AI 글쓰기 코칭**: Google Gemini API를 활용한 맞춤형 피드백 제공
5. **작품 보관함 (갤러리)**: 학생들의 글을 실시간으로 공유하고 좋아요/댓글 기능 제공
6. **교사용 관리자 페이지**: 
   - 학생 제출 현황 확인
   - 포트폴리오 PDF 다운로드
   - 주제/장르 목록 관리

## 기술 스택

- **프론트엔드**: HTML, Tailwind CSS, JavaScript (ES Modules)
- **백엔드**: Google Firebase
  - Firestore (데이터베이스)
  - Authentication (익명 로그인)
- **AI**: Google Gemini API (gemini-2.0-flash 모델)
- **PDF 생성**: jsPDF 라이브러리

## 설치 및 설정

### 1. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication 활성화 및 익명 로그인 활성화
3. Firestore Database 생성 (테스트 모드로 시작 가능)
4. Firebase 프로젝트 설정 정보 복사

### 2. Google Gemini API 키 발급

1. [Google AI Studio](https://makersuite.google.com/app/apikey)에서 API 키 발급
2. 또는 [Vertex AI](https://cloud.google.com/vertex-ai)를 통해 설정

### 3. 설정 파일 수정

1. `js/firebase-config.example.js` 파일을 복사하여 `js/firebase-config.js`로 이름을 변경하세요.
2. `js/firebase-config.js` 파일을 열어서 Firebase 및 Gemini API 설정값을 입력하세요:

```javascript
export const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

export const geminiConfig = {
    apiKey: "YOUR_GEMINI_API_KEY",
    model: "gemini-2.0-flash"
};
```

**주의**: `firebase-config.js` 파일은 `.gitignore`에 포함되어 있어 Git에 커밋되지 않습니다. 각 개발자는 자신의 설정 파일을 만들어야 합니다.

### 4. Firestore 보안 규칙 설정

Firebase Console에서 Firestore 보안 규칙을 설정하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 정보는 본인만 읽기/쓰기 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 글은 모든 인증된 사용자가 읽고 쓸 수 있음
    match /writings/{writingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // 주제/장르는 모든 인증된 사용자가 읽을 수 있고, 관리자만 쓸 수 있음
    // (실제로는 모든 사용자가 쓸 수 있도록 설정되어 있으므로, 필요시 수정)
    match /topics/{topicId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /genres/{genreId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 5. 로컬 서버 실행

프로젝트를 로컬 서버에서 실행하세요. Python을 사용하는 경우:

```bash
# Python 3
python -m http.server 8000

# 또는 Node.js의 http-server 사용
npx http-server
```

브라우저에서 `http://localhost:8000`으로 접속하세요.

## 사용 방법

### 학생 사용자

1. **로그인**: 이름을 입력하고 "시작하기" 버튼 클릭
2. **주제/장르 선택**: "글쓰기" 탭에서 주제 또는 장르 선택
3. **글 작성**: 제목과 내용을 입력
4. **AI 코칭 받기**: "AI 코칭 받기" 버튼을 클릭하여 피드백 받기
5. **저장하기**: 작성한 글을 저장하여 갤러리에 공유
6. **갤러리 확인**: 다른 학생들의 글을 보고 좋아요/댓글 남기기

### 교사 사용자

1. **관리자 페이지 접속**: "관리자" 탭 클릭
2. **주제/장르 관리**: 
   - "주제/장르 관리" 탭에서 주제 또는 장르 추가/삭제
3. **제출 현황 확인**:
   - "제출 현황" 탭에서 학생들의 글 확인
   - 전체 포트폴리오 또는 개별 학생 포트폴리오 PDF 다운로드

## 프로젝트 구조

```
gptwriter/
├── index.html              # 메인 HTML 파일
├── js/
│   ├── app.js              # 메인 애플리케이션 로직
│   ├── firebase.js         # Firebase 관련 함수
│   ├── firebase-config.js  # Firebase 및 Gemini 설정
│   ├── write.js            # 글쓰기 화면
│   ├── gallery.js          # 갤러리 화면
│   ├── admin.js            # 관리자 페이지
│   └── gemini.js           # Gemini API 연동
└── README.md               # 프로젝트 설명서
```

## Firestore 데이터 구조

### users 컬렉션
```
users/{userId}
  - name: string
  - createdAt: timestamp
```

### writings 컬렉션
```
writings/{writingId}
  - userId: string
  - userName: string
  - title: string
  - content: string
  - topicOrGenre: string
  - type: string ("topic" or "genre")
  - createdAt: timestamp
  - likes: number
  - likedBy: array<string>
  - comments: array<{
      userId: string
      userName: string
      text: string
      createdAt: timestamp
    }>
```

### topics 컬렉션
```
topics/{topicId}
  - name: string
  - createdAt: timestamp
```

### genres 컬렉션
```
genres/{genreId}
  - name: string
  - createdAt: timestamp
```

## 주의사항

1. **Firebase 보안 규칙**: 프로덕션 환경에서는 보안 규칙을 더 엄격하게 설정하세요.
2. **Gemini API 사용량**: API 사용량에 따라 비용이 발생할 수 있으니 주의하세요.
3. **CORS 설정**: 로컬 개발 환경에서는 문제가 없지만, 배포 시 CORS 설정을 확인하세요.

## 라이선스

이 프로젝트는 교육 목적으로 자유롭게 사용할 수 있습니다.


