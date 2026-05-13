'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProject } from '@/hooks/useProject';
import { usePosts, useChapters } from '@/hooks/usePosts';
import { LoginButton } from '@/components/auth/LoginButton';
import { PostList } from '@/components/dashboard/PostList';
import { ChapterBuilder } from '@/components/dashboard/ChapterBuilder';
import { BookPreview } from '@/components/dashboard/BookPreview';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Post } from '@/types';

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();
  const { project, loading: projectLoading } = useProject(projectId);
  const { posts } = usePosts(projectId);
  const { chapters } = useChapters(projectId);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'chapters' | 'preview'>('posts');

  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="로딩 중..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">로그인이 필요합니다</p>
        <LoginButton />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">프로젝트를 찾을 수 없습니다</p>
        <Button onClick={() => router.push('/projects')}>프로젝트 목록으로</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/projects" className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">{project.coverTitle || project.title}</h1>
              <p className="text-xs text-gray-500">{project.author}</p>
            </div>
          </div>
          <LoginButton />
        </div>

        {/* 모바일 탭 */}
        <div className="flex gap-1 mt-3 md:hidden">
          {(['posts', 'chapters', 'preview'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs rounded-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab === 'posts' ? '글 목록' : tab === 'chapters' ? '챕터 구성' : '미리보기'}
            </button>
          ))}
        </div>
      </header>

      {/* 3패널 레이아웃 (데스크탑) */}
      <div className="flex-1 overflow-hidden">
        {/* 데스크탑: 3패널 */}
        <div className="hidden md:grid md:grid-cols-3 h-full divide-x bg-white">
          <div className="overflow-hidden flex flex-col">
            <PostList projectId={projectId} onSelectPost={setSelectedPost} />
          </div>
          <div className="overflow-hidden flex flex-col">
            <ChapterBuilder projectId={projectId} />
          </div>
          <div className="overflow-hidden flex flex-col">
            <BookPreview project={project} chapters={chapters} posts={posts} />
          </div>
        </div>

        {/* 모바일: 탭 전환 */}
        <div className="md:hidden h-full bg-white overflow-hidden">
          {activeTab === 'posts' && (
            <div className="h-full flex flex-col">
              <PostList projectId={projectId} onSelectPost={setSelectedPost} />
            </div>
          )}
          {activeTab === 'chapters' && (
            <div className="h-full flex flex-col">
              <ChapterBuilder projectId={projectId} />
            </div>
          )}
          {activeTab === 'preview' && (
            <div className="h-full flex flex-col">
              <BookPreview project={project} chapters={chapters} posts={posts} />
            </div>
          )}
        </div>
      </div>

      {/* 글 상세보기 모달 */}
      {selectedPost && (
        <Modal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          title={selectedPost.title}
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {selectedPost.publishedAt && (
                <span>{new Date(selectedPost.publishedAt).toLocaleDateString('ko-KR')}</span>
              )}
              {selectedPost.originalUrl && (
                <a
                  href={selectedPost.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  원문 보기
                </a>
              )}
            </div>
            {selectedPost.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedPost.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: selectedPost.content }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
