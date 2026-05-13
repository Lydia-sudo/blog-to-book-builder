# Blog-to-Book Builder

블로그 글을 책으로 엮어주는 웹 애플리케이션입니다.

## 기능

- **블로그 스크래핑**: 네이버 블로그, 티스토리, 워드프레스, RSS 피드에서 글을 자동 수집
- **챕터 구성**: 드래그앤드롭으로 글을 챕터에 배치하고 순서 조정
- **AI 편집**: Claude AI로 서문, 에필로그, 챕터 서문 자동 생성
- **내보내기**: PDF, DOCX, EPUB 형식으로 내보내기
- **프로젝트 관리**: 여러 책 프로젝트 생성 및 관리

## 기술 스택

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Styling**: Tailwind CSS
- **드래그앤드롭**: @dnd-kit
- **AI**: Anthropic Claude API
- **내보내기**: jsPDF, docx, epub-gen-memory

## 시작하기

### 1. 환경 변수 설정

`.env.example`을 복사해 `.env.local`을 만들고 값을 채워주세요:

```bash
cp .env.example .env.local
```

필요한 키:
- Firebase 프로젝트 설정 (콘솔에서 확인)
- Firebase Admin SDK 서비스 계정 키
- Anthropic API 키

### 2. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com)에서 프로젝트 생성
2. Authentication > Google 로그인 활성화
3. Firestore Database 생성 (프로덕션 모드)
4. Storage 생성
5. Firestore 규칙 배포: `firebase deploy --only firestore:rules`
6. Storage 규칙 배포: `firebase deploy --only storage:rules`

### 3. 의존성 설치 및 실행

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어주세요.

## 프로젝트 구조

```
src/
  app/
    layout.tsx           # 루트 레이아웃
    page.tsx             # 랜딩 페이지
    dashboard/page.tsx   # 대시보드 (→ /projects 리다이렉트)
    projects/page.tsx    # 프로젝트 목록
    projects/[id]/page.tsx  # 프로젝트 편집 (3패널 대시보드)
    api/
      scrape/route.ts    # 블로그 스크래핑 API
      ai/route.ts        # AI 편집 API
      export/route.ts    # 파일 내보내기 API
  components/
    auth/                # 인증 컴포넌트
    dashboard/           # 대시보드 컴포넌트
    export/              # 내보내기 컴포넌트
    ui/                  # 공통 UI 컴포넌트
  lib/
    firebase.ts          # Firebase 클라이언트
    firebaseAdmin.ts     # Firebase Admin SDK
    scrapers/            # 블로그 스크래퍼
    exporters/           # 파일 내보내기
  hooks/                 # React 커스텀 훅
  types/                 # TypeScript 타입 정의
```

## 데이터 구조 (Firestore)

```
users/{userId}
projects/{projectId}
  → { userId, title, coverTitle, author, description, createdAt, updatedAt }
  /posts/{postId}
    → { title, content, originalUrl, publishedAt, images[], selected, order, tags[] }
  /chapters/{chapterId}
    → { title, postIds[], order, preface }
exports/{exportId}
  → { userId, projectId, format, url, createdAt }
```

## 배포

Vercel 배포:

```bash
vercel --prod
```

환경 변수를 Vercel 대시보드에서 설정하거나 `vercel env add`로 추가하세요.
