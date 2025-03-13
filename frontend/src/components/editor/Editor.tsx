'use client';

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useSelection } from '@/utils/selectionContext';

interface EditorProps {
  content: string;
  setContent: (content: string) => void;
  aiResponse: string;
}

export interface EditorHandle {
  replaceSelectedText: (newText?: string) => void;
}

const Editor = forwardRef<EditorHandle, EditorProps>(({ content, setContent, aiResponse }, ref) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const { setSelection, clearSelection, selectionRange, isSelectionActive } = useSelection();
  
  // Selection handling functions
  const handleTextSelection = (e: React.SyntheticEvent) => {
    try {
      const target = e.target as HTMLTextAreaElement;
      const selectionStart = target.selectionStart;
      const selectionEnd = target.selectionEnd;
      
      if (selectionStart !== undefined && selectionEnd !== undefined) {
        if (selectionStart !== selectionEnd) {
          const selectedText = content.substring(selectionStart, selectionEnd);
          setSelection(selectedText, { start: selectionStart, end: selectionEnd }, 'editor');
          
          // Dispatch a custom event for other components to react to
          const selectionEvent = new CustomEvent('editorTextSelected', {
            detail: {
              text: selectedText,
              range: { start: selectionStart, end: selectionEnd }
            }
          });
          document.dispatchEvent(selectionEvent);
        } else {
          clearSelection();
          
          // Dispatch a custom event for selection cleared
          const clearEvent = new CustomEvent('editorSelectionCleared');
          document.dispatchEvent(clearEvent);
        }
      }
    } catch (error) {
      console.error('Error handling text selection:', error);
      clearSelection();
    }
  };
  
  // Make this function available to parent components
  const replaceSelectedText = (newText: string = aiResponse) => {
    if (!selectionRange) return;
    
    const before = content.substring(0, selectionRange.start);
    const after = content.substring(selectionRange.end);
    const newContent = before + newText + after;
    
    setContent(newContent);
    
    // Focus the editor and set cursor position after the inserted text
    if (editorRef.current) {
      editorRef.current.focus();
      const newCursorPosition = selectionRange.start + newText.length;
      editorRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
    }
    
    // Clear the selection after replacement
    clearSelection();
  };
  
  // Expose methods to parent component using useImperativeHandle
  useImperativeHandle(ref, () => ({
    replaceSelectedText
  }));
  
  // Highlight the selected text in the editor
  const highlightSelection = () => {
    if (editorRef.current && selectionRange && isSelectionActive) {
      editorRef.current.focus();
      editorRef.current.setSelectionRange(selectionRange.start, selectionRange.end);
    }
  };
  
  // Handle keyboard shortcuts for selection
  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    // Check for Ctrl+E or Cmd+E to highlight current selection
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      highlightSelection();
    }
    
    // Check for Escape key to clear selection
    if (e.key === 'Escape' && isSelectionActive) {
      e.preventDefault();
      clearSelection();
    }
  };
  
  // Handle selection changes from keyboard navigation
  const handleSelectionChange = (e: React.SyntheticEvent) => {
    // Only process if this is a keyboard event that might change selection
    handleTextSelection(e);
  };
  
  // Use localStorage to persist selected text safely
  useEffect(() => {
    // Add event listener for selection changes
    const handleDocumentSelectionChange = () => {
      if (editorRef.current && document.activeElement === editorRef.current) {
        const selStart = editorRef.current.selectionStart;
        const selEnd = editorRef.current.selectionEnd;
        
        if (selStart !== selEnd) {
          const text = content.substring(selStart, selEnd);
          setSelection(text, { start: selStart, end: selEnd }, 'editor');
        }
      }
    };
    
    document.addEventListener('selectionchange', handleDocumentSelectionChange);
    
    return () => {
      document.removeEventListener('selectionchange', handleDocumentSelectionChange);
    };
  }, [content, setSelection]);
  
  // Restore selection when component mounts
  useEffect(() => {
    if (editorRef.current && selectionRange && isSelectionActive) {
      // Restore the visual selection in the editor
      editorRef.current.focus();
      editorRef.current.setSelectionRange(selectionRange.start, selectionRange.end);
    }
  }, [isSelectionActive, selectionRange]);

  // Set up document click handler to prevent selection clearing
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (isSelectionActive && selectionRange) {
        // Only prevent default if the click is outside the editor
        if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, [isSelectionActive, selectionRange]);

  return (
    <div className="w-full h-full relative">
      {isSelectionActive && (
        <div className="absolute top-2 right-2 z-10 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md flex items-center shadow-sm border border-blue-200 dark:border-blue-800">
          <span className="text-xs mr-1">Selection Active</span>
          <button 
            onClick={() => clearSelection()}
            className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 ml-1 text-xs"
            title="Clear selection"
          >
            ✕
          </button>
        </div>
      )}
      <div className="h-full">
        <textarea
          ref={editorRef}
          className="w-full h-full p-3 bg-transparent focus:outline-none resize-none"
          placeholder="Start writing here or paste your text to analyze, edit, or improve..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onClick={(e) => {
            // Only clear selection if clicking outside of current selection
            if (isSelectionActive && selectionRange) {
              const target = e.target as HTMLTextAreaElement;
              const clickPosition = target.selectionStart;
              if (clickPosition < selectionRange.start || clickPosition > selectionRange.end) {
                clearSelection();
              }
            }
          }}
          onSelect={handleTextSelection}
          onMouseUp={handleTextSelection}
          onKeyDown={handleEditorKeyDown}
          onKeyUp={handleSelectionChange}
        ></textarea>
      </div>
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor; 