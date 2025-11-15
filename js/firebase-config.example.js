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

// Gemini API 설정
export const geminiConfig = {
    apiKey: "YOUR_GEMINI_API_KEY", // Google AI Studio에서 발급받은 API 키
    model: "gemini-2.0-flash"
};

