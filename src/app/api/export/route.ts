import { NextRequest, NextResponse } from 'next/server';
import { generateDocx } from '@/lib/exporters/docx';
import { generatePdf } from '@/lib/exporters/pdf';
import { generateEpub } from '@/lib/exporters/epub';
import { Chapter, Post, ExportFormat } from '@/types';

interface ExportRequestBody {
  projectId: string;
  format: ExportFormat;
  chapters: Chapter[];
  posts: Post[];
  bookInfo: { title: string; author: string; description?: string };
  bookPreface?: string;
  bookEpilogue?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ExportRequestBody = await req.json();
    const { format, chapters, posts, bookInfo, bookPreface, bookEpilogue } = body;
    if (!format || !chapters || !posts || !bookInfo) return NextResponse.json({ error: '필수 파라미터가 누락되었습니다' }, { status: 400 });

    const enrichedChapters: Chapter[] = [...chapters];
    const enrichedPosts: Post[] = [...posts];

    if (bookPreface) {
      enrichedPosts.unshift({ id: '__preface__', projectId: body.projectId, title: '서문', content: `<p>${bookPreface.replace(/\n/g, '</p><p>')}</p>`, originalUrl: '', publishedAt: null, images: [], selected: true, order: -2, tags: [] });
      enrichedChapters.unshift({ id: '__preface_chapter__', projectId: body.projectId, title: '서문', postIds: ['__preface__'], order: -2 });
    }

    if (bookEpilogue) {
      enrichedPosts.push({ id: '__epilogue__', projectId: body.projectId, title: '에필로그', content: `<p>${bookEpilogue.replace(/\n/g, '</p><p>')}</p>`, originalUrl: '', publishedAt: null, images: [], selected: true, order: 99999, tags: [] });
      enrichedChapters.push({ id: '__epilogue_chapter__', projectId: body.projectId, title: '에필로그', postIds: ['__epilogue__'], order: 99999 });
    }

    let buffer: Buffer;
    let contentType: string;
    const safeTitle = bookInfo.title.replace(/[^가-힣a-zA-Z0-9\s]/g, '').trim() || 'book';

    if (format === 'docx') {
      buffer = await generateDocx(bookInfo, enrichedChapters, enrichedPosts);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (format === 'pdf') {
      buffer = await generatePdf(bookInfo, enrichedChapters, enrichedPosts);
      contentType = 'application/pdf';
    } else if (format === 'epub') {
      buffer = await generateEpub(bookInfo, enrichedChapters, enrichedPosts);
      contentType = 'application/epub+zip';
    } else {
      return NextResponse.json({ error: '지원하지 않는 형식입니다' }, { status: 400 });
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`${safeTitle}.${format}`)}`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('내보내기 오류:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : '내보내기 중 오류가 발생했습니다' }, { status: 500 });
  }
}
