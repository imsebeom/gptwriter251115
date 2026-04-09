import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { useAuthCtx } from '../../lib/authContext';
import { subscribeWritings, subscribeWritingsByClasses } from '../../lib/firestore';
import { subscribeTeacherClasses } from '../../lib/classes';
import { requestProgressReport } from '../../lib/coach';
import { mdToHtml } from '../../lib/markdown';
import type { ClassRoom, Writing } from '../../lib/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Title,
  Tooltip,
  Legend,
);

interface Summary {
  userId: string;
  userName: string;
  writings: Writing[];
}

export default function StudentReport() {
  const { profile } = useAuthCtx();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [writings, setWritings] = useState<Writing[]>([]);
  const [selected, setSelected] = useState<Summary | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const groups = useMemo<Summary[]>(() => {
    const map = new Map<string, Summary>();
    for (const w of writings) {
      if (!map.has(w.userId)) map.set(w.userId, { userId: w.userId, userName: w.userName, writings: [] });
      map.get(w.userId)!.writings.push(w);
    }
    for (const g of map.values()) {
      g.writings.sort((a, b) => {
        const da = (a.createdAt as any)?.toDate?.()?.getTime?.() ?? 0;
        const db = (b.createdAt as any)?.toDate?.()?.getTime?.() ?? 0;
        return da - db;
      });
    }
    return Array.from(map.values());
  }, [writings]);

  const generate = async () => {
    if (!selected) return;
    setBusy(true);
    setReport(null);
    try {
      const r = await requestProgressReport(selected.userName, selected.writings);
      setReport(r);
    } catch (e: any) {
      setReport(`❌ 리포트 생성 실패: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
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
      <div className="flex items-center gap-2 mb-3">
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
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <aside className="bg-white rounded-xl shadow p-3 space-y-2 max-h-[80vh] overflow-auto">
          {groups.length === 0 && <div className="text-sm text-slate-400">학생 글이 없습니다.</div>}
          {groups.map((g) => (
            <button
              key={g.userId}
              onClick={() => {
                setSelected(g);
                setReport(null);
              }}
              className={`w-full text-left border rounded p-2 hover:bg-slate-50 ${
                selected?.userId === g.userId ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <div className="font-semibold">{g.userName}</div>
              <div className="text-xs text-slate-500">{g.writings.length}개의 글</div>
            </button>
          ))}
        </aside>
        <main>
          {selected ? (
            <StudentDetail summary={selected} report={report} busy={busy} onGenerate={generate} />
          ) : (
            <div className="text-slate-500 p-6">왼쪽에서 학생을 선택하세요.</div>
          )}
        </main>
      </div>
    </div>
  );
}

