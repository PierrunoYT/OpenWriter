'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/app/providers';
import Chat from './components/Chat';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import AppControls from '../../components/controls/AppControls';

// Define types for models
interface Model {
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

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function EditorPage() {
  const { theme } = useTheme();
  const [content, setContent] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('anthropic/claude-3.7-sonnet');
  const [enableCaching, setEnableCaching] = useState<boolean>(true);
  const [useStructuredOutput, setUseStructuredOutput] = useState<boolean>(false);
  const [outputFormat, setOutputFormat] = useState<string>('text');
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);
  const [systemPrompt, setSystemPrompt] = useState<string>('You are a helpful writing assistant.');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('default');
  const [showSystemPrompt, setShowSystemPrompt] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  // Removed unused state variables: copyState, setCopyState
  
  // Conversation management
  interface Conversation {
    id: number;
    title: string;
    model?: string;
    system_prompt?: string;
    created_at?: string;
  }
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  // State is used in createConversation but not directly in JSX
  const [, setNewConversationTitle] = useState<string>('');
  // State is used in createConversation but not directly in JSX
  const [, setIsCreatingConversation] = useState<boolean>(false);

  // Fetch all conversations
  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      
      const data = await response.json();
      console.log('Fetched conversations:', data);
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  // Fetch a specific conversation
  const fetchConversation = async (id: number) => {
    try {
      const response = await fetch(`/api/conversations/${id}`);
      if (!response.ok) throw new Error('Failed to fetch conversation');
      
      const data = await response.json();
      
      // Debug log
      console.log('Conversation data received:', data);
      
      // Fetch messages for this conversation
      const messagesResponse = await fetch(`/api/conversations/${id}/messages`);
      if (!messagesResponse.ok) throw new Error('Failed to fetch conversation messages');
      
      const messagesData = await messagesResponse.json();
      console.log('Messages in the conversation:', messagesData);
      
      // Update UI with conversation data
      setCurrentConversation(id);
      setChatMessages(messagesData.messages ? messagesData.messages.map((msg: {role: string; content: string}) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })) : []);
      
      // Update other state from the conversation
      if (data.conversation.system_prompt) {
        const loadedPrompt = data.conversation.system_prompt;
        setSystemPrompt(loadedPrompt);
        
        // Check if the loaded prompt matches any preset
        const matchingPreset = presetSystemPrompts.find(p => p.prompt === loadedPrompt);
        if (matchingPreset) {
          console.log(`Loaded conversation uses preset: ${matchingPreset.name}`);
          setSelectedPromptId(matchingPreset.id);
        } else {
          console.log('Loaded conversation uses custom prompt');
          setSelectedPromptId('custom');
        }
      }
      
