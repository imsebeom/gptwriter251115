import { useEffect, useState } from 'react';
import { useAuthCtx } from '../../lib/authContext';
import { createClass, deleteClass, regenerateInviteCode, renameClass, subscribeTeacherClasses } from '../../lib/classes';
import type { ClassRoom } from '../../lib/types';

export default function Classes() {
  const { profile } = useAuthCtx();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    return subscribeTeacherClasses(profile.uid, setClasses);
  }, [profile]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !name.trim()) return;
    setErr(null);
    try {
      await createClass(profile.uid, name.trim());
      setName('');
    } catch (e: any) {
      setErr(e?.message ?? '생성 실패');
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      alert(`초대코드 ${code} 복사됨`);
    } catch {
      prompt('초대코드', code);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <h3 className="font-bold mb-3">새 클래스 만들기</h3>
        <form onSubmit={add} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 5학년 2반"
            className="flex-1 border rounded px-3 py-2 text-sm"
          />
          <button className="bg-blue-600 text-white px-4 rounded text-sm font-semibold">생성</button>
        </form>
        {err && <div className="text-sm text-red-600 mt-2">{err}</div>}
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-bold mb-3">내 클래스 ({classes.length})</h3>
        {classes.length === 0 && <p className="text-sm text-slate-400">아직 클래스가 없습니다.</p>}
        <ul className="space-y-2">
          {classes.map((c) => (
            <ClassRow
              key={c.id}
              c={c}
              onCopy={() => copyCode(c.inviteCode)}
              onRegen={async () => {
                if (!confirm('초대코드를 새로 생성하시면 기존 코드는 사용할 수 없습니다. 계속할까요?')) return;
                await regenerateInviteCode(c.id);
              }}
              onRename={async (newName) => {
                await renameClass(c.id, newName);
              }}
              onDelete={async () => {
                if (!confirm(`"${c.name}" 클래스를 삭제할까요? 소속 학생·글은 지워지지 않습니다.`)) return;
                await deleteClass(c.id);
              }}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ClassRow({
  c,
  onCopy,
  onRegen,
  onRename,
  onDelete,
}: {
  c: ClassRoom;
  onCopy: () => void;
  onRegen: () => Promise<void>;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(c.name);

  return (
    <li className="border rounded p-3">
      <div className="flex items-center gap-2">
        {editing ? (
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            className="flex-1 border rounded px-2 py-1 text-sm"
          />
        ) : (
          <span className="font-semibold">{c.name}</span>
        )}
        <span className="ml-auto text-xs text-slate-500">초대코드</span>
        <button
          onClick={onCopy}
          className="font-mono text-base tracking-wider bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
          title="클릭해서 복사"
        >
          {c.inviteCode}
        </button>
      </div>
      <div className="mt-2 flex gap-2 text-xs">
        {editing ? (
          <>
            <button
              onClick={async () => {
                await onRename(nameDraft);
                setEditing(false);
              }}
              className="bg-emerald-600 text-white px-2 py-1 rounded"
            >
              저장
            </button>
            <button
              onClick={() => {
                setNameDraft(c.name);
                setEditing(false);
              }}
              className="text-slate-500"
            >
              취소
            </button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} className="text-slate-600 hover:text-slate-900">
            이름 수정
          </button>
        )}
        <button onClick={onRegen} className="text-slate-600 hover:text-slate-900">
          코드 재생성
        </button>
        <button onClick={onDelete} className="ml-auto text-red-600">
          삭제
        </button>
      </div>
    </li>
  );
}
