'use client';

import { createContext, useContext, useState } from 'react';

interface SelectionContextType {
  isSelectionActive: boolean;
  selectedText: string;
  selectionRange: { start: number; end: number } | null;
  setSelection: (text: string, range: { start: number; end: number } | null) => void;
  clearSelection: () => void;
}

const SelectionContext = createContext<SelectionContextType>({
  isSelectionActive: false,
  selectedText: '',
  selectionRange: null,
  setSelection: () => {},
  clearSelection: () => {},
});

export const SelectionProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSelectionActive, setIsSelectionActive] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

  const setSelection = (text: string, range: { start: number; end: number } | null) => {
    setSelectedText(text);
    setSelectionRange(range);
    setIsSelectionActive(!!text);
  };

  const clearSelection = () => {
    setSelectedText('');
    setSelectionRange(null);
    setIsSelectionActive(false);
  };

  return (
    <SelectionContext.Provider
      value={{
        isSelectionActive,
        selectedText,
        selectionRange,
        setSelection,
        clearSelection,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};

export const useSelection = () => useContext(SelectionContext);
