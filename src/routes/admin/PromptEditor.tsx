import { useEffect, useState } from 'react';
import { DEFAULT_COACHING_PROMPT, getCoachingPrompt, saveCoachingPrompt } from '../../lib/firestore';

export default function PromptEditor() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    getCoachingPrompt().then(setText);
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await saveCoachingPrompt(text);
      setMsg('저장되었습니다.');
    } catch (e: any) {
      setMsg(`저장 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (confirm('기본값으로 되돌릴까요?')) setText(DEFAULT_COACHING_PROMPT);
  };

  return (
    <div className="max-w-3xl bg-white rounded-xl shadow p-4">
      <h3 className="font-bold mb-2">AI 코칭 기본 프롬프트</h3>
      <p className="text-xs text-slate-500 mb-3">
        학생이 글을 제출하면 이 프롬프트가 시스템 메시지로 사용됩니다. 주제/장르별 추가 프롬프트가 있으면 아래에 덧붙여집니다.
        <br />
        치환 변수: <code>{'{title}'}</code>, <code>{'{content}'}</code>, <code>{'{topicOrGenre}'}</code>
      </p>
      <textarea
        className="w-full border rounded p-2 text-sm h-96 font-mono"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex gap-2 mt-3 items-center">
        <button onClick={save} disabled={busy} className="bg-blue-600 text-white px-3 py-2 rounded text-sm disabled:opacity-60">
          {busy ? '저장 중…' : '저장'}
        </button>
        <button onClick={reset} className="border px-3 py-2 rounded text-sm">
          기본값으로 초기화
        </button>
        {msg && <span className="text-sm text-slate-600">{msg}</span>}
      </div>
    </div>
  );
}
