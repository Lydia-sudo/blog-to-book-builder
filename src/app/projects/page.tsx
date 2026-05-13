'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProject';
import { LoginButton } from '@/components/auth/LoginButton';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const { projects, loading, createProject, deleteProject } = useProjects();
  const router = useRouter();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', coverTitle: '', author: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  if (authLoading) {
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

  async function handleCreate() {
    if (!form.title.trim()) {
      setError('프로젝트 이름을 입력해주세요');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const id = await createProject({
        title: form.title.trim(),
        coverTitle: form.coverTitle.trim() || form.title.trim(),
        author: form.author.trim() || user?.displayName || '작자 미상',
        description: form.description.trim(),
      });
      setShowCreate(false);
      setForm({ title: '', coverTitle: '', author: '', description: '' });
      router.push(`/projects/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로젝트 생성 실패');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <span className="font-bold text-gray-900">Blog-to-Book Builder</span>
          </Link>
          <LoginButton />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">내 프로젝트</h1>
            <p className="text-sm text-gray-500 mt-0.5">블로그 글로 만들 책 프로젝트를 관리하세요</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>+ 새 프로젝트</Button>
        </div>

        {loading ? (
          <div className="py-20">
            <LoadingSpinner text="프로젝트 목록 불러오는 중..." />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-5xl mb-4">📖</p>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">첫 프로젝트를 만들어보세요</h2>
            <p className="text-gray-500 mb-6">블로그 글을 모아 나만의 책을 만들 수 있습니다</p>
            <Button onClick={() => setShowCreate(true)}>+ 새 프로젝트 만들기</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white">
                  <p className="text-xs text-blue-200 mb-1">{project.author}</p>
                  <p className="font-bold text-lg line-clamp-2">
                    {project.coverTitle || project.title}
                  </p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-3">
                    {project.updatedAt.toLocaleDateString('ko-KR')} 수정
                  </p>
                  <div className="flex gap-2">
                    <Link href={`/projects/${project.id}`} className="flex-1">
                      <Button variant="primary" size="sm" className="w-full">
                        열기
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('프로젝트를 삭제하시겠습니까?')) {
                          deleteProject(project.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 프로젝트 생성 모달 */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="새 프로젝트 만들기">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              프로젝트 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="예: 개발자의 성장 이야기"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              책 표제
            </label>
            <input
              type="text"
              value={form.coverTitle}
              onChange={(e) => setForm({ ...form, coverTitle: e.target.value })}
              placeholder="표지에 표시될 제목 (미입력시 프로젝트 이름 사용)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">저자</label>
            <input
              type="text"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder={user.displayName || '저자 이름'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">책 소개</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="책에 대한 간단한 소개..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              프로젝트 만들기
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
