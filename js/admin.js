import { 
    getWritings, 
    getTopicsAndGenres, 
    addTopic, 
    addGenre, 
    deleteTopic, 
    deleteGenre,
    getUserName,
    getCoachingPrompt,
    saveCoachingPrompt,
    getTopicPrompt,
    saveTopicPrompt,
    getGenrePrompt,
    saveGenrePrompt
} from './firebase.js';
import { adminConfig } from './firebase-config.js';
import { currentUser } from './app.js';
import { generateProgressReport } from './openai.js';

export async function renderAdminScreen() {
    // 관리자 권한 확인
    if (!currentUser) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    const userName = await getUserName(currentUser.uid);
    if (userName !== adminConfig.adminName) {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6">
                <div class="text-center py-12">
                    <h2 class="text-2xl font-bold text-red-600 mb-4">접근 권한 없음</h2>
                    <p class="text-gray-600">관리자만 이 페이지에 접근할 수 있습니다.</p>
                </div>
            </div>
        `;
        return;
    }
    const contentArea = document.getElementById('content-area');
    
    contentArea.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">관리자 페이지</h2>
            
            <!-- 탭 네비게이션 -->
            <div class="border-b border-gray-200 mb-6">
                <nav class="flex space-x-4">
                    <button 
                        id="tab-submissions" 
                        class="tab-btn px-4 py-2 font-semibold border-b-2 border-blue-600 text-blue-600"
                    >
                        제출 현황
                    </button>
                    <button 
                        id="tab-topics-genres" 
                        class="tab-btn px-4 py-2 font-semibold text-gray-600 hover:text-gray-800"
                    >
                        주제/장르 관리
                    </button>
                    <button 
                        id="tab-prompt" 
                        class="tab-btn px-4 py-2 font-semibold text-gray-600 hover:text-gray-800"
                    >
                        피드백 프롬프트 관리
                    </button>
                    <button 
                        id="tab-reports" 
                        class="tab-btn px-4 py-2 font-semibold text-gray-600 hover:text-gray-800"
                    >
                        학생 리포트
                    </button>
                </nav>
            </div>
            
            <!-- 제출 현황 탭 -->
            <div id="submissions-tab" class="tab-content">
                <div class="mb-4 flex justify-between items-center">
                    <h3 class="text-xl font-semibold text-gray-700">학생 제출 현황</h3>
                    <button 
                        id="download-pdf-btn" 
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        📄 전체 포트폴리오 PDF 다운로드
                    </button>
                </div>
                <div id="submissions-list" class="space-y-4">
                    <div class="text-center py-8">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p class="mt-2 text-gray-600">로딩 중...</p>
                    </div>
                </div>
            </div>
            
            <!-- 주제/장르 관리 탭 -->
            <div id="topics-genres-tab" class="tab-content hidden">
                <div class="grid md:grid-cols-2 gap-6">
                    <!-- 주제 관리 -->
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h3 class="text-lg font-semibold mb-4 text-gray-700">주제 관리</h3>
                        <div class="mb-4 flex space-x-2">
                            <input 
                                type="text" 
                                id="new-topic-input" 
                                placeholder="새 주제 이름"
                                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button 
                                id="add-topic-btn" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                추가
                            </button>
                        </div>
                        <div id="topics-list" class="space-y-2">
                            <p class="text-gray-500 text-sm">로딩 중...</p>
                        </div>
                    </div>
                    
                    <!-- 장르 관리 -->
                    <div class="border border-gray-200 rounded-lg p-4">
                        <h3 class="text-lg font-semibold mb-4 text-gray-700">장르 관리</h3>
                        <div class="mb-4 flex space-x-2">
                            <input 
                                type="text" 
                                id="new-genre-input" 
                                placeholder="새 장르 이름"
                                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <button 
                                id="add-genre-btn" 
                                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                추가
                            </button>
                        </div>
                        <div id="genres-list" class="space-y-2">
                            <p class="text-gray-500 text-sm">로딩 중...</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 프롬프트 관리 탭 -->
            <div id="prompt-tab" class="tab-content hidden">
                <div class="mb-6">
                    <h3 class="text-xl font-semibold mb-4 text-gray-700">AI 코칭 프롬프트 관리</h3>
                    <p class="text-sm text-gray-600 mb-4">
                        학생들이 AI 코칭을 받을 때 사용되는 프롬프트를 설정할 수 있습니다. 
                        프롬프트는 AI가 학생의 글을 어떻게 평가하고 피드백할지 결정합니다.
                    </p>
                    <div class="mb-4">
                        <label for="coaching-prompt" class="block text-sm font-medium text-gray-700 mb-2">
                            프롬프트 내용
                        </label>
                        <textarea 
                            id="coaching-prompt" 
                            rows="15"
                            placeholder="프롬프트를 입력하세요..."
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        ></textarea>
                        <p class="text-xs text-gray-500 mt-2">
                            참고: 프롬프트에서 <code class="bg-gray-100 px-1 rounded">{title}</code>, <code class="bg-gray-100 px-1 rounded">{content}</code>, <code class="bg-gray-100 px-1 rounded">{topicOrGenre}</code> 변수를 사용할 수 있습니다.
                        </p>
                    </div>
                    <div class="flex space-x-4">
                        <button 
                            id="save-prompt-btn" 
                            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            저장하기
                        </button>
                        <button 
                            id="reset-prompt-btn" 
                            class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            기본값으로 초기화
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 학생 리포트 탭 -->
            <div id="reports-tab" class="tab-content hidden">
                <div class="mb-4">
                    <h3 class="text-xl font-semibold text-gray-700 mb-4">학생별 글 모음 및 발전 리포트</h3>
                    <div id="reports-list" class="space-y-4">
                        <div class="text-center py-8">
                            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p class="mt-2 text-gray-600">로딩 중...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 탭 전환
    document.getElementById('tab-submissions').addEventListener('click', () => {
        switchTab('submissions');
    });
    
    document.getElementById('tab-topics-genres').addEventListener('click', () => {
        switchTab('topics-genres');
    });
    
    document.getElementById('tab-prompt').addEventListener('click', () => {
        switchTab('prompt');
    });
    
    document.getElementById('tab-reports').addEventListener('click', () => {
        switchTab('reports');
        loadStudentReports();
    });
    
    // 제출 현황 로드
    await loadSubmissions();
    
    // 주제/장르 관리 로드
    await loadTopicsAndGenres();
    
    // 프롬프트 관리 로드
    await loadPrompt();
    
    // 주제 추가
    document.getElementById('add-topic-btn').addEventListener('click', async () => {
        const input = document.getElementById('new-topic-input');
        const name = input.value.trim();
        
        if (!name) {
            alert('주제 이름을 입력해주세요.');
            return;
        }
        
        try {
            await addTopic(name);
            input.value = '';
            await loadTopicsAndGenres();
        } catch (error) {
            alert('주제 추가에 실패했습니다: ' + error.message);
        }
    });
    
    // 장르 추가
    document.getElementById('add-genre-btn').addEventListener('click', async () => {
        const input = document.getElementById('new-genre-input');
        const name = input.value.trim();
        
        if (!name) {
            alert('장르 이름을 입력해주세요.');
            return;
        }
        
        try {
            await addGenre(name);
            input.value = '';
            await loadTopicsAndGenres();
        } catch (error) {
            alert('장르 추가에 실패했습니다: ' + error.message);
        }
    });
    
    // Enter 키로 추가
    document.getElementById('new-topic-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('add-topic-btn').click();
        }
    });
    
    document.getElementById('new-genre-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('add-genre-btn').click();
        }
    });
    
    // PDF 다운로드
    document.getElementById('download-pdf-btn').addEventListener('click', async () => {
        await downloadPortfolioPDF();
    });
    
    // 프롬프트 저장
    document.getElementById('save-prompt-btn').addEventListener('click', async () => {
        const promptText = document.getElementById('coaching-prompt').value.trim();
        
        if (!promptText) {
            alert('프롬프트를 입력해주세요.');
            return;
        }
        
        try {
            await saveCoachingPrompt(promptText);
            alert('프롬프트가 저장되었습니다.');
        } catch (error) {
            alert('프롬프트 저장에 실패했습니다: ' + error.message);
        }
    });
    
    // 프롬프트 초기화
    document.getElementById('reset-prompt-btn').addEventListener('click', () => {
        if (confirm('기본 프롬프트로 초기화하시겠습니까? 현재 프롬프트는 삭제됩니다.')) {
            const defaultPrompt = `당신은 초등학생의 글쓰기 실력을 칭찬하고 격려하며 성장시키는 'AI 글쓰기 코치'입니다. 초등학교 5학년 학생이 쓴 글을 검토해주세요.

학생의 장점을 먼저 칭찬하고 격려하는 말을 꼭 해주세요.
그다음, 아래 세 가지 관점에서 피드백해주세요.

1. [주제와 내용] : 글의 내용이 선택한 주제(혹은 장르)와 얼마나 잘 연결되나요?
2. [생각과 표현] : 글쓴이의 생각이나 느낌이 명확하고 구체적으로 잘 표현되었나요?
3. [더 멋진 글로!] : 어휘를 더 풍부하게 사용하거나, 문장의 연결을 다듬어서 글을 더 좋게 만들 수 있는 부분은 없을까요?

각 항목에 대해 학생이 스스로 생각하고 글을 고칠 수 있도록, 친절하게 질문을 던지는 방식으로 코칭해주세요. 답변은 마크다운으로 작성해주세요.`;
            document.getElementById('coaching-prompt').value = defaultPrompt;
        }
    });
}

function switchTab(tabName) {
    // 탭 버튼 스타일 업데이트
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-b-2', 'border-blue-600', 'text-blue-600');
        btn.classList.add('text-gray-600');
    });
    
    // 탭 콘텐츠 숨기기
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // 선택된 탭 표시
    if (tabName === 'submissions') {
        document.getElementById('tab-submissions').classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-submissions').classList.remove('text-gray-600');
        document.getElementById('submissions-tab').classList.remove('hidden');
    } else if (tabName === 'topics-genres') {
        document.getElementById('tab-topics-genres').classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-topics-genres').classList.remove('text-gray-600');
        document.getElementById('topics-genres-tab').classList.remove('hidden');
    } else if (tabName === 'prompt') {
        document.getElementById('tab-prompt').classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-prompt').classList.remove('text-gray-600');
        document.getElementById('prompt-tab').classList.remove('hidden');
    } else if (tabName === 'reports') {
        document.getElementById('tab-reports').classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-reports').classList.remove('text-gray-600');
        document.getElementById('reports-tab').classList.remove('hidden');
    }
}

async function loadSubmissions() {
    const submissionsList = document.getElementById('submissions-list');
    
    try {
        const writings = await getWritings();
        
        if (writings.length === 0) {
            submissionsList.innerHTML = '<p class="text-center text-gray-500 py-8">아직 제출된 글이 없습니다.</p>';
            return;
        }
        
        // 학생별로 그룹화
        const studentsMap = new Map();
        
        writings.forEach(writing => {
            const userId = writing.userId;
            if (!studentsMap.has(userId)) {
                studentsMap.set(userId, {
                    userName: writing.userName,
                    writings: []
                });
            }
            studentsMap.get(userId).writings.push(writing);
        });
        
        submissionsList.innerHTML = Array.from(studentsMap.entries()).map(([userId, student]) => {
            const totalWritings = student.writings.length;
            const totalLikes = student.writings.reduce((sum, w) => sum + (w.likes || 0), 0);
            const totalComments = student.writings.reduce((sum, w) => sum + (w.comments?.length || 0), 0);
            
            return `
                <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h4 class="text-lg font-bold text-gray-800">${escapeHtml(student.userName)}</h4>
                            <p class="text-sm text-gray-600 mt-1">
                                총 ${totalWritings}개의 글 | 좋아요 ${totalLikes}개 | 댓글 ${totalComments}개
                            </p>
                        </div>
                        <button 
                            class="download-student-pdf-btn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            data-user-id="${userId}"
                            data-user-name="${escapeHtml(student.userName)}"
                        >
                            📄 PDF 다운로드
                        </button>
                    </div>
                    <div class="space-y-2">
                        ${student.writings.map(writing => {
                            const createdAt = writing.createdAt?.toDate ? writing.createdAt.toDate() : new Date();
                            return `
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <div class="flex justify-between items-start">
                                        <div class="flex-1">
                                            <h5 class="font-semibold text-gray-800">${escapeHtml(writing.title)}</h5>
                                            <p class="text-xs text-gray-600 mt-1">
                                                ${escapeHtml(writing.topicOrGenre)} | ${formatDate(createdAt)}
                                            </p>
                                            <p class="text-sm text-gray-700 mt-2 line-clamp-2">
                                                ${escapeHtml(writing.content.substring(0, 100))}${writing.content.length > 100 ? '...' : ''}
                                            </p>
                                        </div>
                                        <div class="ml-4 text-right text-sm text-gray-600">
                                            <div>❤️ ${writing.likes || 0}</div>
                                            <div>💬 ${writing.comments?.length || 0}</div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        // 학생별 PDF 다운로드 버튼 이벤트
        submissionsList.querySelectorAll('.download-student-pdf-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = btn.dataset.userId;
                const userName = btn.dataset.userName;
                const studentWritings = writings.filter(w => w.userId === userId);
                await downloadStudentPDF(userName, studentWritings);
            });
        });
        
    } catch (error) {
        submissionsList.innerHTML = `<p class="text-center text-red-500 py-8">오류가 발생했습니다: ${error.message}</p>`;
    }
}

async function loadTopicsAndGenres() {
    try {
        const { topics, genres } = await getTopicsAndGenres();
        
        // 주제 목록 렌더링
        const topicsList = document.getElementById('topics-list');
        if (topics.length === 0) {
            topicsList.innerHTML = '<p class="text-gray-500 text-sm">등록된 주제가 없습니다.</p>';
        } else {
            topicsList.innerHTML = topics.map(topic => `
                <div class="bg-gray-50 rounded-lg p-3 mb-2">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-800 font-medium">${escapeHtml(topic.name)}</span>
                        <div class="flex space-x-2">
                            <button 
                                class="edit-topic-prompt-btn px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                                data-topic-id="${topic.id}"
                                data-topic-name="${escapeHtml(topic.name)}"
                            >
                                프롬프트
                            </button>
                            <button 
                                class="delete-topic-btn px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                                data-topic-id="${topic.id}"
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            topicsList.querySelectorAll('.delete-topic-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('이 주제를 삭제하시겠습니까?')) {
                        try {
                            await deleteTopic(btn.dataset.topicId);
                            await loadTopicsAndGenres();
                        } catch (error) {
                            alert('주제 삭제에 실패했습니다: ' + error.message);
                        }
                    }
                });
            });
            
            topicsList.querySelectorAll('.edit-topic-prompt-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    await showTopicPromptModal(btn.dataset.topicId, btn.dataset.topicName);
                });
            });
        }
        
        // 장르 목록 렌더링
        const genresList = document.getElementById('genres-list');
        if (genres.length === 0) {
            genresList.innerHTML = '<p class="text-gray-500 text-sm">등록된 장르가 없습니다.</p>';
        } else {
            genresList.innerHTML = genres.map(genre => `
                <div class="bg-gray-50 rounded-lg p-3 mb-2">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-800 font-medium">${escapeHtml(genre.name)}</span>
                        <div class="flex space-x-2">
                            <button 
                                class="edit-genre-prompt-btn px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                                data-genre-id="${genre.id}"
                                data-genre-name="${escapeHtml(genre.name)}"
                            >
                                프롬프트
                            </button>
                            <button 
                                class="delete-genre-btn px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                                data-genre-id="${genre.id}"
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
            
            genresList.querySelectorAll('.delete-genre-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (confirm('이 장르를 삭제하시겠습니까?')) {
                        try {
                            await deleteGenre(btn.dataset.genreId);
                            await loadTopicsAndGenres();
                        } catch (error) {
                            alert('장르 삭제에 실패했습니다: ' + error.message);
                        }
                    }
                });
            });
            
            genresList.querySelectorAll('.edit-genre-prompt-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    await showGenrePromptModal(btn.dataset.genreId, btn.dataset.genreName);
                });
            });
        }
    } catch (error) {
        console.error('주제/장르 로드 오류:', error);
    }
}

async function downloadPortfolioPDF() {
    try {
        const writings = await getWritings();
        
        if (writings.length === 0) {
            alert('다운로드할 글이 없습니다.');
            return;
        }
        
        // 학생별로 그룹화
        const studentsMap = new Map();
        writings.forEach(writing => {
            const userId = writing.userId;
            if (!studentsMap.has(userId)) {
                studentsMap.set(userId, {
                    userName: writing.userName,
                    writings: []
                });
            }
            studentsMap.get(userId).writings.push(writing);
        });
        
        // PDF 생성
        await generatePDF('전체 학생 포트폴리오', Array.from(studentsMap.values()));
    } catch (error) {
        alert('PDF 다운로드에 실패했습니다: ' + error.message);
    }
}

async function downloadStudentPDF(userName, writings) {
    if (writings.length === 0) {
        alert('다운로드할 글이 없습니다.');
        return;
    }
    
    await generatePDF(`${userName}님의 포트폴리오`, [{
        userName: userName,
        writings: writings
    }]);
}

async function generatePDF(title, students) {
    // jsPDF 라이브러리 로드
    if (typeof window.jspdf === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);
        
        await new Promise((resolve) => {
            script.onload = resolve;
        });
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;
    
    // 제목
    doc.setFontSize(18);
    doc.text(title, margin, yPos);
    yPos += 15;
    
    // 각 학생의 글
    students.forEach((student, studentIndex) => {
        // 새 페이지가 필요하면 추가
        if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = 20;
        }
        
        // 학생 이름
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`${student.userName}님의 글`, margin, yPos);
        yPos += 10;
        
        // 각 글
        student.writings.forEach((writing, writingIndex) => {
            // 새 페이지가 필요하면 추가
            if (yPos > pageHeight - 60) {
                doc.addPage();
                yPos = 20;
            }
            
            const createdAt = writing.createdAt?.toDate ? writing.createdAt.toDate() : new Date();
            const dateStr = createdAt.toLocaleDateString('ko-KR');
            
            // 제목
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            const titleLines = doc.splitTextToSize(
                `${writingIndex + 1}. ${writing.title}`, 
                doc.internal.pageSize.width - 2 * margin
            );
            doc.text(titleLines, margin, yPos);
            yPos += titleLines.length * lineHeight + 3;
            
            // 메타 정보
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.text(
                `주제/장르: ${writing.topicOrGenre} | 작성일: ${dateStr} | 좋아요: ${writing.likes || 0} | 댓글: ${writing.comments?.length || 0}`,
                margin,
                yPos
            );
            yPos += 8;
            
            // 내용
            doc.setFontSize(10);
            const contentLines = doc.splitTextToSize(
                writing.content,
                doc.internal.pageSize.width - 2 * margin
            );
            doc.text(contentLines, margin, yPos);
            yPos += contentLines.length * lineHeight + 10;
            
            // 댓글이 있으면 표시
            if (writing.comments && writing.comments.length > 0) {
                doc.setFontSize(9);
                doc.setFont(undefined, 'italic');
                doc.text('댓글:', margin, yPos);
                yPos += 6;
                
                writing.comments.forEach(comment => {
                    if (yPos > pageHeight - 30) {
                        doc.addPage();
                        yPos = 20;
                    }
                    const commentText = `- ${comment.userName}: ${comment.text}`;
                    const commentLines = doc.splitTextToSize(
                        commentText,
                        doc.internal.pageSize.width - 2 * margin - 10
                    );
                    doc.text(commentLines, margin + 5, yPos);
                    yPos += commentLines.length * lineHeight + 3;
                });
                yPos += 5;
            }
            
            // 구분선
            if (writingIndex < student.writings.length - 1) {
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, yPos, doc.internal.pageSize.width - margin, yPos);
                yPos += 5;
            }
        });
        
        // 학생 간 구분
        if (studentIndex < students.length - 1) {
            if (yPos > pageHeight - 30) {
                doc.addPage();
                yPos = 20;
            } else {
                yPos += 10;
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.5);
                doc.line(margin, yPos, doc.internal.pageSize.width - margin, yPos);
                yPos += 10;
            }
        }
    });
    
    // PDF 다운로드
    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadPrompt() {
    try {
        const prompt = await getCoachingPrompt();
        document.getElementById('coaching-prompt').value = prompt;
    } catch (error) {
        console.error('프롬프트 로드 오류:', error);
    }
}

// 주제 프롬프트 모달 표시
async function showTopicPromptModal(topicId, topicName) {
    const prompt = await getTopicPrompt(topicId);
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-4 text-gray-800">주제: ${escapeHtml(topicName)} - 추가 프롬프트</h3>
            <p class="text-sm text-gray-600 mb-4">
                이 주제에 대한 추가 프롬프트를 입력하세요. 기본 프롬프트에 추가되어 사용됩니다.
            </p>
            <textarea 
                id="topic-prompt-input" 
                rows="10"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm mb-4"
                placeholder="추가 프롬프트를 입력하세요..."
            >${escapeHtml(prompt)}</textarea>
            <div class="flex space-x-4 justify-end">
                <button 
                    id="cancel-topic-prompt-btn" 
                    class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    취소
                </button>
                <button 
                    id="save-topic-prompt-btn" 
                    class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    data-topic-id="${topicId}"
                >
                    저장
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('cancel-topic-prompt-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.getElementById('save-topic-prompt-btn').addEventListener('click', async () => {
        const promptText = document.getElementById('topic-prompt-input').value.trim();
        try {
            await saveTopicPrompt(topicId, promptText);
            alert('프롬프트가 저장되었습니다.');
            document.body.removeChild(modal);
        } catch (error) {
            alert('프롬프트 저장에 실패했습니다: ' + error.message);
        }
    });
}

// 장르 프롬프트 모달 표시
async function showGenrePromptModal(genreId, genreName) {
    const prompt = await getGenrePrompt(genreId);
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-4 text-gray-800">장르: ${escapeHtml(genreName)} - 추가 프롬프트</h3>
            <p class="text-sm text-gray-600 mb-4">
                이 장르에 대한 추가 프롬프트를 입력하세요. 기본 프롬프트에 추가되어 사용됩니다.
            </p>
            <textarea 
                id="genre-prompt-input" 
                rows="10"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm mb-4"
                placeholder="추가 프롬프트를 입력하세요..."
            >${escapeHtml(prompt)}</textarea>
            <div class="flex space-x-4 justify-end">
                <button 
                    id="cancel-genre-prompt-btn" 
                    class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    취소
                </button>
                <button 
                    id="save-genre-prompt-btn" 
                    class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    data-genre-id="${genreId}"
                >
                    저장
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('cancel-genre-prompt-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.getElementById('save-genre-prompt-btn').addEventListener('click', async () => {
        const promptText = document.getElementById('genre-prompt-input').value.trim();
        try {
            await saveGenrePrompt(genreId, promptText);
            alert('프롬프트가 저장되었습니다.');
            document.body.removeChild(modal);
        } catch (error) {
            alert('프롬프트 저장에 실패했습니다: ' + error.message);
        }
    });
}

// 학생 리포트 로드
async function loadStudentReports() {
    const reportsList = document.getElementById('reports-list');
    
    try {
        const writings = await getWritings();
        
        if (writings.length === 0) {
            reportsList.innerHTML = '<p class="text-center text-gray-500 py-8">아직 제출된 글이 없습니다.</p>';
            return;
        }
        
        // 학생별로 그룹화 및 정렬 (시간순)
        // userName으로 그룹화 (익명 로그인 시 userId가 매번 달라질 수 있음)
        const studentsMap = new Map();
        
        writings.forEach(writing => {
            // userName을 기준으로 그룹화 (같은 이름이면 같은 학생으로 간주)
            const userName = writing.userName || '익명';
            
            if (!studentsMap.has(userName)) {
                studentsMap.set(userName, {
                    userName: userName,
                    userId: writing.userId, // 첫 번째 userId 저장 (참고용)
                    writings: []
                });
            }
            studentsMap.get(userName).writings.push(writing);
        });
        
        // 각 학생의 글을 시간순으로 정렬
        studentsMap.forEach(student => {
            student.writings.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateA - dateB;
            });
        });
        
        reportsList.innerHTML = Array.from(studentsMap.values()).map(student => {
            const totalWritings = student.writings.length;
            const totalLikes = student.writings.reduce((sum, w) => sum + (w.likes || 0), 0);
            const totalComments = student.writings.reduce((sum, w) => sum + (w.comments?.length || 0), 0);
            
            // 발전 지표 계산
            const firstWriting = student.writings[0];
            const lastWriting = student.writings[student.writings.length - 1];
            const firstDate = firstWriting?.createdAt?.toDate ? firstWriting.createdAt.toDate() : new Date();
            const lastDate = lastWriting?.createdAt?.toDate ? lastWriting.createdAt.toDate() : new Date();
            const daysDiff = Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24));
            
            // 글 길이 변화 분석
            const avgLength = student.writings.reduce((sum, w) => sum + w.content.length, 0) / totalWritings;
            const firstLength = firstWriting?.content.length || 0;
            const lastLength = lastWriting?.content.length || 0;
            const lengthGrowth = firstLength > 0 ? ((lastLength - firstLength) / firstLength * 100).toFixed(1) : 0;
            
            // 주제/장르 다양성
            const uniqueTopics = new Set(student.writings.map(w => w.topicOrGenre));
            const topicDiversity = uniqueTopics.size;
            
            return `
                <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex-1">
                            <h4 class="text-xl font-bold text-gray-800 mb-2">${escapeHtml(student.userName)}</h4>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p class="text-gray-500">총 글 수</p>
                                    <p class="text-lg font-semibold text-blue-600">${totalWritings}개</p>
                                </div>
                                <div>
                                    <p class="text-gray-500">기간</p>
                                    <p class="text-lg font-semibold text-green-600">${daysDiff}일</p>
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
                        <button 
                            class="view-student-detail-btn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            data-user-name="${escapeHtml(student.userName)}"
                        >
                            상세 보기
                        </button>
                    </div>
                    
                    <!-- 발전 리포트 -->
                    <div class="bg-blue-50 rounded-lg p-4 mb-4">
                        <div class="flex justify-between items-center mb-3">
                            <h5 class="font-semibold text-gray-800">📊 글쓰기 능력 발전 리포트</h5>
                            <button 
                                class="generate-ai-report-btn px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs"
                                data-user-name="${escapeHtml(student.userName)}"
                            >
                                🤖 AI 분석 리포트 생성
                            </button>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                            <div>
                                <p class="text-gray-600">글 길이 변화</p>
                                <p class="text-lg font-bold ${lengthGrowth > 0 ? 'text-green-600' : lengthGrowth < 0 ? 'text-red-600' : 'text-gray-600'}">
                                    ${lengthGrowth > 0 ? '+' : ''}${lengthGrowth}%
                                </p>
                                <p class="text-xs text-gray-500">첫 글: ${firstLength}자 → 최근 글: ${lastLength}자</p>
                            </div>
                            <div>
                                <p class="text-gray-600">평균 글 길이</p>
                                <p class="text-lg font-bold text-blue-600">${Math.round(avgLength)}자</p>
                            </div>
                            <div>
                                <p class="text-gray-600">주제 다양성</p>
                                <p class="text-lg font-bold text-purple-600">${topicDiversity}가지</p>
                                <p class="text-xs text-gray-500">${Array.from(uniqueTopics).slice(0, 3).join(', ')}${uniqueTopics.size > 3 ? '...' : ''}</p>
                            </div>
                        </div>
                        <div id="ai-report-${escapeHtml(student.userName)}" class="hidden mt-3"></div>
                    </div>
                    
                    <!-- 글 목록 (최근 3개만 미리보기) -->
                    <div class="space-y-2">
                        <h5 class="font-semibold text-gray-700 mb-2">최근 글 (최근 3개)</h5>
                        ${student.writings.slice(-3).reverse().map(writing => {
                            const createdAt = writing.createdAt?.toDate ? writing.createdAt.toDate() : new Date();
                            return `
                                <div class="bg-gray-50 rounded-lg p-3">
                                    <div class="flex justify-between items-start">
                                        <div class="flex-1">
                                            <h6 class="font-semibold text-gray-800">${escapeHtml(writing.title)}</h6>
                                            <p class="text-xs text-gray-600 mt-1">
                                                ${escapeHtml(writing.topicOrGenre)} | ${formatDate(createdAt)} | ${writing.content.length}자
                                            </p>
                                        </div>
                                        <div class="ml-4 text-right text-sm text-gray-600">
                                            <div>❤️ ${writing.likes || 0}</div>
                                            <div>💬 ${writing.comments?.length || 0}</div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        ${totalWritings > 3 ? `<p class="text-sm text-gray-500 text-center mt-2">외 ${totalWritings - 3}개의 글 더 보기</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // 상세 보기 버튼 이벤트
        reportsList.querySelectorAll('.view-student-detail-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userName = btn.dataset.userName;
                // userName으로 필터링 (같은 이름의 모든 글)
                const studentWritings = writings.filter(w => w.userName === userName);
                showStudentDetailModal(userName, studentWritings);
            });
        });
        
        // AI 리포트 생성 버튼 이벤트
        reportsList.querySelectorAll('.generate-ai-report-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userName = btn.dataset.userName;
                const studentWritings = writings.filter(w => w.userName === userName);
                const reportDiv = document.getElementById(`ai-report-${userName}`);
                
                // 버튼 비활성화
                btn.disabled = true;
                btn.textContent = '⏳ 분석 중...';
                
                // 리포트 영역 표시
                reportDiv.classList.remove('hidden');
                reportDiv.innerHTML = `
                    <div class="bg-white rounded-lg p-4 border border-purple-200">
                        <div class="flex items-center space-x-2 mb-2">
                            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                            <p class="text-sm text-gray-600">AI가 글쓰기 능력 향상을 분석하고 있습니다...</p>
                        </div>
                    </div>
                `;
                
                try {
                    const report = await generateProgressReport(userName, studentWritings);
                    
                    // 그래프 데이터 생성
                    const chartData = generateChartData(studentWritings);
                    
                    // 마크다운을 HTML로 변환 (간단한 변환)
                    const htmlReport = convertMarkdownToHtml(report);
                    
                    // 고유 ID 생성
                    const chartId = `chart-${userName.replace(/\s+/g, '-')}-${Date.now()}`;
                    
                    reportDiv.innerHTML = `
                        <div class="bg-white rounded-lg p-4 border border-purple-200">
                            <h6 class="font-semibold text-purple-800 mb-3">🤖 AI 분석 리포트</h6>
                            
                            <!-- 그래프 섹션 -->
                            <div class="mb-4">
                                <h6 class="font-semibold text-gray-700 mb-3">📈 글쓰기 지표 변화</h6>
                                <div class="bg-gray-50 rounded-lg p-4">
                                    <canvas id="${chartId}" style="max-height: 400px;"></canvas>
                                </div>
                            </div>
                            
                            <!-- AI 리포트 텍스트 -->
                            <div class="prose prose-sm max-w-none text-gray-700">
                                ${htmlReport}
                            </div>
                        </div>
                    `;
                    
                    // 그래프 렌더링
                    setTimeout(() => {
                        renderProgressChart(chartId, chartData);
                    }, 100);
                    
                    btn.disabled = false;
                    btn.textContent = '🔄 다시 생성';
                } catch (error) {
                    reportDiv.innerHTML = `
                        <div class="bg-red-50 rounded-lg p-4 border border-red-200">
                            <p class="text-sm text-red-600">리포트 생성 중 오류가 발생했습니다: ${error.message}</p>
                            <button 
                                class="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                onclick="this.closest('[id^=ai-report-]').classList.add('hidden')"
                            >
                                닫기
                            </button>
                        </div>
                    `;
                    btn.disabled = false;
                    btn.textContent = '🤖 AI 분석 리포트 생성';
                }
            });
        });
        
    } catch (error) {
        reportsList.innerHTML = `<p class="text-center text-red-500 py-8">오류가 발생했습니다: ${error.message}</p>`;
    }
}

