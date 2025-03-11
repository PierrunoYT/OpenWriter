import { ThemeToggle } from '../ThemeToggle';

interface HeaderProps {
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  loadingModels: boolean;
}

export default function Header({ showSidebar, setShowSidebar, loadingModels }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
      {/* Left side - Logo and menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          title={showSidebar ? "Hide sidebar" : "Show sidebar"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">OpenWriter</span>
          {loadingModels && (
            <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full animate-pulse">
              Loading models...
            </div>
          )}
        </div>
      </div>

      {/* Right side - Theme toggle */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}