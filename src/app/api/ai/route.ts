import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIRequest } from '@/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const systemPrompt = `당신은 블로그 글을 책으로 엮어주는 전문 편집자입니다.
한국어로 자연스럽고 세련된 문체로 작업해주세요.
독자에게 가치 있는 내용을 전달하는 것을 최우선으로 합니다.`;

function buildPrompt(action: AIRequest['action'], content: string, context?: string): string {
  switch (action) {
    case 'summarize':
      return `다음 블로그 글을 2-3문장으로 요약해주세요:\n\n${content}`;
    case 'unify-style':
      return `다음 글의 문체를 책에 어울리는 정제된 문어체로 통일해주세요. 내용은 유지하고 문체만 개선해주세요:\n\n${content}`;
    case 'chapter-preface':
      return `"${context || '챕터'}" 챕터에는 다음 주제들의 글이 담겨 있습니다: ${content}\n\n이 챕터를 소개하는 짧은 서문(2-3문장)을 작성해주세요.`;
    case 'book-preface':
      return `"${context || '이 책'}"은 다음 챕터들로 구성되어 있습니다: ${content}\n\n이 책 전체를 소개하는 서문(3-5문장)을 작성해주세요.`;
    case 'epilogue':
      return `"${context || '이 책'}"에는 다음 주제들의 글이 수록되어 있습니다: ${content}\n\n책을 마무리하는 에필로그(3-5문장)를 작성해주세요.`;
    default:
      return content;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: AIRequest = await req.json();
    const { action, content, context } = body;

    if (!action || !content) {
      return NextResponse.json({ error: 'action과 content가 필요합니다' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API 키가 설정되지 않았습니다' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `${systemPrompt}\n\n${buildPrompt(action, content, context)}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ result: text });
  } catch (err) {
    console.error('AI API 오류:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
