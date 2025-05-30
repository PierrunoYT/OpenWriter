interface SidebarProps {
  conversations: any[];
  currentConversation: number | null;
  fetchConversation: (id: number) => Promise<void>;
  deleteConversation: (id: number) => Promise<void>;
  deleteAllConversations: () => Promise<void>;
  setCurrentConversation: (id: number | null) => void;
  setChatMessages: (messages: any[]) => void;
  selectedPromptId: string;
}

export default function Sidebar({
  conversations,
  currentConversation,
  fetchConversation,
  deleteConversation,
  deleteAllConversations,
  setCurrentConversation,
  setChatMessages,
  selectedPromptId,
}: SidebarProps) {
  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 flex flex-col">
      {/* New Chat Button */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => {
            setCurrentConversation(null);
            setChatMessages([]);
          }}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Conversations
        </div>
        {conversations.length > 0 ? (
          <div className="space-y-1 p-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  currentConversation === conv.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-l-2 border-blue-500 dark:border-blue-400'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-2 border-transparent'
                }`}
              >
                {/* Chat icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>

                {/* Title */}
                <span
                  className="flex-1 truncate text-sm"
                  onClick={() => fetchConversation(conv.id)}
                >
                  {conv.title}
                </span>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-4 text-slate-400 dark:text-slate-500 italic">
            No conversations yet
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      {conversations.length > 0 && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={deleteAllConversations}
            className="w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
            Clear All Conversations
          </button>
          
          <div className="mt-4 text-xs text-center text-slate-500 dark:text-slate-400">
            <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">
              Powered by OpenRouter
            </a>
          </div>
        </div>
      )}
    </aside>
  );
}
