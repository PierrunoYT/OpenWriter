'use client';

import React, { forwardRef, useRef, useImperativeHandle } from 'react';

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
  
  // Make this function available to parent components
  const replaceSelectedText = (newText: string = aiResponse) => {
    // Simply append the text at the current cursor position
    if (editorRef.current) {
      const cursorPosition = editorRef.current.selectionStart || 0;
      const before = content.substring(0, cursorPosition);
      const after = content.substring(cursorPosition);
      const newContent = before + newText + after;
      
      setContent(newContent);
      
      // Focus the editor and set cursor position after the inserted text
      editorRef.current.focus();
      const newCursorPosition = cursorPosition + newText.length;
      editorRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
    }
  };
  
  // Expose methods to parent component using useImperativeHandle
  useImperativeHandle(ref, () => ({
    replaceSelectedText
  }));
  
  // Handle keyboard shortcuts
  const handleEditorKeyDown = () => {
    // No selection-specific shortcuts needed
  };

  return (
    <div className="w-full h-full relative">
      <div className="h-full">
        <textarea
          ref={editorRef}
          className="w-full h-full p-3 bg-transparent focus:outline-none resize-none"
          placeholder="Start writing here or paste your text to analyze, edit, or improve..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleEditorKeyDown}
        ></textarea>
      </div>
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor; 