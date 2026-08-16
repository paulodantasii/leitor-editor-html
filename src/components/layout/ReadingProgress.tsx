import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

export const ReadingProgress: React.FC = () => {
  const { document: currentDoc } = useAppStore();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    if (!currentDoc.content) {
      setWordCount(0);
      return;
    }
    // Remove HTML tags to count words accurately
    const textContent = currentDoc.content.replace(/<[^>]*>?/gm, '');
    const words = textContent.trim().split(/\s+/).filter((w) => w.length > 0);
    setWordCount(words.length);
  }, [currentDoc.content]);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setScrollProgress(Math.round(progress));
      } else {
        setScrollProgress(100);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Run once initially
    handleScroll();
    
    // Also observe changes in content height to recalculate
    const resizeObserver = new ResizeObserver(() => handleScroll());
    resizeObserver.observe(document.body);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  if (!currentDoc.content) return null;

  const totalMinutes = wordCount / 130;
  const remainingMinutes = Math.ceil(totalMinutes * ((100 - scrollProgress) / 100));
  const timeDisplay = remainingMinutes > 0 ? `${remainingMinutes} min` : 'Fim';

  return (
    <div className="fixed bottom-5 right-5 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm border border-slate-200 dark:border-slate-800 rounded-xl p-2 min-w-[3.5rem] flex flex-col items-center justify-center transition-all opacity-70 hover:opacity-100 pointer-events-none print:hidden">
      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 leading-tight">
        {scrollProgress}%
      </span>
      <span className="text-[9px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider mt-0.5">
        {timeDisplay}
      </span>
    </div>
  );
};
