import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';

import TextAlign from '@tiptap/extension-text-align';

import { useAppStore } from '../../store/useAppStore';
import { CustomHighlight } from './CustomHighlight';
import { HighlightPopover } from './HighlightPopover';
import { EditorToolbar } from './EditorToolbar';
import { HighlightColor } from '../../types';
import { sanitizeHTML } from '../../services/sanitizer';

/**
 * Checks if there is any unhighlighted text or space between two <mark> elements in the DOM.
 */
function hasUnhighlightedTextBetween(m1: HTMLElement, m2: HTMLElement): boolean {
  try {
    const range = document.createRange();
    range.setStartAfter(m1);
    range.setEndBefore(m2);

    const fragment = range.cloneContents();
    fragment.querySelectorAll('mark').forEach((mark) => mark.remove());

    const remainingText = fragment.textContent || '';
    return remainingText.length > 0;
  } catch (err) {
    return true;
  }
}

/**
 * Checks if two <mark> DOM elements are part of a single contiguous highlight selection.
 */
function areMarksConnected(m1: HTMLElement, m2: HTMLElement): boolean {
  const id1 = m1.getAttribute('data-hl-id');
  const id2 = m2.getAttribute('data-hl-id');

  if (id1 && id2) {
    return id1 === id2;
  }

  const color1 = m1.getAttribute('data-color') || m1.className.match(/hl-(\w+)/)?.[1];
  const color2 = m2.getAttribute('data-color') || m2.className.match(/hl-(\w+)/)?.[1];

  if (color1 !== color2) return false;

  return !hasUnhighlightedTextBetween(m1, m2);
}

/**
 * Finds all connected contiguous <mark> DOM elements belonging to the same highlight selection action.
 */
function getConnectedMarkElements(markEl: HTMLElement, container: HTMLElement): HTMLElement[] {
  const hlId = markEl.getAttribute('data-hl-id');
  if (hlId) {
    const matchingMarks = Array.from(container.querySelectorAll(`mark[data-hl-id="${hlId}"]`)) as HTMLElement[];
    if (matchingMarks.length > 0) {
      return matchingMarks;
    }
  }

  // Fallback for legacy HTML without data-hl-id
  const allMarks = Array.from(container.querySelectorAll('mark')) as HTMLElement[];
  const markIndex = allMarks.indexOf(markEl);

  if (allMarks.length === 0 || markIndex === -1) return [markEl];

  let startIdx = markIndex;
  while (startIdx > 0) {
    const prev = allMarks[startIdx - 1];
    const curr = allMarks[startIdx];
    if (areMarksConnected(prev, curr)) {
      startIdx--;
    } else {
      break;
    }
  }

  let endIdx = markIndex;
  while (endIdx < allMarks.length - 1) {
    const curr = allMarks[endIdx];
    const next = allMarks[endIdx + 1];
    if (areMarksConnected(curr, next)) {
      endIdx++;
    } else {
      break;
    }
  }

  return allMarks.slice(startIdx, endIdx + 1);
}

/**
 * Accurately finds the complete contiguous text range [from, to] of a customHighlight mark
 * by inspecting parent block children in ProseMirror.
 */
function getFullMarkRange(editor: Editor, $pos: any): { from: number; to: number } | null {
  if (!editor || !$pos) return null;
  const markType = editor.schema.marks.customHighlight;
  if (!markType) return null;

  const parent = $pos.parent;
  const parentStart = $pos.start();
  const pos = $pos.pos;

  let exactFrom: number | null = null;
  let exactTo: number | null = null;

  let currentOffset = 0;
  parent.forEach((child: any) => {
    const childFrom = parentStart + currentOffset;
    const childTo = childFrom + child.nodeSize;

    const hasMark =
      (child.isText && child.marks.some((m: any) => m.type === markType)) ||
      (child.marks && child.marks.some((m: any) => m.type === markType));

    if (hasMark) {
      if (pos >= childFrom && pos <= childTo) {
        if (exactFrom === null) exactFrom = childFrom;
        exactTo = childTo;
      } else if (exactFrom !== null && childFrom === exactTo) {
        exactTo = childTo;
      }
    }
    currentOffset += child.nodeSize;
  });

  if (exactFrom !== null && exactTo !== null) {
    return { from: exactFrom, to: exactTo };
  }

  return null;
}

/**
 * Resolves exact start & end range [from, to] of a clicked <mark> DOM element
 * across connected mark elements of the same highlight selection action.
 */
