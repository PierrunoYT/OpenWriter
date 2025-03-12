'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface SelectionContextType {
  isSelectionActive: boolean;
  selectedText: string;
  selectionRange: { start: number; end: number } | null;
  selectionTimestamp: number;
  selectionSource: 'editor' | 'other' | null;
  setSelection: (text: string, range: { start: number; end: number } | null, source?: 'editor' | 'other') => void;
  clearSelection: () => void;
  toggleSelectionUse: () => void;
}

const SelectionContext = createContext<SelectionContextType>({
  isSelectionActive: false,
  selectedText: '',
  selectionRange: null,
  selectionTimestamp: 0,
  selectionSource: null,
  setSelection: () => {},
  clearSelection: () => {},
  toggleSelectionUse: () => {},
});

export const SelectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [selectionTimestamp, setSelectionTimestamp] = useState<number>(0);
  const [selectionSource, setSelectionSource] = useState<'editor' | 'other' | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedText = localStorage.getItem('savedSelectedText');
      const isActive = localStorage.getItem('useSelectedText') === 'true';
      const savedRange = localStorage.getItem('savedSelectionRange');
      
      if (savedText && isActive) {
        setSelectedText(savedText);
        setIsSelectionActive(true);
        
        // Try to parse the saved range if it exists
        if (savedRange) {
          try {
            const range = JSON.parse(savedRange);
            if (range && typeof range.start === 'number' && typeof range.end === 'number') {
              setSelectionRange(range);
            }
          } catch (error) {
            console.error('Error parsing saved selection range:', error);
            setSelectionRange(null);
          }
        } else {
          setSelectionRange(null);
        }
        
        setSelectionTimestamp(Date.now());
        setSelectionSource('editor');
      }
    }
    
    // Listen for selection events from the editor
    const handleEditorSelection = (e: CustomEvent) => {
      const { text, range } = e.detail;
      if (text && range) {
        setSelectedText(text);
        setSelectionRange(range);
        setIsSelectionActive(true);
        setSelectionTimestamp(Date.now());
        setSelectionSource('editor');
        
        // Save selection range to localStorage
        if (typeof window !== 'undefined' && range) {
          localStorage.setItem('savedSelectionRange', JSON.stringify(range));
        }
      }
    };
    
    const handleSelectionCleared = () => {
      clearSelection();
    };
    
    document.addEventListener('editorTextSelected', handleEditorSelection as EventListener);
    document.addEventListener('editorSelectionCleared', handleSelectionCleared);
    
    return () => {
      document.removeEventListener('editorTextSelected', handleEditorSelection as EventListener);
      document.removeEventListener('editorSelectionCleared', handleSelectionCleared);
    };
  }, []);

  const setSelection = (text: string, range: { start: number; end: number } | null, source: 'editor' | 'other' = 'editor') => {
    setSelectedText(text);
    setSelectionRange(range);
    setIsSelectionActive(!!text);
    setSelectionTimestamp(Date.now());
    setSelectionSource(source);
    
    // Save selection range to localStorage if available
    if (typeof window !== 'undefined' && range) {
      localStorage.setItem('savedSelectionRange', JSON.stringify(range));
    }
  };

  const clearSelection = () => {
    setSelectedText('');
    setSelectionRange(null);
    setIsSelectionActive(false);
    setSelectionTimestamp(0);
    setSelectionSource(null);
    
    // Clear selection data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('useSelectedText');
      localStorage.removeItem('savedSelectionRange');
      // Don't remove savedSelectedText here to allow for recovery
    }
  };
  
  const toggleSelectionUse = () => {
    if (typeof window !== 'undefined') {
      const isCurrentlyActive = localStorage.getItem('useSelectedText') === 'true';
      
      if (isCurrentlyActive) {
        localStorage.removeItem('useSelectedText');
        setIsSelectionActive(false);
      } else if (selectedText) {
        localStorage.setItem('useSelectedText', 'true');
        setIsSelectionActive(true);
      }
      
      // Dispatch a custom event to notify other components
      const event = new CustomEvent('selectionUseToggled', {
        detail: {
          isActive: !isCurrentlyActive && !!selectedText
        }
      });
      document.dispatchEvent(event);
    }
  };

  return (
    <SelectionContext.Provider
      value={{
        isSelectionActive,
        selectedText,
        selectionRange,
        selectionTimestamp,
        selectionSource,
        setSelection,
        clearSelection,
        toggleSelectionUse,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext);
