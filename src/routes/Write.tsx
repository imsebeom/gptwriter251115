import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthCtx } from '../lib/authContext';
import { saveWriting, subscribeGenres, subscribeTopics } from '../lib/firestore';
import type { Genre, Topic, ChatMessage } from '../lib/types';
import { requestCoaching, requestGrammarScore, sendChatMessage } from '../lib/coach';
import { mdToHtml } from '../lib/markdown';
import Icon from '../components/Icon';

type Selection = { type: 'topic' | 'genre'; id: string; name: string; paragraphs: number };

export default function Write() {
  const { profile } = useAuthCtx();
  const classId = profile?.classId ?? '';
  const [topics, setTopics] = useState<Topic[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [title, setTitle] = useState('');
  // For fixed-paragraph mode, we keep separate strings per paragraph and
  // join them with "\n\n" on save/coach. For unlimited mode, paragraphs[0]
  // holds the whole freeform content.
  const [paragraphs, setParagraphs] = useState<string[]>(['']);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [coaching, setCoaching] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!classId) return;
    return subscribeTopics(classId, setTopics);
  }, [classId]);
  useEffect(() => {
    if (!classId) return;
    return subscribeGenres(classId, setGenres);
  }, [classId]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [history]);

  // Reset paragraph buffer whenever the selection changes.
  useEffect(() => {
    if (!selection) {
      setParagraphs(['']);
      return;
    }
    const n = selection.paragraphs > 0 ? selection.paragraphs : 1;
    setParagraphs(Array.from({ length: n }, () => ''));
  }, [selection]);

  const joinedContent = useMemo(
    () => paragraphs.map((p) => p.trim()).filter(Boolean).join('\n\n'),
    [paragraphs],
  );
  const canSubmit = title.trim().length > 0 && joinedContent.length > 0;

  const visibleMessages = useMemo(() => history.filter((m) => m.role !== 'system'), [history]);

  const resetThread = () => setHistory([]);

  const pickSelection = (sel: Omit<Selection, 'paragraphs'> & { paragraphs?: number }) => {
    setSelection({ ...sel, paragraphs: sel.paragraphs ?? 0 });
    setHistory([]);
    setTitle('');
  };

  const getCoach = async () => {
    if (!canSubmit || !selection) return;
    setCoaching(true);
    try {
      const res = await requestCoaching({
        title,
        content: joinedContent,
        topicOrGenre: selection.name,
        conversationHistory: history,
        topicId: selection.type === 'topic' ? selection.id : null,
        genreId: selection.type === 'genre' ? selection.id : null,
        paragraphGoal: selection.paragraphs,
      });
      setHistory(res.conversationHistory);
    } catch (e: any) {
      alert(`코칭 요청 실패: ${e?.message ?? e}`);
    } finally {
      setCoaching(false);
    }
  };

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;
    setChatting(true);
    setChatInput('');
    const nextHistory: ChatMessage[] = [...history, { role: 'user', content: msg }];
    setHistory(nextHistory);
    try {
      const res = await sendChatMessage(msg, history);
      setHistory(res.conversationHistory);
    } catch (e: any) {
      setHistory((h) => [...h, { role: 'assistant', content: `❌ 전송 실패: ${e?.message ?? e}` }]);
    } finally {
      setChatting(false);
    }
  };

  const save = async () => {
    if (!profile || !selection || !classId || !canSubmit) return;
    setSaveBusy(true);
    setSaveMsg('문법 채점 중…');
    try {
      // Run grammar scoring first so the value is persisted with the doc.
      // Failure is tolerable — the grammar score just falls back to 0 and
      // the writing is still saved.
      const grammarScore = await requestGrammarScore(joinedContent);
      setSaveMsg('저장 중…');
      await saveWriting({
        userId: profile.uid,
        userName: profile.name,
        classId,
        title,
        content: joinedContent,
        topicOrGenre: selection.name,
        topic: selection.type === 'topic' ? selection.name : null,
        genre: selection.type === 'genre' ? selection.name : null,
        topicId: selection.type === 'topic' ? selection.id : null,
        genreId: selection.type === 'genre' ? selection.id : null,
        paragraphs: selection.paragraphs,
        grammarScore,
      });
      setSaveMsg(`저장되었습니다. 문법 점수: ${grammarScore}점`);
    } catch (e: any) {
      setSaveMsg(`저장 실패: ${e?.message ?? e}`);
    } finally {
      setSaveBusy(false);
    }
  };

  // ------------------- Topic/Genre picker -------------------
  if (!selection) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">오늘은 무엇을 써볼까?</h2>
        <p className="text-slate-500 mb-6">주제 또는 장르를 하나 선택하세요.</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Icon name="topic" size={20} /> 주제
            </h3>
            <div className="flex flex-wrap gap-2">
              {topics.length === 0 && <p className="text-sm text-slate-400">등록된 주제가 없습니다.</p>}
              {topics.map((t) => (
                <button
                  key={t.id}
                  onClick={() =>
                    pickSelection({ type: 'topic', id: t.id, name: t.name, paragraphs: t.paragraphs })
                  }
                  className="px-3 py-2 rounded-full border hover:bg-blue-50 hover:border-blue-400 text-sm"
                >
                  {t.name}
                  {t.paragraphs && t.paragraphs > 0 ? (
                    <span className="ml-1 text-xs text-slate-500">({t.paragraphs}문단)</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Icon name="genre" size={20} /> 장르
            </h3>
            <div className="flex flex-wrap gap-2">
              {genres.length === 0 && <p className="text-sm text-slate-400">등록된 장르가 없습니다.</p>}
              {genres.map((g) => (
                <button
                  key={g.id}
                  onClick={() =>
                    pickSelection({ type: 'genre', id: g.id, name: g.name, paragraphs: g.paragraphs })
                  }
                  className="px-3 py-2 rounded-full border hover:bg-purple-50 hover:border-purple-400 text-sm"
                >
                  {g.name}
                  {g.paragraphs && g.paragraphs > 0 ? (
                    <span className="ml-1 text-xs text-slate-500">({g.paragraphs}문단)</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ------------------- Editor -------------------
  const isFixed = selection.paragraphs > 0;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col min-h-0">
      <div className="flex items-center gap-3 mb-3 shrink-0 flex-wrap">
        <button
          onClick={() => {
            setSelection(null);
            resetThread();
          }}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          ← 다시 선택
        </button>
        <div className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
          {selection.type === 'topic' ? '주제' : '장르'} · {selection.name}
        </div>
        <div className="text-xs text-slate-500">
          {isFixed
            ? `${selection.paragraphs}문단 글쓰기 (문단 내에서는 줄바꿈을 하지 않습니다.)`
            : '자유 서술 (엔터로 줄바꿈 가능)'}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 flex-1 min-h-0">
        {/* ---------- Editor ---------- */}
        <section className="flex flex-col bg-white rounded-2xl shadow p-4 min-h-0">
          <input
            className="text-2xl font-bold border-b pb-2 mb-3 outline-none shrink-0"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="flex-1 overflow-auto min-h-0 space-y-3">
            {isFixed ? (
              paragraphs.map((p, i) => (
                <div key={i}>
                  <label className="text-xs text-slate-500 mb-1 block">{i + 1}번째 문단</label>
                  <AutoGrowTextarea
                    value={p}
                    onChange={(v) =>
                      setParagraphs((arr) => arr.map((val, idx) => (idx === i ? v : val)))
                    }
                    placeholder={`${i + 1}번째 문단을 쓰세요`}
                  />
                </div>
              ))
            ) : (
              <textarea
                className="w-full h-full resize-none outline-none leading-relaxed"
                placeholder="여기에 글을 써보세요…"
                value={paragraphs[0] ?? ''}
                onChange={(e) => setParagraphs([e.target.value])}
              />
            )}
          </div>

          <div className="mt-3 flex gap-2 shrink-0">
            <button
              onClick={getCoach}
              disabled={coaching || !canSubmit}
              className="flex-1 bg-purple-600 text-white rounded-lg py-2 font-semibold disabled:opacity-60"
            >
              {coaching ? (
                '코칭 생성 중…'
              ) : history.length === 0 ? (
                <><Icon name="ai" size={16} className="invert mr-1" />AI 코칭 받기</>
              ) : (
                <><Icon name="refresh" size={16} className="invert mr-1" />다시 코칭받기</>
              )}
            </button>
            <button
              onClick={save}
              disabled={saveBusy || !canSubmit}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-semibold disabled:opacity-60"
            >
              {saveBusy ? '저장 중…' : <><Icon name="save" size={16} className="invert mr-1" />저장하기</>}
            </button>
          </div>
          {saveMsg && <div className="mt-2 text-sm text-slate-600 shrink-0">{saveMsg}</div>}
        </section>

        {/* ---------- Coach chat thread ---------- */}
        <section className="flex flex-col bg-white rounded-2xl shadow p-4 min-h-0">
          <div className="flex items-center mb-2 shrink-0">
            <h3 className="font-semibold flex items-center gap-2">
              <Icon name="ai" size={18} /> AI 글쓰기 코치
            </h3>
            {visibleMessages.length > 0 && (
              <button
                onClick={resetThread}
                className="ml-auto text-xs text-slate-400 hover:text-slate-700"
              >
                대화 초기화
              </button>
            )}
          </div>

          <div
            ref={threadRef}
            className="flex-1 overflow-auto rounded-lg bg-slate-50 p-3 text-sm space-y-3 min-h-0"
          >
            {visibleMessages.length === 0 && (
              <p className="text-slate-400">
                먼저 글을 쓰고 <b>AI 코칭 받기</b>를 누르면 여기에 코치의 피드백이 나타납니다. 그 뒤부터는 자유롭게 질문할 수 있어요!
              </p>
            )}
            {visibleMessages.map((m, i) => (
              <MessageBubble key={i} msg={m} />
            ))}
            {(coaching || chatting) && (
              <div className="text-xs text-slate-400 italic">코치가 생각 중…</div>
            )}
          </div>

          <form onSubmit={sendChat} className="mt-2 flex gap-2 shrink-0">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={
                history.length === 0
                  ? '먼저 "AI 코칭 받기"를 눌러주세요'
                  : '코치에게 질문해보세요…'
              }
              disabled={chatting || history.length === 0}
              className="flex-1 border rounded-lg px-3 py-2 text-sm disabled:bg-slate-100"
            />
            <button
              disabled={chatting || history.length === 0 || !chatInput.trim()}
              className="bg-purple-600 text-white px-4 rounded-lg text-sm font-semibold disabled:opacity-60"
            >
              {chatting ? '…' : '전송'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

/**
 * Textarea that auto-resizes to fit its content, with a minimum of ~3 lines.
 * Used for fixed-paragraph writing: each box holds one paragraph, so the
 * Enter key is blocked (manual line breaks are not allowed). Long text still
 * wraps visually thanks to the browser's natural soft-wrap.
 */
function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={3}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        // Soft-wrap is still allowed; hard breaks (Enter) are not.
        if (e.key === 'Enter') e.preventDefault();
      }}
      className="w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-none leading-relaxed overflow-hidden"
    />
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%] whitespace-pre-wrap">
          {msg.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div
        className="bg-white border rounded-2xl rounded-tl-sm px-3 py-2 max-w-[90%] prose-coach"
        dangerouslySetInnerHTML={{ __html: mdToHtml(msg.content) }}
      />
    </div>
  );
}