      if (data.conversation.model) {
        setSelectedModel(data.conversation.model);
      }
      
    } catch (error) {
      console.error(`Error fetching conversation ${id}:`, error);
    }
  };

  // Handle sending a chat message
  const handleChatSend = async () => {
    if (!content.trim()) return;
    
    // Add user message to chat
    const userMessage: ChatMessage = { role: 'user', content };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setContent(''); // Clear input
    setIsLoading(true);

    try {
      let conversationId = currentConversation;

      // Always create a new conversation if we don't have one
      if (!conversationId) {
        console.log('No active conversation, creating a new one');
        const defaultTitle = userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? '...' : '');
        conversationId = await createConversation(defaultTitle);
        console.log('Created new conversation with ID:', conversationId);
        if (conversationId) {
          setCurrentConversation(conversationId);
          // Refresh the conversations list to show the new one
          await fetchConversations();
        }
      }

      // Save user message to the conversation
      console.log('About to save user message, conversation ID:', conversationId);
      if (conversationId) {
        await saveMessage('user', userMessage.content);
      } else {
        console.error('Failed to establish conversation ID before saving message');
      }

      // Add a temporary "thinking" message that will be replaced
      const thinkingMessage: ChatMessage = { 
        role: 'assistant', 
        content: 'Thinking...' 
      };
      setChatMessages([...updatedMessages, thinkingMessage]);
      
      try {
        // Prepare all messages for context
        const messagesForAPI = [
          { role: 'system', content: systemPrompt },
          ...updatedMessages // Include conversation history
        ];
        
        console.log('Sending chat message with system prompt and user message');
        
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://openwriter.app',
            'X-Title': 'OpenWriter'
          },
          body: JSON.stringify({
            messages: messagesForAPI,
            model: selectedModel,
            temperature: 0.7,
            max_tokens: 1000
          }),
        });
        
        // Handle various error cases
        if (!response.ok) {
          console.error(`API error: ${response.status}`);
          
          // Replace the "thinking" message with an error message
          const errorMessages: ChatMessage[] = [...updatedMessages, { 
            role: 'assistant', 
            content: `I'm sorry, but there was an error communicating with the AI (${response.status}). Please try again.` 
          } as ChatMessage];
          setChatMessages(errorMessages);
          return;
        }
        
        // Parse the response
        let data;
        try {
          const textResponse = await response.text();
          data = JSON.parse(textResponse);
        } catch (parseError) {
          console.error('Error parsing API response:', parseError);
          
          // Replace the "thinking" message with an error message
          const errorMessages: ChatMessage[] = [...updatedMessages, { 
            role: 'assistant', 
            content: 'Sorry, I received an invalid response from the server. Please try again.' 
          } as ChatMessage];
          setChatMessages(errorMessages);
          return;
        }
        
        // Get the assistant's response
        if (data.choices && data.choices.length > 0) {
          const messageContent = data.choices[0].message?.content || '';
          
          // Replace the "thinking" message with the actual response
          // Create the assistant message
          const assistantMessage: ChatMessage = { 
            role: 'assistant', 
            content: messageContent 
          };
          
          // Update the chat UI
          const responseMessages = [...updatedMessages, assistantMessage];
          setChatMessages(responseMessages);
          
          // Save the assistant message to the conversation
          if (currentConversation) {
            console.log(`Saving assistant response to conversation ${currentConversation}`);
            await saveMessage('assistant', messageContent);
          } else {
            console.error('No active conversation ID when trying to save assistant response');
          }
        } else {
          console.error('Unexpected API response format:', data);
          
          // Replace the "thinking" message with an error message
          const errorMessages: ChatMessage[] = [...updatedMessages, { 
            role: 'assistant', 
            content: 'I received an unexpected response format. Please try again or contact support.' 
          } as ChatMessage];
          setChatMessages(errorMessages);
        }
      } catch (error) {
        console.error('Error sending chat message:', error);
        
        // Replace the "thinking" message with an error message
        const errorMessages: ChatMessage[] = [...updatedMessages, { 
          role: 'assistant', 
          content: 'Sorry, there was an error sending your message. Please try again.' 
        } as ChatMessage];
        setChatMessages(errorMessages);
      } finally {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in conversation/message setup:', error);
    }
    
  };

  // Create a new conversation
  const createConversation = async (title: string) => {
    try {
      setIsCreatingConversation(true);
      console.log(`Creating new conversation with title: ${title}`);
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          model: selectedModel,
          systemPrompt
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create conversation: ${errorData.error || response.status}`);
      }
      
      const data = await response.json();
      console.log(`Conversation created with ID:`, data.id);
      
      // Set as current conversation immediately
      const newConversationId = Number(data.id);
      setCurrentConversation(newConversationId);
      
      // Clear messages for new conversation
      setChatMessages([]);
      
      // Refresh conversations list
      await fetchConversations();
      
      setNewConversationTitle('');
      setIsCreatingConversation(false);
      
      return newConversationId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      setIsCreatingConversation(false);
      throw error;
    }
  };
  
  // Delete a conversation
  const deleteConversation = async (id: number) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete conversation');
      
      // If we deleted the current conversation, clear it
      if (currentConversation === id) {
        setCurrentConversation(null);
        setChatMessages([]);
      }
      
      // Refresh conversations
      await fetchConversations();
    } catch (error) {
      console.error(`Error deleting conversation ${id}:`, error);
    }
  };
  
  // Delete all conversations
  const deleteAllConversations = async () => {
    if (!confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete all conversations');
      
      // Clear current state
      setCurrentConversation(null);
      setChatMessages([]);
      
      // Refresh conversations
      await fetchConversations();
    } catch (error) {
      console.error('Error deleting all conversations:', error);
    }
  };
  
  // Save a message to the current conversation
  const saveMessage = async (role: string, content: string) => {
    if (!currentConversation) {
      console.error('Attempted to save message without active conversation');
      return;
    }
    
    try {
      console.log(`Saving ${role} message to conversation ${currentConversation}`);
      const response = await fetch(`/api/conversations/${currentConversation}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log(`Message saved successfully:`, data);
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };
  
  // Clear chat messages (and optionally delete conversation)
  // This function is defined but not currently used in the UI
  // Removing it since it's unused
  // If needed in the future, it can be reimplemented


  const handleGenerateContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://openwriter.app',
          'X-Title': 'OpenWriter'
        },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: useStructuredOutput 
                ? `${systemPrompt} Format your response as ${outputFormat}.` 
                : systemPrompt
            },
            { role: 'user', content }
          ],
          model: selectedModel,
          temperature: 0.7,
          max_tokens: 1000,
          response_format: useStructuredOutput && outputFormat === 'json' ? {
            type: 'json_object'
          } : undefined
        }),
      });

      // Check if the response is ok
      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        setAiResponse(`Error: The API returned a ${response.status} status code. Please try again.`);
        return;
      }
      
      // Safely parse the JSON response
      let data;
      try {
        const textResponse = await response.text();
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        setAiResponse('Error: Failed to parse the API response. Please try again.');
        return;
      }
      
      // Handle both OpenAI SDK response format and direct API response format
      if (data.choices && data.choices.length > 0) {
        // Could be either format, check for object vs string content
        let messageContent = data.choices[0].message?.content || data.choices[0].message;
        
        // For JSON responses, format them nicely
        if (typeof messageContent === 'object') {
          messageContent = JSON.stringify(messageContent, null, 2);
        } else if (useStructuredOutput && outputFormat === 'json') {
          // Try to parse it as JSON if we're expecting JSON
          try {
            const jsonObject = JSON.parse(messageContent);
            messageContent = JSON.stringify(jsonObject, null, 2);
          } catch {
            // Not valid JSON, leave as is
          }
        }
        
        setAiResponse(messageContent);
        
        // Log caching info if available
        if (data.usage?.cache_discount !== undefined) {
          console.log(`Cache usage info - Discount: ${data.usage.cache_discount}`);
          
          // Add caching info to response if available
          if (data.usage.cache_discount > 0) {
            setAiResponse(prev => 
              prev + `\n\n---\n*Used cached prompt: saved ${Math.round(data.usage.cache_discount * 100)}% on token costs*`
            );
          }
        }
      } else if (data.content) {
        // Alternative format that might be returned
        setAiResponse(data.content);
      } else {
        console.error('Unexpected API response format:', data);
        setAiResponse('Failed to parse AI response. Please try again.');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setAiResponse('An error occurred while generating content.');
    } finally {
      setIsLoading(false);
    }
  };

  // Direct API URL to OpenRouter
  const API_BASE_URL = 'https://openrouter.ai/api/v1';
  
  // Load conversations and restore system prompt on initial render
  useEffect(() => {
    fetchConversations();
    
    // Check if we have a stored system prompt in localStorage
    const storedPrompt = localStorage.getItem('systemPrompt');
    const storedPromptId = localStorage.getItem('selectedPromptId');
    
    if (storedPrompt) {
      console.log('Restoring system prompt from localStorage');
      setSystemPrompt(storedPrompt);
      
      if (storedPromptId) {
        console.log(`Restoring prompt preset: ${storedPromptId}`);
        setSelectedPromptId(storedPromptId);
      } else {
        setSelectedPromptId('custom');
      }
    }
  }, []);
  
  // Fetch available models from OpenRouter
  useEffect(() => {
    // Set loading state
    setLoadingModels(true);
    
    // Fetch models from OpenRouter
    const fetchModels = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://openwriter.app',
            'X-Title': 'OpenWriter'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
          // Transform the models to match our interface
          const availableModels = data.data.map((model: {
            id: string;
            name?: string;
            description?: string;
            context_length?: number;
            pricing?: { prompt: number; completion: number };
            features?: string[];
          }) => ({
            id: model.id,
            name: model.name || model.id,
            description: model.description || '',
            context_length: model.context_length,
            pricing: model.pricing,
            features: model.features || [],
            supportsStructured: model.features?.includes('json_object') || false
          }));
          
          console.log(`Fetched ${availableModels.length} models from OpenRouter`);
          setModels(availableModels);
          
          // Set default model to Claude 3.7 Sonnet if available, otherwise first model
          const defaultModel = availableModels.find((m: Model) => m.id === 'anthropic/claude-3.7-sonnet') || availableModels[0];
          if (defaultModel) {
            setSelectedModel(defaultModel.id);
          }
        } else {
          throw new Error('Invalid model data format');
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        
        // Fallback to fixed models
        const fixedModels = [
          { 
            id: 'anthropic/claude-3.7-sonnet', 
            name: 'Claude 3.7 Sonnet', 
            description: 'Latest Claude model with excellent capabilities',
            context_length: 200000,
            pricing: { prompt: 3.00, completion: 15.00 },
            features: ['multimodal'],
            supportsStructured: false
          },
          { 
            id: 'anthropic/claude-3-haiku', 
            name: 'Claude 3 Haiku', 
            description: 'Fast and efficient Claude model',
            context_length: 200000,
            pricing: { prompt: 0.25, completion: 1.25 },
            features: ['multimodal'],
            supportsStructured: false
          },
          { 
            id: 'anthropic/claude-3-sonnet', 
            name: 'Claude 3 Sonnet', 
            description: 'Balanced Claude model with great capabilities',
            context_length: 200000,
            pricing: { prompt: 3.00, completion: 15.00 },
            features: ['multimodal'],
            supportsStructured: false
          },
          { 
            id: 'openai/gpt-4o', 
            name: 'GPT-4o', 
            description: 'Latest OpenAI model with excellent capabilities',
            context_length: 128000,
            pricing: { prompt: 5.00, completion: 15.00 },
            features: ['multimodal', 'json_object'],
            supportsStructured: true
          }
        ];
        
        console.log('Using fallback models');
        setModels(fixedModels);
        setSelectedModel('anthropic/claude-3.7-sonnet');
      } finally {
        setLoadingModels(false);
      }
    };
    
    fetchModels();
  }, []);
  
  // No fallback models
  
  // No need for fallback timeout since we're using a fixed model
  
  // Common output formats
  const outputFormats = [
    { id: 'text', name: 'Text (Default)' },
    { id: 'email', name: 'Email' },
    { id: 'summary', name: 'Summary' },
    { id: 'bullet-points', name: 'Bullet Points' },
    { id: 'json', name: 'JSON' },
    { id: 'markdown', name: 'Markdown' },
  ];
  
  // Preset system prompts
  const presetSystemPrompts = [
    { id: 'default', name: 'Default Assistant', prompt: 'You are a helpful writing assistant.' },
    { id: 'social-media', name: 'Social Media Posts', prompt: 'You are an elite social media content strategist. Create platform-perfect posts for multiple platforms that maximize engagement and conversion. For Twitter/X, craft punchy 280-character messages with strategic hashtags and viral hooks. For LinkedIn, develop thought leadership content with data-backed insights and professional CTAs. For Instagram, create visually descriptive captions with emotional resonance and trendy hashtag clusters. For TikTok/YouTube Shorts, draft compelling hooks and conversational scripts under 30 seconds. For Facebook, balance personal storytelling with shareable value. For Pinterest, create descriptive, keyword-rich pins with clear CTAs. For Reddit, craft authentic, community-specific content following subreddit rules. For Threads, design conversation starters that encourage replies. Always optimize for both algorithm visibility and authentic audience connection while adapting tone, length, and format to each platform\'s unique characteristics.' },
    { id: 'email', name: 'Email Writing', prompt: 'You are a conversion-focused email copywriting expert with 10+ years experience. Craft high-performing cold outreach, follow-ups, newsletters, and sales sequences. Create subject lines with 60%+ open rates using curiosity, value, or urgency triggers. Develop persuasive body copy with clear value propositions, social proof, and objection handling. Design strategic CTAs with psychological triggers. Follow email deliverability best practices with personalization tokens while maintaining optimal text-to-link ratios and mobile-responsive formatting.' },
    { id: 'business', name: 'Business Documents', prompt: 'You are a Harvard-trained business documentation specialist. Create executive-grade proposals, reports, and summaries that drive decision-making and showcase professionalism. Structure documents with impeccable C-suite friendly formatting including properly segmented executive summaries, strategic recommendations, and clear ROI projections. Use data visualization best practices and precise business terminology. Maintain authoritative tone with strategic positioning of key insights and implementation roadmaps that anticipate stakeholder questions and objections.' },
    { id: 'marketing', name: 'Marketing Copy', prompt: 'You are a world-class marketing copywriter who consistently produces conversion-optimized content. Create compelling marketing assets including landing pages (with 15%+ conversion rates), ad copy (with CTRs double the industry average), and sales emails. Use proven persuasion frameworks (AIDA, PAS, BAB), create irresistible value propositions, and leverage scarcity/urgency psychological triggers. Write copy that addresses prospect awareness stages (problem aware, solution aware, product aware), transforms features into concrete benefits, and creates emotional connection while always maintaining clear paths to conversion.' },
    { id: 'blog', name: 'Blog Content', prompt: 'You are an SEO-optimized blog content strategist with expertise in creating high-ranking, shareable articles. Create comprehensive content with proven engagement metrics, featuring riveting introductions that reduce bounce rates, strategic H2/H3 headings for both readers and search engines, and scannable formatting with optimal paragraph length. Incorporate primary and secondary keywords naturally while maintaining E-E-A-T standards. Use the optimal content structure for the specific post type (how-to, listicle, ultimate guide, case study, opinion piece) and include internal linking opportunities, custom image suggestions, and meta description recommendations.' },
    { id: 'resume', name: 'Resume & Cover Letters', prompt: 'You are an elite resume writer and career coach who has helped 10,000+ professionals secure interviews at top companies. Create ATS-optimized resumes and compelling cover letters that achieve 80%+ interview rates. Use powerful accomplishment statements with the PAR formula (Problem-Action-Result) focusing on quantifiable achievements and direct business impact. Strategically incorporate both soft and technical skills tailored to specific job descriptions with industry-appropriate keywords and formatting. For cover letters, craft compelling narratives that showcase authentic interest, cultural fit, and specific value the candidate brings to the organization.' },
    { id: 'technical', name: 'Technical Documentation', prompt: 'You are a Silicon Valley-trained technical documentation expert specializing in accessible explanations of complex systems. Create comprehensive documentation that both beginners and experts find valuable. Use precise technical terminology while providing clear context and definitions where needed. Structure content with progressive disclosure (basic concepts first, advanced applications later) and include practical code examples, troubleshooting sections, and visual representation suggestions. Anticipate edge cases and use consistent terminology with a comprehensive glossary approach. Ensure documentation enables users to both understand concepts and immediately implement solutions.' },
    { id: 'academic', name: 'Academic Writing', prompt: 'You are a published academic researcher with expertise in scholarly writing across disciplines. Create research papers and academic content that would pass rigorous peer review. Maintain formal academic tone with discipline-appropriate terminology, proper citation formatting (APA, MLA, Chicago), and logical argument structure. Develop comprehensive literature reviews, clear methodology descriptions, and evidence-based conclusions. Avoid logical fallacies, maintain objective stance on controversial topics, and follow academic integrity standards. Structure papers with proper abstract formatting, keyword optimization, clear research questions/hypotheses, and implications for future research.' },
    { id: 'creative', name: 'Creative Writing', prompt: 'You are a bestselling fiction author and creative writing instructor. Create captivating creative content across formats (short stories, novel chapters, poetry, scripts) that emotionally resonates with readers. Develop three-dimensional characters with clear motivations, flaws, and growth arcs. Craft immersive settings with sensory-rich descriptions that enhance rather than distract from the narrative. Structure plots with proper pacing, tension building, and satisfying development. Master dialogue that reveals character while advancing the plot, employing subtext and distinctive voice. Use literary techniques (foreshadowing, symbolism, motifs) purposefully while following genre-specific conventions when appropriate.' },
    { id: 'personal', name: 'Personal Correspondence', prompt: 'You are a sensitive, articulate communication expert who helps people express meaningful sentiments for important personal occasions. Create thoughtful, authentic personal messages including thank you notes, invitations, congratulations, condolences, and apologies. Craft content that balances sincerity with appropriate tone for the relationship and occasion. Include specific personal details and shared memories that demonstrate genuine connection, while following proper etiquette standards. For formal occasions, maintain appropriate conventions while preserving authentic voice. For emotional communications, strike the balance between honesty and constructiveness, particularly for difficult conversations.' },
    { id: 'sales', name: 'Sales Copy', prompt: 'You are a sales copy virtuoso who has generated $100M+ in revenue through high-converting sales messages. Create persuasive sales pitches, proposals, and follow-ups with proven conversion psychology. Craft powerful hooks that immediately grab attention and qualify prospects. Develop comprehensive objection handling that preemptively addresses customer concerns. Create irresistible offers with clear value propositions, strategically positioned social proof, and risk-reversal guarantees. Master the art of creating urgency without manipulation, and design conversion-focused CTAs with optimal placement and psychology triggers. For each sales document type, follow industry-specific best practices while maintaining a confident, trustworthy tone.' },
    { id: 'customer-service', name: 'Customer Service', prompt: 'You are a customer experience communication strategist who has helped Fortune 500 companies achieve 95%+ satisfaction ratings. Create professional support responses for various scenarios: complaint resolution, technical assistance, policy explanations, and retention conversations. Master the perfect balance of empathy and efficiency with proven frameworks (acknowledge-align-assure for complaints, clarity-solution-verification for technical issues). Maintain brand voice while de-escalating emotional situations and setting realistic expectations. Include appropriate solution options with clear next steps, follow-up protocols, and proactive additional assistance. For sensitive situations, incorporate compliance language while maintaining a human, helpful tone.' },
    { id: 'presentation', name: 'Presentation Content', prompt: 'You are a TED-level presentation specialist who has developed keynote content for world-renowned speakers. Create compelling presentation content including slide text, speaker notes, and narrative structure that captivates audiences while driving key messages. Master the art of presentation storytelling with attention-grabbing openings, strategic tension building, and memorable closings. Create slide content following the 6x6 rule (max 6 points, 6 words each) with high-impact visuals suggestions. Develop speaker notes with timing guidance, emphasis points, audience engagement techniques, and smooth transitions. Tailor content for specific presentation contexts (sales pitch, executive briefing, conference keynote, training session) with appropriate tone, technical depth, and persuasion techniques.' },
    { id: 'legal', name: 'Legal & Compliance', prompt: 'You are a specialized legal writing expert with background in contract law, compliance documentation, and legal communication. Create precise legal content including policy documents, terms of service, compliance explanations, and legal summaries. Use legally accurate terminology while maintaining appropriate definitional clarity. Structure documents with proper legal hierarchies (articles, sections, subsections) and reference conventions. Balance comprehensive coverage with readability, using plain language principles where appropriate without sacrificing legal precision. Include proper conditional statements, disclaimers, and jurisdictional references as needed. For specialized areas (privacy, employment, intellectual property), incorporate relevant statutory and regulatory frameworks while maintaining compliance with current legal standards.' },
    { id: 'instructional', name: 'Instructional Content', prompt: 'You are an instructional design expert with expertise in creating learning materials with 90%+ knowledge retention rates. Develop exceptional how-to guides, tutorials, and training materials using research-backed learning principles. Structure content with clear learning objectives, logical skill building sequence, and appropriate difficulty progression. Incorporate the 4C instructional design model: Conceptual understanding, Concrete examples, Corrective feedback points, and Contextual application scenarios. Use consistent, scannable formatting with strategic repetition of key concepts. Include knowledge-check components, troubleshooting sections, and real-world application guidance. Write in an encouraging tone that builds learner confidence while anticipating and addressing common misconceptions and learning obstacles.' },
    { id: 'video-scripts', name: 'Video Scripts', prompt: 'You are an award-winning video scriptwriter who has created viral content for major brands and top YouTubers. Create engaging video scripts optimized for specific formats: YouTube tutorials, brand stories, explainer videos, promotional content, and advertisements. Master opening hooks that prevent skip-through (first 5 seconds), with B-roll and visual direction suggestions integrated throughout. Structure content with proven retention patterns including pattern interrupts every 40-60 seconds. Balance educational substance with entertainment value using appropriate pacing, humor, and storytelling techniques. Include camera direction, graphics suggestions, and transition guidance in a two-column script format (visual|audio). Tailor language for spoken delivery with appropriate breath points, emphasis opportunities, and natural speech patterns.' },
    { id: 'website-copy', name: 'Website Copy', prompt: 'You are an elite website copywriter who has increased conversion rates by 300%+ for major brands. Create compelling website content for critical pages: homepage, about, services/products, and contact sections. Craft powerful above-the-fold content with irresistible value propositions and clear user direction. Develop strategic page structures following F-pattern and Z-pattern reading behaviors with optimal headline hierarchy. Balance SEO keyword incorporation with persuasive storytelling and brand personality. Create scannable content blocks with conversion-focused microcopy and user-journey appropriate CTAs. Maintain consistent brand voice while adapting to each page\'s specific function in the conversion funnel. Include meta title and description recommendations with click-optimized language and keyword placement.' },
    { id: 'product-content', name: 'Product Content', prompt: 'You are a conversion-focused product content expert who has helped launch $10M+ in successful products. Create compelling product descriptions, comparison content, and review frameworks that drive purchase decisions. Craft product titles and descriptions with strategic keyword incorporation and buying-trigger language. Transform technical specifications into concrete benefit statements using the "features-advantages-benefits" framework. Incorporate sensory language and ownership scenarios that help customers visualize product use. Develop comparison content that fairly positions products while strategically highlighting competitive advantages. Address common purchasing objections proactively and include social proof elements. Use appropriate terminology for the product category and target audience while maintaining authoritative expertise that builds purchase confidence.' },
    { id: 'interview', name: 'Interview Q&A', prompt: 'You are a career advancement strategist with expertise in interview preparation that has helped candidates secure offers at the world\'s most competitive companies. Create comprehensive interview questions and answers for specific industries, roles, and experience levels. For questions, develop behavioral, technical, and situational formats that effectively assess candidate fit. For answers, implement the enhanced STAR-P framework (Situation, Task, Action, Result, Plus-learning) with specific metrics and outcomes. Structure responses with optimal length (30-90 seconds) and strategic positioning of strengths. Incorporate industry-specific terminology, technical concepts, and success signals appropriate for the seniority level. Balance authentic personality with professional presentation, and include guidance for addressing challenging questions, employment gaps, or potential red flags.' },
    { id: 'meeting-notes', name: 'Meeting Summaries', prompt: 'You are an executive-level meeting documentation specialist trained in the Cornell note-taking system and strategic communication. Create impeccably organized meeting summaries and minutes that transform lengthy discussions into actionable intelligence. Structure content with a clear executive summary, key discussion points, and decision log. Develop action items with specific assignees, deadlines, and success criteria. Use objective, clear language that maintains important context and nuance while eliminating non-essential content. Implement strategic information hierarchies that highlight critical business implications and risk factors. Include follow-up frameworks, resource requirements, and accountability tracking. Tailor documentation style based on meeting type (decision-making, brainstorming, status update, strategic planning) while maintaining comprehensive but concise coverage that serves both participants and non-attendees.' },
  ];

  return (
    <div 
      className={`min-h-screen h-screen overflow-hidden flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 text-slate-800 dark:text-slate-100 ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}
      data-theme={theme}>
      <Header 
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        loadingModels={loadingModels}
      />

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">{showSidebar && (
          <Sidebar
            conversations={conversations}
            currentConversation={currentConversation}
            fetchConversation={fetchConversation}
            deleteConversation={deleteConversation}
            deleteAllConversations={deleteAllConversations}
            setCurrentConversation={setCurrentConversation}
            setChatMessages={setChatMessages}
            selectedPromptId={selectedPromptId}
          />
        )}

        
        {/* Main Content Area */}
        <main className={`flex-1 overflow-hidden p-4 ${showSidebar ? 'ml-0' : ''} flex flex-col h-full`}>
          <AppControls
            models={models}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            loadingModels={loadingModels}
            setUseStructuredOutput={setUseStructuredOutput}
            showSystemPrompt={showSystemPrompt}
            setShowSystemPrompt={setShowSystemPrompt}
            enableCaching={enableCaching}
            setEnableCaching={setEnableCaching}
            useStructuredOutput={useStructuredOutput}
            outputFormat={outputFormat}
            setOutputFormat={setOutputFormat}
            handleGenerateContent={handleGenerateContent}
            isLoading={isLoading}
            content={content}
            outputFormats={outputFormats}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            selectedPromptId={selectedPromptId}
            setSelectedPromptId={setSelectedPromptId}
            presetSystemPrompts={presetSystemPrompts}
          />

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden h-full">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700 h-full">
              <Chat
                content={content}
                setContent={setContent}
                aiResponse={aiResponse}
                setAiResponse={setAiResponse}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                selectedModel={selectedModel}
                systemPrompt={systemPrompt}
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                currentConversation={currentConversation}
                setCurrentConversation={setCurrentConversation}
                saveMessage={saveMessage}
                createConversation={createConversation}
                API_BASE_URL={API_BASE_URL}
                handleChatSend={handleChatSend}
                handleGenerateContent={handleGenerateContent}
              />
            </div>
          </div>
        </main>
      </div>
      
      {/* Footer */}
      <footer className={`py-2 text-center text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} flex-shrink-0`}>
        <p>Powered by OpenRouter • Using {selectedModel}</p>
      </footer>
    </div>
  );
}
