'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 대시보드 경로는 /projects로 리다이렉트
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/projects');
  }, [router]);

  return null;
}
