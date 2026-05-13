import { jsPDF } from 'jspdf';
import * as cheerio from 'cheerio';
import { Chapter, Post } from '@/types';

interface BookInfo {
  title: string;
  author: string;
  description?: string;
}

function stripHtml(html: string): string {
  const $ = cheerio.load(html);
  return $.text().trim();
}

function splitTextToLines(text: string, maxWidth: number, doc: jsPDF): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

export async function generatePdf(
  bookInfo: BookInfo,
  chapters: Chapter[],
  posts: Post[]
): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageBreak(neededHeight: number = 10) {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function addText(
    text: string,
    fontSize: number,
    options: {
      bold?: boolean;
      align?: 'left' | 'center' | 'right';
      color?: [number, number, number];
      spacing?: number;
    } = {}
  ) {
    doc.setFontSize(fontSize);
    if (options.bold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    if (options.color) {
      doc.setTextColor(...options.color);
    } else {
      doc.setTextColor(0, 0, 0);
    }

    const lines = splitTextToLines(text, contentWidth, doc);
    const lineHeight = fontSize * 0.4;

    for (const line of lines) {
      checkPageBreak(lineHeight + 2);
      const x =
        options.align === 'center'
          ? pageWidth / 2
          : options.align === 'right'
            ? pageWidth - margin
            : margin;

      doc.text(line, x, y, {
        align: options.align || 'left',
      });
      y += lineHeight + 2;
    }
    y += options.spacing || 4;
  }

  // 표지
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);

  const titleLines = splitTextToLines(bookInfo.title, contentWidth - 10, doc);
  let coverY = pageHeight * 0.35;
  for (const line of titleLines) {
    doc.text(line, pageWidth / 2, coverY, { align: 'center' });
    coverY += 12;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.text(bookInfo.author, pageWidth / 2, coverY + 10, { align: 'center' });

  if (bookInfo.description) {
    doc.setFontSize(11);
    const descLines = splitTextToLines(bookInfo.description, contentWidth - 20, doc);
    let descY = coverY + 30;
    for (const line of descLines) {
      doc.text(line, pageWidth / 2, descY, { align: 'center' });
      descY += 6;
    }
  }

  // 목차
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  y = margin;

  addText('목  차', 20, { bold: true, align: 'center', spacing: 10 });

  const postMap = new Map(posts.map((p) => [p.id, p]));

  chapters.forEach((chapter, idx) => {
    addText(`${idx + 1}. ${chapter.title}`, 13, { bold: true, spacing: 2 });
    chapter.postIds.forEach((postId) => {
      const post = postMap.get(postId);
      if (post) {
        addText(`   • ${post.title}`, 10, { color: [80, 80, 80], spacing: 1 });
      }
    });
    y += 4;
  });

  // 챕터 본문
  for (const chapter of chapters) {
    doc.addPage();
    y = margin;

    addText(chapter.title, 18, { bold: true, spacing: 8 });

    if (chapter.preface) {
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + 3, y);
      addText(chapter.preface, 11, { color: [70, 70, 70], spacing: 8 });
    }

    for (const postId of chapter.postIds) {
      const post = postMap.get(postId);
      if (!post) continue;

      checkPageBreak(20);
      addText(post.title, 14, { bold: true, spacing: 2 });

      if (post.publishedAt) {
        addText(
          new Date(post.publishedAt).toLocaleDateString('ko-KR'),
          9,
          { color: [128, 128, 128], spacing: 4 }
        );
      }

      const plainText = stripHtml(post.content);
      if (plainText) {
        addText(plainText, 10, { spacing: 8 });
      }

      // 구분선
      checkPageBreak(6);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    }
  }

  // 페이지 번호
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(String(i - 1), pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
