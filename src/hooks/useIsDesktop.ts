import { useEffect, useState } from 'react';

export function useIsDesktop(breakpoint = 960) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => setIsDesktop(window.innerWidth >= breakpoint);
    update();
    window.addEventListener('resize', update);

    return () => window.removeEventListener('resize', update);
  }, [breakpoint]);

  return isDesktop;
}
