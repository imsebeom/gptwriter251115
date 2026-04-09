import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './routes/Login';
import JoinClass from './routes/JoinClass';
import Write from './routes/Write';
import Gallery from './routes/Gallery';
import Admin from './routes/Admin';
import Privacy from './routes/Privacy';
import Terms from './routes/Terms';
import Layout from './components/Layout';
import { AuthProvider, useAuthCtx } from './lib/authContext';

function Protected({
  children,
  allow,
  requireClass = false,
}: {
  children: JSX.Element;
  allow: Array<'student' | 'teacher' | 'test'>;
  requireClass?: boolean;
}) {
  const { user, profile, loading } = useAuthCtx();
  if (loading) return <div className="p-8 text-center text-slate-500">불러오는 중…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) {
    // Anonymous (test) sessions create their profile via /api/seed-test —
    // show a brief loader instead of bouncing to the invite-code screen.
    if (user.isAnonymous) return <div className="p-8 text-center text-slate-500">테스트 준비 중…</div>;
    return <Navigate to="/join-class" replace />;
  }
  if (!allow.includes(profile.userType)) return <Navigate to="/" replace />;
  if (requireClass && !profile.classId) return <Navigate to="/join-class" replace />;
  return children;
}

function Home() {
  const { user, profile, loading } = useAuthCtx();
  if (loading) return <div className="p-8 text-center text-slate-500">불러오는 중…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile) {
    if (user.isAnonymous) return <div className="p-8 text-center text-slate-500">테스트 준비 중…</div>;
    return <Navigate to="/join-class" replace />;
  }
  if (profile.userType === 'teacher') return <Navigate to="/admin" replace />;
  return <Navigate to="/write" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/join-class" element={<JoinClass />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route
            path="/write"
            element={
              <Protected allow={['student', 'test']} requireClass>
                <Write />
              </Protected>
            }
          />
          <Route
            path="/gallery"
            element={
              <Protected allow={['student', 'teacher', 'test']}>
                <Gallery />
              </Protected>
            }
          />
          <Route
            path="/admin/*"
            element={
              <Protected allow={['teacher', 'test']}>
                <Admin />
              </Protected>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
