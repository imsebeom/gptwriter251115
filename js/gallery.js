import { getWritings, toggleLike, addComment, getUserName, getUserData, db, getTopicsAndGenres } from './firebase.js';
import { currentUser, currentUserType } from './app.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export async function renderGalleryScreen() {
    const contentArea = document.getElementById('content-area');
    
    contentArea.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">작품 보관함</h2>
            
            <!-- 필터 및 정렬 영역 -->
            <div class="mb-6 space-y-4">
                <!-- 필터 섹션 -->
                <div class="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h3 class="text-sm font-semibold text-gray-700 mb-3">필터</h3>
                    <div class="grid md:grid-cols-3 gap-4">
                        <!-- 사람 필터 -->
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-2">작성자</label>
                            <div id="author-filters" class="flex flex-wrap gap-2">
                                <!-- 동적으로 생성 -->
                            </div>
                        </div>
                        
                        <!-- 주제 필터 -->
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-2">주제</label>
                            <div id="topic-filters" class="flex flex-wrap gap-2">
                                <!-- 동적으로 생성 -->
                            </div>
                        </div>
                        
                        <!-- 장르 필터 -->
                        <div>
                            <label class="block text-xs font-medium text-gray-600 mb-2">장르</label>
                            <div id="genre-filters" class="flex flex-wrap gap-2">
                                <!-- 동적으로 생성 -->
                            </div>
                        </div>
                    </div>
                    <button id="clear-filters-btn" class="mt-3 text-xs text-blue-600 hover:text-blue-800">
                        필터 초기화
                    </button>
                </div>
                
                <!-- 정렬 섹션 -->
                <div class="flex items-center space-x-4">
                    <label class="text-sm font-medium text-gray-700">정렬:</label>
                    <select id="sort-select" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="newest">최신순</option>
                        <option value="oldest">오래된순</option>
                        <option value="likes">좋아요순</option>
                        <option value="comments">댓글순</option>
                    </select>
                </div>
            </div>
            
            <!-- 글 목록 (그리드 레이아웃) -->
            <div id="writings-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div class="text-center py-8 col-span-full">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p class="mt-2 text-gray-600">로딩 중...</p>
                </div>
            </div>
        </div>
    `;
    
    await loadWritings();
}

// 필터 상태
let selectedAuthors = new Set();
let selectedTopics = new Set();
let selectedGenres = new Set();
let sortBy = 'newest';

async function loadWritings() {
    const writingsList = document.getElementById('writings-list');
    
    try {
        let writings = await getWritings();
        
        // 학생인 경우 자신의 글만 필터링
        if (currentUserType === 'student' && currentUser) {
            const userData = await getUserData(currentUser.uid);
            const userName = userData?.name;
            if (userName) {
                writings = writings.filter(w => w.userName === userName);
            }
        } else if (currentUserType === 'teacher' && currentUser) {
            // 교사는 자신이 추가한 학생의 글만 필터링
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const myStudentNames = new Set();
            
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.userType === 'student' && userData.teacherId === currentUser.uid) {
                    myStudentNames.add(userData.name);
                }
            });
            
            writings = writings.filter(w => myStudentNames.has(w.userName));
        }
        // 테스트 사용자는 필터링 없이 모든 글 표시
        
        // 필터 적용
        writings = applyFilters(writings);
        
        // 정렬 적용
        writings = applySort(writings);
        
        // 필터 옵션 렌더링 (처음 한 번만)
        const authorFiltersEl = document.getElementById('author-filters');
        if (authorFiltersEl && authorFiltersEl.children.length === 0) {
            // 모든 글을 가져와서 필터 옵션 생성
            const allWritings = await getWritings();
            await renderFilterOptions(allWritings);
        }
        
        if (writings.length === 0) {
            writingsList.innerHTML = '<p class="text-center text-gray-500 py-8 col-span-full">조건에 맞는 글이 없습니다.</p>';
            return;
        }
        
        writingsList.innerHTML = writings.map(writing => {
            const isLiked = writing.likedBy && writing.likedBy.includes(currentUser.uid);
            const comments = writing.comments || [];
            const createdAt = writing.createdAt?.toDate ? writing.createdAt.toDate() : new Date();
            
            // 내용 미리보기 (최대 150자)
            const contentPreview = writing.content.length > 150 
                ? writing.content.substring(0, 150) + '...' 
                : writing.content;
            
            // 주제/장르 태그 파싱
            const topicGenreTags = writing.topicOrGenre ? writing.topicOrGenre.split(', ') : [];
            
            return `
                <div class="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white flex flex-col h-full">
                    <div class="flex-1">
                        <h3 class="text-lg font-bold text-gray-800 mb-2 line-clamp-2">${escapeHtml(writing.title)}</h3>
                        <p class="text-xs text-gray-500 mb-2">
                            <span class="font-semibold text-gray-700">${escapeHtml(writing.userName)}</span> · ${formatDate(createdAt)}
                        </p>
                        
                        <!-- 주제/장르 태그 -->
                        ${topicGenreTags.length > 0 ? `
                            <div class="flex flex-wrap gap-1 mb-3">
                                ${topicGenreTags.map(tag => `
                                    <span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">${escapeHtml(tag.trim())}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="text-sm text-gray-700 mb-4 line-clamp-4 whitespace-pre-wrap">
                            ${escapeHtml(contentPreview)}
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-between mt-auto pt-3 border-t border-gray-200">
                        <button 
                            class="like-btn flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                                isLiked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }"
                            data-writing-id="${writing.id}"
                        >
                            <span>❤️</span>
                            <span>${writing.likes || 0}</span>
                        </button>
                        
                        <button 
                            class="comment-toggle-btn px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                            data-writing-id="${writing.id}"
                        >
                            💬 ${comments.length}
                        </button>
                    </div>
                    
                    <!-- 댓글 영역 -->
                    <div id="comments-${writing.id}" class="hidden mt-4 pt-4 border-t border-gray-200">
                        <div class="mb-4">
                            <div class="flex space-x-2">
                                <input 
                                    type="text" 
                                    id="comment-input-${writing.id}" 
                                    placeholder="댓글을 입력하세요..."
                                    class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button 
                                    class="add-comment-btn px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                    data-writing-id="${writing.id}"
                                >
                                    등록
                                </button>
                            </div>
                        </div>
                        <div id="comments-list-${writing.id}" class="space-y-2 max-h-40 overflow-y-auto">
                            ${renderComments(comments)}
                        </div>
                    </div>
                    
                    <!-- 전체 내용 보기 모달 트리거 -->
                    <button 
                        class="view-full-btn w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        data-writing-id="${writing.id}"
                    >
                        전체 보기
                    </button>
                </div>
            `;
        }).join('');
        
        // 좋아요 버튼 이벤트
        writingsList.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const writingId = btn.dataset.writingId;
                await toggleLike(writingId, currentUser.uid);
                await loadWritings(); // 새로고침
            });
        });
        
        // 댓글 토글 버튼 이벤트
        writingsList.querySelectorAll('.comment-toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const writingId = btn.dataset.writingId;
                const commentsDiv = document.getElementById(`comments-${writingId}`);
                commentsDiv.classList.toggle('hidden');
            });
        });
        
        // 댓글 추가 버튼 이벤트
        writingsList.querySelectorAll('.add-comment-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const writingId = btn.dataset.writingId;
                const input = document.getElementById(`comment-input-${writingId}`);
                const commentText = input.value.trim();
                
                if (!commentText) {
                    alert('댓글을 입력해주세요.');
                    return;
                }
                
                try {
                    const userName = await getUserName(currentUser.uid);
                    await addComment(writingId, {
                        userId: currentUser.uid,
                        userName: userName,
                        text: commentText
                    });
                    
                    input.value = '';
                    await loadWritings(); // 새로고침
                } catch (error) {
                    alert('댓글 등록에 실패했습니다: ' + error.message);
                }
            });
        });
        
        // Enter 키로 댓글 등록
        writingsList.querySelectorAll('[id^="comment-input-"]').forEach(input => {
            input.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    const writingId = input.id.replace('comment-input-', '');
                    const btn = document.querySelector(`.add-comment-btn[data-writing-id="${writingId}"]`);
                    btn.click();
                }
            });
        });
        
        // 전체 보기 버튼 이벤트
        writingsList.querySelectorAll('.view-full-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const writingId = btn.dataset.writingId;
                const writing = writings.find(w => w.id === writingId);
                if (writing) {
                    showFullWritingModal(writing);
                }
            });
        });
        
    } catch (error) {
        writingsList.innerHTML = `<p class="text-center text-red-500 py-8 col-span-full">오류가 발생했습니다: ${error.message}</p>`;
    }
}

// 필터 적용
function applyFilters(writings) {
    let filtered = [...writings];
    
    // 작성자 필터
    if (selectedAuthors.size > 0) {
        filtered = filtered.filter(w => selectedAuthors.has(w.userName));
    }
    
    // 주제/장르 필터
    if (selectedTopics.size > 0 || selectedGenres.size > 0) {
        filtered = filtered.filter(w => {
            if (!w.topicOrGenre) return false;
            const tags = w.topicOrGenre.split(', ').map(t => t.trim());
            
            // 주제 필터
            if (selectedTopics.size > 0) {
                const hasTopic = tags.some(tag => selectedTopics.has(tag));
                if (!hasTopic) return false;
            }
            
            // 장르 필터
            if (selectedGenres.size > 0) {
                const hasGenre = tags.some(tag => selectedGenres.has(tag));
                if (!hasGenre) return false;
            }
            
            return true;
        });
    }
    
    return filtered;
}

// 정렬 적용
function applySort(writings) {
    const sorted = [...writings];
    
    switch (sortBy) {
        case 'newest':
            sorted.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });
            break;
        case 'oldest':
            sorted.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateA - dateB;
            });
            break;
        case 'likes':
            sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
        case 'comments':
            sorted.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
            break;
    }
    
    return sorted;
}

// 필터 옵션 렌더링
async function renderFilterOptions(allWritings) {
    // 작성자 목록 추출
    const authors = new Set();
    allWritings.forEach(w => {
        if (w.userName) authors.add(w.userName);
    });
    
    // 주제/장르 목록 추출
    const topics = new Set();
    const genres = new Set();
    
    try {
        const { topics: topicList, genres: genreList } = await getTopicsAndGenres();
        topicList.forEach(t => topics.add(t.name));
        genreList.forEach(g => genres.add(g.name));
    } catch (error) {
        console.error('주제/장르 로드 오류:', error);
    }
    
    // 작성자 필터 렌더링
    const authorFilters = document.getElementById('author-filters');
    Array.from(authors).sort().forEach(author => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn author-filter px-3 py-1 text-xs rounded-full border border-gray-300 bg-white hover:bg-blue-50 transition-colors';
        btn.textContent = author;
        btn.dataset.author = author;
        btn.addEventListener('click', () => {
            if (selectedAuthors.has(author)) {
                selectedAuthors.delete(author);
                btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
                btn.classList.add('bg-white', 'border-gray-300');
            } else {
                selectedAuthors.add(author);
                btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
                btn.classList.remove('bg-white', 'border-gray-300');
            }
            loadWritings();
        });
        authorFilters.appendChild(btn);
    });
    
    // 주제 필터 렌더링
    const topicFilters = document.getElementById('topic-filters');
    Array.from(topics).sort().forEach(topic => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn topic-filter px-3 py-1 text-xs rounded-full border border-gray-300 bg-white hover:bg-green-50 transition-colors';
        btn.textContent = topic;
        btn.dataset.topic = topic;
        btn.addEventListener('click', () => {
            if (selectedTopics.has(topic)) {
                selectedTopics.delete(topic);
                btn.classList.remove('bg-green-600', 'text-white', 'border-green-600');
                btn.classList.add('bg-white', 'border-gray-300');
            } else {
                selectedTopics.add(topic);
                btn.classList.add('bg-green-600', 'text-white', 'border-green-600');
                btn.classList.remove('bg-white', 'border-gray-300');
            }
            loadWritings();
        });
        topicFilters.appendChild(btn);
    });
    
    // 장르 필터 렌더링
    const genreFilters = document.getElementById('genre-filters');
    Array.from(genres).sort().forEach(genre => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn genre-filter px-3 py-1 text-xs rounded-full border border-gray-300 bg-white hover:bg-purple-50 transition-colors';
        btn.textContent = genre;
        btn.dataset.genre = genre;
        btn.addEventListener('click', () => {
            if (selectedGenres.has(genre)) {
                selectedGenres.delete(genre);
                btn.classList.remove('bg-purple-600', 'text-white', 'border-purple-600');
                btn.classList.add('bg-white', 'border-gray-300');
            } else {
                selectedGenres.add(genre);
                btn.classList.add('bg-purple-600', 'text-white', 'border-purple-600');
                btn.classList.remove('bg-white', 'border-gray-300');
            }
            loadWritings();
        });
        genreFilters.appendChild(btn);
    });
    
    // 정렬 선택 이벤트
    document.getElementById('sort-select').addEventListener('change', (e) => {
        sortBy = e.target.value;
        loadWritings();
    });
    
    // 필터 초기화 버튼
    document.getElementById('clear-filters-btn').addEventListener('click', () => {
        selectedAuthors.clear();
        selectedTopics.clear();
        selectedGenres.clear();
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'bg-green-600', 'bg-purple-600', 'text-white', 'border-blue-600', 'border-green-600', 'border-purple-600');
            btn.classList.add('bg-white', 'border-gray-300');
        });
        document.getElementById('sort-select').value = 'newest';
        sortBy = 'newest';
        loadWritings();
    });
}

// 전체 글 보기 모달
function showFullWritingModal(writing) {
    const isLiked = writing.likedBy && writing.likedBy.includes(currentUser.uid);
    const comments = writing.comments || [];
    const createdAt = writing.createdAt?.toDate ? writing.createdAt.toDate() : new Date();
    const topicGenreTags = writing.topicOrGenre ? writing.topicOrGenre.split(', ') : [];
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <h3 class="text-2xl font-bold text-gray-800 mb-2">${escapeHtml(writing.title)}</h3>
                        <p class="text-sm text-gray-600 mb-2">
                            <span class="font-semibold">${escapeHtml(writing.userName)}</span> · ${formatDate(createdAt)}
                        </p>
                        ${topicGenreTags.length > 0 ? `
                            <div class="flex flex-wrap gap-2 mb-4">
                                ${topicGenreTags.map(tag => `
                                    <span class="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded">${escapeHtml(tag.trim())}</span>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <button class="close-modal-btn text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>
                
                <div class="prose max-w-none mb-6 text-gray-700 whitespace-pre-wrap">
                    ${escapeHtml(writing.content)}
                </div>
                
                <div class="flex items-center space-x-4 mb-4 pt-4 border-t border-gray-200">
                    <button 
                        class="like-btn flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                            isLiked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }"
                        data-writing-id="${writing.id}"
                    >
                        <span>❤️</span>
                        <span>${writing.likes || 0}</span>
                    </button>
                    
                    <button 
                        class="comment-toggle-btn px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        data-writing-id="${writing.id}"
                    >
                        💬 댓글 (${comments.length})
                    </button>
                </div>
                
                <!-- 댓글 영역 -->
                <div id="modal-comments-${writing.id}" class="hidden mt-4 pt-4 border-t border-gray-200">
                    <div class="mb-4">
                        <div class="flex space-x-2">
                            <input 
                                type="text" 
                                id="modal-comment-input-${writing.id}" 
                                placeholder="댓글을 입력하세요..."
                                class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button 
                                class="add-comment-btn px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                data-writing-id="${writing.id}"
                            >
                                등록
                            </button>
                        </div>
                    </div>
                    <div id="modal-comments-list-${writing.id}" class="space-y-2">
                        ${renderComments(comments)}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 모달 닫기
    modal.querySelector('.close-modal-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    });
    
    // 좋아요 버튼
    modal.querySelector('.like-btn').addEventListener('click', async () => {
        await toggleLike(writing.id, currentUser.uid);
        document.body.removeChild(modal);
        await loadWritings();
    });
    
    // 댓글 토글
    modal.querySelector('.comment-toggle-btn').addEventListener('click', () => {
        const commentsDiv = modal.querySelector(`#modal-comments-${writing.id}`);
        commentsDiv.classList.toggle('hidden');
    });
    
    // 댓글 추가
    modal.querySelector('.add-comment-btn').addEventListener('click', async () => {
        const input = modal.querySelector(`#modal-comment-input-${writing.id}`);
        const commentText = input.value.trim();
        
        if (!commentText) {
            alert('댓글을 입력해주세요.');
            return;
        }
        
        try {
            const userName = await getUserName(currentUser.uid);
            await addComment(writing.id, {
                userId: currentUser.uid,
                userName: userName,
                text: commentText
            });
            
            input.value = '';
            document.body.removeChild(modal);
            await loadWritings();
        } catch (error) {
            alert('댓글 등록에 실패했습니다: ' + error.message);
        }
    });
}

function renderComments(comments) {
    if (comments.length === 0) {
        return '<p class="text-gray-500 text-sm">댓글이 없습니다.</p>';
    }
    
    return comments.map(comment => {
        const createdAt = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date();
        return `
            <div class="bg-gray-50 rounded-lg p-3">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="font-semibold text-sm">${escapeHtml(comment.userName)}</span>
                        <span class="text-xs text-gray-500 ml-2">${formatDate(createdAt)}</span>
                    </div>
                </div>
                <p class="text-sm text-gray-700 mt-1">${escapeHtml(comment.text)}</p>
            </div>
        `;
    }).join('');
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

