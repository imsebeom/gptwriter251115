import { 
    getWritings, 
    getTopicsAndGenres, 
    addTopic, 
    addGenre, 
    deleteTopic, 
    deleteGenre,
    getUserName
} from './firebase.js';

export async function renderAdminScreen() {
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
        </div>
    `;
    
    // 탭 전환
    document.getElementById('tab-submissions').addEventListener('click', () => {
        switchTab('submissions');
    });
    
    document.getElementById('tab-topics-genres').addEventListener('click', () => {
        switchTab('topics-genres');
    });
    
    // 제출 현황 로드
    await loadSubmissions();
    
    // 주제/장르 관리 로드
    await loadTopicsAndGenres();
    
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
    } else {
        document.getElementById('tab-topics-genres').classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-topics-genres').classList.remove('text-gray-600');
        document.getElementById('topics-genres-tab').classList.remove('hidden');
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
                <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span class="text-gray-800">${escapeHtml(topic.name)}</span>
                    <button 
                        class="delete-topic-btn px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                        data-topic-id="${topic.id}"
                    >
                        삭제
                    </button>
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
        }
        
        // 장르 목록 렌더링
        const genresList = document.getElementById('genres-list');
        if (genres.length === 0) {
            genresList.innerHTML = '<p class="text-gray-500 text-sm">등록된 장르가 없습니다.</p>';
        } else {
            genresList.innerHTML = genres.map(genre => `
                <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span class="text-gray-800">${escapeHtml(genre.name)}</span>
                    <button 
                        class="delete-genre-btn px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                        data-genre-id="${genre.id}"
                    >
                        삭제
                    </button>
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


