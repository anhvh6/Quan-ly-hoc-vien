import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Save, Trash2, Plus, RefreshCw, Moon, Sun, Info, Copy, CopyPlus, UserPlus, Link as LinkIcon, Sparkles, RotateCcw, Lock, Maximize2, Loader2, ArrowRight, Layout as LayoutIcon, Type, Video, Palette, AlertCircle, FileJson, CheckCircle, MessageSquare, Terminal, ShieldAlert, Bot, Eraser, Play, ChevronDown, X, ShoppingBag } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Card, Button, Modal } from '../components/UI';
import { LineInput } from '../components/UI';
import { api } from '../services/api';
import { Customer, ExerciseTask, ExerciseType, SidebarBlock, CustomerStatus, Product } from '../types';
import { EXERCISE_TYPES, DEFAULT_SIDEBAR_BLOCKS } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { toInputDateString, formatDDMM } from '../utils/date';

const DEFAULT_CHEWING_INSTRUCTION = "Kích hoạt cơ yếu, giảm tải cơ khỏe. Giai đoạn đầu: tập bên trái 70% – bên phải 30% trong 10-15 tuần. Giai đoạn tiếp theo: điều chỉnh về 60% – 40% trong 4–6 tuần. Khi gương mặt ổn định: tập cân bằng 50% – 50%.";

