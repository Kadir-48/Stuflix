import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
  BookOpen,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';
import { TimetableEntry } from '../../types';

interface TimetableManagerProps {
  entries: TimetableEntry[];
  currentStudentName: string;
  isDarkMode?: boolean;
  onCreateEntry: (entry: { subject: string; date: string; startTime: string; endTime: string }) => void;
  onUpdateEntry: (entryId: string, entry: Partial<TimetableEntry>) => void;
  onDeleteEntry: (entryId: string) => void;
}

function parseExamDateTime(dateStr: string, timeStr: string): number {
  try {
    let cleanTime = timeStr.trim();
    let hours = 10;
    let minutes = 0;

    const ampmMatch = cleanTime.match(/(am|pm)/i);
    const isPM = ampmMatch ? ampmMatch[1].toLowerCase() === 'pm' : false;
    const isAM = ampmMatch ? ampmMatch[1].toLowerCase() === 'am' : false;

    cleanTime = cleanTime.replace(/(am|pm)/gi, '').trim();
    const parts = cleanTime.split(':');
    if (parts.length >= 1) {
      hours = parseInt(parts[0], 10);
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    }
    if (parts.length >= 2) {
      minutes = parseInt(parts[1], 10) || 0;
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d, hours, minutes, 0, 0);
    return target.getTime();
  } catch {
    return new Date(dateStr).getTime();
  }
}

function useCountdown(dateStr: string, timeStr: string) {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
  });

  useEffect(() => {
    const update = () => {
      const target = parseExamDateTime(dateStr, timeStr);
      const diff = target - Date.now();

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds, isPast: false });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [dateStr, timeStr]);

  return countdown;
}

const CountdownBadge: React.FC<{ date: string; startTime: string }> = ({ date, startTime }) => {
  const { days, hours, minutes, seconds, isPast } = useCountdown(date, startTime);

  if (isPast) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        Completed / Past
      </span>
    );
  }

  if (days === 0 && hours === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 animate-pulse">
        <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        <span>Today: {minutes}m {seconds}s left</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
      <span>{days > 0 ? `${days}d ` : ''}{hours}h {minutes}m left</span>
    </span>
  );
};

export const TimetableManager: React.FC<TimetableManagerProps> = ({
  entries,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);

  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('01:00 PM');
  const [error, setError] = useState('');

  const [currentCalendarMonth, setCurrentCalendarMonth] = useState<Date>(new Date());

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const aTime = `${a.date} ${a.startTime}`;
      const bTime = `${b.date} ${b.startTime}`;
      return aTime.localeCompare(bTime);
    });
  }, [entries]);

  const openCreateModal = () => {
    setEditingEntry(null);
    setSubject('');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
    setStartTime('10:00 AM');
    setEndTime('01:00 PM');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setSubject(entry.subject);
    setDate(entry.date);
    setStartTime(entry.startTime);
    setEndTime(entry.endTime);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please enter the subject or paper name (e.g. Mathematics 0607)');
      return;
    }
    if (!date) {
      setError('Please select exam date');
      return;
    }
    if (!startTime.trim()) {
      setError('Please enter start time');
      return;
    }

    if (editingEntry) {
      onUpdateEntry(editingEntry.id, {
        subject: subject.trim(),
        date,
        startTime: startTime.trim(),
        endTime: endTime.trim() || startTime.trim(),
      });
    } else {
      onCreateEntry({
        subject: subject.trim(),
        date,
        startTime: startTime.trim(),
        endTime: endTime.trim() || startTime.trim(),
      });
    }

    setIsModalOpen(false);
  };

  // Calendar calculations
  const year = currentCalendarMonth.getFullYear();
  const month = currentCalendarMonth.getMonth();
  const monthName = currentCalendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const startDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = useMemo(() => {
    const list = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const dayEntries = entries.filter((e) => e.date === dateStr);
      list.push({ day, dateStr, entries: dayEntries });
    }
    return list;
  }, [year, month, daysInMonth, entries]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden select-none transition-colors duration-150">
      {/* Header Bar */}
      <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
              Board Exam Timetable
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* List / Calendar Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>

          {/* Add Exam Button */}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-xs shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Exam</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {entries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3 stroke-[1.5]" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No exam timetable entries yet
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
              Add upcoming board exam papers (e.g. Mathematics 0607, Physics 0625) to track live countdowns with your study group.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium transition cursor-pointer shadow-xs"
            >
              + Add first exam
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="max-w-4xl mx-auto space-y-3">
            {sortedEntries.map((entry) => {
              const dateObj = new Date(entry.date + 'T00:00:00');
              const monthStr = dateObj.toLocaleString('default', { month: 'short' });
              const dayStr = dateObj.getDate();
              const fullDateStr = dateObj.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={entry.id}
                  className="p-4 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/70 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-bold flex flex-col items-center justify-center flex-shrink-0 leading-tight">
                      <span className="text-[10px] uppercase font-semibold">{monthStr}</span>
                      <span className="text-sm">{dayStr}</span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                          {entry.subject}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{fullDateStr}</span>
                        <span>•</span>
                        <span>
                          {entry.startTime} {entry.endTime && `- ${entry.endTime}`}
                        </span>
                        <span>•</span>
                        <span className="text-slate-400 dark:text-slate-500">
                          Added by {entry.createdBy}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700">
                    <CountdownBadge date={entry.date} startTime={entry.startTime} />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(entry)}
                        title="Edit entry"
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteEntry(entry.id)}
                        title="Delete entry"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {monthName}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentCalendarMonth(new Date(year, month - 1, 1))}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentCalendarMonth(new Date(year, month + 1, 1))}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 pb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: startDay }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[80px] p-2 bg-slate-50/40 dark:bg-slate-900/40 rounded-xl"
                />
              ))}

              {calendarDays.map(({ day, dateStr, entries: dayEntries }) => {
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                return (
                  <div
                    key={dateStr}
                    className={`min-h-[80px] p-2 rounded-xl border flex flex-col transition ${
                      isToday
                        ? 'border-blue-400 dark:border-blue-600 bg-blue-50/30 dark:bg-blue-950/30'
                        : dayEntries.length > 0
                        ? 'border-slate-300 dark:border-slate-600 bg-slate-50/70 dark:bg-slate-900/50'
                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/20 hover:bg-slate-50/40 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isToday
                            ? 'w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {day}
                      </span>
                      {dayEntries.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      )}
                    </div>

                    <div className="mt-1 flex-1 overflow-y-auto space-y-1">
                      {dayEntries.map((e) => (
                        <div
                          key={e.id}
                          onClick={() => openEditModal(e)}
                          className="p-1 rounded bg-blue-100/80 dark:bg-blue-900/60 hover:bg-blue-200/80 dark:hover:bg-blue-800/80 text-[10px] text-blue-900 dark:text-blue-200 font-medium truncate cursor-pointer transition"
                          title={`${e.subject} (${e.startTime})`}
                        >
                          {e.subject}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  {editingEntry ? 'Edit Exam Entry' : 'Add Board Exam Entry'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Subject / Syllabus Code
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Mathematics 0607 or Physics 0625"
                  autoFocus
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="e.g. 01:00 PM"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition cursor-pointer shadow-xs"
                >
                  {editingEntry ? 'Save Changes' : 'Add to Timetable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
