import { onAuthChange, signOut, getUserName } from './firebase.js';
import { renderWriteScreen } from './write.js';
import { renderGalleryScreen } from './gallery.js';
import { renderAdminScreen } from './admin.js';

let currentUser = null;
let currentUserName = '';

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initNavigation();
    
    // 인증 상태 감지
    onAuthChange(async (user) => {
        if (user) {
            currentUser = user;
            currentUserName = await getUserName(user.uid);
            showMainScreen();
        } else {
            currentUser = null;
            showLoginScreen();
        }
    });
});

// 로그인 화면 초기화
function initLogin() {
    const loginBtn = document.getElementById('login-btn');
    const studentNameInput = document.getElementById('student-name');
    
    loginBtn.addEventListener('click', async () => {
        const name = studentNameInput.value.trim();
        if (!name) {
            alert('이름을 입력해주세요.');
            return;
        }
        
        loginBtn.disabled = true;
        loginBtn.textContent = '로그인 중...';
        
        try {
            const { loginAnonymously } = await import('./firebase.js');
            await loginAnonymously(name);
        } catch (error) {
            alert('로그인에 실패했습니다: ' + error.message);
            loginBtn.disabled = false;
            loginBtn.textContent = '시작하기';
        }
    });
    
    studentNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginBtn.click();
        }
    });
}

// 네비게이션 초기화
function initNavigation() {
    const logoutBtn = document.getElementById('logout-btn');
    const navWrite = document.getElementById('nav-write');
    const navGallery = document.getElementById('nav-gallery');
    const navAdmin = document.getElementById('nav-admin');
    
    logoutBtn.addEventListener('click', async () => {
        if (confirm('로그아웃하시겠습니까?')) {
            await signOut();
        }
    });
    
    navWrite.addEventListener('click', () => {
        setActiveNav(navWrite);
        renderWriteScreen();
    });
    
    navGallery.addEventListener('click', () => {
        setActiveNav(navGallery);
        renderGalleryScreen();
    });
    
    navAdmin.addEventListener('click', () => {
        setActiveNav(navAdmin);
        renderAdminScreen();
    });
}

function setActiveNav(activeBtn) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.className = 'nav-btn px-6 py-2 rounded-lg font-semibold transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300';
    });
    activeBtn.className = 'nav-btn px-6 py-2 rounded-lg font-semibold transition-colors bg-blue-600 text-white';
}

// 화면 전환
function showLoginScreen() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-screen').classList.add('hidden');
}

function showMainScreen() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('user-name').textContent = currentUserName;
    
    // 기본으로 글쓰기 화면 표시
    document.getElementById('nav-write').click();
}

// 전역으로 사용할 수 있도록 export
export { currentUser, currentUserName };

