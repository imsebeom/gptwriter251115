import { useEffect, useMemo, useState } from 'react';
import { useAuthCtx } from '../../lib/authContext';
import { subscribeWritings, subscribeWritingsByClasses } from '../../lib/firestore';
import { subscribeTeacherClasses } from '../../lib/classes';
import type { ClassRoom, Writing } from '../../lib/types';
import { generatePortfolioPdf } from '../../lib/pdf';

interface Grouped {
  userId: string;
  userName: string;
  writings: Writing[];
}

export default function Submissions() {
  const { profile } = useAuthCtx();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [writings, setWritings] = useState<Writing[]>([]);

  // Load the admin's own classes.
  useEffect(() => {
    if (!profile) return;
    if (profile.userType === 'test') {
      setClasses([
        { id: 'test-class', name: '테스트 클래스', teacherId: 'system', inviteCode: 'TESTCODE' },
      ]);
      setSelectedClassId('test-class');
      return;
    }
    return subscribeTeacherClasses(profile.uid, (list) => {
      setClasses(list);
      if (list.length && !selectedClassId) setSelectedClassId(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Load writings for the filter: single class, or all teacher classes.
  useEffect(() => {
    if (!classes.length) {
      setWritings([]);
      return;
    }
    if (selectedClassId === '__all__') {
      return subscribeWritingsByClasses(classes.map((c) => c.id), setWritings);
    }
    if (!selectedClassId) return;
    return subscribeWritings(selectedClassId, setWritings);
  }, [classes, selectedClassId]);

  const groups = useMemo<Grouped[]>(() => {
    const map = new Map<string, Grouped>();
    for (const w of writings) {
      if (!map.has(w.userId)) map.set(w.userId, { userId: w.userId, userName: w.userName, writings: [] });
      map.get(w.userId)!.writings.push(w);
    }
    return Array.from(map.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  }, [writings]);

  const downloadAll = () => {
    generatePortfolioPdf(
      '전체_포트폴리오',
      groups.map((g) => ({ userName: g.userName, writings: g.writings })),
    );
  };

  if (classes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-4 text-sm text-slate-500">
        먼저 <b>클래스 관리</b> 탭에서 클래스를 만드세요.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="text-sm text-slate-600">클래스:</label>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="border rounded px-2 py-1 bg-white text-sm"
        >
          <option value="__all__">전체 (내 클래스)</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="text-sm text-slate-600 ml-4">
          {groups.length}명 · {writings.length}개의 글
        </div>
        <button onClick={downloadAll} className="ml-auto bg-slate-800 text-white px-3 py-2 rounded text-sm">
          전체 포트폴리오 PDF
        </button>
      </div>

      <div className="space-y-4">
        {groups.map((g) => (
          <details key={g.userId} className="bg-white rounded-xl shadow p-4">
            <summary className="cursor-pointer flex items-center gap-3">
              <span className="font-semibold">{g.userName}</span>
              <span className="text-xs text-slate-500">
                글 {g.writings.length} · 좋아요{' '}
                {g.writings.reduce((s, w) => s + (w.likes ?? 0), 0)} · 댓글{' '}
                {g.writings.reduce((s, w) => s + (w.comments?.length ?? 0), 0)}
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  generatePortfolioPdf(`${g.userName}_포트폴리오`, [{ userName: g.userName, writings: g.writings }]);
                }}
                className="ml-auto text-xs bg-blue-600 text-white px-2 py-1 rounded"
              >
                PDF
              </button>
            </summary>
            <div className="mt-3 space-y-2 text-sm">
              {g.writings.map((w) => (
                <div key={w.id} className="border-l-2 border-blue-300 pl-3">
                  <div className="font-semibold">{w.title}</div>
                  <div className="text-xs text-slate-500">
                    {w.topicOrGenre} · {(w.createdAt as any)?.toDate?.().toLocaleDateString('ko-KR') ?? ''} · ❤{' '}
                    {w.likes ?? 0} · 💬 {w.comments?.length ?? 0}
                  </div>
                  <p className="text-slate-700 line-clamp-2">{w.content}</p>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
