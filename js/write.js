import { getTopicsAndGenres, saveWriting, getUserName, getStudentOriginalDocId } from './firebase.js';
import { getAICoaching, sendChatMessage } from './openai.js';
import { currentUser } from './app.js';

export async function renderWriteScreen() {
    const contentArea = document.getElementById('content-area');
    
    contentArea.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- 왼쪽: 글쓰기 영역 -->
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold mb-6 text-gray-800">글쓰기</h2>
                
                <!-- 주제/장르 선택 -->
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-700 mb-2">주제와 장르 선택</label>
                    <div class="flex space-x-4 mb-4">
                        <button id="select-topic-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            주제 선택
                        </button>
                        <button id="select-genre-btn" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            장르 선택
                        </button>
                    </div>
                    <div id="topic-genre-selection" class="hidden">
                        <div id="topics-list" class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4"></div>
                        <div id="genres-list" class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4"></div>
                    </div>
                    <div id="selected-items" class="mt-4 space-y-2">
                        <div id="selected-topic" class="p-3 bg-blue-50 rounded-lg hidden">
                            <span class="font-semibold">선택된 주제: </span>
                            <span id="selected-topic-name"></span>
                            <button id="remove-topic-btn" class="ml-2 text-red-600 hover:text-red-800 text-sm">✕ 제거</button>
                        </div>
                        <div id="selected-genre" class="p-3 bg-green-50 rounded-lg hidden">
                            <span class="font-semibold">선택된 장르: </span>
                            <span id="selected-genre-name"></span>
                            <button id="remove-genre-btn" class="ml-2 text-red-600 hover:text-red-800 text-sm">✕ 제거</button>
                        </div>
                    </div>
                </div>
                
                <!-- 글 작성 폼 -->
                <div id="writing-form" class="hidden">
                    <div class="mb-4">
                        <label for="writing-title" class="block text-sm font-medium text-gray-700 mb-2">제목</label>
                        <input 
                            type="text" 
                            id="writing-title" 
                            placeholder="글의 제목을 입력하세요"
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    
                    <div class="mb-4">
                        <label for="paragraph-count" class="block text-sm font-medium text-gray-700 mb-2">문단 수 선택</label>
                        <select 
                            id="paragraph-count" 
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="1">1개 문단</option>
                            <option value="2">2개 문단</option>
                            <option value="3">3개 문단</option>
                            <option value="4">4개 문단</option>
                            <option value="5">5개 문단</option>
                            <option value="6">6개 문단</option>
                        </select>
                    </div>
                    
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">내용 (문단별로 작성)</label>
                        <div id="paragraphs-container">
                            <!-- 문단 입력 칸들이 여기에 동적으로 생성됩니다 -->
                        </div>
                    </div>
                    
                    <div class="flex space-x-4">
                        <button 
                            id="save-writing-btn" 
                            class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            저장하기
                        </button>
                        <button 
                            id="get-coaching-btn" 
                            class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            AI 코칭 받기
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 오른쪽: AI 코칭 채팅창 -->
            <div class="bg-white rounded-lg shadow-lg flex flex-col" style="height: calc(100vh - 50px); min-height: 600px;">
                <div class="p-4 border-b border-gray-200">
                    <h3 class="text-xl font-bold text-purple-800">AI 코칭 채팅</h3>
                    <p class="text-sm text-gray-600 mt-1">AI 코치와 대화하며 글을 개선해보세요</p>
                </div>
                
                <!-- 채팅 메시지 영역 -->
                <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    <div class="text-center text-gray-500 text-sm py-8">
                        AI 코칭을 받으려면 "AI 코칭 받기" 버튼을 클릭하세요.
                    </div>
                </div>
                
                <!-- 채팅 입력 영역 -->
                <div class="p-4 border-t border-gray-200 bg-white">
                    <div class="flex space-x-2">
                        <input 
                            type="text" 
                            id="chat-input" 
                            placeholder="질문이나 메시지를 입력하세요..."
                            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            disabled
                        />
                        <button 
                            id="send-chat-btn" 
                            class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                            disabled
                        >
                            전송
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    let selectedTopic = null;
    let selectedGenre = null;
    let conversationHistory = []; // 대화 히스토리 저장
    let paragraphCount = 1;
    
    // 문단 수 선택 이벤트
    const paragraphCountSelect = document.getElementById('paragraph-count');
    paragraphCountSelect.addEventListener('change', (e) => {
        paragraphCount = parseInt(e.target.value);
        renderParagraphs();
    });
    
    // 문단 입력 칸 렌더링
    function renderParagraphs() {
        const container = document.getElementById('paragraphs-container');
        container.innerHTML = '';
        
        for (let i = 0; i < paragraphCount; i++) {
            const paragraphDiv = document.createElement('div');
            paragraphDiv.className = 'mb-4';
            paragraphDiv.innerHTML = `
                <label class="block text-xs font-medium text-gray-600 mb-1">${i + 1}번째 문단</label>
                <textarea 
                    class="paragraph-input w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="8"
                    placeholder="${i + 1}번째 문단을 작성하세요..."
                    data-paragraph-index="${i}"
                ></textarea>
            `;
            container.appendChild(paragraphDiv);
        }
    }
    
    // 초기 문단 렌더링
    renderParagraphs();
    
    // 주제/장르 목록 로드
    const { topics, genres } = await getTopicsAndGenres();
    
    // 주제 선택 버튼
    document.getElementById('select-topic-btn').addEventListener('click', () => {
        document.getElementById('topic-genre-selection').classList.remove('hidden');
        document.getElementById('topics-list').classList.remove('hidden');
        renderTopics(topics);
    });
    
    // 장르 선택 버튼
    document.getElementById('select-genre-btn').addEventListener('click', () => {
        document.getElementById('topic-genre-selection').classList.remove('hidden');
        document.getElementById('genres-list').classList.remove('hidden');
        renderGenres(genres);
    });
    
    // 주제 제거 버튼
    document.getElementById('remove-topic-btn').addEventListener('click', () => {
        selectedTopic = null;
        document.getElementById('selected-topic').classList.add('hidden');
        checkFormVisibility();
    });
    
    // 장르 제거 버튼
    document.getElementById('remove-genre-btn').addEventListener('click', () => {
        selectedGenre = null;
        document.getElementById('selected-genre').classList.add('hidden');
        checkFormVisibility();
    });
    
    function renderTopics(topics) {
        const topicsList = document.getElementById('topics-list');
        if (topics.length === 0) {
            topicsList.innerHTML = '<p class="text-gray-500 col-span-full">등록된 주제가 없습니다. 관리자 페이지에서 주제를 추가해주세요.</p>';
            return;
        }
        
        topicsList.innerHTML = topics.map(topic => `
            <button 
                class="topic-item px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                data-id="${topic.id}"
                data-name="${topic.name}"
                data-type="topic"
            >
                ${topic.name}
            </button>
        `).join('');
        
        topicsList.querySelectorAll('.topic-item').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedTopic = { id: btn.dataset.id, name: btn.dataset.name };
                document.getElementById('selected-topic').classList.remove('hidden');
                document.getElementById('selected-topic-name').textContent = selectedTopic.name;
                checkFormVisibility();
            });
        });
    }
    
    function renderGenres(genres) {
        const genresList = document.getElementById('genres-list');
        if (genres.length === 0) {
            genresList.innerHTML = '<p class="text-gray-500 col-span-full">등록된 장르가 없습니다. 관리자 페이지에서 장르를 추가해주세요.</p>';
            return;
        }
        
        genresList.innerHTML = genres.map(genre => `
            <button 
                class="genre-item px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                data-id="${genre.id}"
                data-name="${genre.name}"
                data-type="genre"
            >
                ${genre.name}
            </button>
        `).join('');
        
        genresList.querySelectorAll('.genre-item').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedGenre = { id: btn.dataset.id, name: btn.dataset.name };
                document.getElementById('selected-genre').classList.remove('hidden');
                document.getElementById('selected-genre-name').textContent = selectedGenre.name;
                checkFormVisibility();
            });
        });
    }
    
    // 채팅 관련 함수들 (먼저 정의)
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    
    function addChatMessage(role, content) {
        const chatMessages = document.getElementById('chat-messages');
        
        // 초기 안내 메시지 제거
        const initialMessage = chatMessages.querySelector('.text-center');
        if (initialMessage) {
            initialMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;
        
        const messageBubble = document.createElement('div');
        messageBubble.className = `max-w-[80%] rounded-lg p-3 ${
            role === 'user' 
                ? 'bg-purple-600 text-white' 
                : role === 'system'
                ? 'bg-yellow-100 text-yellow-800 text-sm'
                : 'bg-white border border-gray-200 text-gray-800'
        }`;
        
        // 마크다운을 HTML로 변환
        const html = convertMarkdownToHTML(content);
        messageBubble.innerHTML = html;
        
        messageDiv.appendChild(messageBubble);
        chatMessages.appendChild(messageDiv);
        
        // 스크롤을 맨 아래로
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function enableChatInput() {
        chatInput.disabled = false;
        sendChatBtn.disabled = false;
        chatInput.placeholder = '질문이나 메시지를 입력하세요...';
    }
    
    function disableChatInput() {
        chatInput.disabled = true;
        sendChatBtn.disabled = true;
        chatInput.placeholder = 'AI 코칭을 받으려면 "AI 코칭 받기" 버튼을 클릭하세요.';
    }
    
    function clearChatMessages() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = `
            <div class="text-center text-gray-500 text-sm py-8">
                AI 코칭을 받으려면 "AI 코칭 받기" 버튼을 클릭하세요.
            </div>
        `;
    }
    
    function checkFormVisibility() {
        // 주제 또는 장르 중 하나라도 선택되면 글 작성 폼 표시
        if (selectedTopic || selectedGenre) {
            document.getElementById('writing-form').classList.remove('hidden');
            // 주제/장르가 변경되면 대화 히스토리 초기화
            conversationHistory = [];
            clearChatMessages();
            disableChatInput();
        } else {
            document.getElementById('writing-form').classList.add('hidden');
        }
    }
    
    // 문단 내용을 합치는 함수
    function combineParagraphs() {
        const paragraphInputs = document.querySelectorAll('.paragraph-input');
        const paragraphs = Array.from(paragraphInputs)
            .map(input => input.value.trim())
            .filter(text => text.length > 0); // 빈 문단 제거
        
        // 각 문단을 두 줄바꿈으로 구분하여 합치기
        return paragraphs.join('\n\n');
    }
    
    // 저장하기 버튼
    document.getElementById('save-writing-btn').addEventListener('click', async () => {
        const title = document.getElementById('writing-title').value.trim();
        const content = combineParagraphs(); // 문단들을 합쳐서 내용 생성
        
        if (!selectedTopic && !selectedGenre) {
            alert('주제 또는 장르를 최소 하나 선택해주세요.');
            return;
        }
        
        if (!title || !content) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }
        
        try {
            const userName = await getUserName(currentUser.uid);
            // 학생의 경우 원본 문서 ID 사용
            const studentDocId = await getStudentOriginalDocId(currentUser.uid);
            
            // 주제와 장르 정보를 모두 저장
            const topicOrGenre = [];
            if (selectedTopic) topicOrGenre.push(selectedTopic.name);
            if (selectedGenre) topicOrGenre.push(selectedGenre.name);
            
            await saveWriting({
                userId: studentDocId, // 학생의 원본 문서 ID 사용
                userName: userName,
                title: title,
                content: content,
                topicOrGenre: topicOrGenre.join(', '), // 표시용
                topic: selectedTopic ? selectedTopic.name : null,
                genre: selectedGenre ? selectedGenre.name : null,
                topicId: selectedTopic ? selectedTopic.id : null,
                genreId: selectedGenre ? selectedGenre.id : null
            });
            
            alert('글이 저장되었습니다!');
            // 폼 초기화
            document.getElementById('writing-title').value = '';
            document.querySelectorAll('.paragraph-input').forEach(input => {
                input.value = '';
            });
            // 선택된 주제/장르는 유지 (다시 글을 쓸 수 있도록)
            // 저장 시 대화 히스토리도 초기화
            conversationHistory = [];
            clearChatMessages();
            disableChatInput();
        } catch (error) {
            alert('저장에 실패했습니다: ' + error.message);
        }
    });
    
    // AI 코칭 받기 버튼
    document.getElementById('get-coaching-btn').addEventListener('click', async () => {
        const btn = document.getElementById('get-coaching-btn');
        btn.disabled = true;
        btn.textContent = 'AI 코칭 받는 중...';
        
        try {
            const title = document.getElementById('writing-title').value.trim();
            const content = combineParagraphs(); // 문단들을 합쳐서 내용 생성
            
            if (!selectedTopic && !selectedGenre) {
                alert('주제 또는 장르를 최소 하나 선택해주세요.');
                btn.disabled = false;
                btn.textContent = 'AI 코칭 받기';
                return;
            }
            
            if (!title || !content) {
                alert('제목과 내용을 모두 입력해주세요.');
                btn.disabled = false;
                btn.textContent = 'AI 코칭 받기';
                return;
            }
            
            // 주제와 장르 정보를 모두 전달
            const topicOrGenreText = [];
            if (selectedTopic) topicOrGenreText.push(`주제: ${selectedTopic.name}`);
            if (selectedGenre) topicOrGenreText.push(`장르: ${selectedGenre.name}`);
            
            // 대화 히스토리를 포함하여 AI 코칭 요청
            // 주제와 장르가 모두 있으면 주제를 우선, 아니면 있는 것을 사용
            const primaryId = selectedTopic ? selectedTopic.id : selectedGenre.id;
            const primaryType = selectedTopic ? 'topic' : 'genre';
            
            const result = await getAICoaching(
                title, 
                content, 
                topicOrGenreText.join(', '), 
                conversationHistory,
                primaryId,
                primaryType,
                selectedTopic ? selectedTopic.id : null,
                selectedGenre ? selectedGenre.id : null
            );
            
            // 대화 히스토리 업데이트
            conversationHistory = result.conversationHistory;
            
            // 채팅창에 사용자 메시지 표시 (글 제목과 내용 요약)
            addChatMessage('user', `제목: ${title}\n\n${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
            
            // 채팅창에 AI 응답 표시
            addChatMessage('assistant', result.response);
            
            // 채팅 입력 활성화
            enableChatInput();
        } catch (error) {
            alert('AI 코칭을 받는 중 오류가 발생했습니다: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'AI 코칭 받기';
        }
    });
    
    // 채팅 메시지 전송
    sendChatBtn.addEventListener('click', async () => {
        await handleChatSend();
    });
    
    chatInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            await handleChatSend();
        }
    });
    
    async function handleChatSend() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // 채팅 입력 비활성화
        chatInput.disabled = true;
        sendChatBtn.disabled = true;
        sendChatBtn.textContent = '전송 중...';
        
        // 사용자 메시지 표시
        addChatMessage('user', message);
        chatInput.value = '';
        
        try {
            // 현재 글의 제목과 내용을 포함하여 메시지 전송
            const title = document.getElementById('writing-title').value.trim();
            const content = combineParagraphs(); // 문단들을 합쳐서 내용 생성
            
            // 글 정보를 포함한 메시지 생성
            let fullMessage = message;
            if (title && content) {
                fullMessage = `현재 제목: ${title}\n현재 내용: ${content}\n\n${message}`;
            }
            
            const result = await sendChatMessage(fullMessage, conversationHistory);
            
            // 대화 히스토리 업데이트
            conversationHistory = result.conversationHistory;
            
            // AI 응답 표시
            addChatMessage('assistant', result.response);
        } catch (error) {
            addChatMessage('system', '오류가 발생했습니다: ' + error.message);
        } finally {
            chatInput.disabled = false;
            sendChatBtn.disabled = false;
            sendChatBtn.textContent = '전송';
            chatInput.focus();
        }
    }
}

// 간단한 마크다운 변환 함수
function convertMarkdownToHTML(markdown) {
    let html = markdown
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
        .replace(/\n/g, '<br>');
    
    return html;
}

