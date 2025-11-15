import { openaiConfig } from './firebase-config.js';
import { getCoachingPrompt, getTopicPrompt, getGenrePrompt } from './firebase.js';

/**
 * OpenAI GPT API를 사용하여 글쓰기 코칭을 받습니다.
 * 대화 맥락을 유지하기 위해 이전 대화 히스토리를 받습니다.
 * 
 * @param {string} title - 글의 제목
 * @param {string} content - 글의 내용
 * @param {string} topicOrGenre - 선택한 주제 또는 장르 (표시용)
 * @param {Array} conversationHistory - 이전 대화 히스토리 (선택사항)
 * @param {string} topicOrGenreId - 선택한 주제 또는 장르의 ID (선택사항, 주 우선)
 * @param {string} type - 'topic' 또는 'genre' (선택사항, 주 우선)
 * @param {string} topicId - 선택한 주제의 ID (선택사항)
 * @param {string} genreId - 선택한 장르의 ID (선택사항)
 * @returns {Promise<string>} AI 코칭 응답
 */
export async function getAICoaching(title, content, topicOrGenre, conversationHistory = [], topicOrGenreId = null, type = null, topicId = null, genreId = null) {
    // Firestore에서 기본 프롬프트 가져오기
    let systemPrompt = await getCoachingPrompt();
    
    // 주제/장르별 추가 프롬프트 가져오기 (주제와 장르 모두 적용)
    let additionalPrompts = [];
    
    if (topicId) {
        const topicPrompt = await getTopicPrompt(topicId);
        if (topicPrompt) {
            additionalPrompts.push(`[주제별 추가 프롬프트]\n${topicPrompt}`);
        }
    }
    
    if (genreId) {
        const genrePrompt = await getGenrePrompt(genreId);
        if (genrePrompt) {
            additionalPrompts.push(`[장르별 추가 프롬프트]\n${genrePrompt}`);
        }
    }
    
    // 기존 방식 호환성 (하위 호환)
    if (topicOrGenreId && type && !topicId && !genreId) {
        let additionalPrompt = '';
        if (type === 'topic') {
            additionalPrompt = await getTopicPrompt(topicOrGenreId);
        } else if (type === 'genre') {
            additionalPrompt = await getGenrePrompt(topicOrGenreId);
        }
        
        if (additionalPrompt) {
            additionalPrompts.push(additionalPrompt);
        }
    }
    
    // 추가 프롬프트가 있으면 기본 프롬프트에 추가
    if (additionalPrompts.length > 0) {
        systemPrompt += '\n\n' + additionalPrompts.join('\n\n');
    }
    
    // 프롬프트의 변수 치환
    systemPrompt = systemPrompt
        .replace(/\{title\}/g, title)
        .replace(/\{content\}/g, content)
        .replace(/\{topicOrGenre\}/g, topicOrGenre);

    // 첫 번째 요청인 경우
    if (conversationHistory.length === 0) {
        const userMessage = `이 글은 '${topicOrGenre}'라는 주제(혹은 장르)로 쓴 글입니다.

---
제목: ${title}
내용: ${content}
---

이 글을 검토해주세요.`;

        conversationHistory = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];
    } else {
        // 이전 대화가 있는 경우, 사용자가 수정한 글을 추가
        const userMessage = `제가 글을 수정했습니다. 다시 검토해주세요.

---
제목: ${title}
내용: ${content}
---`;

        // 시스템 프롬프트는 첫 번째에만 포함하고, 이후에는 사용자 메시지만 추가
        conversationHistory.push({ role: 'user', content: userMessage });
    }

    try {
        // OpenAI Chat Completions API 호출
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: openaiConfig.model,
                messages: conversationHistory,
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API 오류: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const assistantMessage = data.choices[0].message.content;
            
            // 대화 히스토리에 어시스턴트 응답 추가
            conversationHistory.push({ role: 'assistant', content: assistantMessage });
            
            return {
                response: assistantMessage,
                conversationHistory: conversationHistory
            };
        } else {
            throw new Error('AI 응답 형식 오류');
        }
    } catch (error) {
        console.error('OpenAI API 오류:', error);
        throw error;
    }
}

/**
 * 일반 채팅 메시지를 처리합니다.
 * 
 * @param {string} userMessage - 사용자 메시지
 * @param {Array} conversationHistory - 이전 대화 히스토리
 * @returns {Promise<Object>} AI 응답 및 업데이트된 대화 히스토리
 */
