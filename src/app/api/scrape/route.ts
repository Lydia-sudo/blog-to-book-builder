import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/scrapers';
import { ScrapeResult } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { url, projectId } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL이 필요합니다' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId가 필요합니다' }, { status: 400 });
    }

    let urlToScrape = url.trim();
    if (!urlToScrape.startsWith('http')) {
      urlToScrape = 'https://' + urlToScrape;
    }

    const result = await scrapeUrl(urlToScrape);

    if (Array.isArray(result)) {
      return NextResponse.json({ posts: result });
    }

    return NextResponse.json({ post: result, posts: [result] });
  } catch (err) {
    console.error('스크래핑 오류:', err);
    const message = err instanceof Error ? err.message : '스크래핑 중 오류가 발생했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
