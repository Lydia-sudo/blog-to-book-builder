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

```bash
cp .env.example .env.local
```

### 2. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com)에서 프로젝트 생성
2. Authentication > Google 로그인 활성화
3. Firestore Database 생성
4. Storage 생성
5. 규칙 배포: `firebase deploy --only firestore:rules,storage:rules`

### 3. 실행

```bash
npm install
npm run dev
```

## 프로젝트 구조

```
src/
  app/
    layout.tsx
    page.tsx                    # 랜딩 페이지
    projects/page.tsx           # 프로젝트 목록
    projects/[id]/page.tsx      # 3패널 에디터
    api/scrape/route.ts         # 스크래핑 API
    api/ai/route.ts             # AI 편집 API
    api/export/route.ts         # 내보내기 API
  components/
    auth/                       # 인증
    dashboard/                  # 에디터 패널
    export/                     # 내보내기
    ui/                         # 공통 UI
  lib/
    firebase.ts
    scrapers/
    exporters/
  hooks/
  types/
```
