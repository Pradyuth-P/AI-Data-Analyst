import React, { useState, useEffect, useRef } from 'react';
import { useDatasetStore } from '../store/datasetStore';
import api from '../services/api';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Sparkles,
  Database,
  Grid,
  Bot,
  User,
  ArrowRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import Plotly from 'plotly.js-dist-min';

// Inline Custom Plotly component to render chart from JSON
const PlotlyChart: React.FC<{ data: any; elementId: string }> = ({ data, elementId }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mountRef.current && data) {
      try {
        // Clear previous plot contents
        mountRef.current.innerHTML = '';
        
        // Setup styled dark-mode layouts to override if needed
        const layout = {
          ...data.layout,
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor: 'rgba(0,0,0,0)',
          font: { color: '#cbd5e1', family: 'Plus Jakarta Sans, sans-serif' },
          autosize: true,
          margin: { t: 40, r: 20, l: 40, b: 40 }
        };
        
        Plotly.newPlot(elementId, data.data, layout, {
          responsive: true,
          displayModeBar: true,
          toImageButtonOptions: {
            format: 'png',
            filename: 'ai_analyst_chart',
            height: 500,
            width: 700,
            scale: 2
          }
        });
      } catch (err) {
        console.error("Failed rendering plotly chart", err);
      }
    }
  }, [data, elementId]);

  return <div ref={mountRef} id={elementId} className="w-full min-h-[350px] bg-slate-950/40 border border-slate-900 rounded-2xl p-2" />;
};

