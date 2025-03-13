export interface Model {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: number;
    completion: number;
  };
  context_length?: number;
  features?: string[];
  supportsStructured?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Conversation {
  id: number;
  title: string;
  model?: string;
  system_prompt?: string;
  created_at?: string;
}

export interface SelectionRange {
  start: number;
  end: number;
}

export interface PresetSystemPrompt {
  id: string;
  name: string;
  prompt: string;
}

export interface OutputFormat {
  id: string;
  name: string;
} 