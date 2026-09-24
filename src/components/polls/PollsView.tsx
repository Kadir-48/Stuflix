import React, { useState } from 'react';
import { Plus, BarChart2, CheckCircle2, Search, Filter } from 'lucide-react';
import { Poll } from '../../types';
import { PollCard } from './PollCard';
import { CreatePollModal } from './CreatePollModal';

interface PollsViewProps {
  polls: Poll[];
  currentStudentName: string;
  onVote: (pollId: string, optionId: string) => void;
  onCreatePoll: (payload: {
    question: string;
    options: string[];
    allowMultiple: boolean;
    isAnonymous: boolean;
  }) => void;
}

export const PollsView: React.FC<PollsViewProps> = ({
  polls,
  currentStudentName,
  onVote,
  onCreatePoll,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'voted' | 'unvoted'>('all');

  const filteredPolls = polls.filter((poll) => {
    const matchesSearch = poll.question.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const hasVoted = poll.options.some((o) => o.votes.includes(currentStudentName));
    if (filter === 'voted') return hasVoted;
    if (filter === 'unvoted') return !hasVoted;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
      {/* Header Bar */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Room Polls
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold">
              {polls.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time WhatsApp-style polling with live results & instant vote updates
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Poll</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-850/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search polls..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'unvoted', 'voted'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition cursor-pointer ${
                filter === f
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {f === 'all' ? 'All Polls' : f === 'unvoted' ? 'Need My Vote' : 'Voted'}
            </button>
          ))}
        </div>
      </div>

      {/* Poll Cards List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {filteredPolls.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <BarChart2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              {searchQuery ? 'No matching polls found' : 'No polls in this room yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {searchQuery
                ? 'Try a different search query or clear the filter.'
                : 'Start a poll to ask your classmates questions, decide exam review topics, or gauge difficulty.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Poll</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {filteredPolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                currentStudentName={currentStudentName}
                onVote={(optionId) => onVote(poll.id, optionId)}
              />
            ))}
          </div>
        )}
      </div>

      <CreatePollModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreatePoll={onCreatePoll}
      />
    </div>
  );
};
