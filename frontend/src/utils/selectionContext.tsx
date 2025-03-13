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
  hasVisualIndicator: boolean;
  setHasVisualIndicator: (value: boolean) => void;
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
  hasVisualIndicator: false,
  setHasVisualIndicator: () => {},
});

export const SelectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [selectionTimestamp, setSelectionTimestamp] = useState<number>(0);
  const [selectionSource, setSelectionSource] = useState<'editor' | 'other' | null>(null);
  const [hasVisualIndicator, setHasVisualIndicator] = useState(false);

  // Initialize from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedText = localStorage.getItem('savedSelectedText');
      const isActive = localStorage.getItem('useSelectedText') === 'true';
      const savedRange = localStorage.getItem('savedSelectionRange');
      
      if (savedText && isActive) {
        setSelectedText(savedText);
        setIsSelectionActive(true);
        setHasVisualIndicator(true);
        
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
        setHasVisualIndicator(true);
        setSelectionTimestamp(Date.now());
        setSelectionSource('editor');
        
        // Save selection range to localStorage
        if (typeof window !== 'undefined' && range) {
          localStorage.setItem('savedSelectionRange', JSON.stringify(range));
          localStorage.setItem('savedSelectedText', text);
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
    if (!text) {
      clearSelection();
      return;
    }
    
    setSelectedText(text);
    setSelectionRange(range);
    setIsSelectionActive(!!text);
    setHasVisualIndicator(!!text);
    setSelectionTimestamp(Date.now());
    setSelectionSource(source);
    
    // Save selection data to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedSelectedText', text);
      if (range) {
        localStorage.setItem('savedSelectionRange', JSON.stringify(range));
      }
      // Automatically set useSelectedText to true when selection is made
      localStorage.setItem('useSelectedText', 'true');
      
      // Dispatch a custom event to notify other components
      const event = new CustomEvent('selectionChanged', {
        detail: {
          text,
          range,
          isActive: true
        }
      });
      document.dispatchEvent(event);
    }
  };

  const clearSelection = () => {
    setSelectedText('');
    setSelectionRange(null);
    setIsSelectionActive(false);
    setHasVisualIndicator(false);
    setSelectionTimestamp(0);
    setSelectionSource(null);
    
    // Clear selection data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('useSelectedText');
      localStorage.removeItem('savedSelectionRange');
      localStorage.removeItem('savedSelectedText');
      
      // Dispatch a custom event to notify other components
      const event = new CustomEvent('selectionCleared');
      document.dispatchEvent(event);
    }
  };
  
  const toggleSelectionUse = () => {
    if (typeof window !== 'undefined') {
      const isCurrentlyActive = localStorage.getItem('useSelectedText') === 'true';
      
      if (isCurrentlyActive) {
        localStorage.removeItem('useSelectedText');
        setIsSelectionActive(false);
        setHasVisualIndicator(false);
      } else if (selectedText) {
        localStorage.setItem('useSelectedText', 'true');
        setIsSelectionActive(true);
        setHasVisualIndicator(true);
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
        hasVisualIndicator,
        setHasVisualIndicator,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext);
