import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthCtx } from '../lib/authContext';
import { signOutCurrent } from '../lib/auth';
import Icon from './Icon';

export default function Layout() {
  const { profile } = useAuthCtx();
  const nav = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the drawer whenever the route changes (mobile ergonomics).
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const logout = async () => {
    await signOutCurrent();
    nav('/login', { replace: true });
  };

  if (!profile) return <Outlet />;

  const isStudent = profile.userType === 'student' || profile.userType === 'test';
  const isAdmin = profile.userType === 'teacher' || profile.userType === 'test';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded ${isActive ? 'bg-slate-700' : 'hover:bg-slate-800'}`;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-56 shrink-0 bg-slate-900 text-slate-100 p-4 flex flex-col gap-2 overflow-y-auto transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center gap-2 mb-4">
          <Icon name="logo" size={24} className="invert" />
          <div className="text-xl font-bold">GetWriter</div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-slate-300 hover:text-white lg:hidden"
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>
        <div className="text-xs text-slate-400 mb-2">
          {profile.name}
          <span className="ml-1 px-1 rounded bg-slate-700">{profile.userType}</span>
        </div>
        {isStudent && (
          <NavLink to="/write" className={navLinkClass}>
            <Icon name="write" size={18} className="invert mr-2" />글쓰기
          </NavLink>
        )}
        <NavLink to="/gallery" className={navLinkClass}>
          <Icon name="gallery" size={18} className="invert mr-2" />갤러리
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={navLinkClass}>
            <Icon name="admin" size={18} className="invert mr-2" />관리자
          </NavLink>
        )}
        <button onClick={logout} className="mt-auto text-left px-3 py-2 rounded hover:bg-slate-800 text-red-300">
          로그아웃
        </button>
        <div className="pt-2 border-t border-slate-700 text-[10px] text-slate-400 flex gap-2 flex-wrap">
          <NavLink to="/privacy" className="hover:text-slate-200">
            개인정보 처리방침
          </NavLink>
          <span>·</span>
          <NavLink to="/terms" className="hover:text-slate-200">
            이용약관
          </NavLink>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Mobile top bar */}
        <header className="lg:hidden bg-white border-b px-3 py-2 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -m-2 text-slate-700 hover:text-slate-900"
            aria-label="메뉴 열기"
          >
            ☰
          </button>
          <Icon name="logo" size={20} />
          <span className="font-bold">GetWriter</span>
          <span className="ml-auto text-xs text-slate-500">{profile.name}</span>
        </header>
        <main className="flex-1 overflow-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
