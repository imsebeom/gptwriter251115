// Firebase 설정
// 사용자가 직접 Firebase 프로젝트 설정값을 입력해야 합니다
// 이 파일을 복사하여 firebase-config.js로 이름을 변경한 후 설정값을 입력하세요

export const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// OpenAI API 설정
export const openaiConfig = {
    apiKey: "YOUR_OPENAI_API_KEY", // OpenAI에서 발급받은 API 키
    model: "gpt-4o-mini" // 또는 "gpt-4o", "gpt-3.5-turbo" 등
};

// 관리자 설정
export const adminConfig = {
    adminName: "임세범" // 관리자 이름 (로그인 시 입력하는 이름과 정확히 일치해야 함)
};

