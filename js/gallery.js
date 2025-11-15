import { getWritings, toggleLike, addComment, getUserName } from './firebase.js';
import { currentUser } from './app.js';

export async function renderGalleryScreen() {
    const contentArea = document.getElementById('content-area');
    
    contentArea.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg p-6">
            <h2 class="text-2xl font-bold mb-6 text-gray-800">작품 보관함</h2>
            <div id="writings-list" class="space-y-4">
                <div class="text-center py-8">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p class="mt-2 text-gray-600">로딩 중...</p>
                </div>
            </div>
        </div>
    `;
    
    await loadWritings();
}

async function loadWritings() {
    const writingsList = document.getElementById('writings-list');
    
    try {
        const writings = await getWritings();
        
        if (writings.length === 0) {
            writingsList.innerHTML = '<p class="text-center text-gray-500 py-8">아직 등록된 글이 없습니다.</p>';
            return;
        }
        
        writingsList.innerHTML = writings.map(writing => {
            const isLiked = writing.likedBy && writing.likedBy.includes(currentUser.uid);
            const comments = writing.comments || [];
            const createdAt = writing.createdAt?.toDate ? writing.createdAt.toDate() : new Date();
            
            return `
                <div class="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-xl font-bold text-gray-800 mb-2">${escapeHtml(writing.title)}</h3>
                            <p class="text-sm text-gray-600">
                                <span class="font-semibold">${escapeHtml(writing.userName)}</span> | 
                                ${escapeHtml(writing.topicOrGenre)} | 
                                ${formatDate(createdAt)}
                            </p>
                        </div>
                    </div>
                    
                    <div class="prose max-w-none mb-4 text-gray-700 whitespace-pre-wrap">
                        ${escapeHtml(writing.content)}
                    </div>
                    
                    <div class="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-200">
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
                    <div id="comments-${writing.id}" class="hidden mt-4 pt-4 border-t border-gray-200">
                        <div class="mb-4">
                            <div class="flex space-x-2">
                                <input 
                                    type="text" 
                                    id="comment-input-${writing.id}" 
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
                        <div id="comments-list-${writing.id}" class="space-y-2">
                            ${renderComments(comments)}
                        </div>
                    </div>
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
        
    } catch (error) {
        writingsList.innerHTML = `<p class="text-center text-red-500 py-8">오류가 발생했습니다: ${error.message}</p>`;
    }
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