export async function sendChatMessage(userMessage, conversationHistory = []) {
    // 시스템 프롬프트가 없는 경우 추가
    if (conversationHistory.length === 0 || conversationHistory[0].role !== 'system') {
        const systemPrompt = `당신은 초등학생의 글쓰기 실력을 칭찬하고 격려하며 성장시키는 'AI 글쓰기 코치'입니다. 초등학교 5학년 학생과 대화하고 있습니다. 친절하고 격려하는 톤으로 답변해주세요.`;
        conversationHistory.unshift({ role: 'system', content: systemPrompt });
    }
    
    // 사용자 메시지 추가
    conversationHistory.push({ role: 'user', content: userMessage });
    
    try {
        // OpenAI Chat Completions API 호출
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: openaiConfig.model,
                messages: conversationHistory,
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API 오류: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const assistantMessage = data.choices[0].message.content;
            
            // 대화 히스토리에 어시스턴트 응답 추가
            conversationHistory.push({ role: 'assistant', content: assistantMessage });
            
            return {
                response: assistantMessage,
                conversationHistory: conversationHistory
            };
        } else {
            throw new Error('AI 응답 형식 오류');
        }
    } catch (error) {
        console.error('OpenAI API 오류:', error);
        throw error;
    }
}

/**
 * 학생의 글쓰기 능력 향상을 분석하고 발전 리포트를 생성합니다.
 * 
 * @param {string} userName - 학생 이름
 * @param {Array} writings - 학생이 작성한 모든 글 배열 (시간순 정렬)
 * @returns {Promise<string>} GPT가 생성한 발전 리포트
 */
export async function generateProgressReport(userName, writings) {
    if (!writings || writings.length === 0) {
        return '분석할 글이 없습니다.';
    }
    
    // 글들을 시간순으로 정렬
    const sortedWritings = [...writings].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateA - dateB;
    });
    링
    // 글 정보를 포맷팅
    const writingsText = sortedWritings.map((writing, index) => {
        const createdAt = writing.createdAt?.toDate ? writing.createdAt.toDate() : new Date();
        const dateStr = createdAt.toLocaleDateString('ko-KR');
        return `
[${index + 1}번째 글] 작성일: ${dateStr}
제목: ${writing.title}
주제/장르: ${writing.topicOrGenre}
내용:
${writing.content}
---`;
    }).join('\n\n');
    
    const systemPrompt = `당신은 초등학교 5학년 학생의 글쓰기 능력 향상을 분석하는 전문 교육 평가자입니다. 
학생이 작성한 여러 글을 시간순으로 분석하여, 글쓰기 능력의 발전 과정을 평가하고 구체적인 피드백을 제공해야 합니다.

분석 시 다음 항목을 포함하여 리포트를 작성해주세요:

1. **전체적인 발전 추이**
   - 초기 글과 최근 글의 비교
   - 글쓰기 능력이 어떻게 향상되었는지 구체적으로 설명

2. **강점 분석**
   - 학생의 글쓰기 강점과 잘 표현한 부분
   - 특히 개선된 부분

3. **개선 영역**
   - 더 발전할 수 있는 부분
   - 구체적인 개선 방안 제시

4. **주제/장르 다양성**
   - 다양한 주제나 장르를 시도했는지
   - 각 주제/장르에서의 표현력 평가

5. **격려와 제안**
   - 학생을 격려하는 메시지
   - 앞으로의 글쓰기 방향 제안

리포트는 교사가 학생에게 전달할 수 있도록, 친절하고 격려하는 톤으로 작성하되, 구체적이고 실용적인 피드백을 제공해주세요.
마크다운 형식으로 작성해주세요.`;

    const userMessage = `다음은 '${userName}' 학생이 작성한 ${sortedWritings.length}개의 글입니다. 
시간순으로 정렬되어 있으며, 첫 번째 글부터 마지막 글까지의 발전 과정을 분석해주세요.

${writingsText}

위 글들을 분석하여 글쓰기 능력 향상 리포트를 작성해주세요.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiConfig.apiKey}`
            },
            body: JSON.stringify({
                model: openaiConfig.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 3000
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API 오류: ${response.status} - ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            throw new Error('AI 응답 형식 오류');
        }
    } catch (error) {
        console.error('OpenAI API 오류:', error);
        throw error;
    }
}
