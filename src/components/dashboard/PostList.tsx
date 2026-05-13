'use client';

import { useState } from 'react';
import { Post } from '@/types';
import { usePosts } from '@/hooks/usePosts';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ImportBlog } from './ImportBlog';

interface PostListProps { projectId: string; onSelectPost?: (post: Post) => void; }
type SortKey = 'publishedAt' | 'title' | 'order';

export function PostList({ projectId, onSelectPost }: PostListProps) {
  const { posts, loading, toggleSelect, deletePost } = usePosts(projectId);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [filterSelected, setFilterSelected] = useState<'all' | 'selected' | 'unselected'>('all');

  const filtered = posts.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filterSelected === 'all' || (filterSelected === 'selected' && p.selected) || (filterSelected === 'unselected' && !p.selected);
    return matchSearch && matchFilter;
  }).sort((a, b) => {
    if (sortKey === 'title') return a.title.localeCompare(b.title);
    if (sortKey === 'publishedAt') return (b.publishedAt ? new Date(b.publishedAt).getTime() : 0) - (a.publishedAt ? new Date(a.publishedAt).getTime() : 0);
    return a.order - b.order;
  });

  const selectedCount = posts.filter((p) => p.selected).length;
  if (loading) return <LoadingSpinner text="글 목록 불러오는 중..." />;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">수집된 글 <span className="text-gray-500 font-normal">({posts.length})</span></h2>
          <ImportBlog projectId={projectId} />
        </div>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="제목 또는 태그 검색..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-2">
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none">
            <option value="order">순서대로</option>
            <option value="publishedAt">최신순</option>
            <option value="title">제목순</option>
          </select>
          <select value={filterSelected} onChange={(e) => setFilterSelected(e.target.value as typeof filterSelected)} className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none">
            <option value="all">전체</option>
            <option value="selected">선택됨</option>
            <option value="unselected">미선택</option>
          </select>
        </div>
        {selectedCount > 0 && <p className="text-xs text-blue-600 font-medium">{selectedCount}개 선택됨</p>}
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-4xl mb-2">💭</p>
            <p className="text-sm">{posts.length === 0 ? '블로그 글을 가져와 주세요' : '검색 결과가 없습니다'}</p>
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((post) => (
              <li key={post.id} className={`p-3 hover:bg-gray-50 transition-colors ${post.selected ? 'bg-blue-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={post.selected} onChange={(e) => toggleSelect(projectId, post.id, e.target.checked)} className="mt-1 w-4 h-4 text-blue-600 rounded cursor-pointer" />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectPost?.(post)}>
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{post.title}</p>
                    {post.publishedAt && <p className="text-xs text-gray-500 mt-0.5">{new Date(post.publishedAt).toLocaleDateString('ko-KR')}</p>}
                    {post.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{post.tags.slice(0, 3).map((tag) => <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{tag}</span>)}</div>}
                  </div>
                  <button onClick={() => deletePost(projectId, post.id)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0" title="삭제">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
