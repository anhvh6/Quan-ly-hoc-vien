
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Save, Trash2, Plus, RefreshCw, Moon, Sun, Info, Copy, CopyPlus, UserPlus, Link as LinkIcon, Sparkles, RotateCcw, Lock, Maximize2, Loader2, ArrowRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Card, Button, LineInput, Modal } from '../components/UI';
import { api } from '../services/api';
import { Customer, ExerciseTask, ExerciseType, SidebarBlock, CustomerStatus } from '../types';
import { EXERCISE_TYPES, DEFAULT_SIDEBAR_BLOCKS } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { toInputDateString } from '../utils/date';

const DEFAULT_CHEWING_INSTRUCTION = "Kích hoạt cơ yếu, giảm tải cơ khỏe. Giai đoạn đầu: tập bên trái 70% – bên phải 30% trong 10-15 tuần. Giai đoạn tiếp theo: điều chỉnh về 60% – 40% trong 4–6 tuần. Khi gương mặt ổn định: tập cân bằng 50% – 50%.";

export const PlanEditor: React.FC<{ onNavigate: (page: string, params?: any) => void; customerId?: string; templateId?: string; draftCustomer?: Partial<Customer> }> = ({ onNavigate, customerId, templateId, draftCustomer }) => {
  const isEditMode = !!customerId;
  
  const [customer, setCustomer] = useState<Partial<Customer>>({
    customer_name: draftCustomer?.customer_name || "",
    app_title: "PHÁC ĐỒ 30 NGÀY THAY ĐỔI KHUÔN MẶT",
    app_slogan: "Hành trình đánh thức vẻ đẹp tự nhiên, gìn giữ thanh xuân bằng sự hiểu biết và tình yêu bản thân.",
    start_date: toInputDateString(draftCustomer?.start_date || new Date()),
    duration_days: draftCustomer?.duration_days || 62,
    video_date: "",
    sidebar_blocks_json: DEFAULT_SIDEBAR_BLOCKS,
    note: draftCustomer?.note || "",
    chewing_status: draftCustomer?.chewing_status || DEFAULT_CHEWING_INSTRUCTION
  });
  
  const [tasks, setTasks] = useState<ExerciseTask[]>([]);
  const [masterDates, setMasterDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [originalNote, setOriginalNote] = useState<string | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isChewingModalOpen, setIsChewingModalOpen] = useState(false);
  
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: 'alert'
  });

  const showAlert = (title: string, message: string) => {
    setModalConfig({ isOpen: true, title, message, type: 'alert' });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModalConfig({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const parseDate = (dStr: string) => {
    if (!dStr) return new Date(0);
    const parts = dStr.split(/[/-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  const formatDateDisplay = (s: any) => {
    if (!s) return "";
    const str = String(s);
    const d = parseDate(str);
    if (d.getTime() > 0) {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return str;
  };

  const sortedDates = useMemo(() => {
    if (masterDates.length === 0) return [];
    const now = new Date();
    return [...masterDates].sort((a, b) => {
      const diffA = Math.abs(parseDate(a).getTime() - now.getTime());
      const diffB = Math.abs(parseDate(b).getTime() - now.getTime());
      return diffA - diffB;
    });
  }, [masterDates]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const dates = await api.getVideoDates();
        setMasterDates(dates || []);

        let defaultVideoDate = "";
        if (dates && dates.length > 0) {
          const now = new Date();
          const closest = [...dates].sort((a, b) => {
            return Math.abs(parseDate(a).getTime() - now.getTime()) - Math.abs(parseDate(b).getTime() - now.getTime());
          })[0];
          defaultVideoDate = closest;
        }

        if (customerId) {
          const c = await api.getCustomerById(customerId);
          if (c) {
            let processedCustomer = { ...c };
            if (c.start_date) processedCustomer.start_date = toInputDateString(c.start_date);
            
            const hasNoPlanYet = !c.video_date || String(c.video_date).trim() === "";
            
            if (hasNoPlanYet) {
              processedCustomer.chewing_status = DEFAULT_CHEWING_INSTRUCTION;
              processedCustomer.video_date = defaultVideoDate;
              processedCustomer.sidebar_blocks_json = DEFAULT_SIDEBAR_BLOCKS;
              
              setCustomer(processedCustomer);
              setTasks([]);
            } else {
              setCustomer(processedCustomer);
              const t = await api.getPlan(customerId, processedCustomer.video_date);
              setTasks(t || []);
            }
          }
        } else if (templateId) {
          const source = await api.getCustomerById(templateId);
          if (source) {
            setCustomer({
              ...customer,
              customer_name: draftCustomer?.customer_name || source.customer_name,
              duration_days: source.duration_days,
              video_date: source.video_date,
              sidebar_blocks_json: source.sidebar_blocks_json,
              note: source.note,
              chewing_status: source.chewing_status || DEFAULT_CHEWING_INSTRUCTION,
              app_title: source.app_title,
              app_slogan: source.app_slogan
            });
            const t = await api.getPlan(templateId, source.video_date);
            setTasks(t || []);
          }
        } else {
          const initialVideoDate = draftCustomer?.video_date || defaultVideoDate;
          setCustomer(prev => ({
            ...prev,
            ...draftCustomer,
            video_date: initialVideoDate,
            sidebar_blocks_json: DEFAULT_SIDEBAR_BLOCKS
          }));
          setTasks([]);
        }
      } catch (err) {
        console.error("PlanEditor Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [customerId, templateId]);

  const handleAiOptimize = async () => {
    if (!customer.note || customer.note.trim() === "") return;
    setIsAiProcessing(true);
    if (!originalNote) setOriginalNote(customer.note);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Bạn là chuyên gia Yoga Face, bạn hãy viết lại nội dung của từng thói quen như ăn nhai, nằm nghiêng và vắt chéo chân sao cho logic và đưa ra hậu quả của các thói quen xấu đó. Nội dung được bạn viết lại không quá 5 dòng cho toàn bộ 3 thói quen đó, bỏ chủ ngữ như em, chị..., viết dạng liệt kê, bỏ các câu từ chào hỏi, đi thẳng vào vấn đề, câu trả lời không được có các ký tự đặc biệt, chỉ dùng ký tự “-“ nếu cần. Rồi dựa trên thông tin khách hàng đưa, viết lại mong muốn cải thiện của khách hàng sao cho logic. Dưới đây là thông tin người dùng nhập: "${customer.note}"`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      if (response.text) setCustomer(prev => ({ ...prev, note: response.text.trim() }));
    } catch (error) {
      console.error("AI Error:", error);
      showAlert("LỖI AI", "Không thể xử lý nội dung bằng AI lúc này.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleRestoreNote = () => {
    if (originalNote) {
      setCustomer(prev => ({ ...prev, note: originalNote }));
      setOriginalNote(null);
    }
  };

  const handleSave = async () => {
    if (!customer.customer_name) {
      showAlert("THÔNG BÁO", "Vui lòng nhập tên học viên!");
      return;
    }
    try {
      setLoading(true);
      const savedCustomer = await api.upsertCustomer(customer);
      const finalId = savedCustomer.customer_id;
      setCustomer(savedCustomer);
      await api.savePlan(finalId, tasks);
      setLoading(false);
      onNavigate('preview', { customerId: finalId });
    } catch (err) {
      setLoading(false);
      console.error("Save Error:", err);
      showAlert("LỖI", "Có lỗi xảy ra khi lưu phác đồ. Vui lòng kiểm tra lại kết nối mạng.");
    }
  };

  const manualSyncTemplate = async () => {
    if (!customer.video_date) {
      showAlert("THÔNG BÁO", "Vui lòng chọn Nhóm video trước khi tải.");
      return;
    }
    setIsSyncing(true);
    try {
      const t = await api.getPlan("NEW", customer.video_date);
      if (t && t.length > 0) {
        setTasks(t);
      } else {
        showAlert("THÔNG BÁO", "Không tìm thấy dữ liệu mẫu cho ngày này.");
      }
    } catch (e) { 
      console.error("Manual sync error", e);
      showAlert("LỖI", "Không thể tải dữ liệu mẫu.");
    } finally { 
      setIsSyncing(false); 
    }
  };

  const handleDelete = () => {
    showConfirm(
      "XÁC NHẬN XÓA",
      `Bạn có chắc chắn muốn xóa vĩnh viễn học viên ${customer.customer_name}?`,
      async () => {
        closeModal();
        setLoading(true);
        try {
          if (customer.customer_id) {
            await api.deleteCustomer(customer.customer_id);
            onNavigate('dashboard');
          }
        } catch (e) {
          showAlert("LỖI", "Không thể xóa học viên.");
          setLoading(false);
        }
      }
    );
  };

  const copyPublicLink = () => {
    if (customer.link) {
      navigator.clipboard.writeText(customer.link);
      showAlert("THÀNH CÔNG", "Đã copy link phác đồ!");
    }
  };

  const handleFieldFocus = (blockId: string, field: 'title' | 'content', currentValue: string) => {
    const isDefaultTitle = currentValue === 'Mới';
    const isDefaultContent = currentValue === 'Nội dung...';
    if ((field === 'title' && isDefaultTitle) || (field === 'content' && isDefaultContent)) {
      setCustomer(prev => ({
        ...prev,
        sidebar_blocks_json: (prev.sidebar_blocks_json || []).map(b => b.id === blockId ? { ...b, [field]: '' } : b)
      }));
    }
  };

  const hasContent = customer.note && customer.note.trim() !== "";

  return (
    <Layout 
      title={`PHÁC ĐỒ: ${customer.customer_name || 'TẠO MỚI'}`} 
      onBack={() => onNavigate('dashboard')}
      actions={
        <div className="flex gap-2">
          {isEditMode && (
            <div className="flex bg-blue-50 p-1 rounded-xl gap-1 mr-2 border border-blue-100">
              <button onClick={copyPublicLink} className="p-2 hover:bg-white rounded-lg text-blue-600 transition-all" title="Copy link">
                <Copy size={16} />
              </button>
              <button onClick={() => onNavigate('plan-editor', { templateId: customer.customer_id })} className="p-2 hover:bg-white rounded-lg text-orange-600 transition-all" title="Nhân bản">
                <CopyPlus size={16} />
              </button>
              <button onClick={() => onNavigate('management', { customerId: customer.customer_id })} className="p-2 hover:bg-white rounded-lg text-purple-600 transition-all" title="Chi tiết">
                <UserPlus size={16} />
              </button>
              <button onClick={handleDelete} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-all" title="Xóa học viên">
                <Trash2 size={16} />
              </button>
            </div>
          )}
          <Button variant="primary" size="sm" onClick={handleSave}>
            <Save size={16} className="mr-2" /> {isEditMode ? "CẬP NHẬT PHÁC ĐỒ" : "LƯU PHÁC ĐỒ"}
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <RefreshCw size={48} className="animate-spin text-blue-600" />
          <p className="text-blue-900 font-bold uppercase tracking-widest text-xs animate-pulse">Đang nạp thông tin...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10 pb-20">
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="flex flex-col gap-6">
              <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
                <Info size={16} /> Thông tin cơ bản
              </h3>
              <LineInput 
                label="Tên học viên" 
                placeholder="VÍ DỤ: NGUYỄN THỊ MAI" 
                icon={isEditMode ? <Lock size={14} /> : undefined}
                value={customer.customer_name} 
                onChange={e => !isEditMode && setCustomer({...customer, customer_name: e.target.value.toUpperCase()})}
                readOnly={isEditMode}
                className={isEditMode ? "opacity-60 grayscale cursor-not-allowed" : ""}
              />
              <div className="grid grid-cols-2 gap-4">
                <LineInput label="Ngày bắt đầu" type="date" value={customer.start_date} onChange={e => setCustomer({...customer, start_date: e.target.value})} />
                <LineInput label="Số ngày tập" type="number" value={customer.duration_days} onChange={e => setCustomer({...customer, duration_days: parseInt(e.target.value) || 0})} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Nhóm video</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <select 
                      className="line-input flex-1 cursor-pointer pr-10 font-bold text-blue-900" 
                      value={customer.video_date} 
                      onChange={e => setCustomer({...customer, video_date: e.target.value})}
                    >
                      <option value="">-- Chọn nhóm video --</option>
                      {sortedDates.map(d => <option key={d} value={d}>{formatDateDisplay(d)}</option>)}
                    </select>
                  </div>
                  <Button variant="secondary" size="sm" onClick={manualSyncTemplate} disabled={!customer.video_date || isSyncing}>
                    <RefreshCw size={14} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? "ĐANG TẢI..." : "Tải mẫu"}
                  </Button>
                </div>
              </div>
            </Card>
            
            <Card className="flex flex-col gap-6">
              <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
                <Info size={16} /> Phân tích khuôn mặt
              </h3>
              
              <div className="flex flex-col gap-2">
                <label 
                  onClick={() => setIsChewingModalOpen(true)}
                  className="text-[11px] font-bold text-blue-600 uppercase tracking-widest cursor-pointer hover:text-blue-800 flex items-center gap-1.5"
                >
                  Chỉ dẫn ăn nhai <Maximize2 size={10} />
                </label>
                <LineInput isTextArea className="h-24" value={customer.chewing_status} onChange={e => setCustomer({...customer, chewing_status: e.target.value})} />
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label 
                    onClick={() => setIsNoteModalOpen(true)}
                    className="text-[11px] font-bold text-blue-600 uppercase tracking-widest cursor-pointer hover:text-blue-800 flex items-center gap-1.5"
                  >
                    Phân tích chi tiết <Maximize2 size={10} />
                  </label>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleAiOptimize} 
                      disabled={!hasContent || isAiProcessing}
                      className={`p-1.5 rounded-lg transition-all ${!hasContent || isAiProcessing ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100 active:scale-90'}`}
                      title="AI tối ưu nội dung"
                    >
                      <Sparkles size={18} className={isAiProcessing ? 'animate-pulse' : ''} />
                    </button>
                    <button 
                      onClick={handleRestoreNote} 
                      disabled={!originalNote || isAiProcessing}
                      className={`p-1.5 rounded-lg transition-all ${!originalNote || isAiProcessing ? 'text-gray-300 cursor-not-allowed' : 'text-orange-500 hover:bg-orange-100'}`}
                      title="Khôi phục"
                    >
                      <RotateCcw size={18} />
                    </button>
                  </div>
                </div>
                <LineInput isTextArea className="h-24" value={customer.note} onChange={e => setCustomer({...customer, note: e.target.value})} placeholder="Thói quen ăn nhai, nằm nghiêng..." />
              </div>
            </Card>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest">Khối thông tin bổ trợ (Sidebar)</h3>
              <Button variant="secondary" size="sm" onClick={() => setCustomer({ ...customer, sidebar_blocks_json: [{ id: Date.now().toString(), title: "Mới", content: "Nội dung...", type: 'default', video_link: '' }, ...(customer.sidebar_blocks_json || [])] })}>
                <Plus size={14} className="mr-2" /> Thêm khối
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(customer.sidebar_blocks_json || []).map(block => (
                <Card key={block.id} className={`${block.type === 'dark' ? 'bg-blue-900 text-white' : 'bg-white text-gray-800'}`}>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <input 
                        className="font-bold bg-transparent border-b border-opacity-20 outline-none w-full" 
                        value={block.title} 
                        onFocus={() => handleFieldFocus(block.id, 'title', block.title)}
                        onChange={e => setCustomer({ ...customer, sidebar_blocks_json: (customer.sidebar_blocks_json || []).map(b => b.id === block.id ? { ...b, title: e.target.value } : b) })} 
                      />
                      <div className="flex gap-1">
                        <button onClick={() => setCustomer({ ...customer, sidebar_blocks_json: (customer.sidebar_blocks_json || []).map(b => b.id === block.id ? { ...b, type: b.type === 'dark' ? 'default' : 'dark' } : b) })} className="p-1 hover:bg-black/10 rounded">
                          {block.type === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                        <button onClick={() => setCustomer({ ...customer, sidebar_blocks_json: (customer.sidebar_blocks_json || []).filter(b => b.id !== block.id) })} className="p-1 hover:bg-red-100 rounded text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <textarea 
                      className="text-xs bg-transparent border-none resize-none outline-none h-16 w-full" 
                      placeholder="Nội dung chi tiết..." 
                      value={block.content} 
                      onFocus={() => handleFieldFocus(block.id, 'content', block.content)}
                      onChange={e => setCustomer({ ...customer, sidebar_blocks_json: (customer.sidebar_blocks_json || []).map(b => b.id === block.id ? { ...b, content: e.target.value } : b) })} 
                    />
                    <div className="flex items-center gap-2 pt-2 border-t border-blue-50/20">
                      <LinkIcon size={12} className="opacity-50" />
                      <input 
                        className="text-[10px] bg-transparent outline-none w-full placeholder:text-gray-400" 
                        placeholder="Link video..." 
                        value={block.video_link || ''} 
                        onChange={e => setCustomer({ ...customer, sidebar_blocks_json: (customer.sidebar_blocks_json || []).map(b => b.id === block.id ? { ...b, video_link: e.target.value } : b) })} 
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
             <div className="flex items-center justify-between mb-6">
               <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest">Lịch trình chi tiết</h3>
               {isSyncing && (
                 <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest animate-pulse">
                   <Loader2 size={12} className="animate-spin" /> Đang cập nhật...
                 </div>
               )}
             </div>
             <div className="bg-white rounded-[2.5rem] overflow-hidden border border-blue-50 shadow-sm overflow-x-auto min-h-[300px] relative">
                <table className="w-full">
                  <thead className="bg-blue-50 text-blue-900">
                    <tr>
                      <th className="p-4 text-left text-[10px] font-black uppercase w-16">Ngày</th>
                      <th className="p-4 text-left text-[10px] font-black uppercase w-32">Loại</th>
                      <th className="p-4 text-left text-[10px] font-black uppercase">Tên bài tập</th>
                      <th className="p-4 text-left text-[10px] font-black uppercase">Link Video</th>
                      <th className="p-4 text-center text-[10px] font-black uppercase w-16">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y divide-blue-50 ${isSyncing ? 'opacity-30 pointer-events-none transition-opacity' : 'transition-opacity'}`}>
                    {(tasks || []).map((task, idx) => {
                      const isEvenDay = task.day % 2 === 0;
                      const textColor = isEvenDay ? 'text-blue-600' : 'text-indigo-900';
                      const isMandatory = task.type === ExerciseType.MANDATORY;
                      
                      return (
                        <tr key={idx} className="hover:bg-blue-50/20">
                          <td className="p-2"><input type="number" className={`w-full text-center line-input font-bold ${textColor}`} value={task.day} onChange={e => setTasks(tasks.map((t, i) => i === idx ? { ...t, day: parseInt(e.target.value) || 1 } : t))} /></td>
                          <td className="p-2">
                            <select 
                              className={`w-full line-input text-[10px] ${textColor} ${isMandatory ? 'font-black' : 'font-normal'}`} 
                              value={task.type} 
                              onChange={e => setTasks(tasks.map((t, i) => i === idx ? { ...t, type: e.target.value as ExerciseType } : t))}
                            >
                              {EXERCISE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                          </td>
                          <td className="p-2"><input className={`w-full line-input ${textColor} ${isMandatory ? 'font-black' : 'font-normal'}`} value={task.title} onChange={e => setTasks(tasks.map((t, i) => i === idx ? { ...t, title: e.target.value } : t))} /></td>
                          <td className="p-2"><input className={`w-full line-input ${textColor} ${isMandatory ? 'font-black' : 'font-normal'}`} value={task.link} onChange={e => setTasks(tasks.map((t, i) => i === idx ? { ...t, link: e.target.value } : t))} /></td>
                          <td className="p-2 text-center">
                            <button onClick={() => setTasks(tasks.filter((_, i) => i !== idx))} className="p-2 text-red-300 hover:text-red-500"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      );
                    })}
                    {(!tasks || tasks.length === 0) && !isSyncing && (
                       <tr>
                         <td colSpan={5} className="p-16 text-center text-gray-400 italic text-sm">
                           Chưa có lịch trình. Hãy chọn "Nhóm video" và nhấn nút "Tải mẫu" để đồng bộ dữ liệu mẫu.
                         </td>
                       </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </section>
        </div>
      )}

      {/* MODAL PHÂN TÍCH CHI TIẾT */}
      <Modal 
        isOpen={isNoteModalOpen} 
        onClose={() => setIsNoteModalOpen(false)} 
        title="PHÂN TÍCH KHUÔN MẶT"
        maxWidth="max-w-4xl"
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between px-2 bg-blue-50/50 py-3 rounded-2xl">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
              <Info size={14} /> Công cụ hỗ trợ nội dung
            </span>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleAiOptimize} 
                disabled={!hasContent || isAiProcessing}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-[11px] uppercase tracking-tight ${!hasContent || isAiProcessing ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95'}`}
              >
                <Sparkles size={14} className={isAiProcessing ? 'animate-pulse' : ''} />
                {isAiProcessing ? "Đang xử lý..." : "AI Tối ưu"}
              </button>
              <button 
                onClick={handleRestoreNote} 
                disabled={!originalNote || isAiProcessing}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-[11px] uppercase tracking-tight ${!originalNote || isAiProcessing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
              >
                <RotateCcw size={14} />
                Khôi phục
              </button>
            </div>
          </div>
          
          <textarea 
            className="w-full h-96 p-8 rounded-3xl border border-blue-50 bg-white text-base font-medium leading-relaxed outline-none focus:ring-4 ring-blue-50 transition-all resize-none shadow-inner"
            value={customer.note}
            onChange={e => setCustomer({...customer, note: e.target.value})}
            placeholder="Nhập nội dung thói quen và mong muốn cải thiện..."
            autoFocus
          />
          <div className="flex justify-end pt-2">
            <Button variant="primary" className="px-12 py-4" onClick={() => setIsNoteModalOpen(false)}>
              HOÀN TẤT CHỈNH SỬA <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL CHỈ DẪN ĂN NHAI */}
      <Modal 
        isOpen={isChewingModalOpen} 
        onClose={() => setIsChewingModalOpen(false)} 
        title="CHỈ DẪN ĂN NHAI CÂN BẰNG"
        maxWidth="max-w-3xl"
      >
        <div className="flex flex-col gap-6">
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest px-2 italic">
            Hướng dẫn lộ trình nhai dành riêng cho học viên
          </p>
          <textarea 
            className="w-full h-80 p-8 rounded-3xl border border-blue-50 bg-white text-base font-medium leading-relaxed outline-none focus:ring-4 ring-blue-50 transition-all resize-none shadow-inner"
            value={customer.chewing_status}
            onChange={e => setCustomer({...customer, chewing_status: e.target.value})}
            placeholder="Nhập chỉ dẫn ăn nhai..."
            autoFocus
          />
          <div className="flex justify-end pt-2">
            <Button variant="primary" className="px-12 py-4" onClick={() => setIsChewingModalOpen(false)}>
              XÁC NHẬN NỘI DUNG <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalConfig.isOpen} onClose={closeModal} title={modalConfig.title} footer={
        modalConfig.type === 'confirm' ? (
          <>
            <Button variant="ghost" size="sm" onClick={closeModal}>HỦY</Button>
            <Button variant="primary" size="sm" onClick={modalConfig.onConfirm}>ĐỒNG Ý</Button>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={closeModal}>ĐÓNG</Button>
        )
      }>
        <p className="text-sm font-medium text-gray-600">{modalConfig.message}</p>
      </Modal>
    </div>
  );
};
