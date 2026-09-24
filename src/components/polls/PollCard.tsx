import React, { useState } from 'react';
import { Check, Users, Lock, ChevronDown, ChevronUp, AlertCircle, BarChart2 } from 'lucide-react';
import { Poll } from '../../types';

interface PollCardProps {
  poll: Poll;
  currentStudentName: string;
  onVote: (optionId: string) => void;
  isCompact?: boolean;
}

export const PollCard: React.FC<PollCardProps> = ({
  poll,
  currentStudentName,
  onVote,
  isCompact = false,
}) => {
  const [showVoters, setShowVoters] = useState(false);

  // Compute total votes
  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

  // Unique participants count
  const allVoters = Array.from(new Set(poll.options.flatMap((opt) => opt.votes)));
  const totalParticipants = allVoters.length;

  return (
    <div
      className={`bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-2xl p-4 shadow-xs transition-all ${
        isCompact ? 'max-w-md' : 'w-full'
      }`}
    >
      {/* Poll Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5" />
              Poll
            </span>
            <span>•</span>
            <span className="truncate">by @{poll.authorName}</span>
            {poll.isAnonymous && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                <Lock className="w-2.5 h-2.5" /> Anonymous
              </span>
            )}
            {poll.allowMultiple && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                Multiple choice
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
            {poll.question}
          </h4>
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-2 mb-3">
        {poll.options.map((opt) => {
          const hasVoted = opt.votes.includes(currentStudentName);
          const voteCount = opt.votes.length;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onVote(opt.id)}
              className={`w-full relative overflow-hidden rounded-xl border p-2.5 sm:p-3 text-left transition-all cursor-pointer group flex items-center justify-between ${
                hasVoted
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* WhatsApp-style progress bar fill */}
              <div
                className={`absolute inset-0 transition-all duration-300 pointer-events-none ${
                  hasVoted
                    ? 'bg-blue-200/50 dark:bg-blue-900/40'
                    : 'bg-slate-200/40 dark:bg-slate-700/30'
                }`}
                style={{ width: `${percentage}%` }}
              />

              {/* Content */}
              <div className="relative z-10 flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                {/* Radio/Checkbox circle */}
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                    hasVoted
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'border-2 border-slate-300 dark:border-slate-600 group-hover:border-blue-500'
                  }`}
                >
                  {hasVoted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>

                <span
                  className={`text-xs truncate ${
                    hasVoted
                      ? 'font-bold text-slate-900 dark:text-white'
                      : 'font-medium text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {opt.text}
                </span>
              </div>

              {/* Vote Count & Percent */}
              <div className="relative z-10 flex items-center gap-1.5 flex-shrink-0 text-xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] w-8 text-right font-mono">
                  {percentage}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Info & View Votes Toggle */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {totalParticipants} {totalParticipants === 1 ? 'student voted' : 'students voted'}
          </span>
          <span className="text-[10px] text-slate-400 italic">
            (click option to vote or change)
          </span>
        </div>

        {!poll.isAnonymous && totalVotes > 0 && (
          <button
            type="button"
            onClick={() => setShowVoters(!showVoters)}
            className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            <span>{showVoters ? 'Hide voters' : 'View votes'}</span>
            {showVoters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Voter breakdown list (if not anonymous) */}
      {showVoters && !poll.isAnonymous && (
        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-200/60 dark:border-slate-700/60 animate-in fade-in duration-150">
          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Voter Breakdown
          </p>
          <div className="space-y-1.5 text-xs">
            {poll.options.map((opt) => (
              <div key={opt.id} className="text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {opt.text}:
                </span>{' '}
                {opt.votes.length > 0 ? (
                  <span className="text-slate-600 dark:text-slate-400">
                    {opt.votes.join(', ')}
                  </span>
                ) : (
                  <span className="text-slate-400 italic">No votes yet</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
