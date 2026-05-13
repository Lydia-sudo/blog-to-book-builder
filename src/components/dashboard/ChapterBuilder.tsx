'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Chapter, Post } from '@/types';
import { useChapters, usePosts } from '@/hooks/usePosts';
import { Button } from '@/components/ui/Button';

interface ChapterBuilderProps {
  projectId: string;
}

interface SortableChapterProps {
  chapter: Chapter;
  posts: Post[];
  projectId: string;
  onUpdate: (chapterId: string, data: Partial<Chapter>) => Promise<void>;
  onDelete: (chapterId: string) => Promise<void>;
  onRemovePost: (chapterId: string, postId: string) => Promise<void>;
  onGeneratePreface: (chapter: Chapter) => Promise<void>;
}

function SortableChapter({
  chapter,
  posts,
  projectId,
  onUpdate,
  onDelete,
  onRemovePost,
  onGeneratePreface,
}: SortableChapterProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: chapter.id,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chapter.title);
  const [generatingPreface, setGeneratingPreface] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const chapterPosts = chapter.postIds
    .map((id) => posts.find((p) => p.id === id))
    .filter(Boolean) as Post[];

  async function saveTitle() {
    await onUpdate(chapter.id, { title: editTitle });
    setIsEditing(false);
  }

  async function handleGeneratePreface() {
    setGeneratingPreface(true);
    try {
      await onGeneratePreface(chapter);
    } finally {
      setGeneratingPreface(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
    >
      <div className="flex items-center gap-2 p-3 bg-gray-50 border-b">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
        </button>

        {isEditing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
            autoFocus
            className="flex-1 px-2 py-0.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : (
          <span
            className="flex-1 font-medium text-sm text-gray-900 cursor-pointer hover:text-blue-600"
            onClick={() => setIsEditing(true)}
          >
            {chapter.title}
          </span>
        )}

        <span className="text-xs text-gray-500">{chapterPosts.length}편</span>
        <button
          onClick={handleGeneratePreface}
          disabled={generatingPreface}
          className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
          title="AI 서문 생성"
        >
          {generatingPreface ? '생성 중...' : '✨ AI 서문'}
        </button>
        <button
          onClick={() => onDelete(chapter.id)}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {chapter.preface && (
        <div className="px-3 py-2 bg-purple-50 border-b text-xs text-purple-700 italic">
          {chapter.preface}
        </div>
      )}

      <div className="divide-y">
        {chapterPosts.length === 0 ? (
          <p className="p-3 text-xs text-gray-400 text-center">
            좌측에서 글을 선택해 챕터에 추가하세요
          </p>
        ) : (
          chapterPosts.map((post) => (
            <div key={post.id} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1 text-xs text-gray-700 line-clamp-1">{post.title}</span>
              <button
                onClick={() => onRemovePost(chapter.id, post.id)}
                className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ChapterBuilder({ projectId }: ChapterBuilderProps) {
  const { chapters, addChapter, updateChapter, deleteChapter, reorderChapters } =
    useChapters(projectId);
  const { posts } = usePosts(projectId);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [addingChapter, setAddingChapter] = useState(false);

  const selectedPosts = posts.filter((p) => p.selected);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chapters.findIndex((c) => c.id === active.id);
    const newIndex = chapters.findIndex((c) => c.id === over.id);
    const newOrder = arrayMove(chapters, oldIndex, newIndex);
    reorderChapters(
      projectId,
      newOrder.map((c) => c.id)
    );
  }

  async function handleAddChapter() {
    if (!newChapterTitle.trim()) return;
    setAddingChapter(true);
    try {
      const selectedPostIds = selectedPosts.map((p) => p.id);
      await addChapter(projectId, newChapterTitle.trim(), selectedPostIds);
      setNewChapterTitle('');
    } finally {
      setAddingChapter(false);
    }
  }

  async function handleAddSelectedToChapter(chapterId: string) {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    const newPostIds = [
      ...new Set([...chapter.postIds, ...selectedPosts.map((p) => p.id)]),
    ];
    await updateChapter(projectId, chapterId, { postIds: newPostIds });
  }

  async function handleRemovePost(chapterId: string, postId: string) {
    const chapter = chapters.find((c) => c.id === chapterId);
    if (!chapter) return;
    await updateChapter(projectId, chapterId, {
      postIds: chapter.postIds.filter((id) => id !== postId),
    });
  }

  async function handleGeneratePreface(chapter: Chapter) {
    const chapterPosts = chapter.postIds
      .map((id) => posts.find((p) => p.id === id))
      .filter(Boolean) as typeof posts;

    const content = chapterPosts.map((p) => p.title).join(', ');

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chapter-preface',
        content,
        context: chapter.title,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      await updateChapter(projectId, chapter.id, { preface: data.result });
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-gray-900 mb-3">
          챕터 구성 <span className="text-gray-500 font-normal">({chapters.length})</span>
        </h2>

        {selectedPosts.length > 0 && (
          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 font-medium">
              {selectedPosts.length}개 선택됨 — 챕터에 추가하거나 새 챕터를 만드세요
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newChapterTitle}
            onChange={(e) => setNewChapterTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddChapter()}
            placeholder="새 챕터 제목..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={handleAddChapter}
            loading={addingChapter}
            disabled={!newChapterTitle.trim()}
            size="sm"
          >
            추가
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {chapters.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-2">📚</p>
            <p className="text-sm">챕터를 추가해 책의 구조를 만드세요</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={chapters.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {chapters.map((chapter) => (
                  <div key={chapter.id}>
                    <SortableChapter
                      chapter={chapter}
                      posts={posts}
                      projectId={projectId}
                      onUpdate={(id, data) => updateChapter(projectId, id, data)}
                      onDelete={(id) => deleteChapter(projectId, id)}
                      onRemovePost={handleRemovePost}
                      onGeneratePreface={handleGeneratePreface}
                    />
                    {selectedPosts.length > 0 && (
                      <button
                        onClick={() => handleAddSelectedToChapter(chapter.id)}
                        className="mt-1 w-full text-xs text-blue-500 hover:text-blue-700 py-1"
                      >
                        + 선택된 글 이 챕터에 추가
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
