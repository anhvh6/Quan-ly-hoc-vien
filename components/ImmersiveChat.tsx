
import React, { useState, useEffect } from 'react';
import { X, MessageSquare, ChevronRight, MousePointer2, Sparkles, Loader2 } from 'lucide-react';
import { getSuggestedQuestions } from '../services/geminiService';

interface ImmersiveChatProps {
  onClose: () => void;
}

export const ImmersiveChat: React.FC<ImmersiveChatProps> = ({ onClose }) => {
  const [showGuide, setShowGuide] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    // Prevent scrolling when immersive mode is active
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, []);

  const handleOpenSidebar = async () => {
    setShowSidebar(true);
    if (suggestions.length === 0) {
      setLoadingSuggestions(true);
      const data = await getSuggestedQuestions();
      setSuggestions(data);
      setLoadingSuggestions(false);
    }
  };

  const handleDismissGuide = () => {
    setShowGuide(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden animate-in fade-in duration-500">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 via-black to-blue-900/10 pointer-events-none"></div>

      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[100] safe-area-inset-top">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Connection: Active</span>
        </div>
        <button 
          onClick={onClose}
          className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-all active:scale-90 border border-white/20"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main Content Area (16:9) */}
      <div className="relative w-full max-w-[1200px] aspect-video mx-auto shadow-2xl rounded-[2rem] overflow-hidden border border-white/5">
        <iframe 
          src="https://embed.liveavatar.com/v1/6efaef91-58e5-4569-83fc-47eacbf44063?language=vi-VN"
          className="w-full h-full"
          allow="microphone; camera; autoplay; display-capture"
          onLoad={() => {}}
        ></iframe>

        {/* Guide Overlay */}
        {showGuide && (
          <div 
            className="absolute inset-0 bg-white/40 backdrop-blur-md flex items-center justify-center z-50 transition-all cursor-pointer"
            onClick={handleDismissGuide}
          >
            <div className="bg-white/90 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500 animate-pulse-gentle">
              <div className="flex items-center gap-4 text-black">
                <span className="text-3xl font-black">CHỌN</span>
                <div className="relative">
                  <MousePointer2 size={48} className="text-blue-600 animate-gentle-float" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                </div>
                <span className="text-3xl font-black">& BẤM</span>
              </div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">Nhấn vào Mic trong Iframe để bắt đầu nói chuyện</p>
              <button className="px-8 py-3 bg-blue-600 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-700">ĐÃ HIỂU</button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      <button 
        onClick={handleOpenSidebar}
        className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-[70] border-4 border-white/20"
      >
        <MessageSquare size={28} />
      </button>

      {/* AI Companion Sidebar (Slide-in) */}
      {showSidebar && (
        <div className="fixed inset-0 z-[110] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSidebar(false)}></div>
          <div className="w-full max-w-sm bg-white h-full relative z-[120] shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
            <div className="p-8 border-b border-blue-50 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Sparkles size={20} /></div>
                <div>
                  <h4 className="text-sm font-black text-blue-900 uppercase">AI Companion</h4>
                  <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Suggested topics</p>
                </div>
              </div>
              <button onClick={() => setShowSidebar(false)} className="p-2 hover:bg-white rounded-full text-blue-400 transition-colors"><X size={20}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Bạn có thể hỏi chuyên gia các câu hỏi gợi ý sau:</p>
              
              {loadingSuggestions ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                  <span className="text-[10px] font-black text-blue-300 uppercase">Đang tạo gợi ý...</span>
                </div>
              ) : (
                suggestions.map((q, i) => (
                  <div 
                    key={i} 
                    className="p-4 bg-blue-50/50 border border-blue-50 rounded-2xl hover:border-blue-200 hover:bg-white transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <div className="w-5 h-5 bg-blue-100 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black text-blue-600 group-hover:bg-blue-600 group-hover:text-white">{i+1}</div>
                    <span className="text-xs font-bold text-blue-900 leading-relaxed">{q}</span>
                    <ChevronRight size={14} className="ml-auto text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))
              )}
            </div>

            <div className="p-8 bg-blue-50/30 border-t border-blue-50 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">
                Mô hình Gemini 3 Flash được sử dụng<br/>để cung cấp các gợi ý trò chuyện.
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse-gentle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-gentle-float { animation: gentle-float 2.5s ease-in-out infinite; }
        .animate-pulse-gentle { animation: pulse-gentle 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
