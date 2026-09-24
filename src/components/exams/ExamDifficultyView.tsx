import React, { useState, useEffect } from 'react';
import {
  Star,
  Plus,
  Search,
  BookOpen,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { ExamPaper } from '../../types';
import { RateExamModal } from './RateExamModal';
import { CreateExamModal } from './CreateExamModal';

interface ExamDifficultyViewProps {
  currentStudentName: string;
  socket?: any;
}

export const ExamDifficultyView: React.FC<ExamDifficultyViewProps> = ({
  currentStudentName,
  socket,
}) => {
  const [exams, setExams] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedExamForRating, setSelectedExamForRating] = useState<ExamPaper | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch verified real exams from backend
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch('/api/exams')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.exams)) {
          setExams(data.exams);
        }
      })
      .catch((err) => console.error('Failed to load exams:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for socket real-time rating updates
  useEffect(() => {
    if (!socket) return;

    const handleExamUpdated = (updated: ExamPaper) => {
      setExams((prev) => {
        const index = prev.findIndex((e) => e.id === updated.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = updated;
          return next;
        }
        return [updated, ...prev];
      });
    };

    const handleExamCreated = (newExam: ExamPaper) => {
      setExams((prev) => {
        if (prev.some((e) => e.id === newExam.id)) return prev;
        return [newExam, ...prev];
      });
    };

    socket.on('exam_paper_updated', handleExamUpdated);
    socket.on('exam_paper_created', handleExamCreated);

    return () => {
      socket.off('exam_paper_updated', handleExamUpdated);
      socket.off('exam_paper_created', handleExamCreated);
    };
  }, [socket]);

  // Handle rating submission
  const handleSubmitRating = async (
    examId: string,
    rating: 1 | 2 | 3 | 4 | 5,
    comment?: string
  ) => {
    if (socket && socket.connected) {
      socket.emit('rate_exam_paper', {
        examId,
        studentName: currentStudentName,
        rating,
        comment,
      });
    }

    try {
      const res = await fetch('/api/exams/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          studentName: currentStudentName,
          rating,
          comment,
        }),
      });
      const data = await res.json();
      if (data.success && data.exam) {
        setExams((prev) => {
          const index = prev.findIndex((e) => e.id === data.exam.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = data.exam;
            return next;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to rate exam via REST:', err);
    }
  };

  // Handle create exam
  const handleCreateExam = async (examData: {
    title: string;
    subject: string;
    code?: string;
    examDate?: string;
    initialRating?: number;
    comment?: string;
  }) => {
    try {
      const res = await fetch('/api/exams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...examData,
          creatorName: currentStudentName,
        }),
      });
      const data = await res.json();
      if (data.success && data.exam) {
        setExams((prev) => [data.exam, ...prev]);
      }
    } catch (err) {
      console.error('Failed to create exam:', err);
    }
  };

  const getDifficultyBadge = (avg: number) => {
    if (avg >= 4.5) {
      return { text: 'Extremely Hard', bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
    }
    if (avg >= 3.8) {
      return { text: 'Challenging', bg: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border-orange-200 dark:border-orange-800' };
    }
    if (avg >= 2.8) {
      return { text: 'Moderate', bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
    }
    if (avg >= 1.8) {
      return { text: 'Fair / Expected', bg: 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-200 dark:border-teal-800' };
    }
    return { text: 'Very Easy', bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
  };

  // 1. Loading Skeleton State
  if (loading) {
    return (
      <div className="h-full flex flex-col p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
          <div className="h-9 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-56 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse" />
          <div className="h-56 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 animate-pulse" />
        </div>
      </div>
    );
  }

  // 2. Clean Empty State: When no exam papers have been created yet
  if (exams.length === 0) {
    return (
      <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Exam Difficulty Rating System
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rate papers, view crowd-sourced difficulty trends, and share exam experiences
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Exam Paper</span>
          </button>
        </div>

        {/* Empty State Banner */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xs">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mb-4">
              <Star className="w-7 h-7 fill-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              No exam papers reviewed yet.
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-xs mx-auto">
              Be the first student to add a past paper or test, share your difficulty rating, and compare experiences.
            </p>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Exam Paper</span>
            </button>
          </div>
        </div>

        <CreateExamModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreateExam}
        />
      </div>
    );
  }

  // Real verified statistics
  const subjects = ['All', ...Array.from(new Set(exams.map((e) => e.subject)))];
  const filteredExams = exams.filter((e) => {
    const matchesSubject = selectedSubject === 'All' || e.subject === selectedSubject;
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.code && e.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const totalVotesAcrossAll = exams.reduce((acc, curr) => acc + curr.totalVotes, 0);
  const hardestExam = [...exams]
    .filter((e) => e.totalVotes > 0)
    .sort((a, b) => b.averageRating - a.averageRating)[0];

  return (
    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Exam Difficulty Rating System
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              Live Reactions
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Student crowd-sourced 1-5 star reactions, difficulty trends, and tricky question insights
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exam Paper</span>
        </button>
      </div>

      {/* Summary Stat Cards - 100% verified real database records */}
      <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-850/40">
        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Total Exam Papers
            </p>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {exams.length}
            </h4>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Student Votes Cast
            </p>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {totalVotesAcrossAll} {totalVotesAcrossAll === 1 ? 'reaction' : 'reactions'}
            </h4>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Star className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Top Rated Hardest Paper
            </p>
            <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 truncate mt-0.5">
              {hardestExam ? `${hardestExam.subject} (${hardestExam.averageRating}★)` : 'No ratings yet'}
            </h4>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Subject Chips */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, subject, or code..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {subjects.map((subj) => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                selectedSubject === subj
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* Exam Papers List */}
      <div className="p-4 sm:p-6 flex-1">
        {filteredExams.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 max-w-md mx-auto">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No matching exam papers found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or subject filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
            {filteredExams.map((exam) => {
              const myRating = exam.ratings.find(
                (r) => r.studentName.toLowerCase() === currentStudentName.toLowerCase()
              );
              const badge = getDifficultyBadge(exam.averageRating);

              // Calculate star breakdown (1 to 5)
              const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
              exam.ratings.forEach((r) => {
                starCounts[r.rating] = (starCounts[r.rating] || 0) + 1;
              });

              return (
                <div
                  key={exam.id}
                  className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                            {exam.subject}
                          </span>
                          {exam.code && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {exam.code}
                            </span>
                          )}
                          {exam.examDate && (
                            <span className="text-[10px] text-slate-400">
                              • {exam.examDate}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {exam.title}
                        </h3>
                      </div>

                      {/* Difficulty Badge */}
                      {exam.totalVotes > 0 && (
                        <div
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex-shrink-0 text-center ${badge.bg}`}
                        >
                          {badge.text}
                        </div>
                      )}
                    </div>

                    {/* Rating Overview */}
                    <div className="flex items-center gap-4 py-2.5 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-750/70 mb-3">
                      <div className="text-center">
                        <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-center gap-1">
                          <span>{exam.totalVotes > 0 ? exam.averageRating : '—'}</span>
                          <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {exam.totalVotes > 0 ? 'out of 5.0' : 'No votes'}
                        </p>
                      </div>

                      {/* Distribution Mini-Histogram */}
                      <div className="flex-1 space-y-1">
                        {[5, 4, 3, 2, 1].map((s) => {
                          const count = starCounts[s] || 0;
                          const pct = exam.totalVotes > 0 ? (count / exam.totalVotes) * 100 : 0;
                          return (
                            <div key={s} className="flex items-center gap-1.5 text-[10px]">
                              <span className="w-3 text-slate-400 font-mono">{s}★</span>
                              <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-4 text-right text-slate-400 font-mono">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-right pl-2 border-l border-slate-200 dark:border-slate-700 text-xs">
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {exam.totalVotes}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {exam.totalVotes === 1 ? 'review' : 'reviews'}
                        </p>
                      </div>
                    </div>

                    {/* Student Comments Stream */}
                    {exam.ratings.some((r) => r.comment) && (
                      <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
                        {exam.ratings
                          .filter((r) => r.comment)
                          .map((rev) => (
                            <div
                              key={rev.id}
                              className="text-xs p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-800"
                            >
                              <div className="flex items-center justify-between text-[11px] mb-0.5">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {rev.studentName}
                                </span>
                                <span className="font-mono text-amber-500 font-bold">
                                  {rev.rating}★
                                </span>
                              </div>
                              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                                {rev.comment}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Rate / Update Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    {myRating ? (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span>You rated this:</span>
                        <strong className="text-amber-500">{myRating.rating}★</strong>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Share your feedback
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedExamForRating(exam)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                        myRating
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                          : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{myRating ? 'Change Rating' : 'Rate Paper'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedExamForRating && (
        <RateExamModal
          exam={selectedExamForRating}
          currentStudentName={currentStudentName}
          isOpen={Boolean(selectedExamForRating)}
          onClose={() => setSelectedExamForRating(null)}
          onSubmitRating={handleSubmitRating}
        />
      )}

      <CreateExamModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateExam}
      />
    </div>
  );
};
