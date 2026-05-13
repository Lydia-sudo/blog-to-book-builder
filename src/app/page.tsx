'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginButton } from '@/components/auth/LoginButton';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/projects');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <span className="font-bold text-lg text-gray-900">Blog-to-Book Builder</span>
        </div>
        <LoginButton />
      </header>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-8">
          ✨ AI 기반 블로그 → 책 변환 서비스
        </div>

        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          블로그 글을
          <br />
          <span className="text-blue-600">나만의 책</span>으로
        </h1>

        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          네이버 블로그, 티스토리, 워드프레스의 글을 모아 챕터를 구성하고,
          AI의 도움으로 서문과 에필로그를 작성해 PDF, DOCX, EPUB으로 내보내세요.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <LoginButton />
          <Link
            href="/projects"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors text-sm font-semibold"
          >
            무료로 시작하기 →
          </Link>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: '🔗',
              title: '블로그 스크래핑',
              desc: '네이버, 티스토리, 워드프레스, RSS 피드에서 글을 자동으로 수집합니다.',
            },
            {
              icon: '✂️',
              title: '챕터 구성',
              desc: '드래그앤드롭으로 원하는 글을 챕터에 배치하고 순서를 조정합니다.',
            },
            {
              icon: '🤖',
              title: 'AI 편집',
              desc: 'Claude AI가 서문, 에필로그, 챕터 서문을 자동 생성해 드립니다.',
            },
            {
              icon: '📄',
              title: 'PDF 내보내기',
              desc: '인쇄에 최적화된 아름다운 PDF 파일로 내보냅니다.',
            },
            {
              icon: '📝',
              title: 'DOCX 내보내기',
              desc: 'Word 문서로 내보내 추가 편집이 가능합니다.',
            },
            {
              icon: '📱',
              title: 'EPUB 내보내기',
              desc: '전자책 리더기에서 읽을 수 있는 EPUB 파일을 생성합니다.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-gray-400 border-t border-gray-100 mt-20">
        <p>© 2024 Blog-to-Book Builder. 블로그 글을 책으로.</p>
      </footer>
    </div>
  );
}
