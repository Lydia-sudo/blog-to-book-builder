import { NextRequest } from 'next/server';
import { collectPostUrls, scrapePostUrl } from '@/lib/scrapers';
import { adminDb, adminStorage } from '@/lib/firebaseAdmin';

interface SSEEvent {
  status: 'collecting' | 'scraping' | 'done' | 'error';
  total: number;
  current: number;
  title: string;
}

async function uploadImageToStorage(
  imageUrl: string,
  projectId: string
): Promise<string> {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return imageUrl;

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg';
    const fileName = `projects/${projectId}/images/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const bucket = adminStorage.bucket();
    const file = bucket.file(fileName);
    await file.save(buffer, { contentType, public: true });

    return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
  } catch {
    return imageUrl;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { url, maxPosts = 100, projectId } = body as {
    url?: string;
    maxPosts?: number;
    projectId?: string;
  };

  if (!url || typeof url !== 'string') {
    return new Response(JSON.stringify({ error: 'URL이 필요합니다' }), { status: 400 });
  }
  if (!projectId) {
    return new Response(JSON.stringify({ error: 'projectId가 필요합니다' }), { status: 400 });
  }

  const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
  const limit = Math.min(Math.max(1, Number(maxPosts) || 100), 500);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // client disconnected — ignore
        }
      };

      try {
        // Phase 1: collect post URL list
        send({ status: 'collecting', total: 0, current: 0, title: 'URL 목록 수집 중...' });

        const { urls } = await collectPostUrls(normalizedUrl, limit);

        if (urls.length === 0) {
          send({ status: 'error', total: 0, current: 0, title: '수집된 글이 없습니다' });
          controller.close();
          return;
        }

        send({
          status: 'collecting',
          total: urls.length,
          current: 0,
          title: `${urls.length}개 글 발견`,
        });

        // Phase 2: scrape each URL and save to Firestore
        const postsRef = adminDb.collection('projects').doc(projectId).collection('posts');

        for (let i = 0; i < urls.length; i++) {
          const postUrl = urls[i];
          try {
            const result = await scrapePostUrl(postUrl);

            const uploadedImages = await Promise.all(
              result.images.slice(0, 10).map((img) => uploadImageToStorage(img, projectId))
            );

            // Replace original image URLs in content HTML
            let content = result.content;
            result.images.forEach((orig, idx) => {
              if (uploadedImages[idx] && uploadedImages[idx] !== orig) {
                content = content.replaceAll(orig, uploadedImages[idx]);
              }
            });

            await postsRef.add({
              title: result.title,
              content,
              originalUrl: result.originalUrl,
              publishedAt: result.publishedAt ? new Date(result.publishedAt) : null,
              images: uploadedImages,
              selected: false,
              order: i,
              tags: result.tags,
              createdAt: new Date(),
            });

            send({
              status: 'scraping',
              total: urls.length,
              current: i + 1,
              title: result.title,
            });
          } catch {
            send({
              status: 'scraping',
              total: urls.length,
              current: i + 1,
              title: `(오류) ${postUrl}`,
            });
          }
        }

        send({ status: 'done', total: urls.length, current: urls.length, title: '' });
      } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        send({ status: 'error', total: 0, current: 0, title: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
