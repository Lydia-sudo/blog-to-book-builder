'use client';

import { useState } from 'react';
import { Chapter, Post, Project } from '@/types';
import { Button } from '@/components/ui/Button';
import { ExportModal } from '@/components/export/ExportModal';

interface BookPreviewProps {
  project: Project;
  chapters: Chapter[];
  posts: Post[];
}

export function BookPreview({ project, chapters, posts }: BookPreviewProps) {
  const [showExport, setShowExport] = useState(false);
  const [generatingPreface, setGeneratingPreface] = useState(false);
  const [bookPreface, setBookPreface] = useState('');
  const [generatingEpilogue, setGeneratingEpilogue] = useState(false);
  const [bookEpilogue, setBookEpilogue] = useState('');

  const postMap = new Map(posts.map((p) => [p.id, p]));
  const totalPosts = new Set(chapters.flatMap((c) => c.postIds)).size;

  async function generateBookPreface() {
    setGeneratingPreface(true);
    try {
      const chapterTitles = chapters.map((c) => c.title).join(', ');
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book-preface',
          content: chapterTitles,
          context: project.coverTitle || project.title,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookPreface(data.result);
      }
    } finally {
      setGeneratingPreface(false);
    }
  }

  async function generateEpilogue() {
    setGeneratingEpilogue(true);
    try {
      const allTitles = chapters
        .flatMap((c) => c.postIds.map((id) => postMap.get(id)?.title || ''))
        .filter(Boolean)
        .join(', ');
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'epilogue',
          content: allTitles,
          context: project.coverTitle || project.title,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookEpilogue(data.result);
      }
    } finally {
      setGeneratingEpilogue(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">책 미리보기</h2>
          <Button
            onClick={() => setShowExport(true)}
            disabled={chapters.length === 0}
            size="sm"
          >
            내보내기
          </Button>
        </div>

        {/* 표지 미리보기 */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-4 text-white text-center shadow-lg">
          <p className="text-xs text-blue-200 mb-1">{project.author}</p>
          <p className="font-bold text-lg leading-tight">{project.coverTitle || project.title}</p>
          {project.description && (
            <p className="text-xs text-blue-200 mt-2 line-clamp-2">{project.description}</p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-lg font-bold text-gray-900">{chapters.length}</p>
            <p className="text-xs text-gray-500">챕터</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-lg font-bold text-gray-900">{totalPosts}</p>
            <p className="text-xs text-gray-500">수록 글</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-lg font-bold text-gray-900">{posts.length}</p>
            <p className="text-xs text-gray-500">전체 글</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* AI 서문/에필로그 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">책 서문</h3>
            <button
              onClick={generateBookPreface}
              disabled={generatingPreface || chapters.length === 0}
              className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
            >
              {generatingPreface ? '생성 중...' : '✨ AI 생성'}
            </button>
          </div>
          {bookPreface ? (
            <textarea
              value={bookPreface}
              onChange={(e) => setBookPreface(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={4}
            />
          ) : (
            <p className="text-xs text-gray-400 italic">AI로 서문을 생성해 보세요</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">에필로그</h3>
            <button
              onClick={generateEpilogue}
              disabled={generatingEpilogue || chapters.length === 0}
              className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
            >
              {generatingEpilogue ? '생성 중...' : '✨ AI 생성'}
            </button>
          </div>
          {bookEpilogue ? (
            <textarea
              value={bookEpilogue}
              onChange={(e) => setBookEpilogue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={4}
            />
          ) : (
            <p className="text-xs text-gray-400 italic">AI로 에필로그를 생성해 보세요</p>
          )}
        </div>

        {/* 목차 */}
        {chapters.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">목차</h3>
            <div className="space-y-2">
              {chapters.map((chapter, idx) => (
                <div key={chapter.id}>
                  <p className="text-sm font-medium text-gray-900">
                    {idx + 1}. {chapter.title}
                  </p>
                  <ul className="mt-1 ml-4 space-y-0.5">
                    {chapter.postIds.map((postId) => {
                      const post = postMap.get(postId);
                      return post ? (
                        <li key={postId} className="text-xs text-gray-500 line-clamp-1">
                          • {post.title}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {chapters.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">📖</p>
            <p className="text-xs">챕터를 추가하면 목차가 표시됩니다</p>
          </div>
        )}
      </div>

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        project={project}
        chapters={chapters}
        posts={posts}
        bookPreface={bookPreface}
        bookEpilogue={bookEpilogue}
      />
    </div>
  );
}
