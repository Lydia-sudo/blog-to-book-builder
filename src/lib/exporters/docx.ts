import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } from 'docx';
import * as cheerio from 'cheerio';
import { Chapter, Post } from '@/types';

interface BookInfo { title: string; author: string; description?: string; }

function htmlToDocxParagraphs(html: string): Paragraph[] {
  const $ = cheerio.load(html);
  const paragraphs: Paragraph[] = [];

  $('p, h1, h2, h3, h4, br').each((_, el) => {
    const tag = (el as cheerio.TagElement).name;
    const text = $(el).text().trim();
    if (!text && tag !== 'br') return;
    if (tag === 'br') { paragraphs.push(new Paragraph({ text: '' })); return; }
    if (tag === 'h1') { paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_1 })); }
    else if (tag === 'h2') { paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2 })); }
    else if (tag === 'h3') { paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_3 })); }
    else { paragraphs.push(new Paragraph({ children: [new TextRun({ text, size: 24 })], spacing: { after: 200 } })); }
  });

  if (paragraphs.length === 0 && html) {
    const text = cheerio.load(html).text().trim();
    if (text) paragraphs.push(new Paragraph({ children: [new TextRun({ text, size: 24 })], spacing: { after: 200 } }));
  }
  return paragraphs;
}

export async function generateDocx(bookInfo: BookInfo, chapters: Chapter[], posts: Post[]): Promise<Buffer> {
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const sections: Paragraph[] = [];

  sections.push(
    new Paragraph({ children: [new TextRun({ text: bookInfo.title, size: 56, bold: true })], alignment: AlignmentType.CENTER, spacing: { before: 2000, after: 400 } }),
    new Paragraph({ children: [new TextRun({ text: bookInfo.author, size: 32 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } })
  );
  if (bookInfo.description) {
    sections.push(new Paragraph({ children: [new TextRun({ text: bookInfo.description, size: 24, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }));
  }
  sections.push(new Paragraph({ children: [new PageBreak()] }));

  sections.push(new Paragraph({ text: '목차', heading: HeadingLevel.HEADING_1, spacing: { after: 400 } }));
  chapters.forEach((chapter, idx) => {
    sections.push(new Paragraph({ children: [new TextRun({ text: `${idx + 1}. ${chapter.title}`, size: 24 })], spacing: { after: 200 } }));
  });
  sections.push(new Paragraph({ children: [new PageBreak()] }));

  for (const chapter of chapters) {
    sections.push(new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 400 } }));
    if (chapter.preface) {
      sections.push(new Paragraph({ children: [new TextRun({ text: chapter.preface, size: 24, italics: true })], spacing: { after: 400 } }));
    }
    for (const postId of chapter.postIds) {
      const post = postMap.get(postId);
      if (!post) continue;
      sections.push(new Paragraph({ text: post.title, heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }));
      if (post.publishedAt) {
        sections.push(new Paragraph({ children: [new TextRun({ text: new Date(post.publishedAt).toLocaleDateString('ko-KR'), size: 20, color: '888888' })], spacing: { after: 200 } }));
      }
      sections.push(...htmlToDocxParagraphs(post.content));
    }
    sections.push(new Paragraph({ children: [new PageBreak()] }));
  }

  const doc = new Document({
    sections: [{ properties: {}, children: sections }],
    styles: { default: { document: { run: { font: 'Malgun Gothic', size: 24 } } } },
  });
  return Packer.toBuffer(doc);
}
