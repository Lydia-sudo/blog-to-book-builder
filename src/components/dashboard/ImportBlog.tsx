'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { usePosts } from '@/hooks/usePosts';
import { Post } from '@/types';

interface ImportBlogProps {
  projectId: string;
}

export function ImportBlog({ projectId }: ImportBlogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Partial<Post>[] | null>(null);
  const { addPost, posts } = usePosts(projectId);

  async function handleScrape() {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setPreview(null);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '스크래핑 실패');
      }

      const data = await res.json();
      setPreview(Array.isArray(data.posts) ? data.posts : [data.post]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!preview) return;
    setLoading(true);

    try {
      for (const post of preview) {
        await addPost(projectId, {
          title: post.title || '제목 없음',
          content: post.content || '',
          originalUrl: post.originalUrl || url,
          publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
          images: post.images || [],
          selected: false,
          order: posts.length + preview.indexOf(post),
          tags: post.tags || [],
        });
      }
      setIsOpen(false);
      setUrl('');
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setIsOpen(false);
    setUrl('');
    setPreview(null);
    setError('');
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="sm">
        + 블로그 가져오기
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} title="블로그 글 가져오기" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              블로그 URL 또는 RSS 주소
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                placeholder="https://blog.naver.com/... 또는 RSS 피드 URL"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={handleScrape} loading={loading} disabled={!url.trim()}>
                분석
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              지원: 네이버 블로그, 티스토리, 워드프레스, RSS 피드
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {preview && preview.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">
                {preview.length}개 글 발견
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {preview.map((post, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-sm text-gray-900 line-clamp-1">
                      {post.title || '제목 없음'}
                    </p>
                    {post.publishedAt && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(post.publishedAt as string).toLocaleDateString('ko-KR')}
                      </p>
                    )}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {post.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={handleClose}>
                  취소
                </Button>
                <Button onClick={handleImport} loading={loading}>
                  {preview.length}개 글 가져오기
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