export const AIChat: React.FC = () => {
  const { activeDataset } = useDatasetStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [aiProvider, setAiProvider] = useState('gemini');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    "Show statistical description table",
    "Create a distribution chart of the data",
    "What is the correlation between columns?",
    "Detect outliers and print their rows",
    "What insights can we gather from this data?"
  ];

  useEffect(() => {
    if (activeDataset) {
      loadThreads();
    }
  }, [activeDataset]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  useEffect(() => {
    // Scroll chat list to bottom on message load
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadThreads = async () => {
    if (!activeDataset) return;
    setIsLoadingThreads(true);
    try {
      const response = await api.get(`/chat/conversations?dataset_id=${activeDataset.id}`);
      setConversations(response.data);
      if (response.data.length > 0) {
        setActiveConvId(response.data[0].id);
      } else {
        // Auto create first conversation thread
        createThread("Workspace Chat");
      }
    } catch (err) {
      console.error("Failed to load threads", err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const createThread = async (title: string) => {
    if (!activeDataset) return;
    try {
      const response = await api.post('/chat/conversations', {
        dataset_id: activeDataset.id,
        title
      });
      setConversations([response.data, ...conversations]);
      setActiveConvId(response.data.id);
    } catch (err) {
      console.error("Failed to create thread", err);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const response = await api.get(`/chat/conversations/${threadId}`);
      setMessages(response.data.messages);
    } catch (err) {
      console.error("Failed loading messages", err);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeConvId || !text.trim() || isSending) return;
    
    setInputText('');
    setIsSending(true);
    
    // Add user message locally for responsive UI
    const tempUserMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const response = await api.post(`/chat/conversations/${activeConvId}/message`, {
        content: text,
        ai_provider: aiProvider
      });
      
      // Replace last user message and append assistant
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMsg.id);
        return [...filtered, tempUserMsg, response.data];
      });
    } catch (err) {
      console.error("Failed executing message send", err);
      // Append an error message from assistant
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: The sandbox compilation run encountered an exception. Details: ${err}`,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  if (!activeDataset) {
    return (
      <div className="max-w-5xl mx-auto w-full flex flex-col items-center justify-center py-20 text-center glass-panel rounded-3xl p-10">
        <MessageSquare size={48} className="text-slate-700 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-slate-300">No active workspace loaded</h3>
        <p className="text-xs text-slate-500 mt-2 font-medium">
          Please upload or select a dataset from the top navigation dropdown to ask questions.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 h-auto lg:h-[calc(100vh-140px)]">
      
      {/* Threads list sidebar */}
      <div className="w-full lg:w-64 glass-panel rounded-3xl p-4 flex flex-col justify-between shrink-0 h-fit lg:h-full">
        <div>
          <button
            onClick={() => createThread(`Chat ${conversations.length + 1}`)}
            className="w-full border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5 text-blue-400 font-bold py-2.5 px-4 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer mb-6"
          >
            New Thread
          </button>
          
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 px-2">Thread history</h4>
          
          <div className="space-y-1 overflow-y-auto max-h-[400px]">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConvId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold truncate transition-colors ${
                  activeConvId === c.id 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                    : 'text-slate-400 hover:bg-slate-900/40 border border-transparent'
                }`}
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-slate-900/30 rounded-2xl border border-slate-950 mt-4">
          <label className="block text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">AI Engine Switcher</label>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value)}
            className="w-full bg-slate-950 border border-slate-900 text-slate-300 rounded-xl px-2.5 py-1 text-[10px] font-bold focus:outline-none cursor-pointer"
          >
            <option value="gemini">Google Gemini API (Default)</option>
            <option value="openai">OpenAI GPT-4</option>
            <option value="groq">Groq Mixtral</option>
          </select>
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 glass-panel rounded-3xl p-6 flex flex-col justify-between h-[600px] lg:h-full relative overflow-hidden">
        
        {/* Messages list */}
        <div className={`flex-1 overflow-y-auto mb-6 pr-2 max-w-3xl mx-auto w-full flex flex-col ${messages.length === 0 ? 'justify-center' : 'space-y-6'}`}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-6 py-8">
              <Bot size={44} className="text-blue-500 mb-4 animate-pulse" />
              <h3 className="text-lg font-bold text-slate-200">Meet your Data Assistant</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed font-semibold">
                Ask anything about '{activeDataset.filename}'. The assistant will write Pandas code, execute it on standard arrays, and plot insights.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div 
                key={m.id} 
                className={`flex gap-4 p-4 rounded-3xl border ${
                  m.role === 'user' 
                    ? 'bg-slate-900/40 border-slate-800 ml-12 self-end flex-row-reverse' 
                    : 'bg-blue-600/5 border-blue-500/10 mr-12'
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                  m.role === 'user' 
                    ? 'bg-slate-800 border-slate-700 text-slate-300' 
                    : 'bg-blue-600/10 border-blue-500/20 text-blue-400'
                }`}>
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4 overflow-hidden text-left">
                  {/* Message body */}
                  <div className="text-xs leading-relaxed text-slate-300 font-medium whitespace-pre-wrap">
                    {m.content}
                  </div>

                  {/* Message Table (tabular data) */}
                  {m.table_data && m.table_data.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Grid size={12} className="text-blue-500" />
                        Tabular Summary ({m.table_data.length} records)
                      </h5>
                      <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/40 max-h-[200px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-slate-950 text-slate-500 font-semibold border-b border-slate-900 uppercase">
                              {Object.keys(m.table_data[0]).map((k) => (
                                <th key={k} className="p-3">{k}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900">
                            {m.table_data.map((row: any, rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-slate-900/30">
                                {Object.values(row).map((v: any, cIdx: number) => (
                                  <td key={cIdx} className="p-3 font-semibold text-slate-300">
                                    {typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Message Chart (Plotly json) */}
                  {m.chart_data && (
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <TrendingUp size={12} className="text-blue-500" />
                        Interactive Chart Visualizer
                      </h5>
                      <PlotlyChart data={m.chart_data} elementId={`chart-${m.id}`} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {/* Sending Indicator */}
          {isSending && (
            <div className="flex gap-4 p-4 rounded-3xl mr-12 bg-blue-600/5 border border-blue-500/10">
              <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Loader2 className="animate-spin" size={14} />
              </div>
              <div className="flex-1 text-xs text-slate-400 font-medium py-1.5">
                AI Agent is analyzing dataset schema and compiling code sandbox variables...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* suggestion chips for empty chat or help */}
        {messages.length === 0 && (
          <div className="mb-4 max-w-3xl mx-auto w-full">
            <h5 className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-1 text-center">Quick exploration starters</h5>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  className="px-3 py-1.5 rounded-full border border-slate-800 hover:border-blue-500/30 bg-slate-900/30 hover:bg-blue-500/5 text-[10px] font-bold text-slate-400 hover:text-blue-400 cursor-pointer transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input box */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }} 
          className="relative flex items-center max-w-3xl mx-auto w-full"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            placeholder="Query details: 'Show category contributions' or 'Highlight revenue drops'..."
            className="w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl pl-5 pr-14 py-4 text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="absolute right-3 p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </form>

      </div>
    </div>
  );
};
