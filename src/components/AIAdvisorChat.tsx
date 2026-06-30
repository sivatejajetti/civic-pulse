import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, ArrowRight, HelpCircle, CheckCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export default function AIAdvisorChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: "Namaskar! I am your AI Civic Advisor and Municipal Planner for the City. How can I assist you today with ward planning, infrastructure guidelines, community reports, or civic achievement programs?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Quick suggestion chips
  const suggestions = [
    "How does the AI Autopilot Dispatch loop triage pothole reports?",
    "Explain solid waste management and Beach Road sanitation guidelines.",
    "How can I level up my Citizen Profile impact score from Level 4?",
    "Suggest a public park maintenance action plan for Seethammadhara."
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Map message structure to what backend endpoint expects
      const chatHistory = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/issues/advisor-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textToSend,
          chatHistory
        })
      });

      if (response.ok) {
        const data = await response.json();
        const advisorMsg: Message = {
          id: String(Date.now() + 1),
          role: 'model',
          text: data.response || "I apologize, I encountered a response layout error.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, advisorMsg]);
      } else {
        throw new Error("Chat api request returned " + response.status);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        role: 'model',
        text: "My apologies, I am experiencing temporary connectivity lag with the City servers. Please try again in a few moments.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] min-h-[500px] flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-lg overflow-hidden">
      
      {/* Advisor Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-850 p-4 text-white flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-black text-sm uppercase tracking-wider">AI Municipal Planner & Advisor</h2>
            <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest">Smart Ward Co-Pilot</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-emerald-400 text-[10px] font-bold font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>ONLINE</span>
        </div>
      </div>

      {/* Messages Feed Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 space-y-6">
        
        {/* Render suggestions if user hasn't sent custom prompts yet */}
        {messages.length === 1 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/50 max-w-xl text-xs space-y-2">
              <p className="font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>Suggested Municipal Queries</span>
              </p>
              <p className="text-slate-600 leading-relaxed font-medium">
                Tap on any pre-compiled smart chip below to query the AI Advisor about City infrastructure workflows:
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(s)}
                  className="p-3 text-left bg-white hover:bg-blue-50/20 border border-slate-200/85 hover:border-blue-400 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all cursor-pointer flex items-center justify-between gap-2 shadow-sm"
                >
                  <span>{s}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message elements bubble renderer */}
        <div className="space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className="space-y-1 max-w-[85%]">
                <div 
                  className={`p-3.5 rounded-2xl text-xs shadow-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'user' 
                      ? 'bg-blue-600 text-white font-medium rounded-tr-none' 
                      : 'bg-white border border-slate-250/70 text-slate-800 rounded-tl-none'}`}
                >
                  {msg.text}
                </div>
                <p className={`text-[9px] font-bold text-slate-400 tracking-wide px-1
                  ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  {msg.timestamp}
                </p>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm mt-1 font-mono text-xs font-bold">
                  RJ
                </div>
              )}
            </div>
          ))}

          {/* Thinking Spinner */}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm rounded-tl-none flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

      </div>

      {/* Chat Footer Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Ask AI Advisor about building permission, waste pickup schedules..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50 font-sans"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all font-bold text-xs shadow-md shadow-blue-600/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
}
