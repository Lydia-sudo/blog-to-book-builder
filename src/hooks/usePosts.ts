'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types';

export function usePosts(projectId: string | null) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'posts'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const postList = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            projectId,
            ...data,
            publishedAt: data.publishedAt
              ? (data.publishedAt as Timestamp).toDate()
              : null,
          } as Post;
        });
        setPosts(postList);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [projectId]);

  const addPost = useCallback(
    async (projectId: string, postData: Omit<Post, 'id' | 'projectId'>) => {
      const docRef = await addDoc(collection(db, 'projects', projectId, 'posts'), {
        ...postData,
        publishedAt: postData.publishedAt ? Timestamp.fromDate(new Date(postData.publishedAt)) : null,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    },
    []
  );

  const updatePost = useCallback(
    async (projectId: string, postId: string, data: Partial<Post>) => {
      await updateDoc(doc(db, 'projects', projectId, 'posts', postId), data);
    },
    []
  );

  const deletePost = useCallback(async (projectId: string, postId: string) => {
    await deleteDoc(doc(db, 'projects', projectId, 'posts', postId));
  }, []);

  const toggleSelect = useCallback(
    async (projectId: string, postId: string, selected: boolean) => {
      await updateDoc(doc(db, 'projects', projectId, 'posts', postId), { selected });
    },
    []
  );

  const reorderPosts = useCallback(
    async (projectId: string, orderedPostIds: string[]) => {
      const batch = writeBatch(db);
      orderedPostIds.forEach((postId, index) => {
        batch.update(doc(db, 'projects', projectId, 'posts', postId), { order: index });
      });
      await batch.commit();
    },
    []
  );

  return { posts, loading, error, addPost, updatePost, deletePost, toggleSelect, reorderPosts };
}

export function useChapters(projectId: string | null) {
  const [chapters, setChapters] = useState<import('@/types').Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setChapters([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects', projectId, 'chapters'),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chapterList = snapshot.docs.map((d) => ({
        id: d.id,
        projectId,
        ...d.data(),
      })) as import('@/types').Chapter[];
      setChapters(chapterList);
      setLoading(false);
    });

    return unsubscribe;
  }, [projectId]);

  const addChapter = useCallback(
    async (projectId: string, title: string, postIds: string[] = []) => {
      const docRef = await addDoc(collection(db, 'projects', projectId, 'chapters'), {
        title,
        postIds,
        order: Date.now(),
        preface: '',
      });
      return docRef.id;
    },
    []
  );

  const updateChapter = useCallback(
    async (
      projectId: string,
      chapterId: string,
      data: Partial<import('@/types').Chapter>
    ) => {
      await updateDoc(doc(db, 'projects', projectId, 'chapters', chapterId), data);
    },
    []
  );

  const deleteChapter = useCallback(async (projectId: string, chapterId: string) => {
    await deleteDoc(doc(db, 'projects', projectId, 'chapters', chapterId));
  }, []);

  const reorderChapters = useCallback(
    async (projectId: string, orderedChapterIds: string[]) => {
      const batch = writeBatch(db);
      orderedChapterIds.forEach((chapterId, index) => {
        batch.update(doc(db, 'projects', projectId, 'chapters', chapterId), { order: index });
      });
      await batch.commit();
    },
    []
  );

  return { chapters, loading, addChapter, updateChapter, deleteChapter, reorderChapters };
}
