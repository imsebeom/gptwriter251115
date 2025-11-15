import { onAuthChange, signOut, getUserName } from './firebase.js';
import { renderWriteScreen } from './write.js';
import { renderGalleryScreen } from './gallery.js';
import { renderAdminScreen } from './admin.js';
import { adminConfig } from './firebase-config.js';

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
            // 사용자 이름이 로드된 후 화면 표시
            await showMainScreen();
        } else {
            currentUser = null;
            currentUserName = '';
            // 로그아웃 시 관리자 버튼 제거
            removeAdminButton();
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
    
    // 관리자 버튼 이벤트는 동적으로 추가 (버튼이 존재할 때만)
    document.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'nav-admin') {
            e.preventDefault();
            // 관리자 권한 확인
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }
            const userName = await getUserName(currentUser.uid);
            if (userName !== adminConfig.adminName) {
                alert('관리자만 접근할 수 있습니다.');
                return;
            }
            setActiveNav(e.target);
            renderAdminScreen();
        }
    });
}

function setActiveNav(activeBtn) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.className = 'nav-btn w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300';
    });
    activeBtn.className = 'nav-btn w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors bg-blue-600 text-white';
}

// 화면 전환
function showLoginScreen() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('main-screen').classList.add('hidden');
}

// 관리자 버튼 제거 함수
function removeAdminButton() {
    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin && navAdmin.parentNode) {
        navAdmin.remove();
    }
}

// 관리자 버튼 생성 함수
function createAdminButton() {
    // 이미 버튼이 있으면 제거
    removeAdminButton();
    
    const navContainer = document.querySelector('nav');
    if (navContainer) {
        const navAdmin = document.createElement('button');
        navAdmin.id = 'nav-admin';
        navAdmin.className = 'nav-btn w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300';
        navAdmin.textContent = '⚙️ 관리자';
        navContainer.appendChild(navAdmin);
    }
}

async function showMainScreen() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('user-name').textContent = currentUserName;
    
    // 사용자 이름이 없으면 다시 가져오기
    if (!currentUserName && currentUser) {
        currentUserName = await getUserName(currentUser.uid);
    }
    
    // 정확한 문자열 비교 (공백 제거)
    const isAdmin = currentUserName && currentUserName.trim() === adminConfig.adminName.trim();
    
    // 관리자 버튼 처리: 관리자가 아니면 제거, 관리자면 생성
    if (!isAdmin) {
        removeAdminButton();
    } else {
        createAdminButton();
    }
    
    // 기본으로 글쓰기 화면 표시
    document.getElementById('nav-write').click();
}

// 전역으로 사용할 수 있도록 export
export { currentUser, currentUserName };

