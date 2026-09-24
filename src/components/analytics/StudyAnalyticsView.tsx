import React, { useState, useEffect } from 'react';
import {
  Clock,
  Flame,
  Calendar,
  BarChart3,
  BookOpen,
  Plus,
  Zap,
  Award,
  PlayCircle,
  HelpCircle,
  Inbox,
  AlertCircle,
  Headphones,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { StudentAnalytics, StudySessionLog } from '../../types';
import { LogSessionModal } from './LogSessionModal';
import { FOCUS_SOUNDS } from '../../lib/focusAudioEngine';

interface StudyAnalyticsViewProps {
  currentStudentName: string;
  socket?: any;
}

export const StudyAnalyticsView: React.FC<StudyAnalyticsViewProps> = ({
  currentStudentName,
  socket,
}) => {
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Fetch verified analytics for this student
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/analytics/${encodeURIComponent(currentStudentName)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.analytics) {
          setAnalytics(data.analytics);
        }
      })
      .catch((err) => console.error('Failed to load study analytics:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentStudentName]);

  // Listen for real-time socket updates for this student
  useEffect(() => {
    if (!socket) return;

    const handleAnalyticsUpdated = (updated: StudentAnalytics) => {
      if (
        updated &&
        updated.studentName &&
        updated.studentName.toLowerCase() === currentStudentName.toLowerCase()
      ) {
        setAnalytics(updated);
      }
    };

    socket.on('analytics_updated', handleAnalyticsUpdated);
    return () => {
      socket.off('analytics_updated', handleAnalyticsUpdated);
    };
  }, [socket, currentStudentName]);

  const handleLogSession = async (data: {
    durationMinutes: number;
    subject: string;
    focusScore?: number;
    notes?: string;
  }) => {
    if (socket && socket.connected) {
      socket.emit('log_study_session', {
        studentName: currentStudentName,
        durationMinutes: data.durationMinutes,
        subject: data.subject,
        focusScore: data.focusScore,
        notes: data.notes,
      });
    }

    try {
      const res = await fetch('/api/analytics/log-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: currentStudentName,
          durationMinutes: data.durationMinutes,
          subject: data.subject,
          focusScore: data.focusScore,
          notes: data.notes,
        }),
      });
      const resData = await res.json();
      if (resData.success && resData.analytics) {
        setAnalytics(resData.analytics);
      }
    } catch (err) {
      console.error('Failed to log study session via REST:', err);
    }
  };

  const formatHours = (minutes: number) => {
    if (!minutes || minutes <= 0) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    if (mins === 0) return `${hrs}h`;
    return `${hrs}h ${mins}m`;
  };

  // 9. Loading State (Skeleton Loaders)
  if (loading) {
    return (
      <div className="h-full flex flex-col p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
          <div className="h-9 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2 animate-pulse"
            >
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-64 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse" />
          <div className="h-64 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse" />
        </div>
      </div>
    );
  }

  const hasData =
    analytics &&
    (analytics.totalStudyMinutes > 0 ||
      (analytics.recentSessions && analytics.recentSessions.length > 0));

  // 2. Empty State Handling: Display clean empty state when no real study data exists
  if (!analytics || !hasData) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="w-full max-w-md bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
            <BarChart3 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            No study data yet.
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto">
            Start your first study session to see analytics.
          </p>

          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Start Study Session</span>
          </button>
        </div>

        <LogSessionModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          onLogSession={handleLogSession}
        />
      </div>
    );
  }

  // Calculate real values from stored database records
  const maxDailyMinutes = Math.max(
    ...(analytics.dailyHistory && analytics.dailyHistory.length > 0
      ? analytics.dailyHistory.map((d) => d.minutes)
      : [60]),
    60
  );

  const subjectEntries = Object.entries(analytics.subjectBreakdown || {});
  const totalSubjectMinutes = subjectEntries.reduce((acc, [, mins]) => acc + mins, 0);

  const subjectColors: Record<string, { bar: string; text: string; bg: string }> = {
    Physics: { bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/60' },
    Mathematics: { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/60' },
    Chemistry: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
    'Computer Science': { bar: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/60' },
    Biology: { bar: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/60' },
    'General Study': { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/60' },
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Study Analytics
            </h2>
            {analytics.currentStreakDays > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-900">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{analytics.currentStreakDays} Day Streak</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real activity logs and focus tracking for {analytics.studentName}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsLogModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log Study Session</span>
        </button>
      </div>

      {/* KPI Cards Grid - Real verified data only */}
      <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Time */}
        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Total Study Time
          </span>
          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatHours(analytics.totalStudyMinutes)}
          </h4>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
            Accumulated
          </span>
        </div>

        {/* Daily Time */}
        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Today's Study
          </span>
          <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatHours(analytics.dailyStudyMinutes)}
          </h4>
          <span className="text-[10px] text-slate-400 font-medium">
            Logged today
          </span>
        </div>

        {/* Weekly Time */}
        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            This Week
          </span>
          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatHours(analytics.weeklyStudyMinutes)}
          </h4>
          <span className="text-[10px] text-slate-400 font-medium">
            Last 7 days
          </span>
        </div>

        {/* Monthly Time */}
        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            This Month
          </span>
          <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatHours(analytics.monthlyStudyMinutes)}
          </h4>
          <span className="text-[10px] text-slate-400 font-medium">
            Last 30 days
          </span>
        </div>

        {/* Focus Sessions */}
        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Focus Sessions
          </span>
          <h4 className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {analytics.focusSessionsCompleted}
          </h4>
          <span className="text-[10px] text-slate-400 font-medium">
            Sessions completed
          </span>
        </div>

        {/* Longest Streak */}
        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            Best Streak
          </span>
          <h4 className="text-xl font-black text-amber-500 mt-1">
            {analytics.longestStreakDays} {analytics.longestStreakDays === 1 ? 'Day' : 'Days'}
          </h4>
          <span className="text-[10px] text-slate-400 font-medium">
            {analytics.goalsCompleted} goals finished
          </span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="px-4 sm:px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: 7-Day Activity Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                7-Day Study Activity
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Daily hours logged across verified sessions
              </p>
            </div>
            {analytics.dailyHistory && analytics.dailyHistory.length > 0 && (
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                Total: {formatHours(analytics.weeklyStudyMinutes)}
              </span>
            )}
          </div>

          {/* Conditional rendering for chart */}
          {analytics.dailyHistory && analytics.dailyHistory.length > 0 ? (
            <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
              {analytics.dailyHistory.map((day, idx) => {
                const heightPct = Math.round((day.minutes / maxDailyMinutes) * 100);
                const isToday = idx === analytics.dailyHistory.length - 1;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold text-white bg-slate-900 dark:bg-slate-700 px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap pointer-events-none">
                      {formatHours(day.minutes)}
                    </div>

                    <div className="w-full max-w-[38px] bg-slate-100 dark:bg-slate-800 rounded-t-xl overflow-hidden h-36 flex items-end">
                      <div
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          isToday
                            ? 'bg-blue-600 dark:bg-blue-500 shadow-xs'
                            : 'bg-blue-400/70 hover:bg-blue-500 dark:bg-blue-600/60 dark:hover:bg-blue-500'
                        }`}
                        style={{ height: `${Math.max(6, heightPct)}%` }}
                      />
                    </div>

                    <div className="text-center">
                      <span
                        className={`text-xs font-bold block ${
                          isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {day.dayLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {(day.minutes / 60).toFixed(1)}h
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No activity recorded yet
            </div>
          )}
        </div>

        {/* Right Col: Subject Breakdown */}
        <div className="bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Subject Breakdown
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {subjectEntries.length} {subjectEntries.length === 1 ? 'subject' : 'subjects'}
              </span>
            </div>

            {/* Subject Bars List */}
            {subjectEntries.length > 0 ? (
              <div className="space-y-3 mt-2">
                {subjectEntries.map(([subj, mins]) => {
                  const pct =
                    totalSubjectMinutes > 0
                      ? Math.round((mins / totalSubjectMinutes) * 100)
                      : 0;
                  const colors = subjectColors[subj] || subjectColors['General Study'];

                  return (
                    <div key={subj} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {subj}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            {formatHours(mins)}
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300 w-8 text-right font-mono">
                            {pct}%
                          </span>
                        </div>
                      </div>

                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No subject activity logged yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Focus Sounds & Study Ambience Analytics */}
      <div className="px-4 sm:px-6 pb-6">
        <div className="bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Headphones className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Focus Sounds & Study Ambience Analytics
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Acoustic concentration environment tracked from real study sessions
              </p>
            </div>
            {analytics.soundAnalytics && analytics.soundAnalytics.totalSessionsWithAudio > 0 && (
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 px-2.5 py-1 rounded-lg">
                {analytics.soundAnalytics.totalSessionsWithAudio} Sessions With Audio
              </span>
            )}
          </div>

          {/* Strict Data Integrity Rule: Only display analytics when real user activity exists. Otherwise show: 'No focus sound data yet.' */}
          {analytics.soundAnalytics && analytics.soundAnalytics.totalSessionsWithAudio > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Most Used Sound */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl flex-shrink-0">
                  {FOCUS_SOUNDS.find((s) => s.id === analytics.soundAnalytics?.mostUsedSound)?.icon || '🌧'}
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Most Used Sound:
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {FOCUS_SOUNDS.find((s) => s.id === analytics.soundAnalytics?.mostUsedSound)?.title ||
                      analytics.soundAnalytics.mostUsedSound ||
                      'Rain'}
                  </h4>
                </div>
              </div>

              {/* Focus Sessions With Audio */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Focus Sessions With Audio:
                  </span>
                  <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {analytics.soundAnalytics.totalSessionsWithAudio}
                  </h4>
                </div>
              </div>

              {/* Preferred Environment */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Preferred Environment:
                  </span>
                  <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 truncate">
                    {analytics.soundAnalytics.preferredEnvironment || '☕ Library Ambience'}
                  </h4>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <Headphones className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                No focus sound data yet.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Play background ambience while focusing or logging study sessions to see acoustic analytics.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Sessions Timeline */}
      <div className="px-4 sm:px-6 pb-8">
        <div className="bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Recent Focus Sessions
            </h3>
            {analytics.recentSessions && analytics.recentSessions.length > 0 && (
              <span className="text-[11px] text-slate-400 font-medium">
                {analytics.recentSessions.length} {analytics.recentSessions.length === 1 ? 'log' : 'logs'} recorded
              </span>
            )}
          </div>

          {analytics.recentSessions && analytics.recentSessions.length > 0 ? (
            <div className="space-y-2">
              {analytics.recentSessions.map((sess) => {
                const colors = subjectColors[sess.subject] || subjectColors['General Study'];
                const dateStr = new Date(sess.timestamp).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                });
                const timeStr = new Date(sess.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={sess.id}
                    className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        {sess.durationMinutes}m
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}
                          >
                            {sess.subject}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {dateStr} • {timeStr}
                          </span>
                        </div>
                        {sess.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                            {sess.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {typeof sess.focusScore === 'number' && (
                      <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0 text-xs">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                            {sess.focusScore}% focus
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              No sessions recorded yet
            </div>
          )}
        </div>
      </div>

      <LogSessionModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onLogSession={handleLogSession}
      />
    </div>
  );
};
