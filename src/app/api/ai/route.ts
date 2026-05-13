import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AIRequest } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
      return `"${context || '챕터'}" 챕터에는 다음 주제들의 글이 담겨 있습니다: ${content}

이 챕터를 소개하는 짧은 서문(2-3문장)을 작성해주세요. 독자가 이 챕터에서 무엇을 얻을 수 있는지 안내해주세요.`;

    case 'book-preface':
      return `"${context || '이 책'}"은 다음 챕터들로 구성되어 있습니다: ${content}

이 책 전체를 소개하는 서문(3-5문장)을 작성해주세요. 저자의 글쓰기 여정과 독자에게 전하고 싶은 메시지를 담아주세요.`;

    case 'epilogue':
      return `"${context || '이 책'}"에는 다음 주제들의 글이 수록되어 있습니다: ${content}

책을 마무리하는 에필로그(3-5문장)를 작성해주세요. 독자에게 감사의 마음과 마지막 메시지를 전해주세요.`;

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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API 키가 설정되지 않았습니다' },
        { status: 500 }
      );
    }

    const prompt = buildPrompt(action, content, context);

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const result =
      message.content[0].type === 'text' ? message.content[0].text : '';

    return NextResponse.json({ result });
  } catch (err) {
    console.error('AI API 오류:', err);
    const message = err instanceof Error ? err.message : 'AI 처리 중 오류가 발생했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
