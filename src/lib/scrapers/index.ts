import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { ScrapeResult } from '@/types';

const rssParser = new Parser();

export type BlogPlatform = 'naver' | 'tistory' | 'wordpress' | 'rss' | 'unknown';

export function detectBlogType(url: string): BlogPlatform {
  if (url.includes('blog.naver.com')) return 'naver';
  if (url.includes('.tistory.com')) return 'tistory';
  if (url.includes('/feed') || url.endsWith('.xml') || url.includes('/rss')) return 'rss';
  return 'unknown';
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return response.text();
}

// ─── URL collection (phase 1) ────────────────────────────────────────────────

async function collectNaverPostUrls(rootUrl: string, maxPosts: number): Promise<string[]> {
  const match = rootUrl.match(/blog\.naver\.com\/([^/?#]+)/);
  if (!match) return [];
  const blogId = match[1];

  const urls: string[] = [];
  const seen = new Set<string>();
  let page = 1;

  while (urls.length < maxPosts) {
    const listUrl = `https://blog.naver.com/PostList.naver?blogId=${blogId}&currentPage=${page}`;
    try {
      const html = await fetchHtml(listUrl);
      const $ = cheerio.load(html);
      let found = 0;

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const logNoMatch = href.match(/[?&]logNo=(\d+)/);
        if (logNoMatch) {
          const postUrl = `https://blog.naver.com/${blogId}/${logNoMatch[1]}`;
          if (!seen.has(postUrl)) {
            seen.add(postUrl);
            urls.push(postUrl);
            found++;
          }
        }
      });

      if (found === 0) break;
      page++;
    } catch {
      break;
    }
  }

  return urls.slice(0, maxPosts);
}

async function collectTistoryPostUrls(rootUrl: string, maxPosts: number): Promise<string[]> {
  const base = new URL(rootUrl).origin;
  const seen = new Set<string>();

  // Try sitemap.xml first
  try {
    const sitemapXml = await fetchHtml(`${base}/sitemap.xml`);
    const $ = cheerio.load(sitemapXml, { xmlMode: true });
    const locs: string[] = [];
    $('loc').each((_, el) => {
      const loc = $(el).text().trim();
      if (loc.startsWith(base) && loc !== base && loc !== `${base}/`) {
        locs.push(loc);
      }
    });
    if (locs.length > 0) return locs.slice(0, maxPosts);
  } catch {
    // fall through to pagination
  }

  // Pagination fallback
  const urls: string[] = [];
  let page = 1;

  while (urls.length < maxPosts) {
    try {
      const html = await fetchHtml(`${base}/?page=${page}`);
      const $ = cheerio.load(html);
      let found = 0;

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const fullUrl = href.startsWith('http') ? href : `${base}${href}`;
        if (
          fullUrl.startsWith(base) &&
          fullUrl !== base &&
          (fullUrl.match(/\/\d+$/) || fullUrl.includes('/entry/')) &&
          !seen.has(fullUrl)
        ) {
          seen.add(fullUrl);
          urls.push(fullUrl);
          found++;
        }
      });

      if (found === 0) break;
      page++;
    } catch {
      break;
    }
  }

  return urls.slice(0, maxPosts);
}

async function collectWordpressPostUrls(rootUrl: string, maxPosts: number): Promise<string[]> {
  const base = new URL(rootUrl).origin;
  const urls: string[] = [];
  let page = 1;

  while (urls.length < maxPosts) {
    try {
      const apiUrl = `${base}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=link`;
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) break;
      const posts: Array<{ link: string }> = await res.json();
      if (!Array.isArray(posts) || posts.length === 0) break;

      for (const post of posts) {
        if (post.link) urls.push(post.link);
      }
      if (posts.length < 100) break;
      page++;
    } catch {
      break;
    }
  }

  return urls.slice(0, maxPosts);
}

async function collectRssPostUrls(feedUrl: string, maxPosts: number): Promise<string[]> {
  const feed = await rssParser.parseURL(feedUrl);
  return feed.items
    .map((item) => item.link || '')
    .filter(Boolean)
    .slice(0, maxPosts);
}

export async function collectPostUrls(
  rootUrl: string,
  maxPosts: number
): Promise<{ urls: string[]; platform: BlogPlatform }> {
  const platform = detectBlogType(rootUrl);

  let urls: string[];
  switch (platform) {
    case 'naver':
      urls = await collectNaverPostUrls(rootUrl, maxPosts);
      break;
    case 'tistory':
      urls = await collectTistoryPostUrls(rootUrl, maxPosts);
      break;
    case 'rss':
      urls = await collectRssPostUrls(rootUrl, maxPosts);
      break;
    default: {
      // WordPress REST API detection
      const base = (() => { try { return new URL(rootUrl).origin; } catch { return null; } })();
      if (base) {
        const wpUrls = await collectWordpressPostUrls(rootUrl, maxPosts);
        if (wpUrls.length > 0) return { urls: wpUrls, platform: 'wordpress' };
      }
      // Last resort: treat as RSS
      try {
        urls = await collectRssPostUrls(rootUrl, maxPosts);
      } catch {
        urls = [rootUrl];
      }
    }
  }

  return { urls, platform };
}

