import { useEffect, useState } from 'react';
import { useAuthCtx } from '../../lib/authContext';
import {
  addGenre,
  addTopic,
  removeGenre,
  removeTopic,
  subscribeGenres,
  subscribeTopics,
  updateGenreParagraphs,
  updateGenrePrompt,
  updateTopicParagraphs,
  updateTopicPrompt,
} from '../../lib/firestore';
import { subscribeTeacherClasses } from '../../lib/classes';
import type { ClassRoom, Genre, Topic } from '../../lib/types';

export default function TopicsGenres() {
  const { profile } = useAuthCtx();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    if (!profile) return;
    if (profile.userType === 'test') {
      const list: ClassRoom[] = [];
      if (profile.classId) {
        list.push({ id: profile.classId, name: '나의 샌드박스', teacherId: 'system', inviteCode: 'SANDBOX' });
      }
      list.push({ id: 'test-class', name: '테스트 클래스 (데모 10명)', teacherId: 'system', inviteCode: 'DEMO' });
      setClasses(list);
      setSelectedClassId(list[0].id);
      return;
    }
    return subscribeTeacherClasses(profile.uid, (list) => {
      setClasses(list);
      if (list.length && !selectedClassId) setSelectedClassId(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  useEffect(() => {
    if (!selectedClassId) return;
    return subscribeTopics(selectedClassId, setTopics);
  }, [selectedClassId]);
  useEffect(() => {
    if (!selectedClassId) return;
    return subscribeGenres(selectedClassId, setGenres);
  }, [selectedClassId]);

  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-4 text-sm text-slate-500">
        먼저 <b>클래스 관리</b> 탭에서 클래스를 만든 뒤 주제/장르를 추가하세요.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm text-slate-600">클래스:</label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="border rounded px-2 py-1 bg-white text-sm"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <ListEditor
          title="주제"
          items={topics}
          onAdd={(name, paragraphs) => addTopic(selectedClassId, name, paragraphs)}
          onRemove={(id) => removeTopic(id)}
          onUpdatePrompt={(id, p) => updateTopicPrompt(id, p)}
          onUpdateParagraphs={(id, p) => updateTopicParagraphs(id, p)}
        />
        <ListEditor
          title="장르"
          items={genres}
          onAdd={(name, paragraphs) => addGenre(selectedClassId, name, paragraphs)}
          onRemove={(id) => removeGenre(id)}
          onUpdatePrompt={(id, p) => updateGenrePrompt(id, p)}
          onUpdateParagraphs={(id, p) => updateGenreParagraphs(id, p)}
        />
      </div>
    </div>
  );
}

interface ListEditorProps {
  title: string;
  items: Array<Topic | Genre>;
  onAdd: (name: string, paragraphs: number) => Promise<unknown>;
  onRemove: (id: string) => Promise<unknown>;
  onUpdatePrompt: (id: string, prompt: string) => Promise<unknown>;
  onUpdateParagraphs: (id: string, paragraphs: number) => Promise<unknown>;
}

function ListEditor({ title, items, onAdd, onRemove, onUpdatePrompt, onUpdateParagraphs }: ListEditorProps) {
  const [name, setName] = useState('');
  const [paragraphs, setParagraphs] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd(name.trim(), paragraphs);
    setName('');
    setParagraphs(0);
  };

  return (
    <section className="bg-white rounded-xl shadow p-4">
      <h3 className="font-bold mb-3">{title}</h3>
      <form onSubmit={submit} className="flex flex-wrap gap-2 mb-3 items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[140px] border rounded px-2 py-1 text-sm"
          placeholder="새 항목 이름"
        />
        <label className="text-xs text-slate-600 flex items-center gap-1">
          문단:
          <select
            value={paragraphs}
            onChange={(e) => setParagraphs(Number(e.target.value))}
            className="border rounded px-1 py-1 bg-white text-xs"
          >
            <option value={0}>제한없음</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}문단
              </option>
            ))}
          </select>
        </label>
        <button className="bg-blue-600 text-white text-sm px-3 rounded">추가</button>
      </form>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="border rounded p-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{it.name}</span>
              <ParagraphSelect
                value={it.paragraphs ?? 0}
                onChange={(v) => onUpdateParagraphs(it.id, v)}
              />
              <button
                onClick={() => {
                  setEditingId(editingId === it.id ? null : it.id);
                  setEditPrompt(it.additionalPrompt ?? '');
                }}
                className="ml-auto text-xs text-slate-600 hover:text-slate-900"
              >
                프롬프트
              </button>
              <button
                onClick={() => {
                  if (confirm(`"${it.name}"을(를) 삭제할까요?`)) onRemove(it.id);
                }}
                className="text-xs text-red-600"
              >
                삭제
              </button>
            </div>
            {editingId === it.id && (
              <div className="mt-2">
                <textarea
                  className="w-full border rounded px-2 py-1 text-xs h-24"
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="이 항목에 대한 추가 AI 프롬프트 (선택사항)"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={async () => {
                      await onUpdatePrompt(it.id, editPrompt);
                      setEditingId(null);
                    }}
                    className="text-xs bg-emerald-600 text-white px-2 py-1 rounded"
                  >
                    저장
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-slate-600">
                    취소
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ParagraphSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="text-xs border rounded px-1 py-0.5 bg-white"
      title="문단 수"
    >
      <option value={0}>제한없음</option>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <option key={n} value={n}>
          {n}문단
        </option>
      ))}
    </select>
  );
}