function StudentDetail({
  summary,
  report,
  busy,
  onGenerate,
}: {
  summary: Summary;
  report: string | null;
  busy: boolean;
  onGenerate: () => void;
}) {
  const lengths = summary.writings.map((w) => w.content.length);
  const vocab = summary.writings.map((w) => new Set(w.content.split(/\s+/).filter(Boolean)).size);
  const sentenceAvg = summary.writings.map((w) => {
    const sentences = w.content.split(/[.!?。]/).filter((s) => s.trim().length > 0);
    return sentences.length ? Math.round(w.content.length / sentences.length) : 0;
  });
  const paragraphCounts = summary.writings.map((w) => w.content.split(/\n{2,}/).filter(Boolean).length);
  const labels = summary.writings.map((_, i) => `${i + 1}번째`);

  const lineChart = (title: string, data: number[], color: string) => ({
    labels,
    datasets: [
      {
        label: title,
        data,
        borderColor: color,
        backgroundColor: color + '33',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  });

  const commonOpts = {
    responsive: true,
    plugins: { legend: { display: true } },
    scales: { y: { beginAtZero: true } },
  };

  // Combined growth-tracking chart — normalized metrics on one canvas.
  const maxLen = Math.max(1, ...lengths);
  const maxVocab = Math.max(1, ...vocab);
  const maxSent = Math.max(1, ...sentenceAvg);
  const maxPara = Math.max(1, ...paragraphCounts);
  const normalized = {
    labels,
    datasets: [
      {
        label: '글 길이',
        data: lengths.map((v) => Math.round((v / maxLen) * 100)),
        borderColor: '#2563eb',
        backgroundColor: '#2563eb22',
        tension: 0.3,
      },
      {
        label: '어휘 다양성',
        data: vocab.map((v) => Math.round((v / maxVocab) * 100)),
        borderColor: '#a855f7',
        backgroundColor: '#a855f722',
        tension: 0.3,
      },
      {
        label: '평균 문장 길이',
        data: sentenceAvg.map((v) => Math.round((v / maxSent) * 100)),
        borderColor: '#10b981',
        backgroundColor: '#10b98122',
        tension: 0.3,
      },
      {
        label: '문단 수',
        data: paragraphCounts.map((v) => Math.round((v / maxPara) * 100)),
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b22',
        tension: 0.3,
      },
    ],
  };

  return (
    <div className="space-y-4">
      <header className="bg-white rounded-xl shadow p-4">
        <h3 className="font-bold text-lg">{summary.userName}</h3>
        <div className="text-sm text-slate-600 mt-1">
          글 {summary.writings.length}개 · 총 글자 {lengths.reduce((a, b) => a + b, 0)} · 평균{' '}
          {Math.round(lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1))}자
        </div>
      </header>

      <div className="bg-white rounded-xl shadow p-3">
        <h4 className="font-semibold text-sm mb-1">성장 추적 (정규화 지표)</h4>
        <p className="text-xs text-slate-500 mb-2">
          각 지표를 학생의 최댓값 기준 100%로 정규화해 같은 축에 겹쳐서 보여줍니다.
        </p>
        <Line
          data={normalized}
          options={{
            ...commonOpts,
            scales: { y: { beginAtZero: true, max: 110, ticks: { callback: (v) => `${v}%` } } },
          }}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow p-3">
          <Line data={lineChart('글 길이', lengths, '#2563eb')} options={commonOpts} />
        </div>
        <div className="bg-white rounded-xl shadow p-3">
          <Line data={lineChart('어휘 다양성', vocab, '#a855f7')} options={commonOpts} />
        </div>
        <div className="bg-white rounded-xl shadow p-3">
          <Line data={lineChart('평균 문장 길이', sentenceAvg, '#10b981')} options={commonOpts} />
        </div>
        <div className="bg-white rounded-xl shadow p-3">
          <Line data={lineChart('문단 수', paragraphCounts, '#f59e0b')} options={commonOpts} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-bold">AI 발전 리포트</h4>
          <button
            onClick={onGenerate}
            disabled={busy}
            className="ml-auto bg-purple-600 text-white text-sm px-3 py-1.5 rounded disabled:opacity-60"
          >
            {busy ? '생성 중…' : '🤖 리포트 생성'}
          </button>
        </div>
        {report ? (
          <div className="prose-coach text-sm" dangerouslySetInnerHTML={{ __html: mdToHtml(report) }} />
        ) : (
          <p className="text-sm text-slate-400">버튼을 눌러 AI 발전 리포트를 만들어 보세요.</p>
        )}
      </div>

      <details className="bg-white rounded-xl shadow p-4">
        <summary className="cursor-pointer font-semibold">전체 글 보기 (시간순)</summary>
        <div className="mt-3 space-y-3 text-sm">
          {summary.writings.map((w) => (
            <div key={w.id} className="border-l-2 border-blue-300 pl-3">
              <div className="font-semibold">{w.title}</div>
              <div className="text-xs text-slate-500">
                {w.topicOrGenre} · {(w.createdAt as any)?.toDate?.().toLocaleDateString('ko-KR') ?? ''}
              </div>
              <p className="whitespace-pre-wrap text-slate-700">{w.content}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
