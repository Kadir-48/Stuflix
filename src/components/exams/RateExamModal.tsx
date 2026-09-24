import React, { useState } from 'react';
import { X, Star, Check, Sparkles } from 'lucide-react';
import { ExamPaper } from '../../types';

interface RateExamModalProps {
  exam: ExamPaper | null;
  currentStudentName: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmitRating: (examId: string, rating: 1 | 2 | 3 | 4 | 5, comment?: string) => void;
}

const RATING_DESCRIPTIONS: Record<number, { label: string; color: string; desc: string }> = {
  1: { label: 'Very Easy', color: 'text-emerald-500', desc: 'Direct questions, plenty of time left, minimal tricky parts' },
  2: { label: 'Easy / Fair', color: 'text-teal-500', desc: 'Expected questions, standard difficulty, manageable calculations' },
  3: { label: 'Moderate', color: 'text-amber-500', desc: 'Balanced paper, required good preparation, standard time pressure' },
  4: { label: 'Challenging / Hard', color: 'text-orange-500', desc: 'Tricky questions, tight timing, required deep conceptual grasp' },
  5: { label: 'Extremely Hard', color: 'text-rose-500', desc: 'Unusual twists, harsh timing, difficult multi-step problems' },
};

export const RateExamModal: React.FC<RateExamModalProps> = ({
  exam,
  currentStudentName,
  isOpen,
  onClose,
  onSubmitRating,
}) => {
  if (!isOpen || !exam) return null;

  const existingReview = exam.ratings.find(
    (r) => r.studentName.toLowerCase() === currentStudentName.toLowerCase()
  );

  const [selectedRating, setSelectedRating] = useState<number>(existingReview?.rating || 4);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>(existingReview?.comment || '');

  const effectiveRating = hoverRating || selectedRating;
  const ratingInfo = RATING_DESCRIPTIONS[effectiveRating] || RATING_DESCRIPTIONS[3];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitRating(
      exam.id,
      selectedRating as 1 | 2 | 3 | 4 | 5,
      comment.trim() || undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {exam.subject} {exam.code ? `• ${exam.code}` : ''}
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {exam.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="text-center space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              How difficult was this paper?
            </p>

            {/* Star selector */}
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= effectiveRating;
                return (
                  <button
                    type="button"
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setSelectedRating(star)}
                    className="p-1 rounded-lg hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Rating description card */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-750">
              <span className={`text-xs font-bold ${ratingInfo.color}`}>
                {effectiveRating} Stars • {ratingInfo.label}
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {ratingInfo.desc}
              </p>
            </div>
          </div>

          {/* Optional review comment */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Review notes or tricky questions (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Section B Question 3 on electric circuits was tricky, timing was tight..."
              rows={3}
              maxLength={200}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none"
            />
            <p className="text-[10px] text-slate-400 text-right">
              {comment.length}/200 characters
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Submit Rating</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
