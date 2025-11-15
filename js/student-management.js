import { getWritings, getUserData, db, setStudentAsTest, setStudentAsMyStudent } from './firebase.js';
import { signUpStudent } from './firebase.js';
import { currentUser, currentUserType } from './app.js';
import { auth } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export async function renderStudentManagementScreen() {
    const contentArea = document.getElementById('content-area');
    
    contentArea.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">학생 관리</h2>
                <button 
                    id="add-student-btn" 
                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    + 학생 추가
                </button>
            </div>
            <div id="students-list" class="space-y-4">
                <div class="text-center py-8">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p class="mt-2 text-gray-600">로딩 중...</p>
                </div>
            </div>
        </div>
    `;
    
    // 학생 추가 버튼 이벤트
    document.getElementById('add-student-btn').addEventListener('click', () => {
        showAddStudentModal();
    });
    
    await loadStudents();
}

async function loadStudents() {
    const studentsList = document.getElementById('students-list');
    
    try {
        if (!currentUser) {
            studentsList.innerHTML = '<p class="text-center text-red-500 py-8">로그인이 필요합니다.</p>';
            return;
        }
        
        // 학생 목록 가져오기
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const students = [];
        
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.userType === 'student') {
                // 테스트 사용자는 모든 학생 표시
                if (currentUserType === 'test') {
                    students.push({
                        uid: doc.id,
                        ...userData
                    });
                } else {
                    // 교사는 자신이 추가한 학생만
                    if (userData.teacherId === currentUser.uid) {
                        students.push({
                            uid: doc.id,
                            ...userData
                        });
                    }
                }
            }
        });
        
        if (students.length === 0) {
            studentsList.innerHTML = '<p class="text-center text-gray-500 py-8">등록된 학생이 없습니다.</p>';
            return;
        }
        
        // 학생별 글 수 가져오기
        const writings = await getWritings();
        const studentWritingsMap = new Map();
        
        writings.forEach(writing => {
            const userName = writing.userName;
            if (!studentWritingsMap.has(userName)) {
                studentWritingsMap.set(userName, []);
            }
            studentWritingsMap.get(userName).push(writing);
        });
        
        studentsList.innerHTML = students.map(student => {
            const studentWritings = studentWritingsMap.get(student.name) || [];
            const totalWritings = studentWritings.length;
            const totalLikes = studentWritings.reduce((sum, w) => sum + (w.likes || 0), 0);
            const totalComments = studentWritings.reduce((sum, w) => sum + (w.comments?.length || 0), 0);
            
            return `
                <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h3 class="text-xl font-bold text-gray-800 mb-2">${escapeHtml(student.name)}</h3>
                            <p class="text-sm text-gray-600 mb-3">아이디: ${escapeHtml(student.email || 'N/A')}</p>
                            <div class="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p class="text-gray-500">총 글 수</p>
                                    <p class="text-lg font-semibold text-blue-600">${totalWritings}개</p>
                                </div>
                                <div>
                                    <p class="text-gray-500">좋아요</p>
                                    <p class="text-lg font-semibold text-red-600">${totalLikes}개</p>
                                </div>
                                <div>
                                    <p class="text-gray-500">댓글</p>
                                    <p class="text-lg font-semibold text-purple-600">${totalComments}개</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex flex-col space-y-2">
                            <button 
                                class="view-student-writings-btn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                data-student-name="${escapeHtml(student.name)}"
                            >
                                글 보기
                            </button>
                            ${currentUserType === 'test' ? `
                            <button 
                                class="set-my-student-btn px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                data-student-name="${escapeHtml(student.name)}"
                            >
                                내 학생으로 설정
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // 글 보기 버튼 이벤트
        studentsList.querySelectorAll('.view-student-writings-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const studentName = btn.dataset.studentName;
                const studentWritings = studentWritingsMap.get(studentName) || [];
                showStudentWritingsModal(studentName, studentWritings);
            });
        });
        
        // 내 학생으로 설정 버튼 이벤트 (테스트 사용자용)
        studentsList.querySelectorAll('.set-my-student-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const studentName = btn.dataset.studentName;
                if (!currentUser) {
                    alert('로그인이 필요합니다.');
                    return;
                }
                if (confirm(`"${studentName}" 학생을 임세범 교사의 학생으로 설정하시겠습니까?`)) {
                    btn.disabled = true;
                    btn.textContent = '설정 중...';
                    try {
                        await setStudentAsMyStudent(studentName, currentUser.uid);
                        alert(`"${studentName}" 학생이 임세범 교사의 학생으로 설정되었습니다.`);
                        await loadStudents(); // 목록 새로고침
                    } catch (error) {
                        alert('설정에 실패했습니다: ' + error.message);
                        btn.disabled = false;
                        btn.textContent = '내 학생으로 설정';
                    }
                }
            });
        });
        
    } catch (error) {
        studentsList.innerHTML = `<p class="text-center text-red-500 py-8">오류가 발생했습니다: ${error.message}</p>`;
    }
}

// 학생 글 보기 모달
function showStudentWritingsModal(studentName, writings) {
    // 시간순 정렬
    writings.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA; // 최신순
    });
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-2xl font-bold text-gray-800">${escapeHtml(studentName)}님의 글 (${writings.length}개)</h3>
                <button 
                    id="close-student-writings-btn" 
                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    닫기
                </button>
            </div>
            
            <div class="space-y-4">
                ${writings.length === 0 ? '<p class="text-center text-gray-500 py-8">작성한 글이 없습니다.</p>' : ''}
                ${writings.map((writing, index) => {
                    const createdAt = writing.createdAt?.toDate ? writing.createdAt.toDate() : new Date();
                    return `
                        <div class="border border-gray-200 rounded-lg p-4">
                            <div class="flex justify-between items-start mb-2">
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2 mb-2">
                                        <span class="text-sm font-semibold text-blue-600">#${index + 1}</span>
                                        <h4 class="text-lg font-bold text-gray-800">${escapeHtml(writing.title)}</h4>
                                    </div>
                                    <p class="text-xs text-gray-600">
                                        ${escapeHtml(writing.topicOrGenre)} | ${formatDate(createdAt)} | ${writing.content.length}자
                                    </p>
                                </div>
                                <div class="ml-4 text-right text-sm text-gray-600">
                                    <div>❤️ ${writing.likes || 0}</div>
                                    <div>💬 ${writing.comments?.length || 0}</div>
                                </div>
                            </div>
                            <div class="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-700 whitespace-pre-wrap">${escapeHtml(writing.content)}</p>
                            </div>
                            ${writing.comments && writing.comments.length > 0 ? `
                                <div class="mt-3 pt-3 border-t border-gray-200">
                                    <p class="text-xs font-semibold text-gray-600 mb-2">댓글 (${writing.comments.length}개)</p>
                                    <div class="space-y-1">
                                        ${writing.comments.map(comment => {
                                            const commentDate = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date();
                                            return `
                                                <div class="text-xs text-gray-600">
                                                    <span class="font-semibold">${escapeHtml(comment.userName)}</span>: ${escapeHtml(comment.text)}
                                                    <span class="text-gray-400 ml-2">${formatDate(commentDate)}</span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('close-student-writings-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 학생 추가 모달
function showAddStudentModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-bold mb-4 text-gray-800">학생 추가</h3>
            <div class="mb-4">
                <label for="new-student-name" class="block text-sm font-medium text-gray-700 mb-2">이름</label>
                <input 
                    type="text" 
                    id="new-student-name" 
                    placeholder="학생 이름을 입력하세요"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
            </div>
            <div class="mb-4">
                <label for="new-student-id" class="block text-sm font-medium text-gray-700 mb-2">아이디 (로그인에 사용할 이름)</label>
                <input 
                    type="text" 
                    id="new-student-id" 
                    placeholder="로그인 아이디를 입력하세요"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
            </div>
            <div class="mb-4">
                <label for="new-student-password" class="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                <input 
                    type="password" 
                    id="new-student-password" 
                    placeholder="비밀번호를 입력하세요 (최소 6자)"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
            </div>
            <div class="mb-4">
                <label for="new-student-password-confirm" class="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
                <input 
                    type="password" 
                    id="new-student-password-confirm" 
                    placeholder="비밀번호를 다시 입력하세요"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
            </div>
            <div class="flex space-x-4 justify-end">
                <button 
                    id="cancel-add-student-btn" 
                    class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    취소
                </button>
                <button 
                    id="confirm-add-student-btn" 
                    class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    추가
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('cancel-add-student-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.getElementById('confirm-add-student-btn').addEventListener('click', async () => {
        const name = document.getElementById('new-student-name').value.trim();
        const email = document.getElementById('new-student-id').value.trim();
        const password = document.getElementById('new-student-password').value;
        const passwordConfirm = document.getElementById('new-student-password-confirm').value;
        
        if (!name || !email || !password) {
            alert('모든 항목을 입력해주세요.');
            return;
        }
        
        if (password !== passwordConfirm) {
            alert('비밀번호가 일치하지 않습니다.');
            return;
        }
        
        if (password.length < 6) {
            alert('비밀번호는 6자 이상이어야 합니다.');
            return;
        }
        
        const confirmBtn = document.getElementById('confirm-add-student-btn');
        confirmBtn.disabled = true;
        confirmBtn.textContent = '추가 중...';
        
        try {
            if (!currentUser) {
                alert('로그인이 필요합니다.');
                return;
            }
            
            // 현재 사용자 정보 저장 (학생 추가 후 복원하기 위해)
            const isGoogleLogin = currentUser.providerData?.[0]?.providerId === 'google.com';
            
            const result = await signUpStudent(name, email, password, currentUser.uid);
            
            // 구글 로그인 사용자인 경우 페이지 새로고침이 필요할 수 있음
            if (result.needsReload) {
                alert('학생이 추가되었습니다! 다시 로그인해주세요.');
                document.body.removeChild(modal);
                window.location.reload();
            } else {
                alert('학생이 추가되었습니다!');
                document.body.removeChild(modal);
                await loadStudents(); // 목록 새로고침
            }
        } catch (error) {
            alert('학생 추가에 실패했습니다: ' + error.message);
            confirmBtn.disabled = false;
            confirmBtn.textContent = '추가';
        }
    });
}

function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return date.toLocaleDateString('ko-KR');
}

