import { jsPDF } from 'jspdf';
import * as cheerio from 'cheerio';
import { Chapter, Post } from '@/types';

interface BookInfo { title: string; author: string; description?: string; }

function stripHtml(html: string): string {
  return cheerio.load(html).text().trim();
}

export async function generatePdf(bookInfo: BookInfo, chapters: Chapter[], posts: Post[]): Promise<Buffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageBreak(needed = 10) {
    if (y + needed > pageHeight - margin) { doc.addPage(); y = margin; }
  }

  function addText(text: string, fontSize: number, opts: { bold?: boolean; align?: 'left' | 'center' | 'right'; color?: [number, number, number]; spacing?: number } = {}) {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    if (opts.color) doc.setTextColor(...opts.color); else doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    const lh = fontSize * 0.4;
    for (const line of lines) {
      checkPageBreak(lh + 2);
      const x = opts.align === 'center' ? pageWidth / 2 : opts.align === 'right' ? pageWidth - margin : margin;
      doc.text(line, x, y, { align: opts.align || 'left' });
      y += lh + 2;
    }
    y += opts.spacing || 4;
  }

  // 표지
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  const titleLines = doc.splitTextToSize(bookInfo.title, contentWidth - 10) as string[];
  let coverY = pageHeight * 0.35;
  for (const line of titleLines) { doc.text(line, pageWidth / 2, coverY, { align: 'center' }); coverY += 12; }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text(bookInfo.author, pageWidth / 2, coverY + 10, { align: 'center' });
  if (bookInfo.description) {
    doc.setFontSize(11);
    const descLines = doc.splitTextToSize(bookInfo.description, contentWidth - 20) as string[];
    let descY = coverY + 30;
    for (const line of descLines) { doc.text(line, pageWidth / 2, descY, { align: 'center' }); descY += 6; }
  }

  // 목차
  doc.addPage();
  y = margin;
  addText('목  차', 20, { bold: true, align: 'center', spacing: 10 });
  const postMap = new Map(posts.map((p) => [p.id, p]));
  chapters.forEach((chapter, idx) => {
    addText(`${idx + 1}. ${chapter.title}`, 13, { bold: true, spacing: 2 });
    chapter.postIds.forEach((postId) => {
      const post = postMap.get(postId);
      if (post) addText(`   • ${post.title}`, 10, { color: [80, 80, 80], spacing: 1 });
    });
    y += 4;
  });

  // 챕터 본문
  for (const chapter of chapters) {
    doc.addPage();
    y = margin;
    addText(chapter.title, 18, { bold: true, spacing: 8 });
    if (chapter.preface) addText(chapter.preface, 11, { color: [70, 70, 70], spacing: 8 });
    for (const postId of chapter.postIds) {
      const post = postMap.get(postId);
      if (!post) continue;
      checkPageBreak(20);
      addText(post.title, 14, { bold: true, spacing: 2 });
      if (post.publishedAt) addText(new Date(post.publishedAt).toLocaleDateString('ko-KR'), 9, { color: [128, 128, 128], spacing: 4 });
      const plainText = stripHtml(post.content);
      if (plainText) addText(plainText, 10, { spacing: 8 });
      checkPageBreak(6);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(String(i - 1), pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}
