import { Chapter, Post } from '@/types';

interface BookInfo { title: string; author: string; description?: string; }

export async function generateEpub(bookInfo: BookInfo, chapters: Chapter[], posts: Post[]): Promise<Buffer> {
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const epubChapters: { title: string; content: string }[] = [];

  if (bookInfo.description) {
    epubChapters.push({ title: '서문', content: `<h1>서문</h1><p>${bookInfo.description}</p>` });
  }

  let tocHtml = '<h1>목차</h1><ul>';
  chapters.forEach((chapter, idx) => {
    tocHtml += `<li><strong>${idx + 1}. ${chapter.title}</strong><ul>`;
    chapter.postIds.forEach((postId) => {
      const post = postMap.get(postId);
      if (post) tocHtml += `<li>${post.title}</li>`;
    });
    tocHtml += '</ul></li>';
  });
  tocHtml += '</ul>';
  epubChapters.push({ title: '목차', content: tocHtml });

  for (const chapter of chapters) {
    let chapterContent = `<h1>${chapter.title}</h1>`;
    if (chapter.preface) chapterContent += `<blockquote><em>${chapter.preface}</em></blockquote>`;
    for (const postId of chapter.postIds) {
      const post = postMap.get(postId);
      if (!post) continue;
      chapterContent += `<h2>${post.title}</h2>`;
      if (post.publishedAt) chapterContent += `<p><small>${new Date(post.publishedAt).toLocaleDateString('ko-KR')}</small></p>`;
      chapterContent += post.content || '';
      chapterContent += '<hr/>';
    }
    epubChapters.push({ title: chapter.title, content: chapterContent });
  }

  const { default: Epub } = await import('epub-gen-memory');
  const options = {
    title: bookInfo.title,
    author: bookInfo.author,
    publisher: bookInfo.author,
    description: bookInfo.description || '',
    lang: 'ko',
    content: epubChapters,
    css: `body { font-family: 'Malgun Gothic', serif; line-height: 1.8; } h1 { font-size: 1.8em; } h2 { font-size: 1.4em; } p { margin: 0.5em 0; text-indent: 1em; } blockquote { border-left: 3px solid #ccc; padding-left: 1em; color: #555; font-style: italic; } hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; } img { max-width: 100%; height: auto; }`,
  };
  const epubBuffer = await Epub(options);
  return Buffer.from(epubBuffer);
}
