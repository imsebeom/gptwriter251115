import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuthCtx } from '../lib/authContext';
import Classes from './admin/Classes';
import Submissions from './admin/Submissions';
import TopicsGenres from './admin/TopicsGenres';
import PromptEditor from './admin/PromptEditor';
import StudentReport from './admin/StudentReport';

export default function Admin() {
  const { profile } = useAuthCtx();
  if (!profile) return <Navigate to="/login" replace />;

  const tabs = [
    { to: '/admin/classes', label: '클래스 관리' },
    { to: '/admin/topics', label: '주제/장르' },
    { to: '/admin/submissions', label: '제출 현황' },
    { to: '/admin/reports', label: '학생 리포트' },
    { to: '/admin/prompt', label: '프롬프트' },
  ];

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <img src="/icons/admin.png" alt="" width={24} height={24} /> 관리자
      </h2>
      <div className="flex flex-wrap gap-1 border-b mb-4">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `px-4 py-2 rounded-t-lg text-sm ${isActive ? 'bg-white border border-b-0' : 'bg-slate-100'}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <Routes>
        <Route index element={<Navigate to="classes" replace />} />
        <Route path="classes" element={<Classes />} />
        <Route path="topics" element={<TopicsGenres />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="reports" element={<StudentReport />} />
        <Route path="prompt" element={<PromptEditor />} />
      </Routes>
    </div>
  );
}
