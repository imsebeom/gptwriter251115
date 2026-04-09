import { useEffect, useMemo, useState } from 'react';
import { useAuthCtx } from '../lib/authContext';
import {
  addComment,
  subscribeWritings,
  subscribeWritingsByClasses,
  toggleLike,
} from '../lib/firestore';
import { listTeacherClasses } from '../lib/classes';
import type { Writing } from '../lib/types';
import Icon from '../components/Icon';

type SortKey = 'latest' | 'likes' | 'comments';

export default function Gallery() {
  const { profile } = useAuthCtx();
  const [items, setItems] = useState<Writing[]>([]);
  const [sort, setSort] = useState<SortKey>('latest');
  const [authorFilter, setAuthorFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    if (!profile) return;
    if (profile.userType === 'teacher') {
      let active = true;
      let unsub: (() => void) | null = null;
      (async () => {
        const myClasses = await listTeacherClasses(profile.uid);
        if (!active) return;
        const ids = myClasses.map((c) => c.id);
        unsub = subscribeWritingsByClasses(ids, setItems);
      })();
      return () => {
        active = false;
        if (unsub) unsub();
      };
    } else if (profile.classId) {
      return subscribeWritings(profile.classId, setItems);
    } else {
      setItems([]);
    }
  }, [profile]);

  const authors = useMemo(() => Array.from(new Set(items.map((w) => w.userName))).sort(), [items]);
  const categories = useMemo(() => Array.from(new Set(items.map((w) => w.topicOrGenre))).sort(), [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (authorFilter) list = list.filter((w) => w.userName === authorFilter);
    if (categoryFilter) list = list.filter((w) => w.topicOrGenre === categoryFilter);
    const sorted = [...list];
    if (sort === 'likes') sorted.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    else if (sort === 'comments') sorted.sort((a, b) => (b.comments?.length ?? 0) - (a.comments?.length ?? 0));
    return sorted;
  }, [items, authorFilter, categoryFilter, sort]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h2 className="text-2xl font-bold mr-auto flex items-center gap-2">
          <Icon name="gallery" size={26} /> 갤러리
        </h2>
        <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)} className="border rounded px-2 py-1 bg-white">
          <option value="">전체 작가</option>
          {authors.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border rounded px-2 py-1 bg-white">
          <option value="">전체 주제/장르</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="border rounded px-2 py-1 bg-white">
          <option value="latest">최신순</option>
          <option value="likes">좋아요순</option>
          <option value="comments">댓글순</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((w) => (
          <WritingCard key={w.id} w={w} currentUid={profile?.uid ?? ''} currentName={profile?.name ?? ''} />
        ))}
      </div>
    </div>
  );
}

function WritingCard({ w, currentUid, currentName }: { w: Writing; currentUid: string; currentName: string }) {
  const [commentText, setCommentText] = useState('');
  const liked = w.likedBy?.includes(currentUid);
  const createdAt = (w.createdAt as any)?.toDate?.().toLocaleDateString('ko-KR') ?? '';

  const onLike = () => toggleLike(w.id, currentUid);
  const onComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment(w.id, { userId: currentUid, userName: currentName, text: commentText });
    setCommentText('');
  };

  return (
    <article className="bg-white rounded-2xl shadow p-4 flex flex-col">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
        <span className="bg-slate-100 rounded px-2 py-0.5">{w.topicOrGenre}</span>
        <span className="ml-auto">{createdAt}</span>
      </div>
      <h3 className="text-lg font-bold">{w.title}</h3>
      <div className="text-xs text-slate-500 mb-2">작가: {w.userName}</div>
      <p className="text-sm whitespace-pre-wrap line-clamp-6 text-slate-800 mb-3">{w.content}</p>
      <div className="flex items-center gap-3 mt-auto text-sm">
        <button
          onClick={onLike}
          className={`px-2 py-1 rounded inline-flex items-center gap-1 ${liked ? 'bg-red-100 text-red-600' : 'hover:bg-slate-100'}`}
        >
          <Icon name="heart" size={16} /> {w.likes ?? 0}
        </button>
        <span className="inline-flex items-center gap-1">
          <Icon name="comment" size={16} /> {w.comments?.length ?? 0}
        </span>
      </div>
      {w.comments && w.comments.length > 0 && (
        <div className="mt-3 border-t pt-2 space-y-1 text-xs">
          {w.comments.slice(-4).map((c, i) => (
            <div key={i}>
              <span className="font-semibold">{c.userName}</span>: {c.text}
            </div>
          ))}
        </div>
      )}
      <form onSubmit={onComment} className="mt-2 flex gap-1">
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="댓글 달기…"
          className="flex-1 border rounded px-2 py-1 text-xs"
        />
        <button className="text-xs px-2 py-1 bg-slate-800 text-white rounded">등록</button>
      </form>
    </article>
  );
}
