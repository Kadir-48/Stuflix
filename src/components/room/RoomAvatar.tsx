import React from 'react';
import {
  BookOpen,
  Calculator,
  FlaskConical,
  Atom,
  Code,
  Sparkles,
  GraduationCap,
  Palette,
  Hash,
} from 'lucide-react';

export const ROOM_AVATAR_COLORS: { id: string; name: string; bgClass: string; ringClass: string; hex: string }[] = [
  { id: 'blue', name: 'Ocean Blue', bgClass: 'bg-blue-600 text-white', ringClass: 'ring-blue-400', hex: '#2563eb' },
  { id: 'indigo', name: 'Royal Indigo', bgClass: 'bg-indigo-600 text-white', ringClass: 'ring-indigo-400', hex: '#4f46e5' },
  { id: 'purple', name: 'Mystic Purple', bgClass: 'bg-purple-600 text-white', ringClass: 'ring-purple-400', hex: '#9333ea' },
  { id: 'rose', name: 'Crimson Rose', bgClass: 'bg-rose-600 text-white', ringClass: 'ring-rose-400', hex: '#e11d48' },
  { id: 'amber', name: 'Warm Amber', bgClass: 'bg-amber-600 text-white', ringClass: 'ring-amber-400', hex: '#d97706' },
  { id: 'emerald', name: 'Forest Emerald', bgClass: 'bg-emerald-600 text-white', ringClass: 'ring-emerald-400', hex: '#059669' },
  { id: 'teal', name: 'Deep Teal', bgClass: 'bg-teal-600 text-white', ringClass: 'ring-teal-400', hex: '#0d9488' },
  { id: 'cyan', name: 'Electric Cyan', bgClass: 'bg-cyan-600 text-white', ringClass: 'ring-cyan-400', hex: '#0891b2' },
];

export const ROOM_AVATAR_ICONS: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'book', label: 'General / Reading', icon: BookOpen },
  { id: 'calculator', label: 'Mathematics', icon: Calculator },
  { id: 'flask', label: 'Chemistry', icon: FlaskConical },
  { id: 'atom', label: 'Physics', icon: Atom },
  { id: 'code', label: 'Computer Science', icon: Code },
  { id: 'graduation', label: 'Board Exams', icon: GraduationCap },
  { id: 'sparkles', label: 'Honors / Focus', icon: Sparkles },
  { id: 'palette', label: 'Arts & Design', icon: Palette },
];

interface RoomAvatarProps {
  color?: string;
  icon?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const RoomAvatar: React.FC<RoomAvatarProps> = ({
  color = 'blue',
  icon = 'book',
  size = 'md',
  className = '',
}) => {
  const colorObj = ROOM_AVATAR_COLORS.find((c) => c.id === color) || ROOM_AVATAR_COLORS[0];
  const iconObj = ROOM_AVATAR_ICONS.find((i) => i.id === icon);
  const IconComponent = iconObj ? iconObj.icon : Hash;

  const sizeClasses = {
    xs: 'w-5 h-5 rounded-md text-[10px]',
    sm: 'w-7 h-7 rounded-lg text-xs',
    md: 'w-9 h-9 rounded-xl text-sm',
    lg: 'w-11 h-11 rounded-2xl text-base',
    xl: 'w-14 h-14 rounded-2xl text-xl',
  }[size];

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-5.5 h-5.5',
    xl: 'w-7 h-7',
  }[size];

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 font-bold shadow-xs ${colorObj.bgClass} ${sizeClasses} ${className}`}
    >
      <IconComponent className={`${iconSizes} stroke-[2.2]`} />
    </div>
  );
};
