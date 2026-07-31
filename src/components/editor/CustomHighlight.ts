import { Mark, mergeAttributes } from '@tiptap/core';
import { HighlightColor } from '../../types';

export interface CustomHighlightOptions {
  multicolor: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customHighlight: {
      /**
       * Set a custom highlight color mark with optional unique highlight group id
       */
      setCustomHighlight: (attributes?: { color?: HighlightColor; id?: string }) => ReturnType;
      /**
       * Toggle a custom highlight color mark
       */
      toggleCustomHighlight: (attributes?: { color?: HighlightColor; id?: string }) => ReturnType;
      /**
       * Unset highlight mark
       */
      unsetCustomHighlight: () => ReturnType;
    };
  }
}

export const CustomHighlight = Mark.create<CustomHighlightOptions>({
  name: 'customHighlight',

  addOptions() {
    return {
      multicolor: true,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: 'yellow',
        parseHTML: (element) => {
          const dataColor = element.getAttribute('data-color');
          if (dataColor) return dataColor;

          const className = element.getAttribute('class') || '';
          const match = className.match(/hl-(\w+)/);
          return match ? match[1] : 'yellow';
        },
        renderHTML: (attributes) => {
          const color = attributes.color || 'yellow';
          return {
            class: `hl-${color}`,
            'data-color': color,
          };
        },
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-hl-id') || element.getAttribute('id'),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return {
            'data-hl-id': attributes.id,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCustomHighlight:
        (attributes) =>
        ({ commands }) => {
          const attrs = {
            id: attributes?.id || `hl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            color: attributes?.color || 'yellow',
          };
          return commands.setMark(this.name, attrs);
        },
      toggleCustomHighlight:
        (attributes) =>
        ({ commands }) => {
          const attrs = {
            id: attributes?.id || `hl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            color: attributes?.color || 'yellow',
          };
          return commands.toggleMark(this.name, attrs);
        },
      unsetCustomHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});
