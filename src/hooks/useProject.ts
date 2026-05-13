'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { Project } from '@/types';

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'projects'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projectList = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
          } as Project;
        });
        setProjects(projectList);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  const createProject = useCallback(
    async (data: { title: string; coverTitle: string; author: string; description?: string }) => {
      if (!user) throw new Error('로그인이 필요합니다');

      const docRef = await addDoc(collection(db, 'projects'), {
        ...data,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    },
    [user]
  );

  const updateProject = useCallback(async (projectId: string, data: Partial<Project>) => {
    await updateDoc(doc(db, 'projects', projectId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    await deleteDoc(doc(db, 'projects', projectId));
  }, []);

  return { projects, loading, error, createProject, updateProject, deleteProject };
}

export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'projects', projectId), (d) => {
      if (d.exists()) {
        const data = d.data();
        setProject({
          id: d.id,
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          updatedAt: (data.updatedAt as Timestamp)?.toDate() || new Date(),
        } as Project);
      } else {
        setProject(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [projectId]);

  return { project, loading };
}
