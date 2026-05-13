import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { ScrapeResult } from '@/types';

const rssParser = new Parser();

function detectBlogType(url: string): 'naver' | 'tistory' | 'wordpress' | 'rss' | 'unknown' {
  if (url.includes('blog.naver.com')) return 'naver';
  if (url.includes('.tistory.com')) return 'tistory';
  if (url.includes('wordpress.com') || url.includes('/feed') || url.endsWith('.xml')) return 'rss';
  return 'unknown';
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return response.text();
}

export async function scrapeNaver(url: string): Promise<ScrapeResult> {
  const mobileUrl = url.replace('blog.naver.com', 'm.blog.naver.com');
  const html = await fetchHtml(mobileUrl);
  const $ = cheerio.load(html);

  const title = $('meta[property="og:title"]').attr('content') || $('.se-title-text').text().trim() || $('title').text().trim() || '제목 없음';
  const content = $('.se-main-container').html() || $('.post-view').html() || $('.view').html() || $('article').html() || '';
  const publishedAt = $('meta[property="article:published_time"]').attr('content') || $('.se_publishDate').text().trim() || null;

  const images: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && src.startsWith('http') && !src.includes('icon') && !src.includes('btn')) images.push(src);
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

  const title = $('meta[property="og:title"]').attr('content') || $('.entry-title').text().trim() || $('h1.title').text().trim() || $('title').text().trim() || '제목 없음';
  const content = $('.entry-content').html() || $('.article-view').html() || $('#content').html() || $('.post-content').html() || '';
  const publishedAt = $('meta[property="article:published_time"]').attr('content') || $('time').attr('datetime') || null;

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

  const title = $('meta[property="og:title"]').attr('content') || $('h1.entry-title').text().trim() || $('.post-title').text().trim() || $('title').text().trim() || '제목 없음';
  const content = $('.entry-content').html() || $('.post-content').html() || $('article .content').html() || '';
  const publishedAt = $('meta[property="article:published_time"]').attr('content') || $('time.entry-date').attr('datetime') || null;

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

  const title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim() || $('title').text().trim() || '제목 없음';
  const content = $('article').html() || $('main').html() || $('.post-content, .entry-content, .article-content').html() || $('body').html() || '';
  const publishedAt = $('meta[property="article:published_time"]').attr('content') || $('time').first().attr('datetime') || null;

  const images: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && src.startsWith('http')) images.push(src);
  });

  return { title, content, publishedAt, images: [...new Set(images)], tags: [], originalUrl: url };
}

export async function scrapeUrl(url: string): Promise<ScrapeResult | ScrapeResult[]> {
  const type = detectBlogType(url);
  switch (type) {
    case 'naver': return scrapeNaver(url);
    case 'tistory': return scrapeTistory(url);
    case 'rss': return scrapeRss(url);
    default:
      if (url.includes('wordpress')) return scrapeWordpress(url);
      return scrapeGeneric(url);
  }
}
