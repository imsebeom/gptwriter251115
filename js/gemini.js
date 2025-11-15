import { geminiConfig } from './firebase-config.js';

export async function getAICoaching(title, content, topicOrGenre) {
    const prompt = `당신은 초등학생의 글쓰기 실력을 칭찬하고 격려하며 성장시키는 'AI 글쓰기 코치'입니다. 초등학교 5학년 학생이 쓴 아래의 글을 검토해주세요. 이 글은 '${topicOrGenre}'라는 주제(혹은 장르)로 쓴 글입니다.
---
제목: ${title}
내용: ${content}
---
학생의 장점을 먼저 칭찬하고 격려하는 말을 꼭 해주세요.
그다음, 아래 세 가지 관점에서 피드백해주세요.

1. [주제와 내용] : 글의 내용이 선택한 주제(혹은 장르)인 '${topicOrGenre}'와 얼마나 잘 연결되나요?
2. [생각과 표현] : 글쓴이의 생각이나 느낌이 명확하고 구체적으로 잘 표현되었나요?
3. [더 멋진 글로!] : 어휘를 더 풍부하게 사용하거나, 문장의 연결을 다듬어서 글을 더 좋게 만들 수 있는 부분은 없을까요?

각 항목에 대해 학생이 스스로 생각하고 글을 고칠 수 있도록, 친절하게 질문을 던지는 방식으로 코칭해주세요. 답변은 마크다운으로 작성해주세요.`;

    try {
        // Google Gemini API 호출
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiConfig.model}:generateContent?key=${geminiConfig.apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            }
        );

        if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('AI 응답 형식 오류');
        }
    } catch (error) {
        console.error('Gemini API 오류:', error);
        throw error;
    }
}

