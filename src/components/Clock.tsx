import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon } from 'lucide-react';

export const Clock: React.FC = () => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = time.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-300 shadow-xs">
      <ClockIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
      <span>{timeString}</span>
      <span className="text-slate-300 dark:text-slate-600">|</span>
      <span>{dateString}</span>
    </div>
  );
};
