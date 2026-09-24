import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  User,
  Tag,
  AlertCircle,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit2,
  CheckCircle2,
  Search,
  Filter,
  Sparkles,
  X,
  Flame,
} from 'lucide-react';
import { KanbanTask, TaskStatus, TaskPriority, RoomMember } from '../../types';

interface KanbanBoardProps {
  tasks: KanbanTask[];
  currentStudentName: string;
  members: RoomMember[];
  isDarkMode?: boolean;
  onCreateTask: (task: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignee?: string;
    dueDate?: string;
    tags?: string[];
  }) => void;
  onUpdateTask: (taskId: string, updates: Partial<KanbanTask>) => void;
  onMoveTask: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

const COLUMNS: { id: TaskStatus; label: string; color: string; badgeBg: string; border: string }[] = [
  {
    id: 'todo',
    label: 'To Do / Goals',
    color: 'text-slate-700 dark:text-slate-200',
    badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-800',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    color: 'text-blue-700 dark:text-blue-400',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-900/50',
  },
  {
    id: 'completed',
    label: 'Completed / Mastered',
    color: 'text-emerald-700 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-900/50',
  },
];

const POPULAR_TAGS = ['Paper 2', 'Algebra', 'Geometry', 'Physics', 'Formulas', 'Past Papers', 'Revision'];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  currentStudentName,
  members,
  onCreateTask,
  onUpdateTask,
  onMoveTask,
  onDeleteTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<'all' | 'mine'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [defaultStatusForNew, setDefaultStatusForNew] = useState<TaskStatus>('todo');

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<TaskStatus>('todo');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formAssignee, setFormAssignee] = useState<string>(currentStudentName);
  const [formDueDate, setFormDueDate] = useState('');
  const [formTagInput, setFormTagInput] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);

  const openCreateModal = (initialStatus: TaskStatus = 'todo') => {
    setDefaultStatusForNew(initialStatus);
    setFormTitle('');
    setFormDescription('');
    setFormStatus(initialStatus);
    setFormPriority('medium');
    setFormAssignee(currentStudentName);
    setFormDueDate('');
    setFormTags([]);
    setFormTagInput('');
    setEditingTask(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (task: KanbanTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormStatus(task.status);
    setFormPriority(task.priority);
    setFormAssignee(task.assignee || '');
    setFormDueDate(task.dueDate || '');
    setFormTags(task.tags || []);
    setFormTagInput('');
    setIsCreateModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    if (editingTask) {
      onUpdateTask(editingTask.id, {
        title: formTitle.trim(),
        description: formDescription.trim(),
        status: formStatus,
        priority: formPriority,
        assignee: formAssignee,
        dueDate: formDueDate,
        tags: formTags,
      });
    } else {
      onCreateTask({
        title: formTitle.trim(),
        description: formDescription.trim(),
        status: formStatus,
        priority: formPriority,
        assignee: formAssignee,
        dueDate: formDueDate,
        tags: formTags,
      });
    }

    setIsCreateModalOpen(false);
  };

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().replace(/^#/, '');
    if (clean && !formTags.includes(clean)) {
      setFormTags([...formTags, clean]);
    }
    setFormTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormTags(formTags.filter((t) => t !== tagToRemove));
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: TaskStatus) => {
    e.preventDefault();
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      onMoveTask(taskId, targetStatus);
    }
    setDraggedTaskId(null);
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = (task.description || '').toLowerCase().includes(q);
        const matchesTag = (task.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchesAssignee = (task.assignee || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesTag && !matchesAssignee) return false;
      }
      if (assigneeFilter === 'mine') {
        if (task.assignee !== currentStudentName) return false;
      }
      if (priorityFilter !== 'all') {
        if (task.priority !== priorityFilter) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, assigneeFilter, priorityFilter, currentStudentName]);

  // Task metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div id="kanban-task-board" className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900 overflow-hidden select-none">
      {/* Header Bar */}
      <div className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                Study Goals & Tasks
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
                <Sparkles className="w-2.5 h-2.5" />
                {progressPercent}% Session Completed
              </span>
            </div>
          </div>
        </div>

        {/* Action: Add Task */}
        <button
          type="button"
          onClick={() => openCreateModal('todo')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs shadow-blue-600/20 flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Filter and Progress Bar Strip */}
      <div className="px-4 sm:px-6 py-2.5 bg-white/60 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 text-xs">
        {/* Progress meter */}
        <div className="flex items-center gap-3 min-w-[200px] flex-1 sm:flex-none">
          <div className="w-32 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium whitespace-nowrap">
            {completedTasks}/{totalTasks} Goals Completed ({inProgressTasks} In Progress)
          </span>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search goals..."
              className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
            />
          </div>

          {/* Assignee Filter */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setAssigneeFilter('all')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                assigneeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Goals
            </button>
            <button
              type="button"
              onClick={() => setAssigneeFilter('mine')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                assigneeFilter === 'mine'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              My Goals
            </button>
          </div>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Columns Container */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 min-w-[760px] h-full">
          {COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => t.status === col.id);
            const isDropTarget = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col h-full rounded-2xl border bg-white/70 dark:bg-slate-900/70 p-3 transition-colors ${
                  isDropTarget
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                    : col.border
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-xs uppercase tracking-wider ${col.color}`}>
                      {col.label}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${col.badgeBg}`}>
                      {columnTasks.length}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openCreateModal(col.id)}
                    title={`Add goal to ${col.label}`}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Column Task Cards Scroll Area */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[140px]">
                  {columnTasks.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-3 text-slate-400">
                      <p className="text-xs font-medium">No tasks here</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Drag items or click + to add
                      </p>
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const isHigh = task.priority === 'high';
                      const isMed = task.priority === 'medium';
                      const isDone = task.status === 'completed';

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className={`p-3 bg-white dark:bg-slate-800 border rounded-xl shadow-xs transition hover:shadow-md cursor-grab active:cursor-grabbing group ${
                            isDone
                              ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20'
                              : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                          }`}
                        >
                          {/* Priority and Actions Bar */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-tight uppercase flex items-center gap-1 ${
                                isHigh
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                                  : isMed
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {isHigh && <Flame className="w-2.5 h-2.5" />}
                              {task.priority}
                            </span>

                            <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                              {/* Quick Move Previous */}
                              {task.status !== 'todo' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onMoveTask(
                                      task.id,
                                      task.status === 'completed' ? 'in_progress' : 'todo'
                                    )
                                  }
                                  title="Move to previous status"
                                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                              )}

                              {/* Quick Move Next */}
                              {task.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onMoveTask(
                                      task.id,
                                      task.status === 'todo' ? 'in_progress' : 'completed'
                                    )
                                  }
                                  title="Move to next status"
                                  className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition cursor-pointer"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => openEditModal(task)}
                                title="Edit goal"
                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded transition cursor-pointer"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => onDeleteTask(task.id)}
                                title="Delete goal"
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Title */}
                          <h4
                            className={`font-semibold text-xs text-slate-900 dark:text-white leading-snug mb-1 ${
                              isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''
                            }`}
                          >
                            {task.title}
                          </h4>

                          {/* Description */}
                          {task.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Tags */}
                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {task.tags.map((tg) => (
                                <span
                                  key={tg}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300"
                                >
                                  #{tg}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Card Footer: Assignee & Due Date */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400">
                            {task.assignee ? (
                              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                                <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[9px] font-bold">
                                  {task.assignee.charAt(0).toUpperCase()}
                                </div>
                                <span className="truncate max-w-[100px]">{task.assignee}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}

                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{task.dueDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create / Edit Goal Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {editingTask ? 'Edit Study Goal' : 'New Study Goal & Task'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveTask} className="p-5 overflow-y-auto space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Goal / Task Title *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Solve 2023 Paper 2 Section B questions 8-14"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Specific Problem Notes
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Add formulas, question numbers, page references, or tips..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none"
                />
              </div>

              {/* Status & Priority Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="todo">To Do / Goals</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="high">🔥 High (Exam Critical)</option>
                    <option value="medium">⚡ Medium (Standard)</option>
                    <option value="low">🌱 Low (Supplementary)</option>
                  </select>
                </div>
              </div>

              {/* Assignee & Due Date Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assignee
                  </label>
                  <select
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="">Unassigned (Shared)</option>
                    <option value={currentStudentName}>{currentStudentName} (Me)</option>
                    {members
                      .filter((m) => m.studentName !== currentStudentName)
                      .map((m) => (
                        <option key={m.sessionId || m.studentName} value={m.studentName}>
                          {m.studentName}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Date / Time
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Subject & Topic Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Topic & Subject Tags
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={formTagInput}
                    onChange={(e) => setFormTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(formTagInput);
                      }
                    }}
                    placeholder="Type tag & press Enter (e.g. Algebra)"
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(formTagInput)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Add Tag
                  </button>
                </div>

                {/* Tag suggestions */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {POPULAR_TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleAddTag(t)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                        formTags.includes(t)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      +{t}
                    </button>
                  ))}
                </div>

                {/* Selected tags */}
                {formTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-medium"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-blue-900 dark:hover:text-white"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formTitle.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs shadow-blue-600/20"
                >
                  {editingTask ? 'Save Changes' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