// ─── Individual post scrapers (phase 2) ──────────────────────────────────────

export async function scrapeNaver(url: string): Promise<ScrapeResult> {
  const mobileUrl = url.replace('blog.naver.com', 'm.blog.naver.com');
  const html = await fetchHtml(mobileUrl);
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('.se-title-text').text().trim() ||
    $('title').text().trim() ||
    '제목 없음';

  const content =
    $('.se-main-container').html() ||
    $('.post-view').html() ||
    $('.view').html() ||
    $('article').html() ||
    '';

  const publishedAt =
    $('meta[property="article:published_time"]').attr('content') ||
    $('.se_publishDate').text().trim() ||
    null;

  const images: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && src.startsWith('http') && !src.includes('icon') && !src.includes('btn')) {
      images.push(src);
    }
  });

  const tags: string[] = [];
  $('.post_tag a, .tag_area a').each((_, el) => {
    const tag = $(el).text().trim().replace('#', '');
    if (tag) tags.push(tag);
  });

  return { title, content, publishedAt, images: [...new Set(images)], tags, originalUrl: url };
}

export async function scrapeTistory(url: string): Promise<ScrapeResult> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('.entry-title').text().trim() ||
    $('h1.title').text().trim() ||
    $('title').text().trim() ||
    '제목 없음';

  const content =
    $('.entry-content').html() ||
    $('.article-view').html() ||
    $('#content').html() ||
    $('.post-content').html() ||
    '';

  const publishedAt =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time').attr('datetime') ||
    null;

  const images: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-original');
    if (src && src.startsWith('http')) images.push(src);
  });

  const tags: string[] = [];
  $('.tag a, .tags a, .entry-tags a').each((_, el) => {
    const tag = $(el).text().trim().replace('#', '');
    if (tag) tags.push(tag);
  });

  return { title, content, publishedAt, images: [...new Set(images)], tags, originalUrl: url };
}

export async function scrapeWordpress(url: string): Promise<ScrapeResult> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('h1.entry-title').text().trim() ||
    $('.post-title').text().trim() ||
    $('title').text().trim() ||
    '제목 없음';

  const content =
    $('.entry-content').html() ||
    $('.post-content').html() ||
    $('article .content').html() ||
    '';

  const publishedAt =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time.entry-date').attr('datetime') ||
    null;

  const images: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && src.startsWith('http')) images.push(src);
  });

  const tags: string[] = [];
  $('.tags-links a, .tag-links a').each((_, el) => {
    const tag = $(el).text().trim();
    if (tag) tags.push(tag);
  });

  return { title, content, publishedAt, images: [...new Set(images)], tags, originalUrl: url };
}

export async function scrapeRss(feedUrl: string): Promise<ScrapeResult[]> {
  const feed = await rssParser.parseURL(feedUrl);
  return feed.items.map((item) => {
    const $ = cheerio.load(item.content || item['content:encoded'] || '');
    const images: string[] = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) images.push(src);
    });
    return {
      title: item.title || '제목 없음',
      content: item.content || item['content:encoded'] || '',
      publishedAt: item.pubDate || item.isoDate || null,
      images: [...new Set(images)],
      tags: item.categories || [],
      originalUrl: item.link || feedUrl,
    };
  });
}

export async function scrapeGeneric(url: string): Promise<ScrapeResult> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    '제목 없음';

  const content =
    $('article').html() ||
    $('main').html() ||
    $('.post-content, .entry-content, .article-content').html() ||
    $('body').html() ||
    '';

  const publishedAt =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time').first().attr('datetime') ||
    null;

  const images: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && src.startsWith('http')) images.push(src);
  });

  return { title, content, publishedAt, images: [...new Set(images)], tags: [], originalUrl: url };
}

/** Scrape a single post URL (never calls RSS parser — individual HTML page only). */
export async function scrapePostUrl(url: string): Promise<ScrapeResult> {
  const platform = detectBlogType(url);
  switch (platform) {
    case 'naver':
      return scrapeNaver(url);
    case 'tistory':
      return scrapeTistory(url);
    default:
      if (url.includes('wordpress') || url.includes('/wp-')) return scrapeWordpress(url);
      return scrapeGeneric(url);
  }
}

/** Legacy entry point — kept for backwards compatibility. */
export async function scrapeUrl(url: string): Promise<ScrapeResult | ScrapeResult[]> {
  const platform = detectBlogType(url);
  switch (platform) {
    case 'naver':
      return scrapeNaver(url);
    case 'tistory':
      return scrapeTistory(url);
    case 'rss':
      return scrapeRss(url);
    default:
      if (url.includes('wordpress')) return scrapeWordpress(url);
      return scrapeGeneric(url);
  }
}
