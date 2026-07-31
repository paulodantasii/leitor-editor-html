import React from 'react';
import { HighlightColor, HighlightColorOption } from '../../types';
import { Trash2 } from 'lucide-react';

export const HIGHLIGHT_COLORS: HighlightColorOption[] = [
  { id: 'yellow', name: 'Amarelo', bgClass: 'bg-amber-200 hover:bg-amber-300 dark:bg-yellow-300', borderClass: 'border-amber-400', hex: '#fef08a' },
  { id: 'blue', name: 'Azul', bgClass: 'bg-sky-200 hover:bg-sky-300 dark:bg-sky-300', borderClass: 'border-sky-400', hex: '#bae6fd' },
  { id: 'pink', name: 'Rosa', bgClass: 'bg-pink-200 hover:bg-pink-300 dark:bg-pink-300', borderClass: 'border-pink-400', hex: '#fbcfe8' },
  { id: 'green', name: 'Verde', bgClass: 'bg-emerald-200 hover:bg-emerald-300 dark:bg-emerald-300', borderClass: 'border-emerald-400', hex: '#bbf7d0' },
  { id: 'purple', name: 'Roxo', bgClass: 'bg-purple-200 hover:bg-purple-300 dark:bg-purple-300', borderClass: 'border-purple-400', hex: '#e9d5ff' },
  { id: 'orange', name: 'Laranja', bgClass: 'bg-orange-200 hover:bg-orange-300 dark:bg-orange-300', borderClass: 'border-orange-400', hex: '#fed7aa' },
  { id: 'gray', name: 'Cinza', bgClass: 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-300', borderClass: 'border-slate-400', hex: '#cbd5e1' },
];

interface HighlightPopoverProps {
  position: { x: number; y: number } | null;
  activeColor?: HighlightColor;
  onSelectColor: (color: HighlightColor) => void;
  onRemoveHighlight: () => void;
  onClose: () => void;
}

export const HighlightPopover: React.FC<HighlightPopoverProps> = ({
  position,
  activeColor,
  onSelectColor,
  onRemoveHighlight,
}) => {
  if (!position) return null;

  return (
    <div
      data-highlight-popover="true"
      className="absolute z-20 transform -translate-x-1/2 -translate-y-full mb-2 bg-white dark:bg-slate-800 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 flex items-center gap-1.5 pointer-events-auto select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200 dark:border-slate-700">
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectColor(c.id);
            }}
            title={`Grifar de ${c.name}`}
            className={`w-6 h-6 rounded-full transition-transform hover:scale-110 active:scale-95 ${c.bgClass} ${
              activeColor === c.id ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-800 scale-110' : ''
            }`}
          />
        ))}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemoveHighlight();
        }}
        title="Remover grifo"
        className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};
