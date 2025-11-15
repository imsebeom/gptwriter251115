import { getTopicsAndGenres, saveWriting, getUserName } from './firebase.js';
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
                    <label class="block text-sm font-medium text-gray-700 mb-2">주제 또는 장르 선택</label>
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
                        <div id="genres-list" class="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 hidden"></div>
                    </div>
                    <div id="selected-item" class="mt-4 p-3 bg-blue-50 rounded-lg hidden">
                        <span class="font-semibold">선택됨: </span>
                        <span id="selected-item-name"></span>
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
                        <label for="writing-content" class="block text-sm font-medium text-gray-700 mb-2">내용</label>
                        <textarea 
                            id="writing-content" 
                            rows="15"
                            placeholder="여기에 글을 작성하세요..."
                            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        ></textarea>
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
    
    let selectedTopicOrGenre = null;
    let selectedType = null; // 'topic' or 'genre'
    let conversationHistory = []; // 대화 히스토리 저장
    
    // 주제/장르 목록 로드
    const { topics, genres } = await getTopicsAndGenres();
    
    // 주제 선택 버튼
    document.getElementById('select-topic-btn').addEventListener('click', () => {
        document.getElementById('topic-genre-selection').classList.remove('hidden');
        document.getElementById('topics-list').classList.remove('hidden');
        document.getElementById('genres-list').classList.add('hidden');
        renderTopics(topics);
    });
    
    // 장르 선택 버튼
    document.getElementById('select-genre-btn').addEventListener('click', () => {
        document.getElementById('topic-genre-selection').classList.remove('hidden');
        document.getElementById('topics-list').classList.add('hidden');
        document.getElementById('genres-list').classList.remove('hidden');
        renderGenres(genres);
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
                selectedTopicOrGenre = { id: btn.dataset.id, name: btn.dataset.name };
                selectedType = 'topic';
                showSelected();
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
                selectedTopicOrGenre = { id: btn.dataset.id, name: btn.dataset.name };
                selectedType = 'genre';
                showSelected();
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
    
    function showSelected() {
        document.getElementById('selected-item').classList.remove('hidden');
        document.getElementById('selected-item-name').textContent = selectedTopicOrGenre.name;
        document.getElementById('writing-form').classList.remove('hidden');
        // 주제/장르가 변경되면 대화 히스토리 초기화
        conversationHistory = [];
        clearChatMessages();
        disableChatInput();
    }
    
    // 저장하기 버튼
    document.getElementById('save-writing-btn').addEventListener('click', async () => {
        const title = document.getElementById('writing-title').value.trim();
        const content = document.getElementById('writing-content').value.trim();
        
        if (!selectedTopicOrGenre) {
            alert('주제 또는 장르를 선택해주세요.');
            return;
        }
        
        if (!title || !content) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }
        
        try {
            const userName = await getUserName(currentUser.uid);
            await saveWriting({
                userId: currentUser.uid,
                userName: userName,
                title: title,
                content: content,
                topicOrGenre: selectedTopicOrGenre.name,
                type: selectedType
            });
            
            alert('글이 저장되었습니다!');
            // 폼 초기화
            document.getElementById('writing-title').value = '';
            document.getElementById('writing-content').value = '';
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
        const title = document.getElementById('writing-title').value.trim();
        const content = document.getElementById('writing-content').value.trim();
        
        if (!selectedTopicOrGenre) {
            alert('주제 또는 장르를 선택해주세요.');
            return;
        }
        
        if (!title || !content) {
            alert('제목과 내용을 모두 입력해주세요.');
            return;
        }
        
        const btn = document.getElementById('get-coaching-btn');
        btn.disabled = true;
        btn.textContent = 'AI 코칭 받는 중...';
        
        try {
            // 대화 히스토리를 포함하여 AI 코칭 요청 (주제/장르 ID와 타입도 전달)
            const result = await getAICoaching(
                title, 
                content, 
                selectedTopicOrGenre.name, 
                conversationHistory,
                selectedTopicOrGenre.id,
                selectedType
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
            const content = document.getElementById('writing-content').value.trim();
            
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

