
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Users, Home, Plus, AlertCircle, Gift, 
  ClipboardList, TrendingUp, Eraser, Mail, 
  Phone, Truck, Minimize2, ShoppingBag, Trash2, 
  Pencil, User, CheckCircle, X, ExternalLink, Copy, CopyPlus, Play, List, Eye, ChevronDown, Maximize2, RefreshCw, UserPlus
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { Button, LineInput, Card } from '../components/UI';
import { api } from '../services/api';
import { Customer, Product, CustomerStatus } from '../types';
import { calcRevenueCostProfit, isChuaGan } from '../utils/finance';
import { toVnZeroHour, getDiffDays, formatDDMM, formatDDMMYYYY, toInputDateString, toISODateKey, parseVNDate } from '../utils/date';

const getCustomerNamePillColor = (customer: Customer): string => {
  if (!customer.video_date) return 'bg-orange-100 text-orange-700 border-orange-200';
  if (isChuaGan(customer)) return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
};

export const CustomerManagement: React.FC<{ onNavigate: (page: string, params?: any) => void, customerId?: string }> = ({ onNavigate, customerId: initialId }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [expandedId, setExpandedId] = useState<string | null>(initialId || null);
  const [lastViewedId, setLastViewedId] = useState<string | null>(initialId || null);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateToFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterMissing, setFilterMissing] = useState<string | null>(null);

  const editPanelRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const getDefaultDateRange = () => {
    const today = new Date();
    const day = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    let fromDate, toDate;
    if (day <= 14) {
      fromDate = new Date(currentYear, currentMonth - 1, 15);
      toDate = new Date(currentYear, currentMonth, 14);
    } else {
      fromDate = new Date(currentYear, currentMonth, 15);
      toDate = new Date(currentYear, currentMonth + 1, 14);
    }
    return { from: toISODateKey(fromDate), to: toISODateKey(toDate) };
  };

  useEffect(() => {
    if (initialId) {
      setDateToFrom("");
      setDateTo("");
      setSearchTerm("");
      setFilterMissing(null);
      setLastViewedId(initialId);
    } else {
      const defaults = getDefaultDateRange();
      setDateToFrom(defaults.from);
      setDateTo(defaults.to);
    }
  }, [initialId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([api.getCustomers(), api.getProducts()]);
      const list = Array.isArray(c) ? c.filter(item => item.status !== CustomerStatus.DELETED) : [];
      setCustomers(list);
      setProducts(Array.isArray(p) ? p : []);
      
      if (initialId) {
        const target = list.find(cust => cust.customer_id === initialId);
        if (target) {
          setFormData({ ...target });
          setExpandedId(initialId);
        }
      }
    } catch (e) {
      console.error("Lỗi tải dữ liệu:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [initialId]);

  useEffect(() => {
    if (!expandedId && lastViewedId && !loading) {
      const timer = setTimeout(() => {
        const row = document.getElementById(`customer-row-${lastViewedId}`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.classList.add('bg-blue-100/50');
          setTimeout(() => row.classList.remove('bg-blue-100/50'), 2000);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [expandedId, lastViewedId, loading]);

  useEffect(() => {
    const handleClickOutsideProduct = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    if (showProductDropdown) {
      document.addEventListener("mousedown", handleClickOutsideProduct);
    }
    return () => document.removeEventListener("mousedown", handleClickOutsideProduct);
  }, [showProductDropdown]);

  const handleRowClick = (customer: Customer) => {
    setFormData({ ...customer });
    setExpandedId(customer.customer_id);
    setLastViewedId(customer.customer_id);
    setShowProductDropdown(false);
  };

  const handleAddStudent = () => {
    setFormData({
      customer_name: '',
      sdt: '',
      email: '',
      dia_chi: '',
      ma_vd: '',
      trang_thai_gan: 'Chưa gán',
      start_date: toISODateKey(new Date()),
      duration_days: 62,
      san_pham: [],
      gia_tien: 0,
      trang_thai: 0,
      status: CustomerStatus.ACTIVE
    });
    setExpandedId('NEW');
    setShowProductDropdown(false);
  };

  const handleIconClick = (e: React.MouseEvent, customer: Customer, field: keyof Customer) => {
    e.stopPropagation();
    const value = customer[field];
    
    if (value && typeof value !== 'object' && String(value).trim() !== "") {
      if (field === 'video_date') {
        if (customer.link) {
          navigator.clipboard.writeText(customer.link);
          alert(`Đã copy link phác đồ của học viên: ${customer.customer_name}`);
        } else {
          alert(`Học viên chưa có link phác đồ!`);
        }
      } else {
        navigator.clipboard.writeText(String(value));
        alert(`Đã copy: ${value}`);
      }
    } else {
      setExpandedId(customer.customer_id);
      setLastViewedId(customer.customer_id);
      setFormData({ ...customer });
      setShowProductDropdown(false);
      setTimeout(() => {
        const inputNameMap: Record<string, string> = {
          'video_date': 'start_date',
          'email': 'email',
          'sdt': 'sdt',
          'ma_vd': 'ma_vd'
        };
        const targetName = inputNameMap[field as string] || (field as string);
        const input = document.getElementsByName(targetName)[0] as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 300);
    }
  };

  const handleSave = async () => {
    if (!formData.customer_name) {
      alert("Vui lòng nhập tên học viên!");
      return;
    }
    setIsSaving(true);
    try {
      const payload = { ...formData };
      if (expandedId === 'NEW') {
        payload.customer_id = 'C' + Date.now();
        payload.created_at = new Date().toISOString();
      }
      
      const result = await api.upsertCustomer(payload);
      
      if (expandedId === 'NEW') {
        setCustomers(prev => [result, ...prev]);
      } else {
        setCustomers(prev => prev.map(c => c.customer_id === result.customer_id ? result : c));
      }
      
      alert(expandedId === 'NEW' ? "Đã thêm học viên mới thành công!" : "Đã cập nhật thông tin thành công!");
      setExpandedId(null);
      setShowProductDropdown(false);
    } catch (e) {
      alert("Lỗi khi lưu dữ liệu!");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProduct = (product: Product) => {
    const current = formData.san_pham || [];
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
    setFormData({ ...formData, san_pham: newItems, gia_tien: total });
    setShowProductDropdown(false);
  };

  const updateProductQty = (id: string, qty: number) => {
    const newItems = (formData.san_pham || []).map(p => {
      if (p.id_sp === id) { 
        const q = Math.max(0, qty); 
        return { ...p, so_luong: q, thanh_tien: q * p.don_gia }; 
      }
      return p;
    });
    const total = newItems.reduce((acc, curr) => acc + curr.thanh_tien, 0);
    setFormData({ ...formData, san_pham: newItems, gia_tien: total });
  };

  const updateProductPrice = (id: string, price: number) => {
    const newItems = (formData.san_pham || []).map(p => {
      if (p.id_sp === id) { 
        const pr = Math.max(0, price); 
        return { ...p, don_gia: pr, thanh_tien: p.so_luong * pr }; 
      }
      return p;
    });
    const total = newItems.reduce((acc, curr) => acc + curr.thanh_tien, 0);
    setFormData({ ...formData, san_pham: newItems, gia_tien: total });
  };

  const formatVND = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

  const baseFiltered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return customers.filter(c => {
      const matchSearch = String(c.customer_name || "").toLowerCase().includes(term) || 
                          String(c.ma_vd || "").toLowerCase().includes(term) ||
                          String(c.sdt || "").includes(searchTerm);
      
      if (!dateFrom && !dateTo) return matchSearch;
      const createdAtISO = toISODateKey(c.created_at);
      const matchDate = (!dateFrom || createdAtISO >= dateFrom) && (!dateTo || createdAtISO <= dateTo);
      return matchSearch && matchDate;
    });
  }, [customers, searchTerm, dateFrom, dateTo]);

  const studentFinances = useMemo(() => {
    const map = new Map();
    baseFiltered.forEach(c => {
      map.set(c.customer_id, calcRevenueCostProfit(c, products));
    });
    return map;
  }, [baseFiltered, products]);

  const stats = useMemo(() => {
    let totalRevenue = 0, totalProfit = 0;
    baseFiltered.forEach(c => {
      const fin = studentFinances.get(c.customer_id);
      if (fin) {
        totalRevenue += fin.revenue; totalProfit += fin.profit;
      }
    });
    return {
      total: baseFiltered.length,
      notAssigned: baseFiltered.filter(c => isChuaGan(c)).length,
      missingMVD: baseFiltered.filter(c => !c.ma_vd).length,
      noPlan: baseFiltered.filter(c => !c.video_date).length,
      profit: totalProfit
    };
  }, [baseFiltered, studentFinances]);

  const colorStats = useMemo(() => {
    const s = { orange: 0, green: 0, gray: 0, brown: 0 };
    baseFiltered.forEach(c => {
      const isNotAssigned = isChuaGan(c);
      const fin = studentFinances.get(c.customer_id);
      const hasVon = fin?.hasVon || false;
      const hasEmail = !!c.email && String(c.email).trim() !== "";
      const hasAddress = !!c.dia_chi && String(c.dia_chi).trim() !== "";
      const hasMvd = !!c.ma_vd && String(c.ma_vd).trim() !== "";
      if (isNotAssigned && !hasEmail) s.orange++;
      else if (isNotAssigned && hasEmail) s.green++;
      else if (!isNotAssigned && c.trang_thai === 1 && hasVon && !hasAddress) s.gray++;
      else if (!isNotAssigned && c.trang_thai === 1 && hasVon && hasAddress && !hasMvd) s.brown++;
    });
    return s;
  }, [baseFiltered, studentFinances]);

  const filteredCustomers = useMemo(() => {
    return baseFiltered.filter(c => {
      if (!filterMissing) return true;
      const isNotAssigned = isChuaGan(c);
      if (filterMissing === 'chua_gan') return isNotAssigned;
      if (filterMissing === 'phac_do') return !c.video_date;
      if (filterMissing === 'email') return !c.email || String(c.email).trim() === "";
      if (filterMissing === 'sdt') return !c.sdt || String(c.sdt).trim() === "";
      if (filterMissing === 'dia_chi') return !c.dia_chi || String(c.dia_chi).trim() === "";
      if (filterMissing === 'ma_vd') return !c.ma_vd || String(c.ma_vd).trim() === "";
      if (filterMissing === 'dc_no_mvd') return !!c.dia_chi && (!c.ma_vd || String(c.ma_vd).trim() === "");
      if (filterMissing === 'mail_no_gan') return !!c.email && isNotAssigned;

      const fin = studentFinances.get(c.customer_id);
      const hasVon = fin?.hasVon || false;
      const hasEmail = !!c.email && String(c.email).trim() !== "";
      const hasAddress = !!c.dia_chi && String(c.dia_chi).trim() !== "";
      const hasMvd = !!c.ma_vd && String(c.ma_vd).trim() !== "";

      if (filterMissing === 'color_orange') return isNotAssigned && !hasEmail;
      if (filterMissing === 'color_green') return isNotAssigned && hasEmail;
      if (filterMissing === 'color_gray') return !isNotAssigned && c.trang_thai === 1 && hasVon && !hasAddress;
      if (filterMissing === 'color_brown') return !isNotAssigned && c.trang_thai === 1 && hasVon && hasAddress && !hasMvd;
      return true;
    }).sort((a, b) => (parseVNDate(b.start_date)?.getTime() || 0) - (parseVNDate(a.start_date)?.getTime() || 0));
  }, [baseFiltered, filterMissing, studentFinances]);

  const renderEditModal = () => {
    if (!expandedId) return null;
    const isNew = expandedId === 'NEW';
    const customer = isNew ? formData : (customers.find(c => c.customer_id === expandedId) || formData);
    if (!customer) return null;

    const hasPlan = customer.video_date && String(customer.video_date).trim() !== "";

    return (
      <div 
        className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-blue-900/40 backdrop-blur-md animate-in fade-in duration-300"
        onClick={() => { setExpandedId(null); setShowProductDropdown(false); }}
      >
        <div 
          ref={editPanelRef} 
          className="w-full max-w-6xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-8 border-b border-blue-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200"><User size={24} /></div>
              <div>
                <h4 className="font-extrabold text-[#1E3A8A] uppercase text-lg tracking-tight">
                  {isNew ? "THÊM HỌC VIÊN MỚI" : `SỬA HỌC VIÊN: ${customer.customer_name}`}
                </h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isNew ? "TẠO BẢN GHI MỚI" : `ID: ${customer.customer_id}`}</p>
              </div>
            </div>
            <button onClick={() => { setExpandedId(null); setShowProductDropdown(false); }} className="p-3 text-gray-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-full"><X size={28} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                  <LineInput label="TÊN HỌC VIÊN" name="customer_name" icon={<User size={14} />} value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value.toUpperCase()})} />
                  <LineInput label="SỐ ĐIỆN THOẠI" name="sdt" icon={<Phone size={14} />} value={formData.sdt} onChange={e => setFormData({...formData, sdt: e.target.value})} />
                  <LineInput label="EMAIL" name="email" icon={<Mail size={14} />} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  <LineInput label="MÃ VẬN ĐƠN" name="ma_vd" icon={<Truck size={14} />} value={formData.ma_vd} onChange={e => setFormData({...formData, ma_vd: e.target.value})} />
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">TRẠNG THÁI GÁN</label>
                    <select className="line-input font-bold text-blue-900" value={formData.trang_thai_gan} onChange={e => setFormData({...formData, trang_thai_gan: e.target.value})}>
                      <option value="Chưa gán">Chưa gán</option>
                      <option value="Đã gán">Đã gán</option>
                    </select>
                  </div>
                  <LineInput label="NGÀY B bắt đầu" name="start_date" type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                  <LineInput label="ĐỊA CHỈ NHẬN HÀNG" name="dia_chi" isTextArea className="h-24" value={formData.dia_chi} onChange={e => setFormData({...formData, dia_chi: e.target.value})} />
                  <div className="flex flex-col gap-6">
                     <LineInput label="SỐ NGÀY TẬP" name="duration_days" type="number" value={formData.duration_days} onChange={e => setFormData({...formData, duration_days: parseInt(e.target.value) || 0})} />
                     
                     <div className="flex items-center gap-4 mt-2">
                       <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">PHÁC ĐỒ:</span>
                       {hasPlan && !isNew ? (
                         <div className="flex items-center gap-3">
                           <button onClick={() => onNavigate('plan-editor', { customerId: customer.customer_id })} className="text-blue-600 hover:scale-110 transition-all" title="Sửa phác đồ"><Pencil size={20}/></button>
                           <button onClick={() => onNavigate('preview', { customerId: customer.customer_id })} className="text-green-600 hover:scale-110 transition-all" title="Xem phác đồ"><Eye size={20}/></button>
                           <button onClick={() => onNavigate('plan-editor', { templateId: customer.customer_id })} className="text-orange-500 hover:scale-110 transition-all" title="Nhân bản phác đồ"><CopyPlus size={20}/></button>
                           <button onClick={() => { navigator.clipboard.writeText(customer.link); alert("Đã copy link!"); }} className="text-purple-600 hover:scale-110 transition-all" title="Copy link"><Copy size={20}/></button>
                         </div>
                       ) : (
                         <div className="flex items-center gap-3">
                           <button 
                             onClick={() => {
                               if (isNew) onNavigate('plan-editor', { draftCustomer: formData });
                               else onNavigate('plan-editor', { customerId: customer.customer_id });
                             }}
                             className="flex items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all border border-blue-100 hover:scale-110"
                             title="Thêm phác đồ mới"
                           >
                             <Plus size={22} />
                           </button>
                         </div>
                       )}
                     </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                 <div className="flex items-center justify-between text-[#1E3A8A] font-extrabold text-sm uppercase tracking-widest">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600"><ShoppingBag size={18} /></div>
                     ĐƠN HÀNG & SẢN PHẨM
                   </div>
                   
                   <div className="relative" ref={productDropdownRef}>
                     <button 
                       onClick={() => setShowProductDropdown(!showProductDropdown)}
                       className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all shadow-md active:scale-95"
                     >
                       <Plus size={24} />
                     </button>
                     
                     {showProductDropdown && (
                       <div className="absolute right-0 top-12 w-80 bg-white border border-blue-50 rounded-2xl shadow-2xl z-[6000] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                            {products.filter(p => p.trang_thai === 1).length === 0 && (
                              <div className="p-4 text-center text-xs text-gray-400 italic">Hết hàng...</div>
                            )}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar border-b border-blue-50 pb-6">
                      {(formData.san_pham || []).map(item => (
                        <div key={item.id_sp} className="flex items-center justify-between group">
                          <div className="flex-1">
                            <div className="text-[12px] font-black text-blue-900 uppercase">{item.ten_sp}</div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-[11px] font-bold text-gray-400">SL: <input type="number" className="w-8 bg-transparent outline-none font-bold text-blue-600 border-b border-blue-50 focus:border-blue-400" value={item.so_luong} onChange={e => updateProductQty(item.id_sp, parseInt(e.target.value) || 0)} /></span>
                              <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                                GIÁ: 
                                <input 
                                  type="text" 
                                  className="w-20 bg-transparent outline-none font-bold text-blue-900 border-b border-blue-50 focus:border-blue-400" 
                                  value={formatVND(item.don_gia)} 
                                  onChange={e => updateProductPrice(item.id_sp, parseInt(e.target.value.replace(/\D/g, '')) || 0)} 
                                />
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                             <span className="text-sm font-black text-blue-600">{formatVND(item.thanh_tien)}</span>
                             <button onClick={() => toggleProduct(products.find(p => p.id_sp === item.id_sp)!)} className="text-red-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                      {(formData.san_pham || []).length === 0 && (
                        <div className="py-12 text-center text-gray-300 italic text-sm">
                          Chưa có sản phẩm nào được thêm...
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TỔNG THANH TOÁN</span>
                        <span className="text-2xl font-black text-blue-600">{formatVND(formData.gia_tien || 0)}</span>
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-blue-50/50 border-t border-blue-50 flex justify-end gap-4 shrink-0">
            <button onClick={() => { setExpandedId(null); setShowProductDropdown(false); }} className="px-10 py-4 bg-white text-gray-400 font-bold rounded-2xl text-[12px] uppercase tracking-widest hover:bg-gray-100 transition-all border border-blue-100">ĐÓNG</button>
            <Button variant="primary" className="px-16 py-4" onClick={handleSave} disabled={isSaving}>{isSaving ? "ĐANG LƯU..." : isNew ? "THÊM HỌC VIÊN" : "LƯU THAY ĐỔI"}</Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout 
      title="HỆ THỐNG QUẢ LÝ HỌC VIÊN"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onNavigate('plan-editor')}><Plus size={14} className="mr-1.5" /> THÊM PĐ</Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('dashboard')}><Home size={14} className="mr-1.5" /> TRANG CHỦ</Button>
          <Button variant="primary" size="sm" onClick={handleAddStudent}><UserPlus size={16} className="mr-2" /> THÊM HV</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-10 pb-20">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-3 gap-y-3 items-center px-1">
             <button className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border transition-all shadow-sm ${filterMissing === null ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'}`} onClick={() => setFilterMissing(null)}><Users size={16} /><span className="text-[12px] font-black uppercase tracking-tight">{stats.total} HỌC VIÊN</span></button>
             <button className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border transition-all shadow-sm ${filterMissing === 'chua_gan' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-500 border-blue-100 hover:bg-blue-50'}`} onClick={() => setFilterMissing('chua_gan')}><AlertCircle size={16} /><span className="text-[12px] font-black uppercase tracking-tight">{stats.notAssigned} CHƯA GÁN</span></button>
             <button className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border transition-all shadow-sm ${filterMissing === 'ma_vd' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-purple-500 border-blue-100 hover:bg-blue-50'}`} onClick={() => setFilterMissing('ma_vd')}><Gift size={16} /><span className="text-[12px] font-black uppercase tracking-tight">{stats.missingMVD} THIẾU MVD</span></button>
             <button className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border transition-all shadow-sm ${filterMissing === 'phac_do' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-blue-100 hover:bg-blue-50'}`} onClick={() => setFilterMissing('phac_do')}><ClipboardList size={16} /><span className="text-[12px] font-black uppercase tracking-tight">{stats.noPlan} THIẾU PĐ</span></button>
             <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-green-200 text-green-600 bg-white/50 shadow-sm"><TrendingUp size={16} /><span className="text-[12px] font-black uppercase tracking-tight">+{formatVND(stats.profit)}</span></div>
          </div>
          
          <div className="flex flex-wrap gap-x-6 gap-y-2 px-1">
             <button onClick={() => setFilterMissing(prev => prev === 'color_orange' ? null : 'color_orange')} className={`flex items-center gap-2 transition-all p-2 rounded-xl hover:bg-gray-50 ${filterMissing === 'color_orange' ? 'bg-orange-50 ring-1 ring-orange-200' : ''}`}><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div><span className="text-[10px] font-black text-orange-600 uppercase tracking-tight">CHƯA GÁN-MAIL: <span className="text-gray-900 ml-1">{colorStats.orange}</span></span></button>
             <button onClick={() => setFilterMissing(prev => prev === 'color_green' ? null : 'color_green')} className={`flex items-center gap-2 transition-all p-2 rounded-xl hover:bg-gray-50 ${filterMissing === 'color_green' ? 'bg-green-50 ring-1 ring-green-200' : ''}`}><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span className="text-[10px] font-black text-green-700 uppercase tracking-tight">CHƯA GÁN+MAIL: <span className="text-gray-900 ml-1">{colorStats.green}</span></span></button>
             <button onClick={() => setFilterMissing(prev => prev === 'color_gray' ? null : 'color_gray')} className={`flex items-center gap-2 transition-all p-2 rounded-xl hover:bg-gray-50 ${filterMissing === 'color_gray' ? 'bg-slate-50 ring-1 ring-slate-200' : ''}`}><div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div><span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">GÁN-ĐC: <span className="text-gray-900 ml-1">{colorStats.gray}</span></span></button>
             <button onClick={() => setFilterMissing(prev => prev === 'color_brown' ? null : 'color_brown')} className={`flex items-center gap-2 transition-all p-2 rounded-xl hover:bg-gray-50 ${filterMissing === 'color_brown' ? 'bg-amber-50 ring-1 ring-amber-200' : ''}`}><div className="w-2.5 h-2.5 rounded-full bg-amber-800"></div><span className="text-[10px] font-black text-amber-800 uppercase tracking-tight">GÁN-MVD: <span className="text-gray-900 ml-1">{colorStats.brown}</span></span></button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-end px-1">
          <div className="relative flex-1 w-full border-b-2 border-blue-50 focus-within:border-blue-500 transition-colors">
            <Search size={20} className="absolute left-0 top-1/2 -translate-y-1/2 text-blue-300" />
            <input 
              className="w-full bg-transparent pl-8 py-3 text-base font-bold text-blue-900 placeholder:text-blue-100 outline-none" 
              placeholder="Tên, SĐT, Mã VD..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
            <div className="flex-1 min-w-[130px]"><LineInput placeholder={`Từ (${formatDDMM(dateFrom)})`} type="date" value={dateFrom} onChange={e => setDateToFrom(e.target.value)} /></div>
            <div className="flex-1 min-w-[130px]"><LineInput placeholder={`Đến (${formatDDMM(dateTo)})`} type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
            <div className="flex-1 min-w-[200px]">
              <div className="flex flex-col">
                <select className="line-input text-blue-900 font-bold bg-transparent" value={filterMissing || ""} onChange={e => setFilterMissing(e.target.value || null)}>
                  <option value="">-- Tất cả tiêu chí --</option>
                  <option value="chua_gan">Chưa gán</option>
                  <option value="phac_do">Thiếu Phác đồ</option>
                  <option value="email">Thiếu Email</option>
                  <option value="sdt">Thiếu Số điện thoại</option>
                  <option value="dia_chi">Thiếu Địa chỉ</option>
                  <option value="ma_vd">Thiếu Mã vận đơn</option>
                  <option value="dc_no_mvd">Có ĐC – Chưa có MVĐ</option>
                  <option value="mail_no_gan">Có Mail – Chưa gán</option>
                </select>
              </div>
            </div>
            <button 
              onClick={() => { 
                setSearchTerm(""); 
                const def = getDefaultDateRange(); 
                setDateToFrom(def.from); 
                setDateTo(def.to); 
                setFilterMissing(null); 
              }} 
              className="p-3 text-gray-400 hover:text-red-500 transition-all flex items-center gap-2 active:scale-95"
            >
              <Eraser size={20} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-blue-50 shadow-sm min-h-[500px]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky top-0 z-40 bg-[#1E3A8A] text-white p-5 text-[10px] font-black uppercase w-16 text-center border-b border-blue-800">STT</th>
                  <th className="sticky top-0 z-40 bg-[#1E3A8A] text-white p-5 text-[10px] font-black uppercase w-24 border-b border-blue-800">NGÀY BĐ</th>
                  <th className="sticky top-0 z-40 bg-[#1E3A8A] text-white p-5 text-[10px] font-black uppercase min-w-[200px] border-b border-blue-800">HỌC VIÊN</th>
                  <th className="sticky top-0 z-40 bg-[#1E3A8A] text-white p-5 text-[10px] font-black uppercase w-24 text-center border-b border-blue-800">NGÀY HỌC</th>
                  <th className="sticky top-0 z-40 bg-[#1E3A8A] text-white p-5 text-[10px] font-black uppercase border-b border-blue-800">SẢN PHẨM</th>
                  <th className="sticky top-0 z-40 bg-[#1E3A8A] text-white p-5 text-[10px] font-black uppercase w-40 text-center border-b border-blue-800">CÔNG CỤ</th>
                  <th className="sticky top-0 z-40 bg-[#1E3A8A] text-white p-5 text-[10px] font-black uppercase text-right w-32 border-b border-blue-800">TỔNG TIỀN</th>
                  <th className="sticky top-0 z-40 bg-[#1E3A8A] text-white p-5 text-[10px] font-black uppercase text-right w-32 border-b border-blue-800">LỢI NHUẬN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {loading ? (
                  <tr><td colSpan={8} className="p-24 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-[11px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">Đang nạp dữ liệu...</p></td></tr>
                ) : filteredCustomers.map((c, idx) => {
                  const today = toVnZeroHour();
                  const start = parseVNDate(c.start_date) || new Date();
                  const currentDay = getDiffDays(start, today) + 1;
                  const fin = studentFinances.get(c.customer_id) || { revenue: 0, profit: 0 };

                  return (
                    <tr 
                      key={c.customer_id}
                      id={`customer-row-${c.customer_id}`}
                      onClick={() => handleRowClick(c)} 
                      className="hover:bg-blue-50/40 cursor-pointer transition-all border-l-4 border-transparent"
                    >
                      <td className="p-5 text-center text-xs font-bold text-gray-400">{idx + 1}</td>
                      <td className="p-5 text-xs font-black text-blue-900">{formatDDMM(c.start_date)}</td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <div className={`px-4 py-1.5 rounded-full text-[12px] font-black border uppercase tracking-tight shadow-sm ${getCustomerNamePillColor(c)}`}>
                            {c.customer_name}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold ml-2">
                            {c.sdt || 'Trống SĐT'}
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-center font-black text-blue-900 text-sm">
                        {currentDay > 0 ? currentDay : 0}
                      </td>
                      <td className="p-5">
                        <div className="flex flex-wrap gap-2">
                          {c.san_pham && c.san_pham.length > 0 ? c.san_pham.map((p, pIdx) => (
                            <span key={pIdx} className="bg-blue-50 text-blue-500 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-100 uppercase">
                              {p.ten_sp} {p.so_luong > 1 ? `x ${p.so_luong}` : ''}
                            </span>
                          )) : '--'}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-5">
                          <span onClick={(e) => handleIconClick(e, c, 'video_date')} className="hover:scale-125 transition-all cursor-pointer"><ClipboardList size={18} className={c.video_date ? "text-blue-600" : "text-gray-200"} /></span>
                          <span onClick={(e) => handleIconClick(e, c, 'email')} className="hover:scale-125 transition-all cursor-pointer"><Mail size={18} className={c.email ? "text-blue-600" : "text-gray-200"} /></span>
                          <span onClick={(e) => handleIconClick(e, c, 'sdt')} className="hover:scale-125 transition-all cursor-pointer"><Phone size={18} className={c.sdt ? "text-blue-600" : "text-gray-200"} /></span>
                          <span onClick={(e) => handleIconClick(e, c, 'ma_vd')} className="hover:scale-125 transition-all cursor-pointer"><Truck size={18} className={c.ma_vd ? "text-orange-500" : "text-gray-200"} /></span>
                        </div>
                      </td>
                      <td className="p-5 text-right font-black text-blue-900 text-sm">
                        {formatVND(fin.revenue)}
                      </td>
                      <td className="p-5 text-right font-black text-green-500 text-sm">
                        {formatVND(fin.profit)}
                      </td>
                    </tr>
                  );
                })}
                {!loading && filteredCustomers.length === 0 && (
                  <tr><td colSpan={8} className="p-32 text-center text-gray-400 italic font-medium">Hệ thống chưa ghi nhận học viên nào phù hợp...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {renderEditModal()}
    </Layout>
  );
};
