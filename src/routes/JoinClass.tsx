import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinClass, signOutCurrent } from '../lib/auth';
import { useAuthCtx } from '../lib/authContext';

export default function JoinClass() {
  const { user, refresh } = useAuthCtx();
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  if (!user) {
    nav('/login', { replace: true });
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const { className } = await joinClass(code);
      alert(`"${className}"에 가입되었습니다!`);
      await refresh();
      nav('/write', { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? '가입 실패');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    await signOutCurrent();
    nav('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6">
        <h1 className="text-xl font-bold mb-1">클래스 가입</h1>
        <p className="text-sm text-slate-500 mb-4">
          교사에게 받은 <b>초대코드</b>를 입력하세요.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="예: K7X2M9AB"
            className="w-full border rounded-lg px-3 py-3 text-center text-xl tracking-widest font-mono"
            maxLength={16}
            required
          />
          {err && <div className="text-sm text-red-600">{err}</div>}
          <button
            disabled={busy}
            className="w-full bg-blue-600 text-white rounded-lg py-2 font-semibold disabled:opacity-60"
          >
            {busy ? '가입 중…' : '가입하기'}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="w-full text-sm text-slate-500 hover:text-slate-800"
          >
            로그아웃하고 돌아가기
          </button>
        </form>
      </div>
    </div>
  );
}