function getExactMarkRangeFromDOM(
  editor: Editor,
  markEl: HTMLElement,
  container: HTMLElement
): { from: number; to: number } | null {
  if (!editor || !markEl || !container) return null;

  try {
    const view = editor.view;
    const connectedMarks = getConnectedMarkElements(markEl, container);

    const firstEl = connectedMarks[0];
    const lastEl = connectedMarks[connectedMarks.length - 1];

    const startPos = view.posAtDOM(firstEl, 0);
    const lastPos = view.posAtDOM(lastEl, 0);
    const lastLen = lastEl.textContent?.length || 0;

    if (startPos !== undefined && lastPos !== undefined) {
      return { from: startPos, to: lastPos + lastLen };
    }
  } catch (err) {
    console.warn('Error resolving exact mark range from DOM:', err);
  }
  return null;
}

export const TiptapEditor: React.FC = () => {
  const {
    document: currentDoc,
    updateDocumentContent,
    isHighlightMode,
    activeHighlightColor,
    setActiveHighlightColor,
    isEditable,
    preferences,
    setHighlightCount,
  } = useAppStore();

  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);
  const [targetMarkRange, setTargetMarkRange] = useState<{ from: number; to: number } | null>(null);
  const [targetMarkId, setTargetMarkId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Accurately counts unique connected highlight entities
  const updateHighlightCount = useCallback(
    (ed: Editor | null) => {
      if (!ed || !containerRef.current) return;
      const allMarks = Array.from(containerRef.current.querySelectorAll('mark')) as HTMLElement[];

      if (allMarks.length === 0) {
        setHighlightCount(0);
        return;
      }

      // Group marks by unique data-hl-id if available
      const uniqueIds = new Set<string>();
      let legacyGroupCount = 0;

      for (let i = 0; i < allMarks.length; i++) {
        const hlId = allMarks[i].getAttribute('data-hl-id');
        if (hlId) {
          uniqueIds.add(hlId);
        } else if (i === 0 || !areMarksConnected(allMarks[i - 1], allMarks[i])) {
          legacyGroupCount++;
        }
      }

      setHighlightCount(uniqueIds.size + legacyGroupCount);
    },
    [setHighlightCount]
  );

  // Initialize Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'blockquote'],
      }),
      Underline,
      Subscript,
      Superscript,
      TextStyle,
      Color,
      CustomHighlight,
    ],
    content: sanitizeHTML(currentDoc.content),
    editable: isEditable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      updateDocumentContent(html);
      updateHighlightCount(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      if (!editor) return;

      const { from, to, $from } = editor.state.selection;

      // Case A: User selected a text range in Highlight Mode -> APPLY HIGHLIGHT INSTANTLY!
      if (isHighlightMode && !editor.isDestroyed && from !== to) {
        const uniqueId = `hl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        // Apply yellow highlight immediately and advance selection to release anchor
        editor
          .chain()
          .focus()
          .setCustomHighlight({ color: 'yellow', id: uniqueId })
          .setTextSelection(to)
          .run();

        // Clear native browser text selection handles immediately
        setTimeout(() => {
          window.getSelection()?.removeAllRanges();
          document.getSelection()?.empty();
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }, 20);

        setPopoverPos(null);
        setTargetMarkRange(null);
        setTargetMarkId(null);
        updateHighlightCount(editor);
      } 
      // Case B: Cursor is inside a mark (collapsed selection)
      else if (editor.isActive('customHighlight')) {
        const markRange = getFullMarkRange(editor, $from);
        if (markRange) {
          setTargetMarkRange(markRange);
          const markAttrs = editor.getAttributes('customHighlight');
          if (markAttrs?.color) {
            setActiveHighlightColor(markAttrs.color as HighlightColor);
          }
          if (markAttrs?.id) {
            setTargetMarkId(markAttrs.id as string);
          }
        }
      } else {
        // Clear popover if selection is outside any mark
        setPopoverPos(null);
        setTargetMarkRange(null);
        setTargetMarkId(null);
      }
    },
  });

  // Automatically check if open popover's mark scrolls behind the sticky header (approx 70px)
  useEffect(() => {
    if (!popoverPos || !containerRef.current) return;

    const handleScroll = () => {
      if (!containerRef.current) return;

      let markEl: HTMLElement | null = null;
      if (targetMarkId) {
        markEl = containerRef.current.querySelector(`mark[data-hl-id="${targetMarkId}"]`);
      }

      if (!markEl) {
        markEl = containerRef.current.querySelector('mark.mark-hovered') || containerRef.current.querySelector('mark');
      }

      if (markEl) {
        const connectedMarks = getConnectedMarkElements(markEl, containerRef.current);
        const firstRect = connectedMarks[0].getBoundingClientRect();
        const lastRect = connectedMarks[connectedMarks.length - 1].getBoundingClientRect();

        // Close popover if mark scrolls behind header (top < 70px) or off screen bottom
        if (firstRect.top < 70 || lastRect.bottom < 70 || firstRect.top > window.innerHeight) {
          setPopoverPos(null);
          setTargetMarkRange(null);
          setTargetMarkId(null);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [popoverPos, targetMarkId]);

  // Direct Click & Hover Synchronizer for <mark> elements in the DOM
  useEffect(() => {
    const handleDomClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Ignore clicks originating inside the popover UI itself
      if (target.closest('[data-highlight-popover]')) {
        return;
      }

      const markEl = target.closest('mark');

      if (markEl && editor && containerRef.current) {
        e.stopPropagation();

        const hlId = markEl.getAttribute('data-hl-id');
        setTargetMarkId(hlId);

        const connectedMarks = getConnectedMarkElements(markEl, containerRef.current);
        const containerRect = containerRef.current.getBoundingClientRect();
        const firstRect = connectedMarks[0].getBoundingClientRect();
        const lastRect = connectedMarks[connectedMarks.length - 1].getBoundingClientRect();

        // If clicked mark is already under header, don't open
        if (firstRect.top < 70) {
          return;
        }

        // Calculate combined center position RELATIVE to relative containerRef (for 100% native GPU scroll syncing)
        const combinedLeft = Math.min(firstRect.left, lastRect.left) - containerRect.left;
        const combinedRight = Math.max(firstRect.right, lastRect.right) - containerRect.left;
        const combinedTop = Math.min(firstRect.top, lastRect.top) - containerRect.top;

        setPopoverPos({
          x: combinedLeft + (combinedRight - combinedLeft) / 2,
          y: combinedTop - 8,
        });

        // Detect current color of clicked mark
        const dataColor = markEl.getAttribute('data-color') as HighlightColor;
        const classMatch = markEl.className.match(/hl-(\w+)/);
        const color = dataColor || (classMatch ? (classMatch[1] as HighlightColor) : 'yellow');
        setActiveHighlightColor(color);

        // Resolve exact ProseMirror range [from, to] across connected mark elements
        const fullRange = getExactMarkRangeFromDOM(editor, markEl, containerRef.current);
        if (fullRange) {
          setTargetMarkRange(fullRange);
        }

        // Clear native browser text selection overlay
        window.getSelection()?.removeAllRanges();
      } else {
        // Clicked outside any mark -> close popover
        setPopoverPos(null);
        setTargetMarkRange(null);
        setTargetMarkId(null);
      }
    };

    // Synchronize hover state across connected mark elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-highlight-popover]')) return;

      const markEl = target.closest('mark');
      if (markEl && containerRef.current) {
        const connectedMarks = getConnectedMarkElements(markEl, containerRef.current);
        connectedMarks.forEach((m) => m.classList.add('mark-hovered'));
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const markEl = target.closest('mark');
      if (markEl && containerRef.current) {
        containerRef.current.querySelectorAll('mark.mark-hovered').forEach((m) => m.classList.remove('mark-hovered'));
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('click', handleDomClick);
      container.addEventListener('mouseover', handleMouseOver);
      container.addEventListener('mouseout', handleMouseOut);
    }
    return () => {
      if (container) {
        container.removeEventListener('click', handleDomClick);
        container.removeEventListener('mouseover', handleMouseOver);
        container.removeEventListener('mouseout', handleMouseOut);
      }
    };
  }, [editor, setActiveHighlightColor]);

  // Update content when document changes externally
  useEffect(() => {
    if (editor && currentDoc.content && editor.getHTML() !== currentDoc.content) {
      editor.commands.setContent(sanitizeHTML(currentDoc.content), false);
      updateHighlightCount(editor);
    }
  }, [currentDoc.content, editor, updateHighlightCount]);

  // Update editor editable mode
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditable);
    }
  }, [isEditable, editor]);

  // Handle native selection in Highlight mode & iPad context menu suppression
  useEffect(() => {
    const handleMouseUpOrTouchEnd = (e: MouseEvent | TouchEvent) => {
      if (!editor || !isHighlightMode || isEditable) return;

      const target = e.target as HTMLElement;

      // 1. Ignore touches/clicks inside the popover UI (allows color changes on iPad while in Highlight Mode)
      if (target?.closest('[data-highlight-popover]')) {
        return;
      }

      // 2. Ignore touches/clicks on existing marks (allows tapping marks to open popover)
      const markEl = target?.closest('mark');
      if (markEl) {
        return;
      }

      // 3. Apply custom highlight on drag selection
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const uniqueId = `hl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        // Apply highlight and advance ProseMirror selection to release WebKit anchor
        editor
          .chain()
          .focus()
          .setCustomHighlight({ color: 'yellow', id: uniqueId })
          .setTextSelection(to)
          .run();

        // Asynchronously release native iOS WebKit selection anchor memory
        setTimeout(() => {
          window.getSelection()?.removeAllRanges();
          document.getSelection()?.empty();
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }, 30);

        setPopoverPos(null);
        setTargetMarkRange(null);
        setTargetMarkId(null);
        updateHighlightCount(editor);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (isHighlightMode) {
        e.preventDefault();
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseup', handleMouseUpOrTouchEnd);
      container.addEventListener('touchend', handleMouseUpOrTouchEnd);
      container.addEventListener('contextmenu', handleContextMenu);
    }

    return () => {
      if (container) {
        container.removeEventListener('mouseup', handleMouseUpOrTouchEnd);
        container.removeEventListener('touchend', handleMouseUpOrTouchEnd);
        container.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [editor, isHighlightMode, isEditable, updateHighlightCount]);

  // Initial highlight count on mount
  useEffect(() => {
    if (editor) {
      updateHighlightCount(editor);
    }
  }, [editor, updateHighlightCount]);

  // Handle color change from Popover (Preserves unique data-hl-id of that specific highlight entity)
  const handleSelectColor = (color: HighlightColor) => {
    if (!editor) return;

    const range =
      targetMarkRange ||
      (editor.state.selection.from !== editor.state.selection.to
        ? { from: editor.state.selection.from, to: editor.state.selection.to }
        : null);

    const existingId = targetMarkId || `hl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (range) {
      editor
        .chain()
        .focus()
        .setTextSelection(range)
        .setCustomHighlight({ color, id: existingId })
        .setTextSelection(range.to)
        .run();
    } else {
      editor.chain().focus().setCustomHighlight({ color, id: existingId }).run();
    }

    // Clean up popover, target range, and browser selection
    window.getSelection()?.removeAllRanges();
    setPopoverPos(null);
    setTargetMarkRange(null);
    setTargetMarkId(null);
    updateHighlightCount(editor);
  };

  // Handle highlight removal from Popover
  const handleRemoveHighlight = () => {
    if (!editor) return;

    const range =
      targetMarkRange ||
      (editor.state.selection.from !== editor.state.selection.to
        ? { from: editor.state.selection.from, to: editor.state.selection.to }
        : null);

    if (range) {
      editor
        .chain()
        .focus()
        .setTextSelection(range)
        .unsetCustomHighlight()
        .setTextSelection(range.to)
        .run();
    } else {
      editor.chain().focus().unsetCustomHighlight().run();
    }

    // Clean up popover, target range, and browser selection
    window.getSelection()?.removeAllRanges();
    setPopoverPos(null);
    setTargetMarkRange(null);
    setTargetMarkId(null);
    updateHighlightCount(editor);
  };

  // Dynamic style parameters based on preferences (Fixed width so font size adjustments only resize text, not page width)
  const getContainerWidthClass = () => {
    switch (preferences.textWidth) {
      case 'narrow': return 'max-w-2xl'; // ~672px
      case 'normal': return 'max-w-4xl'; // ~896px
      case 'wide': return 'max-w-6xl';   // ~1152px
      case 'full': return 'max-w-none w-full';
      default: return 'max-w-4xl';
    }
  };

  return (
    <div className="w-full flex flex-col items-center py-4 px-4 sm:px-6">
      {/* Show Editor Floating Toolbar when in Edit Mode */}
      {isEditable && <EditorToolbar editor={editor} />}

      <div
        ref={containerRef}
        className={`relative w-full ${getContainerWidthClass()} transition-all duration-200 ${
          preferences.fontFamily === 'serif' ? 'font-serif-editor' : 'font-sans-editor'
        } ${isHighlightMode ? 'highlight-mode-active' : ''}`}
        style={{ fontSize: `${preferences.fontSize}px` }}
      >
        <EditorContent editor={editor} className="bg-white dark:bg-slate-800/90 shadow-sm border border-slate-200 dark:border-slate-700/60 rounded-xl p-6 sm:p-10 min-h-[75vh]" />

        <HighlightPopover
          position={popoverPos}
          activeColor={activeHighlightColor}
          onSelectColor={handleSelectColor}
          onRemoveHighlight={handleRemoveHighlight}
          onClose={() => {
            setPopoverPos(null);
            setTargetMarkRange(null);
            setTargetMarkId(null);
            window.getSelection()?.removeAllRanges();
          }}
        />
      </div>
    </div>
  );
};
