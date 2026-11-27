import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface GeneralChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GeneralChat: React.FC<GeneralChatProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const apiKey = localStorage.getItem('ai_novel_studio_apikey') || '';
      const model = localStorage.getItem('ai_novel_studio_model') || '';
      const customBaseUrl = localStorage.getItem('ai_novel_studio_custom_base_url') || '';
      const useChatCompletions = localStorage.getItem('ai_novel_studio_use_chat_completions') === 'true';
      let selectedModels: string[] = [];
      try {
        selectedModels = JSON.parse(localStorage.getItem('ai_novel_studio_selected_models') || '[]');
      } catch (e) {}

      const systemInstruction = `你是一位通用创作助理，可以协助作者处理各种任务、构思灵感、回答问题。你的回答需要专业、有创意。`;

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          model,
          customBaseUrl,
          useChatCompletions,
          selectedModels,
          messages: [...messages, { role: 'user', text: userMessage }],
          systemInstruction
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.text }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: `请求失败: ${data.error || '未知错误'}` }]);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `发生错误: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          drag
          dragConstraints={{ left: -1000, right: 0, top: -1000, bottom: 0 }}
          dragElastic={0.1}
          dragMomentum={false}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[340px] sm:w-[380px] h-[500px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-stone-100 bg-stone-50/50 cursor-move">
        <div className="flex items-center space-x-2 px-1">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-sm text-stone-800">通用助手</h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-500 transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/30">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-stone-400 space-y-3 opacity-80">
            <Bot className="w-12 h-12 text-stone-300" />
            <p className="text-sm text-center">你好！我是你的通用 AI 创作助理。<br/>有关各种灵感、问题，都可以和我讨论。</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-amber-100 text-amber-900 rounded-tr-sm' 
                : 'bg-white border border-stone-200 text-stone-700 rounded-tl-sm shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center space-x-2">
              <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
              <span className="text-xs text-stone-500">正在思考...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-stone-100 bg-white">
        <div className="flex items-end space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入您的问题..."
            className="flex-1 max-h-32 min-h-[44px] text-sm p-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none bg-stone-50"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-stone-400 mt-2 text-center">按 Enter 发送，Shift + Enter 换行</p>
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
