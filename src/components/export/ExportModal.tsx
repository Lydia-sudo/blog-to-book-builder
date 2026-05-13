'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Chapter, Post, Project, ExportFormat } from '@/types';

interface ExportModalProps { isOpen: boolean; onClose: () => void; project: Project; chapters: Chapter[]; posts: Post[]; bookPreface?: string; bookEpilogue?: string; }

export function ExportModal({ isOpen, onClose, project, chapters, posts, bookPreface, bookEpilogue }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleExport() {
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, format, chapters, posts, bookInfo: { title: project.coverTitle || project.title, author: project.author, description: bookPreface || project.description }, bookPreface, bookEpilogue }) });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || '내보내기 실패'); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.coverTitle || project.title}.${format}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setSuccess(`${format.toUpperCase()} 파일이 다운로드되었습니다!`);
    } catch (err) { setError(err instanceof Error ? err.message : '알 수 없는 오류'); }
    finally { setLoading(false); }
  }

  const formatInfo = {
    pdf: { label: 'PDF', description: '인쇄에 최적화된 형식', icon: '📄' },
    docx: { label: 'Word (DOCX)', description: 'Microsoft Word에서 편집 가능한 형식', icon: '📝' },
    epub: { label: 'EPUB', description: '전자책 리더기 지원 형식', icon: '📚' },
  };

  const totalPosts = new Set(chapters.flatMap((c) => c.postIds)).size;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="책 내보내기" size="md">
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="font-medium text-gray-900">{project.coverTitle || project.title}</p>
          <p className="text-sm text-gray-500 mt-0.5">{project.author}</p>
          <div className="flex gap-4 mt-2">
            <span className="text-xs text-gray-500">챕터 {chapters.length}개</span>
            <span className="text-xs text-gray-500">글 {totalPosts}편</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">내보내기 형식</p>
          <div className="space-y-2">
            {(Object.keys(formatInfo) as ExportFormat[]).map((f) => (
              <label key={f} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${format === f ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} className="sr-only" />
                <span className="text-2xl">{formatInfo[f].icon}</span>
                <div>
                  <p className="font-medium text-sm text-gray-900">{formatInfo[f].label}</p>
                  <p className="text-xs text-gray-500">{formatInfo[f].description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={handleExport} loading={loading} disabled={chapters.length === 0}>{loading ? '생성 중...' : `${formatInfo[format].label}로 내보내기`}</Button>
        </div>
      </div>
    </Modal>
  );
}
