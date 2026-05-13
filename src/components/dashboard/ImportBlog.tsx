'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface ImportBlogProps {
  projectId: string;
}

type Phase = 'idle' | 'collecting' | 'scraping' | 'done' | 'error';

export function ImportBlog({ projectId }: ImportBlogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [maxPosts, setMaxPosts] = useState(100);
  const [phase, setPhase] = useState<Phase>('idle');
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(0);
  const [liveTitle, setLiveTitle] = useState('');
  const [completedTitles, setCompletedTitles] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const isRunning = phase === 'collecting' || phase === 'scraping';

  async function handleScrape() {
    if (!url.trim() || isRunning) return;

    setPhase('collecting');
    setTotal(0);
    setCurrent(0);
    setLiveTitle('URL 목록 수집 중...');
    setCompletedTitles([]);
    setErrorMsg('');

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), maxPosts, projectId }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || '스크래핑 요청 실패');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6)) as {
              status: string;
              total: number;
              current: number;
              title: string;
            };

            if (data.status === 'collecting') {
              setPhase('collecting');
              if (data.total > 0) setTotal(data.total);
              setLiveTitle(data.title);
            } else if (data.status === 'scraping') {
              setPhase('scraping');
              setTotal(data.total);
              setCurrent(data.current);
              setLiveTitle(data.title);
              if (data.title && !data.title.startsWith('(오류)')) {
                setCompletedTitles((prev) => {
                  const next = [...prev, data.title];
                  // auto-scroll
                  setTimeout(() => {
                    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
                  }, 0);
                  return next;
                });
              }
            } else if (data.status === 'done') {
              setPhase('done');
              setTotal(data.total);
              setCurrent(data.total);
            } else if (data.status === 'error') {
              setPhase('error');
              setErrorMsg(data.title || '알 수 없는 오류');
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }

      // Mark done if the stream ended without an explicit done event
      setPhase((prev) => (prev === 'scraping' || prev === 'collecting' ? 'done' : prev));
    } catch (err) {
      setPhase('error');
      setErrorMsg(err instanceof Error ? err.message : '알 수 없는 오류');
    }
  }

  function handleClose() {
    if (isRunning) return;
    setIsOpen(false);
    setUrl('');
    setPhase('idle');
    setTotal(0);
    setCurrent(0);
    setCompletedTitles([]);
    setErrorMsg('');
  }

  const progressPct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="sm">
        + 블로그 가져오기
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} title="블로그 글 가져오기" size="lg">
        <div className="space-y-5">
          {/* URL + 최대 글 수 입력 */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                블로그 루트 URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                placeholder="https://blog.naver.com/userid"
                disabled={isRunning}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                지원: 네이버 블로그, 티스토리, 워드프레스, RSS 피드
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                최대 수집 글 수
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={maxPosts}
                onChange={(e) => setMaxPosts(Number(e.target.value))}
                disabled={isRunning}
                className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
              <Button
                onClick={handleScrape}
                loading={isRunning}
                disabled={!url.trim() || isRunning || phase === 'done'}
              >
                {isRunning ? '수집 중...' : '수집 시작'}
              </Button>
            </div>
          </div>

          {/* 오류 */}
          {phase === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* 진행 상태 */}
          {(isRunning || phase === 'done') && (
            <div className="space-y-3">
              {/* 단계 표시 */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {phase === 'collecting' && (
                  <>
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
                    {liveTitle}
                  </>
                )}
                {phase === 'scraping' && (
                  <>
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                    <span className="font-medium">{current} / {total}</span>
                    <span className="truncate max-w-xs text-gray-500">{liveTitle}</span>
                  </>
                )}
                {phase === 'done' && (
                  <span className="font-semibold text-green-600">
                    ✓ 총 {total}개 수집 완료
                  </span>
                )}
              </div>

              {/* 진행률 바 */}
              {total > 0 && (
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${phase === 'done' ? 100 : progressPct}%` }}
                  />
                </div>
              )}

              {/* 완료된 글 목록 */}
              {completedTitles.length > 0 && (
                <div
                  ref={listRef}
                  className="max-h-52 overflow-y-auto space-y-1 border border-gray-100 rounded-lg bg-gray-50 p-2"
                >
                  {completedTitles.map((title, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm py-1 px-2">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      <span className="text-gray-700 line-clamp-1">{title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 완료 후 닫기 */}
          {phase === 'done' && (
            <div className="flex justify-end">
              <Button onClick={handleClose}>닫기</Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
