import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ensureTeacherProfile, loadProfile, loginAsTest, signInWithGoogle, signOutCurrent } from '../lib/auth';
import { useAuthCtx } from '../lib/authContext';
import { auth } from '../lib/firebase';
import Icon from '../components/Icon';

type Tab = 'student' | 'teacher' | 'test';

export default function Login() {
  const [tab, setTab] = useState<Tab>('student');
  const { user, profile, loading, refresh } = useAuthCtx();
  const nav = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (profile) {
      if (profile.userType === 'teacher') nav('/admin', { replace: true });
      else if (profile.classId) nav('/write', { replace: true });
      else nav('/join-class', { replace: true });
      return;
    }
    // Authenticated but no Firestore profile yet:
    //  - Google-signed student → needs to enter an invite code.
    //  - Anonymous (test) user → still being seeded by /api/seed-test, do
    //    NOT redirect; TestPanel will call refresh() when the seed finishes.
    if (user && !user.isAnonymous) nav('/join-class', { replace: true });
  }, [user, profile, loading, nav]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <Icon name="logo" size={28} /> GetWriter
        </h1>
        <p className="text-sm text-slate-500 mb-4">초등 5학년 글쓰기 교실</p>

        <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1 text-sm">
          {(['student', 'teacher', 'test'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-md transition ${tab === t ? 'bg-white shadow font-semibold' : 'text-slate-600'}`}
            >
              {t === 'student' ? '학생' : t === 'teacher' ? '교사' : '테스트'}
            </button>
          ))}
        </div>

        {tab === 'student' && <StudentPanel onDone={refresh} />}
        {tab === 'teacher' && <TeacherPanel onDone={refresh} />}
        {tab === 'test' && <TestPanel onDone={refresh} />}

        <div className="mt-6 pt-4 border-t flex justify-center gap-4 text-xs text-slate-500">
          <Link to="/privacy" className="hover:text-slate-800">
            개인정보 처리방침
          </Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-slate-800">
            이용약관
          </Link>
        </div>
      </div>
    </div>
  );
}

function StudentPanel({ onDone }: { onDone: () => Promise<void> }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const click = async () => {
    setErr(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      // Check if the profile already exists. If not, the auth context will
      // route the user to /join-class once the profile lookup returns null.
      await onDone();
    } catch (e: any) {
      setErr(e?.message ?? 'Google 로그인 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">학생은 Google 계정으로 로그인하세요.</p>
      <p className="text-xs text-slate-500">
        처음 가입하는 경우 교사에게서 받은 <b>초대코드</b>를 입력해야 합니다.
      </p>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <button
        onClick={click}
        disabled={busy}
        className="w-full bg-blue-600 text-white rounded-lg py-2 font-semibold disabled:opacity-60"
      >
        {busy ? '처리 중…' : <><Icon name="key" size={16} className="invert mr-1" />Google로 학생 로그인</>}
      </button>
    </div>
  );
}

function TeacherPanel({ onDone }: { onDone: () => Promise<void> }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const click = async () => {
    setErr(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      // After Google sign-in, make sure we have a teacher profile. If an
      // existing doc is a student, the helper throws.
      const uid = auth.currentUser?.uid;
      const existing = uid ? await loadProfile(uid) : null;
      if (!existing || existing.userType !== 'teacher') {
        if (existing?.userType === 'student') {
          await signOutCurrent();
          throw new Error('이 계정은 학생으로 가입되어 있습니다. 다른 계정을 사용하세요.');
        }
        await ensureTeacherProfile();
      }
      await onDone();
    } catch (e: any) {
      setErr(e?.message ?? 'Google 로그인 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">교사는 Google 계정으로 로그인하세요.</p>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <button
        onClick={click}
        disabled={busy}
        className="w-full bg-white border-2 border-slate-300 rounded-lg py-2 font-semibold hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? '처리 중…' : <><Icon name="key" size={16} className="mr-1" />Google로 교사 로그인</>}
      </button>
    </div>
  );
}

function TestPanel({ onDone }: { onDone: () => Promise<void> }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const click = async () => {
    setErr(null);
    setBusy(true);
    try {
      await loginAsTest();
      await onDone();
    } catch (e: any) {
      setErr(e?.message ?? '테스트 로그인 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        테스트 사용자는 가입 없이 바로 <b>테스트 클래스</b>에 들어가서 <b>테스트 과제</b>를 해볼 수 있습니다.
      </p>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <button
        onClick={click}
        disabled={busy}
        className="w-full bg-emerald-600 text-white rounded-lg py-2 font-semibold disabled:opacity-60"
      >
        {busy ? '준비 중…' : '✨ 테스트로 바로 시작'}
      </button>
    </div>
  );
}