// 학생 상세 모달 표시
function showStudentDetailModal(userName, writings) {
    // 시간순 정렬
    writings.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateA - dateB;
    });
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-2xl font-bold text-gray-800">${escapeHtml(userName)}님의 모든 글</h3>
                <button 
                    id="close-student-detail-btn" 
                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    닫기
                </button>
            </div>
            
            <div class="space-y-4">
                ${writings.map((writing, index) => {
                    const createdAt = writing.createdAt?.toDate ? writing.createdAt.toDate() : new Date();
                    const prevWriting = index > 0 ? writings[index - 1] : null;
                    const prevDate = prevWriting?.createdAt?.toDate ? prevWriting.createdAt.toDate() : null;
                    const daysSincePrev = prevDate ? Math.floor((createdAt - prevDate) / (1000 * 60 * 60 * 24)) : null;
                    
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
                                        ${daysSincePrev !== null ? ` | 이전 글로부터 ${daysSincePrev}일 후` : ''}
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
    
    document.getElementById('close-student-detail-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

// 그래프 데이터 생성
function generateChartData(writings) {
    // 시간순 정렬
    const sortedWritings = [...writings].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateA - dateB;
    });
    
    const labels = [];
    const dataLength = [];
    const dataVocabulary = [];
    const dataAvgSentenceLength = [];
    const dataParagraphs = [];
    
    sortedWritings.forEach((writing, index) => {
        const createdAt = writing.createdAt?.toDate ? writing.createdAt.toDate() : new Date();
        labels.push(`${index + 1}번째 글\n${createdAt.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`);
        
        // 글 길이 (자수)
        dataLength.push(writing.content.length);
        
        // 어휘 다양성 (고유 단어 수)
        const words = writing.content
            .replace(/[^\w\s가-힣]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);
        const uniqueWords = new Set(words);
        dataVocabulary.push(uniqueWords.size);
        
        // 평균 문장 길이
        const sentences = writing.content
            .split(/[.!?。！？\n]/)
            .filter(s => s.trim().length > 0);
        const avgSentenceLength = sentences.length > 0
            ? Math.round(sentences.reduce((sum, s) => sum + s.trim().length, 0) / sentences.length)
            : 0;
        dataAvgSentenceLength.push(avgSentenceLength);
        
        // 문단 수
        const paragraphs = writing.content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        dataParagraphs.push(paragraphs.length);
    });
    
    return {
        labels,
        datasets: [
            {
                label: '글 길이 (자)',
                data: dataLength,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                label: '어휘 다양성 (고유 단어 수)',
                data: dataVocabulary,
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                yAxisID: 'y1'
            },
            {
                label: '평균 문장 길이 (자)',
                data: dataAvgSentenceLength,
                borderColor: 'rgb(168, 85, 247)',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                tension: 0.4,
                yAxisID: 'y'
            },
            {
                label: '문단 수',
                data: dataParagraphs,
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                yAxisID: 'y1'
            }
        ]
    };
}

// 그래프 렌더링
function renderProgressChart(canvasId, chartData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // Chart.js가 로드되었는지 확인
    if (typeof Chart === 'undefined') {
        console.error('Chart.js가 로드되지 않았습니다.');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // 기존 차트가 있으면 제거
    if (canvas.chart) {
        canvas.chart.destroy();
    }
    
    canvas.chart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                title: {
                    display: true,
                    text: '글쓰기 능력 발전 추이',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '글 길이 / 평균 문장 길이 (자)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '어휘 다양성 / 문단 수'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '작성 순서'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// 마크다운을 간단한 HTML로 변환
function convertMarkdownToHtml(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    // 헤더 변환 (먼저 처리)
    html = html.replace(/^### (.*$)/gim, '<h3 class="font-bold text-lg mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="font-bold text-xl mt-5 mb-3">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="font-bold text-2xl mt-6 mb-4">$1</h1>');
    
    // 볼드
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    
    // 리스트를 먼저 처리 (줄 단위로)
    const lines = html.split('\n');
    const processedLines = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const listMatch = line.match(/^[\*\-\d+\.]\s+(.+)$/);
        
        if (listMatch) {
            if (!inList) {
                processedLines.push('<ul class="list-disc ml-6 mb-2">');
                inList = true;
            }
            processedLines.push(`<li class="ml-2">${listMatch[1]}</li>`);
        } else {
            if (inList) {
                processedLines.push('</ul>');
                inList = false;
            }
            if (line.trim()) {
                processedLines.push(line);
            }
        }
    }
    
    if (inList) {
        processedLines.push('</ul>');
    }
    
    html = processedLines.join('\n');
    
    // 줄바꿈 처리
    html = html.replace(/\n\n+/g, '</p><p class="mb-2">');
    html = html.replace(/\n/g, '<br>');
    
    // 문단 감싸기 (이미 감싸진 부분 제외)
    if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<li')) {
        html = '<p class="mb-2">' + html + '</p>';
    }
    
    return html;
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


