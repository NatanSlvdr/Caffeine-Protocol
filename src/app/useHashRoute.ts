import { useEffect, useState } from 'react';
import { go, readHashRoute } from '@/shared/lib/navigation';

/** Current `#/...` route plus navigation; replaces ad-hoc hashchange listeners. */
export function useHashRoute(): [string, (path: string) => void] {
  const [route, setRoute] = useState(readHashRoute);
  useEffect(() => {
    const change = () => setRoute(readHashRoute());
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  return [route, go];
}
