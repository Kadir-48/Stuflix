import React from 'react';
import { UserStatus, PresenceStatus } from '../../types';

interface UserStatusBadgeProps {
  status?: UserStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const PRESENCE_CONFIG: Record<
  PresenceStatus,
  { label: string; color: string; ringColor: string; dotClass: string; icon: string }
> = {
  online: {
    label: 'Online',
    color: 'text-emerald-600 dark:text-emerald-400',
    ringColor: 'ring-emerald-500',
    dotClass: 'bg-emerald-500',
    icon: '🟢',
  },
  in_call: {
    label: 'In Call',
    color: 'text-purple-600 dark:text-purple-400',
    ringColor: 'ring-purple-500',
    dotClass: 'bg-purple-500',
    icon: '🎙',
  },
  away: {
    label: 'Away',
    color: 'text-amber-600 dark:text-amber-400',
    ringColor: 'ring-amber-500',
    dotClass: 'bg-amber-500',
    icon: '🟡',
  },
  offline: {
    label: 'Offline',
    color: 'text-slate-400 dark:text-slate-500',
    ringColor: 'ring-slate-400',
    dotClass: 'bg-slate-400',
    icon: '⚪',
  },
  studying: {
    label: 'Studying',
    color: 'text-blue-600 dark:text-blue-400',
    ringColor: 'ring-blue-500',
    dotClass: 'bg-blue-500',
    icon: '📘',
  },
};

export const ACTIVITY_PRESETS = [
  { id: 'studying', text: '📚 Studying', label: 'Studying' },
  { id: 'revising', text: '📝 Revising', label: 'Revising' },
  { id: 'solving_past_papers', text: '🎯 Solving Past Papers', label: 'Solving Past Papers' },
  { id: 'reading_notes', text: '📖 Reading Notes', label: 'Reading Notes' },
  { id: 'looking_for_partner', text: '🤝 Looking for Study Partner', label: 'Looking for Study Partner' },
  { id: 'need_help', text: '❓ Need Help', label: 'Need Help' },
  { id: 'dnd', text: '🚫 Do Not Disturb', label: 'Do Not Disturb' },
  { id: 'taking_break', text: '☕ Taking a Break', label: 'Taking a Break' },
];

export const UserStatusBadge: React.FC<UserStatusBadgeProps> = ({
  status,
  size = 'sm',
  showText = true,
  className = '',
  onClick,
}) => {
  const presence = status?.presence || 'online';
  const activity = status?.activity || (status?.customText ? `📝 ${status.customText}` : '📚 Studying');
  const cfg = PRESENCE_CONFIG[presence] || PRESENCE_CONFIG.online;

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const textSizes = {
    xs: 'text-[9px]',
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 min-w-0 ${
        onClick ? 'hover:opacity-80 transition cursor-pointer text-left' : ''
      } ${className}`}
    >
      {/* Presence indicator dot */}
      <span className="relative flex items-center justify-center flex-shrink-0">
        <span
          className={`inline-block rounded-full ${cfg.dotClass} ${dotSizes[size]} ring-1.5 ring-white dark:ring-slate-900`}
        />
        {presence === 'in_call' && (
          <span className="absolute -inset-0.5 rounded-full bg-purple-500 opacity-40 animate-ping" />
        )}
      </span>

      {showText && (
        <div className={`flex items-center gap-1 min-w-0 ${textSizes[size]} truncate leading-tight`}>
          <span className={`font-semibold ${cfg.color} flex-shrink-0`}>
            {cfg.label}
          </span>
          {activity && (
            <>
              <span className="text-slate-300 dark:text-slate-600 flex-shrink-0">•</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                {activity}
              </span>
            </>
          )}
        </div>
      )}
    </Component>
  );
};
