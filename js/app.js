import { onAuthChange, signOut, getUserName, getUserData, isTeacher } from './firebase.js';
import { renderWriteScreen } from './write.js';
import { renderGalleryScreen } from './gallery.js';
import { renderAdminScreen } from './admin.js';
import { renderStudentManagementScreen } from './student-management.js';
import { loginAnonymously, loginStudent, loginTeacherWithGoogle } from './firebase.js';

let currentUser = null;
let currentUserName = '';
let currentUserType = null;

// 전역으로 사용할 수 있도록 export
export { currentUser, currentUserName, currentUserType };

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initNavigation();
    
    // 인증 상태 감지
    onAuthChange(async (user) => {
        if (user) {
            currentUser = user;
            const userData = await getUserData(user.uid);
            currentUserName = userData?.name || user.displayName || user.email || '익명';
            currentUserType = userData?.userType || 'unknown';
            // 사용자 이름이 로드된 후 화면 표시
            await showMainScreen();
        } else {
            currentUser = null;
            currentUserName = '';
            currentUserType = null;
            // 로그아웃 시 관리자 버튼 및 학생관리 버튼 제거
            removeAdminButton();
            removeStudentManagementButton();
            showLoginScreen();
        }
    });
});

// 로그인 화면 초기화
function initLogin() {
    // 탭 전환
    const tabStudent = document.getElementById('tab-student');
    const tabTeacher = document.getElementById('tab-teacher');
    const tabTest = document.getElementById('tab-test');
    
    const studentPanel = document.getElementById('student-login-panel');
    const teacherPanel = document.getElementById('teacher-login-panel');
    const testPanel = document.getElementById('test-login-panel');
    
    tabStudent.addEventListener('click', () => {
        switchLoginTab('student');
    });
    
    tabTeacher.addEventListener('click', () => {
        switchLoginTab('teacher');
    });
    
    tabTest.addEventListener('click', () => {
        switchLoginTab('test');
    });
    
    // 학생 로그인
    const studentLoginBtn = document.getElementById('student-login-btn');
    const studentEmailInput = document.getElementById('student-email');
    const studentPasswordInput = document.getElementById('student-password');
    
    studentLoginBtn.addEventListener('click', async () => {
        const email = studentEmailInput.value.trim();
        const password = studentPasswordInput.value;
        
        if (!email || !password) {
            alert('이름과 비밀번호를 입력해주세요.');
            return;
        }
        
        studentLoginBtn.disabled = true;
        studentLoginBtn.textContent = '로그인 중...';
        
        try {
            await loginStudent(email, password);
        } catch (error) {
            alert('로그인에 실패했습니다: ' + error.message);
            studentLoginBtn.disabled = false;
            studentLoginBtn.textContent = '로그인';
        }
    });
    
    
    // 교사 구글 로그인
    const teacherGoogleLoginBtn = document.getElementById('teacher-google-login-btn');
    
    teacherGoogleLoginBtn.addEventListener('click', async () => {
        teacherGoogleLoginBtn.disabled = true;
        teacherGoogleLoginBtn.innerHTML = '<span>로그인 중...</span>';
        
        try {
            await loginTeacherWithGoogle();
        } catch (error) {
            alert('구글 로그인에 실패했습니다: ' + error.message);
            teacherGoogleLoginBtn.disabled = false;
            teacherGoogleLoginBtn.innerHTML = '<svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span>구글로 로그인</span>';
        }
    });
    
    // 테스트 로그인 (무조건 임세범으로)
    const testLoginBtn = document.getElementById('test-login-btn');
    
    testLoginBtn.addEventListener('click', async () => {
        testLoginBtn.disabled = true;
        testLoginBtn.textContent = '로그인 중...';
        
        try {
            await loginAnonymously('임세범');
        } catch (error) {
            alert('로그인에 실패했습니다: ' + error.message);
            testLoginBtn.disabled = false;
            testLoginBtn.textContent = '테스트 로그인 (임세범)';
        }
    });
    
    // Enter 키로 로그인
    studentEmailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            studentLoginBtn.click();
        }
    });
    
    studentPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            studentLoginBtn.click();
        }
    });
}

// 로그인 탭 전환
function switchLoginTab(tab) {
    const tabs = document.querySelectorAll('.tab-login');
    const panels = document.querySelectorAll('.login-panel');
    
    tabs.forEach(t => {
        t.classList.remove('border-b-2', 'border-blue-600', 'text-blue-600');
        t.classList.add('text-gray-600');
    });
    
    panels.forEach(p => p.classList.add('hidden'));
    
    if (tab === 'student') {
        document.getElementById('tab-student').classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-student').classList.remove('text-gray-600');
        document.getElementById('student-login-panel').classList.remove('hidden');
    } else if (tab === 'teacher') {
        document.getElementById('tab-teacher').classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-teacher').classList.remove('text-gray-600');
        document.getElementById('teacher-login-panel').classList.remove('hidden');
    } else if (tab === 'test') {
        document.getElementById('tab-test').classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-test').classList.remove('text-gray-600');
        document.getElementById('test-login-panel').classList.remove('hidden');
    }
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
            // 교사 또는 테스트 사용자만 접근 가능
            const isAdmin = currentUserType === 'teacher' || currentUserType === 'test';
            if (!isAdmin) {
                alert('관리자만 접근할 수 있습니다.');
                return;
            }
            setActiveNav(e.target);
            renderAdminScreen();
        }
        
        // 학생관리 버튼 이벤트
        if (e.target && e.target.id === 'nav-student-mgmt') {
            e.preventDefault();
            // 관리자 권한 확인
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }
            // 교사 또는 테스트 사용자만 접근 가능
            const isAdmin = currentUserType === 'teacher' || currentUserType === 'test';
            if (!isAdmin) {
                alert('관리자만 접근할 수 있습니다.');
                return;
            }
            setActiveNav(e.target);
            renderStudentManagementScreen();
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
        const userData = await getUserData(currentUser.uid);
        currentUserName = userData?.name || currentUser.displayName || currentUser.email || '익명';
    }
    
    // 관리자 권한 확인: 교사 또는 테스트 사용자
    const isAdmin = currentUserType === 'teacher' || currentUserType === 'test';
    
    // 관리자 버튼 처리: 교사 또는 테스트 사용자면 관리자 버튼과 학생관리 버튼 생성
    if (!isAdmin) {
        removeAdminButton();
        removeStudentManagementButton();
    } else {
        createAdminButton();
        createStudentManagementButton();
    }
    
    // 기본으로 글쓰기 화면 표시
    document.getElementById('nav-write').click();
}

// 학생관리 버튼 제거 함수
function removeStudentManagementButton() {
    const navStudentMgmt = document.getElementById('nav-student-mgmt');
    if (navStudentMgmt && navStudentMgmt.parentNode) {
        navStudentMgmt.remove();
    }
}

// 학생관리 버튼 생성 함수
function createStudentManagementButton() {
    // 이미 버튼이 있으면 제거
    removeStudentManagementButton();
    
    const navContainer = document.querySelector('nav');
    if (navContainer) {
        const navStudentMgmt = document.createElement('button');
        navStudentMgmt.id = 'nav-student-mgmt';
        navStudentMgmt.className = 'nav-btn w-full text-left px-4 py-3 rounded-lg font-semibold transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300';
        navStudentMgmt.textContent = '👥 학생관리';
        navContainer.appendChild(navStudentMgmt);
    }
}
