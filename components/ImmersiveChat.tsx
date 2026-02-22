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
    // Ép body không cuộn để tập trung vào iframe
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
      {/* Background Deep Black */}
      <div className="absolute inset-0 bg-black pointer-events-none"></div>

      {/* Header Controls - Neon Guide Text */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-8 flex flex-col items-center gap-4 z-[100] safe-area-inset-top">
        <div className="flex justify-between items-center w-full max-w-[1400px]">
          <div className="flex-1 hidden md:block"></div>
          <div className="flex items-center gap-3 bg-black/50 backdrop-blur-2xl px-6 py-3.5 rounded-full border border-blue-500/60 shadow-[0_0_30px_rgba(59,130,246,0.4)] animate-glow-neon mx-auto md:mx-0">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_15px_#22c55e] animate-ping"></div>
            <span className="text-[10px] md:text-[13px] font-black text-white uppercase tracking-wider text-center drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
              Hãy chọn Vietnameses và Chat Now để bắt đầu trao đổi sau 30s nhé!
            </span>
          </div>
          <div className="flex-1 flex justify-end">
            <button 
              onClick={onClose}
              className="w-12 h-12 bg-white/10 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all active:scale-90 border border-white/20 shadow-2xl group"
            >
              <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Frame Container - FORCE ABSOLUTE CENTER & FULL HEIGHT */}
      <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
        <div className="relative h-[100dvh] w-full flex items-center justify-center">
          <iframe 
            src="https://embed.liveavatar.com/v1/6efaef91-58e5-4569-83fc-47eacbf44063?language=vi-VN"
            className="h-full border-none shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            style={{ 
              height: '100dvh',
              width: '177.78dvh', // Duy trì tỉ lệ 16:9 nhưng ép theo chiều cao thiết bị
              maxWidth: 'none',
              objectFit: 'cover'
            }}
            allow="microphone; camera; autoplay; display-capture"
          ></iframe>
        </div>

        {/* Guide Overlay - Hướng dẫn khi mới mở */}
        {showGuide && (
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-[10px] flex items-center justify-center z-[150] transition-all cursor-pointer"
            onClick={handleDismissGuide}
          >
            <div className="bg-white p-10 rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col items-center gap-8 animate-in zoom-in-95 duration-500 max-w-[85%] text-center border-t-8 border-blue-600">
              <div className="flex items-center gap-5 text-black">
                <span className="text-3xl font-[900] tracking-tighter">CHỌN</span>
                <div className="relative">
                  <MousePointer2 size={48} className="text-blue-600 animate-gentle-float" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
                </div>
                <span className="text-3xl font-[900] tracking-tighter">& BẤM</span>
              </div>
              <div className="space-y-3">
                <p className="text-[15px] font-black text-gray-900 leading-relaxed uppercase tracking-tight">Bước 1: Chọn ngôn ngữ "Vietnamese"</p>
                <p className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-blue-600 bg-blue-50 px-4 py-2 rounded-full">Sau đó nhấn "Chat Now"</p>
              </div>
              <button className="w-full py-5 bg-blue-600 text-white rounded-full text-sm font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95">BẮT ĐẦU TRÒ CHUYỆN</button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Assistant Button */}
      <button 
        onClick={handleOpenSidebar}
        className="fixed bottom-10 right-8 w-16 h-16 bg-blue-600 text-white rounded-full shadow-[0_15px_40px_rgba(37,99,235,0.4)] flex items-center justify-center transition-all hover:scale-110 active:scale-90 z-[70] border-4 border-white/20"
      >
        <MessageSquare size={28} />
      </button>

      {/* Sidebar - Gợi ý câu hỏi AI */}
      {showSidebar && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowSidebar(false)}></div>
          <div className="w-full max-w-sm bg-white h-full relative z-[210] shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 rounded-l-[3rem] border-l-4 border-blue-600">
            <div className="p-10 border-b border-blue-50 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100"><Sparkles size={24} /></div>
                <div>
                  <h4 className="text-sm font-black text-blue-900 uppercase tracking-tight">AI Companion</h4>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Gợi ý câu hỏi</p>
                </div>
              </div>
              <button onClick={() => setShowSidebar(false)} className="p-3 hover:bg-white rounded-full text-blue-300 transition-colors"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 flex flex-col gap-5 custom-scrollbar">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Chủ đề gợi ý:</p>
              {loadingSuggestions ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <Loader2 size={32} className="animate-spin text-blue-600" />
                </div>
              ) : (
                suggestions.map((q, i) => (
                  <div key={i} className="p-5 bg-blue-50/50 border-2 border-transparent hover:border-blue-100 hover:bg-white transition-all cursor-pointer group flex items-start gap-4 rounded-3xl">
                    <div className="w-6 h-6 bg-blue-100 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-black text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">{i+1}</div>
                    <span className="text-sm font-bold text-blue-900 leading-snug">{q}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes glow-neon {
          0%, 100% { border-color: rgba(59,130,246,0.4); box-shadow: 0 0 15px rgba(59,130,246,0.3); transform: scale(1); }
          50% { border-color: rgba(59,130,246,1); box-shadow: 0 0 40px rgba(59,130,246,0.7); transform: scale(1.03); }
        }
        .animate-gentle-float { animation: gentle-float 3s ease-in-out infinite; }
        .animate-glow-neon { animation: glow-neon 2s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
      `}</style>
    </div>
  );
};