export const PlanEditor: React.FC<{ onNavigate: (page: string, params?: any) => void; customerId?: string; templateId?: string; draftCustomer?: Partial<Customer> }> = ({ onNavigate, customerId, templateId, draftCustomer }) => {
  const isEditMode = !!customerId;
  
  const [customer, setCustomer] = useState<Partial<Customer>>({
    customer_name: draftCustomer?.customer_name || "",
    app_title: "PHÁC ĐỒ 30 NGÀY THAY ĐỔI KHUÔN MẶT",
    app_slogan: "Hành trình đánh thức vẻ đẹp tự nhiên, gìn giữ thanh xuân bằng sự hiểu biết và tình yêu bản thân.",
    start_date: toInputDateString(new Date()),
    duration_days: draftCustomer?.duration_days || 62,
    video_date: "",
    sidebar_blocks_json: [...DEFAULT_SIDEBAR_BLOCKS],
    note: draftCustomer?.note || "",
    chewing_status: draftCustomer?.chewing_status || DEFAULT_CHEWING_INSTRUCTION,
    trang_thai: 0,
    trang_thai_gan: "0",
    san_pham: [],
    gia_tien: 0
  });
  
  const [tasks, setTasks] = useState<ExerciseTask[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [isCustomized, setIsCustomized] = useState(false);
  const [masterDates, setMasterDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [originalNote, setOriginalNote] = useState<string | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isChewingModalOpen, setIsChewingModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'save_error';
    onConfirm?: () => void;
    dataToCopy?: any;
    isForbidden?: boolean;
  }>({ isOpen: false, title: "", message: "", type: 'alert' });

  const showAlert = (title: string, message: string) => setModalConfig({ isOpen: true, title, message, type: 'alert' });
  const showConfirm = (title: string, message: string, onConfirm: () => void) => setModalConfig({ isOpen: true, title, message, type: 'confirm', onConfirm });
  const showSaveError = (title: string, message: string, data: any, isForbidden = false) => 
    setModalConfig({ isOpen: true, title, message, type: 'save_error', dataToCopy: data, isForbidden });
  
  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const sortedDates = useMemo(() => {
    if (!Array.isArray(masterDates) || masterDates.length === 0) return [];
    return masterDates;
  }, [masterDates]);

  const loadMasterPreview = async (date: string) => {
    if (!date) return;
    setIsSyncing(true);
    try {
      const t = await api.getPlan("NEW", date);
      setTasks(Array.isArray(t) ? t : []);
    } catch (e) {
      console.error("Preview failed", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleVideoDateChange = async (date: string) => {
    setCustomer(prev => ({ ...prev, video_date: date }));
    if (date) {
      await loadMasterPreview(date);
    }
  };

  const handleManualEdit = (idx: number, updates: Partial<ExerciseTask>) => {
    setIsCustomized(true);
    setTasks(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t));
  };

  const clearCustomization = () => {
    showConfirm("XÁC NHẬN", "Bạn có muốn xóa toàn bộ các bài tập tùy chỉnh và quay về chế độ đồng bộ tự động theo nhóm video mẫu?", () => {
      setIsCustomized(false);
      if (customer.video_date) {
        loadMasterPreview(customer.video_date);
      } else {
        setTasks([]);
      }
      closeModal();
    });
  };

  const manualSyncTemplate = async () => {
    if (!customer.video_date) { 
      showAlert("THÔNG BÁO", "Vui lòng chọn Nhóm video để đồng bộ."); 
      return; 
    }
    setIsCustomized(true);
    await loadMasterPreview(customer.video_date);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [datesRes, productsRes] = await Promise.all([
        api.getVideoDates(),
        api.getProducts()
      ]);
      
      const dates = Array.isArray(datesRes) ? datesRes : [];
      setMasterDates(dates);
      
      const allProducts = Array.isArray(productsRes) ? productsRes : [];
      setProducts(allProducts);

      if (customerId) {
        const c = await api.getCustomerById(customerId);
        if (c) {
          let pc = { ...c };
          if (c.start_date) pc.start_date = toInputDateString(c.start_date);
          setCustomer(pc);
          
          const studentTRes = await api.getPlan(customerId, pc.video_date || "");
          const studentT = Array.isArray(studentTRes) ? studentTRes : [];
          setTasks(studentT);
          setIsCustomized(studentT.some((t: any) => t._is_master === false)); 
        }
      } else if (templateId) {
        const source = await api.getCustomerById(templateId);
        if (source) {
          // Mặc định chọn sản phẩm đầu tiên cho bản sao
          let defaultProducts: any[] = [];
          let defaultTotal = 0;
          if (allProducts.length > 0) {
            const firstP = allProducts[0];
            defaultProducts = [{
              id_sp: firstP.id_sp,
              ten_sp: firstP.ten_sp,
              so_luong: 1,
              don_gia: firstP.gia_ban,
              gia_nhap: firstP.gia_nhap,
              thanh_tien: firstP.gia_ban
            }];
            defaultTotal = firstP.gia_ban;
          }

          const initialData = {
            ...customer,
            customer_name: draftCustomer?.customer_name || (source.customer_name ? `${source.customer_name} - SAO CHÉP` : ""),
            duration_days: source.duration_days,
            video_date: source.video_date,
            sidebar_blocks_json: [...(source.sidebar_blocks_json || DEFAULT_SIDEBAR_BLOCKS)],
            note: String(source.note || ""),
            chewing_status: String(source.chewing_status || DEFAULT_CHEWING_INSTRUCTION),
            app_title: source.app_title,
            app_slogan: source.app_slogan,
            trang_thai: 0,
            trang_thai_gan: "0",
            san_pham: defaultProducts,
            gia_tien: defaultTotal
          };
          setCustomer(initialData);
          const tRes = await api.getPlan(templateId, source.video_date || "");
          const t = Array.isArray(tRes) ? tRes : [];
          setTasks(t);
          setIsCustomized(true);
        }
      } else {
        const latestDate = dates.length > 0 ? dates[0] : "";
        
        // Mặc định chọn sản phẩm đầu tiên
        let defaultProducts: any[] = [];
        let defaultTotal = 0;
        if (allProducts.length > 0) {
          const firstP = allProducts[0];
          defaultProducts = [{
            id_sp: firstP.id_sp,
            ten_sp: firstP.ten_sp,
            so_luong: 1,
            don_gia: firstP.gia_ban,
            gia_nhap: firstP.gia_nhap,
            thanh_tien: firstP.gia_ban
          }];
          defaultTotal = firstP.gia_ban;
        }

        const initialData = { 
          ...customer, 
          ...draftCustomer,
          video_date: draftCustomer?.video_date || latestDate,
          trang_thai: 0,
          trang_thai_gan: "0",
          san_pham: defaultProducts,
          gia_tien: defaultTotal
        };
        setCustomer(initialData);
        if (initialData.video_date) {
          await loadMasterPreview(initialData.video_date);
          setIsCustomized(false);
        }
      }
    } catch (err: any) {
      console.error("PlanEditor Fetch Error:", err);
      setError(err.message || "Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [customerId, templateId]);

  const toggleProduct = (product: Product) => {
    const current = customer.san_pham || [];
    const exists = current.find(p => p.id_sp === product.id_sp);
    let newItems;
    if (exists) {
      newItems = current.filter(p => p.id_sp !== product.id_sp);
    } else {
      newItems = [...current, { 
        id_sp: product.id_sp, ten_sp: product.ten_sp, so_luong: 1, 
        don_gia: product.gia_ban, gia_nhap: product.gia_nhap, thanh_tien: product.gia_ban 
      }];
    }
    const total = newItems.reduce((acc, curr) => acc + curr.thanh_tien, 0);
    setCustomer({ ...customer, san_pham: newItems, gia_tien: total });
    setShowProductDropdown(false);
  };

  const updateProductQty = (id: string, qty: number) => {
    const newItems = (customer.san_pham || []).map(p => {
      if (p.id_sp === id) { 
        const q = Math.max(0, qty); 
        return { ...p, so_luong: q, thanh_tien: q * p.don_gia }; 
      }
      return p;
    });
    const total = newItems.reduce((acc, curr) => acc + curr.thanh_tien, 0);
    setCustomer({ ...customer, san_pham: newItems, gia_tien: total });
  };

  const updateProductPrice = (id: string, price: number) => {
    const newItems = (customer.san_pham || []).map(p => {
      if (p.id_sp === id) { 
        const pr = Math.max(0, price); 
        return { ...p, don_gia: pr, thanh_tien: p.so_luong * pr }; 
      }
      return p;
    });
    const total = newItems.reduce((acc, curr) => acc + curr.thanh_tien, 0);
    setCustomer({ ...customer, san_pham: newItems, gia_tien: total });
  };

  const formatVND = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

  const handleAiOptimize = async () => {
    const currentNote = String(customer.note || "");
    if (!currentNote.trim()) return;
    setIsAiProcessing(true);
    if (!originalNote) setOriginalNote(currentNote);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Bạn là chuyên gia Yoga Face của Mega Phương, bạn hãy viết lại nội dung của từng thói quen như ăn nhai, nằm nghiêng và vắt chéo chân sao cho logic và đưa ra hậu quả của các thói quen xấu đó. Nội dung được bạn viết lại không quá 5 dòng cho toàn bộ 3 thói quen đó, bỏ chủ ngữ như em, chị.... nội dung viết lại chia ra làm 2 mục: "Tình trạng hiện tại:" / "Và mong muốn cải thiện" dựa trên nội dung cung cấp từ khách hàng. Câu trả lời viết dưới dạng liệt kê các ý (chia ra làm 2 mục rõ ràng), không viết các nội dung thừa và không liên quan. Input: "${currentNote}"`;
      
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt 
      });
      if (response.text) setCustomer(prev => ({ ...prev, note: response.text.trim() }));
    } catch (error) {
      console.error("AI Error:", error);
      showAlert("LỖI AI", "Không thể xử lý nội dung bằng AI lúc này.");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!customer.customer_name) { showAlert("THÔNG BÁO", "Vui lòng nhập tên học viên!"); return; }
    if (!customer.video_date) { showAlert("THÔNG BÁO", "Vui lòng chọn nhóm video!"); return; }
    
    setLoading(true);
    try {
      const payload = { ...customer };
      
      let finalTasks = isCustomized ? tasks.map(t => ({
        ...t,
        day: Number(t.day || (t as any).n || 0),
        is_deleted: !!t.is_deleted
      })).filter(t => t.day > 0) : null;
      
      if (!isEditMode) {
        payload.trang_thai = 0;
        payload.trang_thai_gan = "0";
      }
      
      const savedResult = await api.upsertCustomer(payload, finalTasks);
      setLoading(false);
      onNavigate('preview', { customerId: savedResult.customer_id });
    } catch (err: any) {
      setLoading(false);
      const isForbidden = err.message.includes('403') || err.message.includes('FORBIDDEN');
      if (isForbidden) {
        showSaveError("LỖI PHÂN QUYỀN (403)", "Google Script từ chối lưu dữ liệu.", { customer: customer, tasks: tasks }, true);
      } else {
        showSaveError("LỖI LƯU DỮ LIỆU", "Có lỗi xảy ra khi lưu phác đồ.", { customer: customer, tasks: tasks });
      }
    }
  };

  const handleDelete = () => {
    showConfirm("XÁC NHẬN XÓA", `Xóa học viên ${customer.customer_name}?`, async () => {
      closeModal();
      setLoading(true);
      try {
        if (customer.customer_id) {
          await api.deleteCustomer(customer.customer_id);
          onNavigate('dashboard');
        }
      } catch (e) { showAlert("LỖI", "Không thể xóa."); setLoading(false); }
    });
  };

  const handleRestore = () => {
    showConfirm("XÁC NHẬN KHÔI PHỤC", `Khôi phục học viên ${customer.customer_name} về trạng thái hoạt động?`, async () => {
      closeModal();
      setLoading(true);
      try {
        if (customer.customer_id) {
          await api.upsertCustomer({ ...customer, status: CustomerStatus.ACTIVE });
          showAlert("THÀNH CÔNG", "Đã khôi phục học viên.");
          setCustomer(prev => ({ ...prev, status: CustomerStatus.ACTIVE }));
        }
      } catch (e) { showAlert("LỖI", "Không thể khôi phục."); } finally { setLoading(false); }
    });
  };

  const addSidebarBlock = () => {
    const newBlock: SidebarBlock = {
      id: 'sb_' + Date.now(),
      title: 'Khối thông tin mới',
      content: 'Nhập nội dung hiển thị tại đây...',
      type: 'default'
    };
    setCustomer(prev => ({
      ...prev,
      sidebar_blocks_json: [newBlock, ...(prev.sidebar_blocks_json || [])]
    }));
  };

  const updateSidebarBlock = (id: string, updates: Partial<SidebarBlock>) => {
    setCustomer(prev => ({
      ...prev,
      sidebar_blocks_json: (prev.sidebar_blocks_json || []).map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  };

  const deleteSidebarBlock = (id: string) => {
    setCustomer(prev => ({
      ...prev,
      sidebar_blocks_json: (prev.sidebar_blocks_json || []).filter(b => b.id !== id)
    }));
  };

  const handleInputFocus = (id: string, field: keyof SidebarBlock, currentValue: string) => {
    const defaultValues = ['Khối thông tin mới', 'Nhập nội dung hiển thị tại đây...', 'Link video (nếu có)...'];
    if (defaultValues.includes(currentValue)) {
      updateSidebarBlock(id, { [field]: '' });
    }
  };

  const handleCopyJson = () => {
    if (modalConfig.dataToCopy) {
      const jsonStr = JSON.stringify(modalConfig.dataToCopy, null, 2);
      navigator.clipboard.writeText(jsonStr);
      alert("Đã copy dữ liệu phác đồ!");
    }
  };

  const formatDateDisplay = (s: any) => {
    if (!s) return "";
    const str = String(s);
    const d = new Date(str);
    if (!isNaN(d.getTime())) return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return str;
  };

  const hasContent = customer.note && typeof customer.note === 'string' && customer.note.trim() !== "";

  return (
    <Layout 
      title={
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <span className="truncate max-w-[120px] sm:max-w-[300px] uppercase">
            PHÁC ĐỒ: {customer.customer_name || 'TẠO MỚI'}
          </span>
        </div>
      }
      onBack={() => onNavigate('dashboard')}
      actions={
        <div className="flex gap-2">
          {isEditMode && (
            <div className="flex bg-blue-50 p-1 rounded-xl gap-1 border border-blue-100">
              <button onClick={() => { if(customer.link){ navigator.clipboard.writeText(customer.link); showAlert("THÀNH CÔNG", "Đã copy link!"); } }} className="p-2 hover:bg-white rounded-lg text-blue-600 transition-all"><Copy size={16} /></button>
              <button onClick={() => onNavigate('plan-editor', { templateId: customer.customer_id })} className="p-2 hover:bg-white rounded-lg text-orange-600 transition-all" title="Nhân bản"><CopyPlus size={16} /></button>
              <button onClick={() => onNavigate('management', { customerId: customer.customer_id })} className="p-2 hover:bg-white rounded-lg text-purple-600 transition-all" title="Quản lý"><UserPlus size={16} /></button>
              <button 
                onClick={customer.status === CustomerStatus.DELETED ? handleRestore : handleDelete} 
                className={`p-2 rounded-lg transition-all ${customer.status === CustomerStatus.DELETED ? 'hover:bg-green-50 text-green-600' : 'hover:bg-red-50 text-red-500'}`}
                title={customer.status === CustomerStatus.DELETED ? "Khôi phục" : "Xóa"}
              >
                {customer.status === CustomerStatus.DELETED ? <RotateCcw size={16} /> : <Trash2 size={16} />}
              </button>
            </div>
          )}
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-black text-[11px] sm:text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Lưu
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <RefreshCw size={48} className="animate-spin text-blue-600" />
          <p className="text-blue-900 font-bold uppercase tracking-widest text-xs animate-pulse">Đang nạp dữ liệu...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6 text-center">
          <AlertCircle size={64} className="text-red-500" />
          <div>
            <h3 className="text-xl font-bold text-blue-900 uppercase">Lỗi Kết Nối Máy Chủ</h3>
            <p className="text-gray-500 mt-2 max-w-md">{error}</p>
          </div>
          <Button variant="primary" onClick={fetchData}>
            <RefreshCw size={16} className="mr-2" /> THỬ LẠI
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 sm:gap-10 pb-20">
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <Card className="flex flex-col gap-6 p-6 sm:p-8">
              <div className="flex flex-col gap-6">
                 <LineInput label="Tên học viên" placeholder="VÍ DỤ: NGUYỄN THỊ MAI" icon={isEditMode ? <Lock size={14} /> : undefined} value={customer.customer_name} onChange={e => !isEditMode && setCustomer({...customer, customer_name: e.target.value.toUpperCase()})} readOnly={isEditMode} className={isEditMode ? "opacity-60 grayscale cursor-not-allowed" : ""} />
                 <div className="grid grid-cols-2 gap-4">
                    <LineInput label="Ngày bắt đầu" type="date" value={customer.start_date} onChange={e => setCustomer({...customer, start_date: e.target.value})} />
                    <LineInput label="Số ngày tập" type="number" value={customer.duration_days} onChange={e => setCustomer({...customer, duration_days: parseInt(e.target.value) || 0})} />
                 </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Nhóm video lộ trình</label>
                <div className="flex items-center gap-3">
                  <select 
                    className="line-input flex-1 cursor-pointer font-bold text-blue-900" 
                    value={customer.video_date} 
                    onChange={e => handleVideoDateChange(e.target.value)}
                  >
                    <option value="">-- Chọn nhóm video --</option>
                    {sortedDates.map(d => <option key={d} value={d}>{formatDateDisplay(d)}</option>)}
                  </select>
                  <Button variant="secondary" size="sm" onClick={manualSyncTemplate} disabled={!customer.video_date || isSyncing}>
                    <RefreshCw size={14} className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? "ĐANG ĐỒNG BỘ..." : "Đồng bộ mẫu"}
                  </Button>
                </div>
              </div>
            </Card>
            
            <Card className="flex flex-col gap-6 p-6 sm:p-8">
              <h3 className="text-sm font-bold text-blue-900 uppercase tracking-widest flex items-center justify-between">
                <div className="flex items-center gap-2"><ShoppingBag size={16} /> Đơn hàng & Sản phẩm</div>
                <div className="relative">
                  <button 
                    onClick={() => setShowProductDropdown(!showProductDropdown)}
                    className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all shadow-md active:scale-95"
                  >
                    <Plus size={20} />
                  </button>
                  
                  {showProductDropdown && (
                    <div className="absolute right-0 top-10 w-72 sm:w-80 bg-white border border-blue-50 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                        <span className="text-[11px] font-black text-blue-900 uppercase">Danh sách sản phẩm</span>
                        <button onClick={() => setShowProductDropdown(false)}><X size={14} className="text-blue-400" /></button>
                      </div>
                      <div className="max-h-64 overflow-y-auto p-2 custom-scrollbar">
                        {products.filter(p => p.trang_thai === 1).map(p => (
                          <div 
                            key={p.id_sp} 
                            onClick={() => toggleProduct(p)}
                            className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl cursor-pointer transition-colors group"
                          >
                            <div className="flex flex-col">
                              <span className="text-[12px] font-bold text-gray-700 uppercase group-hover:text-blue-600">{p.ten_sp}</span>
                              <span className="text-[10px] font-bold text-gray-400">{formatVND(p.gia_ban)}</span>
                            </div>
                            <Plus size={14} className="text-blue-200 group-hover:text-blue-600" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </h3>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar border-b border-blue-50 pb-4">
                  {(customer.san_pham || []).map(item => (
                    <div key={item.id_sp} className="flex items-center justify-between group">
                      <div className="flex-1">
                        <div className="text-[12px] font-black text-blue-900 uppercase">{item.ten_sp}</div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                          <span className="text-[11px] font-bold text-gray-400">SL: <input type="number" className="w-8 bg-transparent outline-none font-bold text-blue-600 border-b border-blue-50 focus:border-blue-400" value={item.so_luong || 0} onChange={e => updateProductQty(item.id_sp, parseInt(e.target.value) || 0)} /></span>
                          <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                            GIÁ: 
                            <input 
                              type="text" 
                              className="w-20 bg-transparent outline-none font-bold text-blue-900 border-b border-blue-50 focus:border-blue-400" 
                              value={formatVND(item.don_gia || 0)} 
                              onChange={e => updateProductPrice(item.id_sp, parseInt(e.target.value.replace(/\D/g, '')) || 0)} 
                            />
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-6">
                        <span className="text-sm font-black text-blue-600">{formatVND(item.thanh_tien)}</span>
                        <button onClick={() => toggleProduct(products.find(p => p.id_sp === item.id_sp)!)} className="text-red-200 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {(customer.san_pham || []).length === 0 && (
                    <p className="text-center text-gray-400 italic text-xs py-4">Chưa chọn sản phẩm nào...</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TỔNG THANH TOÁN</span>
                    <span className="text-xl font-black text-blue-600">{formatVND(customer.gia_tien || 0)}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col gap-6 p-6 sm:p-8">
              <div className="flex flex-col gap-2">
                <label onClick={() => setIsChewingModalOpen(true)} className="text-[11px] font-bold text-blue-600 uppercase tracking-widest cursor-pointer hover:text-blue-800 flex items-center gap-1.5">Ăn nhai cân bằng <Maximize2 size={10} /></label>
                <div 
                  onClick={() => setIsChewingModalOpen(true)}
                  className="p-4 bg-gray-50/50 rounded-2xl border border-blue-50 text-sm font-medium text-blue-900 min-h-[96px] cursor-pointer hover:bg-blue-50/30 transition-all line-clamp-4 overflow-hidden"
                >
                  {customer.chewing_status || "Nhấn để nhập chỉ dẫn ăn nhai..."}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label onClick={() => setIsNoteModalOpen(true)} className="text-[11px] font-bold text-blue-600 uppercase tracking-widest cursor-pointer hover:text-blue-800 flex items-center gap-1.5">Tình trạng và mong muốn <Maximize2 size={10} /></label>
                  <div className="flex items-center gap-2">
                    <button onClick={handleAiOptimize} disabled={!hasContent || isAiProcessing} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-all shadow-sm" title="Phân tích bằng AI"><Sparkles size={18} className={isAiProcessing ? 'animate-pulse' : ''} /></button>
                    <button onClick={() => { if(originalNote) setCustomer(prev => ({...prev, note: originalNote})); }} disabled={!originalNote} className="p-1.5 text-orange-500 hover:bg-orange-100 rounded-lg transition-all" title="Khôi phục nội dung gốc"><RotateCcw size={18} /></button>
                  </div>
                </div>
                <div 
                  onClick={() => setIsNoteModalOpen(true)}
                  className="p-4 bg-gray-50/50 rounded-2xl border border-blue-50 text-sm font-medium text-blue-900 min-h-[96px] cursor-pointer hover:bg-blue-50/30 transition-all line-clamp-4 overflow-hidden"
                >
                  {customer.note || "Nhấn để nhập tình trạng học viên..."}
                </div>
              </div>
            </Card>
          </section>

          <section>
             <div className="flex flex-col sm:flex-row items-center justify-end mb-8 px-1 gap-4">
               <Button variant="secondary" size="sm" onClick={addSidebarBlock} className="w-full sm:w-auto rounded-full shadow-lg shadow-blue-100"><Plus size={16} className="mr-2"/> THÊM KHỐI</Button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {(customer.sidebar_blocks_json || []).map((block, idx) => (
                  <Card key={block.id} className={`relative flex flex-col group transition-all duration-500 ${block.type === 'dark' ? 'bg-[#1E3A8A] border-transparent shadow-xl' : 'bg-white border-blue-100 hover:border-blue-300'} p-7 rounded-[2.5rem] min-h-[300px]`}>
                    
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateSidebarBlock(block.id, { type: block.type === 'dark' ? 'default' : 'dark' })} className={`p-2 rounded-xl transition-all ${block.type === 'dark' ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600'}`}>
                          {block.type === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>
                        <button onClick={() => updateSidebarBlock(block.id, { is_chat: !block.is_chat })} className={`p-2 rounded-xl transition-all ${block.is_chat ? 'bg-orange-500 text-white shadow-lg' : (block.type === 'dark' ? 'bg-white/10 text-white' : 'bg-blue-50 text-blue-600')}`}>
                          <MessageSquare size={16} />
                        </button>
                      </div>
                      <button onClick={() => deleteSidebarBlock(block.id)} className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all ${block.type === 'dark' ? 'hover:bg-red-500 text-white/40' : 'hover:bg-red-50 text-red-300'}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex flex-col gap-4">
                      <input 
                        className={`bg-transparent border-none text-lg font-black uppercase tracking-tight outline-none ${block.type === 'dark' ? 'text-white placeholder:text-white/20' : 'text-blue-900 placeholder:text-blue-100'}`}
                        placeholder="Tiêu đề khối..."
                        value={block.title}
                        onFocus={() => handleInputFocus(block.id, 'title', block.title)}
                        onChange={e => updateSidebarBlock(block.id, { title: e.target.value })}
                      />
                      <textarea 
                        className={`bg-transparent border-none text-sm font-medium leading-relaxed resize-none h-32 outline-none ${block.type === 'dark' ? 'text-white/80 placeholder:text-white/10' : 'text-gray-500 placeholder:text-blue-50'}`}
                        placeholder="Nội dung hiển thị..."
                        value={block.content}
                        onFocus={() => handleInputFocus(block.id, 'content', block.content)}
                        onChange={e => updateSidebarBlock(block.id, { content: e.target.value })}
                      />
                      <div className="relative mt-2">
                         <LinkIcon size={14} className={`absolute left-0 top-1/2 -translate-y-1/2 ${block.type === 'dark' ? 'text-white/20' : 'text-blue-100'}`} />
                         <input 
                          className={`w-full bg-transparent border-none pl-6 text-[10px] font-bold outline-none ${block.type === 'dark' ? 'text-white/40 placeholder:text-white/10' : 'text-blue-300 placeholder:text-blue-50'}`}
                          placeholder="Link video (nếu có)..."
                          value={block.video_link}
                          onFocus={() => handleInputFocus(block.id, 'video_link', block.video_link || '')}
                          onChange={e => updateSidebarBlock(block.id, { video_link: e.target.value })}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
             </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 border border-blue-50 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-10 px-2 gap-4">
              <h3 className="text-[14px] font-black text-blue-900 uppercase tracking-[0.2em] flex items-center gap-2">
                LỊCH TRÌNH CHI TIẾT 
                <span className={`text-[10px] px-3 py-1 rounded-full border ${isCustomized ? 'bg-orange-100 text-orange-600 border-orange-200' : 'hidden'}`}>
                  {isCustomized ? 'ĐÃ TÙY CHỈNH RIÊNG' : ''}
                </span>
              </h3>
              <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-center sm:justify-end">
                {isCustomized && (
                  <Button variant="outline" size="sm" onClick={clearCustomization} className="flex-1 sm:flex-none rounded-full">
                    <RefreshCw size={14} className="mr-2" /> XÓA TÙY CHỈNH
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-blue-50 overflow-hidden shadow-sm">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="bg-blue-50/50">
                      <th className="p-4 pl-8 text-[10px] font-black text-blue-700 uppercase tracking-widest w-20 text-center">NGÀY</th>
                      <th className="p-4 text-[10px] font-black text-blue-700 uppercase tracking-widest w-32">LOẠI</th>
                      <th className="p-4 text-[10px] font-black text-blue-700 uppercase tracking-widest">TÊN BÀI TẬP</th>
                      <th className="p-4 text-[10px] font-black text-blue-700 uppercase tracking-widest">LINK VIDEO</th>
                      <th className="p-4 text-[10px] font-black text-blue-700 uppercase tracking-widest w-20 text-center">XÓA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50">
                    {tasks.sort((a,b) => (Number(a.day)||0) - (Number(b.day)||0)).map((t, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                         <td className="p-4 pl-8">
                           <input 
                            type="number" 
                            className="w-12 bg-transparent border-none font-black text-blue-900 outline-none text-center focus:ring-0"
                            value={t.day ?? 0}
                            onChange={e => handleManualEdit(tasks.indexOf(t), { day: parseInt(e.target.value) || 0 })}
                           />
                         </td>
                         <td className="p-4">
                            <div className="relative group flex items-center">
                              <select 
                                className={`w-full bg-transparent border-none text-[11px] font-bold uppercase outline-none cursor-pointer appearance-none pr-6 focus:ring-0 ${String(t.type).toLowerCase().includes('bắt buộc') || String(t.type).toLowerCase().includes('bat buoc') ? 'text-blue-600' : 'text-blue-400'}`}
                                value={t.type || ''}
                                onChange={e => handleManualEdit(tasks.indexOf(t), { type: e.target.value as ExerciseType })}
                              >
                                {EXERCISE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                              </select>
                              <ChevronDown size={14} className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-blue-300" />
                            </div>
                         </td>
                         <td className="p-4">
                           <input 
                            className={`w-full bg-transparent border-none text-[13px] outline-none placeholder:text-blue-100 focus:ring-0 ${String(t.type).toLowerCase().includes('bắt buộc') || String(t.type).toLowerCase().includes('bat buoc') ? 'font-black text-blue-900 uppercase' : 'font-bold text-blue-500'}`}
                            placeholder="Tên bài tập..."
                            value={t.title || ''}
                            onChange={e => handleManualEdit(tasks.indexOf(t), { title: e.target.value })}
                           />
                         </td>
                         <td className="p-4">
                           <input 
                            className="w-full bg-transparent border-none text-[12px] font-bold text-blue-600 outline-none placeholder:text-blue-100 focus:ring-0"
                            placeholder="https://youtu.be/..."
                            value={t.link || ''}
                            onChange={e => handleManualEdit(tasks.indexOf(t), { link: e.target.value })}
                           />
                         </td>
                         <td className="p-4 text-center">
                           <button 
                            onClick={() => { setIsCustomized(true); setTasks(tasks.filter(item => item !== t)); }} 
                            className="p-2 text-red-200 hover:text-red-500 transition-colors active:scale-90"
                           >
                             <Trash2 size={18} />
                           </button>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Modals for Details and Chewing instructions */}
      <Modal 
        isOpen={isNoteModalOpen} 
        onClose={() => setIsNoteModalOpen(false)} 
        title="MÔ TẢ TÌNH TRẠNG & MONG MUỐN" 
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsNoteModalOpen(false)}>HỦY</Button>
            <Button variant="primary" onClick={() => setIsNoteModalOpen(false)}>XÁC NHẬN</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-end gap-3 mb-2 px-1">
             <div className="flex items-center gap-2">
                <button 
                  onClick={handleAiOptimize} 
                  disabled={!hasContent || isAiProcessing} 
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all border border-blue-100 shadow-sm group disabled:opacity-50"
                >
                  {isAiProcessing ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} className="group-hover:scale-110 transition-transform" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">Phân tích bằng AI</span>
                </button>
                <button 
                  onClick={() => { if(originalNote) setCustomer(prev => ({...prev, note: originalNote})); }} 
                  disabled={!originalNote} 
                  className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl transition-all border border-orange-100 shadow-sm group disabled:opacity-50"
                >
                  <RotateCcw size={16} className="group-hover:-rotate-45 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Khôi phục gốc</span>
                </button>
             </div>
          </div>
          <textarea 
            className="w-full h-96 p-8 bg-blue-50/30 border border-blue-50 rounded-[2rem] outline-none text-sm font-medium leading-relaxed resize-none focus:bg-white focus:border-blue-300 transition-all custom-scrollbar"
            placeholder="Nhập chi tiết tình trạng học viên (ăn nhai, nằm nghiêng, vắt chéo chân...)"
            value={customer.note}
            onChange={e => setCustomer({...customer, note: e.target.value})}
          />
        </div>
      </Modal>

      <Modal 
        isOpen={isChewingModalOpen} 
        onClose={() => setIsChewingModalOpen(false)} 
        title="CHỈ DẪN ĂN NHAI CÂN BẰNG" 
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsChewingModalOpen(false)}>HỦY</Button>
            <Button variant="primary" onClick={() => setIsChewingModalOpen(false)}>XÁC NHẬN</Button>
          </>
        }
      >
        <textarea 
          className="w-full h-64 p-8 bg-blue-50/30 border border-blue-50 rounded-[2rem] outline-none text-sm font-medium leading-relaxed resize-none focus:bg-white focus:border-blue-300 transition-all custom-scrollbar"
          placeholder="Nhập hướng dẫn ăn nhai chi tiết..."
          value={customer.chewing_status}
          onChange={e => setCustomer({...customer, chewing_status: e.target.value})}
        />
      </Modal>

      <Modal 
        isOpen={modalConfig.isOpen} 
        onClose={closeModal} 
        title={modalConfig.title}
        footer={
          modalConfig.type === 'confirm' ? (
            <>
              <Button variant="ghost" size="sm" onClick={closeModal}>HỦY</Button>
              <Button variant="primary" size="sm" onClick={modalConfig.onConfirm}>ĐỒNG Ý</Button>
            </>
          ) : modalConfig.type === 'save_error' ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCopyJson}><Copy size={14} className="mr-2"/> COPY JSON</Button>
              <Button variant="primary" size="sm" onClick={closeModal}>ĐÓNG</Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={closeModal}>ĐÃ HIỂU</Button>
          )
        }
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle size={48} className={modalConfig.type === 'save_error' ? "text-red-500" : "text-orange-500"} />
          <p className="font-medium text-gray-600 leading-relaxed">{modalConfig.message}</p>
        </div>
      </Modal>
    </Layout>
  );
};