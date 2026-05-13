export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  coverTitle: string;
  author: string;
  description?: string;
  coverImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  projectId: string;
  title: string;
  content: string;
  originalUrl: string;
  publishedAt: Date | null;
  images: string[];
  selected: boolean;
  order: number;
  tags: string[];
  summary?: string;
}

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  postIds: string[];
  order: number;
  preface?: string;
}

export interface Export {
  id: string;
  userId: string;
  projectId: string;
  format: 'pdf' | 'docx' | 'epub';
  url: string;
  createdAt: Date;
}

export type ExportFormat = 'pdf' | 'docx' | 'epub';

export interface ScrapeRequest {
  url: string;
  projectId: string;
}

export interface ScrapeResult {
  title: string;
  content: string;
  publishedAt: string | null;
  images: string[];
  tags: string[];
  originalUrl: string;
}

export interface AIRequest {
  action: 'summarize' | 'unify-style' | 'chapter-preface' | 'book-preface' | 'epilogue';
  content: string;
  context?: string;
  projectId?: string;
}

export interface AIResponse {
  result: string;
}

export interface ExportRequest {
  projectId: string;
  format: ExportFormat;
  chapters: Chapter[];
  posts: Post[];
  bookInfo: {
    title: string;
    author: string;
    description?: string;
  };
}
