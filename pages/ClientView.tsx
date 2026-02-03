
import React, { useState, useEffect, useRef } from 'react';
import { Play, X, Copy, CopyPlus, Pencil, UserPlus, ArrowLeft, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { Customer, ExerciseTask, ExerciseType, CustomerStatus } from '../types';
import { toVnZeroHour, formatDDMMYYYY, getDiffDays, addDays } from '../utils/date';

export const ClientView: React.FC<{ customerId: string; onNavigate?: (page: string, params?: any) => void }> = ({ customerId, onNavigate }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tasks, setTasks] = useState<ExerciseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllDays, setShowAllDays] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ExerciseTask | null>(null);
  
  const [infoModal, setInfoModal] = useState<{ isOpen: boolean; title: string; message: string } | null>(null);
  const [warningModal, setWarningModal] = useState<{ isOpen: boolean; task: ExerciseTask } | null>(null);
  
  const refreshInFlight = useRef(false);

  const fetchData = async () => {
    try {
      const data = await api.refreshClientData(customerId);
      if (data) {
        setCustomer(data.customer);
        const cleanTasks = (data.tasks || [])
          .filter(task => !task.is_deleted)
          .sort((a, b) => a.day - b.day);
        setTasks(cleanTasks);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu học viên:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const triggerBackgroundRefresh = async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const data = await api.refreshClientData(customerId);
      if (data) {
        setCustomer(data.customer);
        const cleanTasks = (data.tasks || [])
          .filter(task => !task.is_deleted)
          .sort((a, b) => a.day - b.day);
        setTasks(cleanTasks);
      }
    } catch (e) {
      console.error("Background refresh failed", e);
    } finally {
      refreshInFlight.current = false;
    }
  };

  const shouldBackgroundRefresh = (task: ExerciseTask) => {
    return task.type === ExerciseType.MANDATORY && task.day % 3 === 0;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FBFF]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
        <p className="text-blue-600 font-bold text-[10px] uppercase tracking-widest animate-pulse">Đang nạp dữ liệu...</p>
      </div>
    </div>
  );

  if (!customer || customer.status === CustomerStatus.DELETED) {
    return (
      <div className="min-h-screen bg-[#F8FBFF] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-white rounded-[22px] flex items-center justify-center mb-6 shadow-xl text-3xl">🔒</div>
        <h2 className="text-xl font-black text-[#1E3A8A] mb-3 tracking-tight">KHÔNG KHẢ DỤNG</h2>
        <p className="text-gray-500 mb-8 max-w-xs text-[15px] leading-relaxed">Phác đồ này đã bị khóa hoặc không tồn tại.</p>
        <a href="https://zalo.me/0966888609" target="_blank" rel="noopener noreferrer" className="bg-[#2563EB] text-white font-bold py-3.5 px-8 rounded-full shadow-lg uppercase text-[11px] tracking-widest">Liên hệ hỗ trợ</a>
      </div>
    );
  }

  const today = toVnZeroHour();
  const startDate = toVnZeroHour(customer.start_date);
  const endDate = customer.end_date ? toVnZeroHour(customer.end_date) : addDays(startDate, (customer.duration_days || 62) - 1);
  const allowedDay = getDiffDays(startDate, today) + 1;
  const daysLeft = getDiffDays(today, endDate);
  const isNotStarted = today < startDate;
  const isExpired = today > endDate;

  const handleTaskClick = (task: ExerciseTask) => {
    if (isNotStarted) {
      setInfoModal({
        isOpen: true,
        title: "Chưa đến thời gian học",
        message: `Hành trình tập luyện của bạn sẽ chính thức bắt đầu từ ngày ${formatDDMMYYYY(startDate)}. Hãy chuẩn bị sẵn sàng nhé!`
      });
      return;
    }
    if (isExpired) {
      setInfoModal({
        isOpen: true,
        title: "Phác đồ hết hạn",
        message: `Phác đồ của bạn đã hết hạn từ ngày ${formatDDMMYYYY(endDate)}. Vui lòng liên hệ hỗ trợ để được gia hạn và tiếp tục hành trình.`
      });
      return;
    }
    if (task.day > allowedDay) {
      const openDate = addDays(startDate, task.day - 1);
      setInfoModal({
        isOpen: true,
        title: "Chưa đến ngày mở bài",
        message: `Ngày học thứ ${task.day} hiện đang được đóng kín để đảm bảo lộ trình tập luyện khoa học nhất cho cơ mặt của bạn. Bài tập này sẽ tự động mở khóa vào ngày ${formatDDMMYYYY(openDate)}. Kiên trì tập đúng tiến độ là chìa khóa của cái đẹp!`
      });
      return;
    }
    if (shouldBackgroundRefresh(task)) triggerBackgroundRefresh();
    if (daysLeft >= 0 && daysLeft <= 5) setWarningModal({ isOpen: true, task });
    else setSelectedTask(task);
  };

  const copyPublicLink = () => {
    if (customer?.link) {
      navigator.clipboard.writeText(customer.link);
      alert("Đã copy link phác đồ!");
    }
  };

  const maxDays = 30; 
  const daysToRenderCount = showAllDays ? maxDays : 10;
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.day]) acc[task.day] = [];
    acc[task.day].push(task);
    return acc;
  }, {} as Record<number, ExerciseTask[]>);

  const daysToRender = Array.from({ length: daysToRenderCount }, (_, i) => i + 1);
  const displayDate = formatDDMMYYYY(startDate);

  const getTaskTheme = (task: ExerciseTask) => {
    return task.type === ExerciseType.MANDATORY ? { color: '#2563EB', bgColor: 'bg-[#2563EB]', hoverBg: 'hover:bg-[#1E40AF]' } : { color: '#10B981', bgColor: 'bg-[#10B981]', hoverBg: 'hover:bg-[#059669]' };
  };

  const currentTheme = selectedTask ? getTaskTheme(selectedTask) : { color: '#2563EB', bgColor: 'bg-[#2563EB]', hoverBg: 'hover:bg-[#1E40AF]' };

  return (
    <div className="min-h-screen bg-[#F8FBFF] text-[#1E3A8A] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-blue-100">
      {/* THANH TÁC VỤ CỐ ĐỊNH Ở TRÊN CÙNG - SỬ DỤNG FIXED CHO TOÀN BỘ TRANG */}
      <div className="fixed top-0 left-0 right-0 z-[5000] bg-white/95 backdrop-blur-lg border-b border-blue-50 px-4 py-3 shadow-md">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <button 
            onClick={() => onNavigate && onNavigate('dashboard')} 
            className="flex items-center gap-2 text-[#2563EB] font-bold text-[10px] uppercase tracking-widest hover:opacity-70 transition-opacity"
          >
            <ArrowLeft size={14} /> Dashboard
          </button>
          
          <div className="flex gap-2">
            <button onClick={copyPublicLink} className="p-2 bg-blue-50 text-[#2563EB] rounded-full hover:bg-blue-100 transition-all active:scale-90" title="Copy Link"><Copy size={14} /></button>
            <button onClick={() => onNavigate && onNavigate('plan-editor', { templateId: customer.customer_id })} className="p-2 bg-orange-50 text-orange-600 rounded-full hover:bg-orange-100 transition-all active:scale-90" title="Nhân bản"><CopyPlus size={14} /></button>
            <button onClick={() => onNavigate && onNavigate('plan-editor', { customerId: customer.customer_id })} className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-all active:scale-90" title="Sửa"><Pencil size={14} /></button>
            <button onClick={() => onNavigate && onNavigate('management', { customerId: customer.customer_id })} className="p-2 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-all active:scale-90" title="Chi tiết"><UserPlus size={14} /></button>
          </div>
        </div>
      </div>

      {/* Khoảng trống bù lại cho Fixed header */}
      <div className="pt-[80px] max-w-[1200px] mx-auto px-[14px] md:px-[16px] pb-20">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-[26px] md:text-[42px] font-[800] text-[#1E3A8A] leading-tight mb-3 tracking-tight">
            {customer.app_title || "Phác đồ 30 ngày thay đổi khuôn mặt"}
          </h1>
          <p className="text-[14px] md:text-[16px] text-[#3B82F6] opacity-70 max-w-3xl mx-auto leading-relaxed px-6 mb-8 font-medium">
            "{customer.app_slogan || "Hành trình đánh thức vẻ đẹp tự nhiên, gìn giữ thanh xuân."}"
          </p>
          
          <div className="flex flex-col items-center gap-2">
            <span className="inline-block px-6 py-2 bg-white text-[#2563EB] rounded-full text-[12px] font-bold uppercase tracking-[0.15em] border border-[rgba(147,197,253,.45)] shadow-sm">
              Bắt đầu: {displayDate}
            </span>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[12px] font-[700] text-gray-400 uppercase tracking-widest">Học viên:</span>
              <span className="text-[20px] font-[800] text-[#1E3A8A] tracking-tight">{customer.customer_name}</span>
            </div>
          </div>
        </header>

        <section className="bg-white rounded-[22px] md:rounded-[30px] p-6 md:p-8 shadow-[0_6px_18px_rgba(30,58,138,.05)] md:shadow-[0_10px_30px_rgba(30,58,138,.06)] border border-[rgba(147,197,253,.45)] mb-8 md:mb-12">
           <div className="text-[12px] font-bold text-[#2563EB] uppercase tracking-widest mb-4 text-center md:text-left">Phân tích tình trạng</div>
           <div className="text-[#1E3A8A] leading-[1.8] text-[15px] text-justify opacity-90 whitespace-pre-line break-words font-medium">
             {customer.note || "Hệ thống đang cập nhật phân tích khuôn mặt chi tiết cho bạn..."}
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-[360px] flex flex-col gap-6 flex-shrink-0">
             <div className="bg-[#1E3A8A] text-white rounded-[22px] md:rounded-[30px] p-7 md:p-8 shadow-lg border border-blue-900/20">
                <h3 className="text-[18px] font-[800] mb-4 border-b border-white/10 pb-3 tracking-tight">Ăn Nhai Cân Bằng</h3>
                <p className="text-[15px] leading-[1.8] opacity-90 text-justify whitespace-pre-line break-words font-medium">
                  {customer.chewing_status || "Kích hoạt cơ yếu, giảm tải cơ khỏe. Giai đoạn đầu: tập bên trái 70% – bên phải 30%..."}
                </p>
             </div>
             
             {(customer.sidebar_blocks_json || []).map(block => (
               <div key={block.id} className={`rounded-[22px] md:rounded-[30px] p-7 md:p-8 shadow-sm border border-[rgba(147,197,253,.45)] transition-all hover:shadow-md ${block.type === 'dark' ? 'bg-[#1E3A8A] text-white' : 'bg-white text-[#1E3A8A]'}`}>
                 <h3 className={`text-[18px] font-[800] mb-4 border-b pb-3 tracking-tight break-words ${block.type === 'dark' ? 'border-white/10' : 'border-blue-50'}`}>
                  {block.title}
                 </h3>
                 <p className="text-[15px] leading-[1.8] opacity-90 mb-6 text-justify whitespace-pre-line break-words font-medium">
                  {block.content}
                 </p>
                 {block.video_link && (
                   <button 
                    onClick={() => window.open(block.video_link, '_blank')}
                    className={`w-full py-3.5 rounded-full font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-md ${block.type === 'dark' ? 'bg-white text-[#1E3A8A]' : 'bg-[#2563EB] text-white'}`}
                   >
                     <Play size={14} fill="currentColor" /> Xem hướng dẫn
                   </button>
                 )}
               </div>
             ))}
          </aside>

          <section className="flex-1 min-w-0">
             <div className="bg-white rounded-[22px] md:rounded-[30px] p-6 md:p-10 border border-[rgba(147,197,253,.45)] shadow-[0_10px_30px_rgba(30,58,138,.06)]">
                <div className="text-center mb-10">
                   <h2 className="text-[24px] md:text-[30px] font-[800] text-[#1E3A8A] mb-6 tracking-tight">Lịch trình chi tiết</h2>
                   
                   <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></div> Bắt buộc</div>
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div> Bổ trợ</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-md border-2 border-blue-500 bg-white"></div> Đang học</div>
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
                  {daysToRender.map(day => {
                    const isTaskLocked = day > allowedDay;
                    const isCurrent = day === allowedDay;
                    const dayTasks = groupedTasks[day] || [];
                    
                    return (
                      <div 
                        key={day} 
                        className={`bg-white rounded-[22px] border p-5 transition-all duration-300 relative ${isTaskLocked || isExpired || isNotStarted ? 'opacity-40 grayscale pointer-events-none' : 'hover:border-blue-200'} ${isCurrent && !isExpired && !isNotStarted ? 'border-blue-500 border-2 shadow-[0_12px_30px_rgba(37,99,235,0.12)] z-10 scale-[1.02]' : 'border-[rgba(147,197,253,.45)]'}`}
                      >
                        <div className={`text-center font-bold text-[13px] border-b mb-4 pb-2 uppercase tracking-[0.04em] ${day <= allowedDay && !isExpired && !isNotStarted ? 'text-[#2563EB] border-blue-50' : 'text-gray-400 border-gray-100'}`}>
                          Ngày {day}
                        </div>
                        <div className="flex flex-col gap-1 min-h-[60px]">
                           {dayTasks.map((task, idx) => (
                             <button 
                                key={idx} 
                                onClick={() => handleTaskClick(task)} 
                                className="w-full text-center py-2 px-1 rounded-xl font-[600] text-[13px] leading-tight transition-all active:scale-95 hover:bg-blue-50/50 break-words"
                                style={{ color: (task.type === ExerciseType.MANDATORY ? '#2563EB' : '#10B981') }}
                             >
                               {task.title}
                             </button>
                           ))}
                           {dayTasks.length === 0 && <div className="text-center py-4 text-gray-200 font-bold uppercase tracking-widest text-[9px]">Trống</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => setShowAllDays(!showAllDays)} 
                  className="w-full max-w-[280px] block mx-auto mt-12 py-4 px-8 bg-[#1E3A8A] text-white font-bold rounded-full text-[12px] uppercase tracking-widest shadow-lg transition-all hover:bg-[#2563EB] active:scale-95"
                >
                  {showAllDays ? "Thu gọn phác đồ" : "Xem tất cả 30 ngày"}
                </button>
             </div>
          </section>
        </div>
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1E3A8A]/90 backdrop-blur-md" onClick={() => setSelectedTask(null)}></div>
          <div className="bg-white w-full max-w-lg rounded-[28px] md:rounded-[32px] relative z-10 overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-300">
             <div className="bg-blue-50/30 p-8 md:p-10 pr-14 border-b border-blue-50 relative flex-shrink-0">
                <button onClick={() => setSelectedTask(null)} className="absolute right-6 top-8 text-[#1E3A8A] hover:opacity-50"><X size={28} /></button>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: currentTheme.color }}>
                  Ngày {selectedTask.day} • {selectedTask.type}
                </div>
                <h3 className="text-[22px] font-[800] leading-tight break-words tracking-tight" style={{ color: currentTheme.color }}>
                  {selectedTask.title}
                </h3>
             </div>
             <div className="p-8 md:p-10 overflow-y-auto flex-1 text-[15px] text-justify whitespace-pre-line font-medium opacity-90 break-words" style={{ color: currentTheme.color }}>
                {selectedTask.detail || "Nội dung đang được chuẩn bị dành riêng cho bạn..."}
             </div>
             <div className="p-8 md:p-10 pt-0">
                {selectedTask.link && (
                  <button 
                    onClick={() => window.open(selectedTask.link, '_blank')} 
                    className={`w-full py-4 rounded-full font-bold text-[12px] uppercase tracking-widest text-white flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all ${currentTheme.bgColor}`}
                  >
                    <Play size={18} fill="white" /> Xem hướng dẫn
                  </button>
                )}
             </div>
          </div>
        </div>
      )}

      {infoModal?.isOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setInfoModal(null)}></div>
          <div className="bg-white w-full max-sm rounded-[28px] p-8 relative z-10 shadow-2xl text-center flex flex-col items-center">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6"><Info size={28} /></div>
            <h3 className="text-xl font-bold text-blue-900 mb-3 tracking-tight">{infoModal.title}</h3>
            <p className="text-gray-500 text-[14px] leading-relaxed mb-8">{infoModal.message}</p>
            <button onClick={() => setInfoModal(null)} className="w-full py-3.5 bg-[#1E3A8A] text-white font-bold rounded-full text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-md">Tôi đã hiểu</button>
          </div>
        </div>
      )}
    </div>
  );
};
