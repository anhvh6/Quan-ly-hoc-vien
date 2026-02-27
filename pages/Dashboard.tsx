
import { Search, UserPlus, Users, Calendar, ExternalLink, Edit2, Copy, Package, Clock, AlertTriangle, CheckCircle, Archive, Zap, CopyPlus, UserCircle, Filter, Eraser, AlertCircle, X, Plus, Mail, MapPin, Truck, FileWarning, User, Play, List, ChevronDown, ChevronRight, Trash2, RefreshCw, ShoppingBag, Phone } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Card, Button, LineInput, Modal } from '../components/UI';
import { DateInput } from '../components/DateInput';
import { api } from '../services/api'; 
import { Customer, CustomerStatus, Product } from '../types';
import { calcRevenueCostProfit, isChuaGan } from '../utils/finance';
import { formatDDMM, formatDDMMYYYY, toISODateKey, parseVNDate, getDiffDays } from '../utils/date';

interface CustomerCardProps {
  customer: Customer;
  products: Product[];
  onEdit: (id: string) => void;
  onPreview: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDetail: (id: string) => void;
  groupColor: string;
  groupIcon: any;
}

const getCategory = (c: Customer, products: Product[]): 'orange' | 'green' | 'gray' | 'brown' | null => {
  const fin = calcRevenueCostProfit(c, products);
  const isUnassigned = String(c.trang_thai ?? '') === '0';
  const isAssigned = String(c.trang_thai ?? '') === '1';
  const emailEmpty = !c.email || String(c.email).trim() === '';
  const addressEmpty = !c.dia_chi || String(c.dia_chi).trim() === '';
  const mvdEmpty = !c.ma_vd || String(c.ma_vd).trim() === '';
  const hasCost = (fin.revenue - fin.profit) !== 0;

  if (isUnassigned && emailEmpty) return 'orange';
  if (isUnassigned && !emailEmpty) return 'green';
  if (isAssigned && addressEmpty && hasCost) return 'gray';
  if (isAssigned && mvdEmpty && !addressEmpty && hasCost) return 'brown';
  
  return null;
};

const CustomerCard: React.FC<CustomerCardProps> = ({ customer, products, onEdit, onPreview, onDuplicate, onDetail, groupColor, groupIcon: GroupIcon }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const start = parseVNDate(customer.start_date) || new Date();
  const end = parseVNDate(customer.end_date);
  
  const currentDay = getDiffDays(start, today) + 1;
  let daysLeft = 0;
  if (end) {
    const diff = end.getTime() - today.getTime();
    daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  } else {
    daysLeft = (customer.duration_days || 62) - (currentDay > 0 ? currentDay : 0);
  }

  const formattedStart = formatDDMM(customer.start_date);
  const hasPlan = !!customer.video_date && String(customer.video_date).trim() !== "";
  
  const category = getCategory(customer, products);

  let StatusIcon = GroupIcon;
  let iconColorClass = "text-blue-500";
  let iconBgClass = "bg-blue-100/50";
  let cardBorderClass = "border-blue-100";
  let cardGradientClass = "bg-gradient-to-r from-blue-50/40 to-white";

  if (customer.status === CustomerStatus.DELETED) {
    StatusIcon = Trash2;
    iconColorClass = "text-gray-400";
    iconBgClass = "bg-gray-100";
    cardBorderClass = "border-gray-200";
    cardGradientClass = "bg-gray-50";
  } else if (!hasPlan) {
    StatusIcon = FileWarning; 
    iconColorClass = "text-red-500";
    iconBgClass = "bg-red-100";
    cardBorderClass = "border-red-200";
    cardGradientClass = "bg-gradient-to-r from-red-50/60 to-white";
  } else if (category === 'orange') {
    StatusIcon = Mail; 
    iconColorClass = "text-orange-600";
    iconBgClass = "bg-orange-100";
    cardBorderClass = "border-orange-200";
    cardGradientClass = "bg-gradient-to-r from-orange-50/60 to-white";
  } else if (category === 'green') {
    StatusIcon = Play; 
    iconColorClass = "text-green-600";
    iconBgClass = "bg-green-100";
    cardBorderClass = "border-green-200";
    cardGradientClass = "bg-gradient-to-r from-green-50/60 to-white";
  } else if (category === 'gray') {
    StatusIcon = MapPin; 
    iconColorClass = "text-slate-600";
    iconBgClass = "bg-slate-200";
    cardBorderClass = "border-slate-300";
    cardGradientClass = "bg-gradient-to-r from-slate-50 to-white";
  } else if (category === 'brown') {
    StatusIcon = Truck; 
    iconColorClass = "text-amber-800";
    iconBgClass = "bg-amber-100";
    cardBorderClass = "border-amber-300";
    cardGradientClass = "bg-gradient-to-r from-amber-50/60 to-white";
  } else {
    StatusIcon = GroupIcon;
    iconColorClass = groupColor;
    iconBgClass = groupColor.replace('text-', 'bg-').replace('600', '100').replace('500', '100').replace('400', '100');
    cardBorderClass = groupColor.replace('text-', 'border-').replace('600', '100').replace('500', '100').replace('400', '100');
    cardGradientClass = "bg-gradient-to-r from-blue-50/40 to-white";
  }

  const handleCardClick = () => {
    if (customer.status === CustomerStatus.DELETED) onEdit(customer.customer_id);
    else if (hasPlan) onPreview(customer.customer_id);
    else onEdit(customer.customer_id);
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 ${cardGradientClass} border ${cardBorderClass} rounded-[1.5rem] transition-all hover:shadow-xl hover:-translate-y-1 group cursor-pointer shadow-sm overflow-hidden`}
    >
      <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <div 
          onClick={(e) => { e.stopPropagation(); onDetail(customer.customer_id); }}
          className={`relative z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex-shrink-0 flex items-center justify-center ${iconBgClass} ${iconColorClass} shadow-inner transition-transform group-hover:scale-105 active:scale-95`}
          title="Quản lý chi tiết học viên"
        >
          <StatusIcon size={24} strokeWidth={1.5} />
        </div>
        <div className="relative z-10 flex-1 min-w-0 sm:hidden">
          <h4 className="text-[14px] font-extrabold text-[#1E3A8A] truncate uppercase tracking-tight">
            {customer.customer_name}
          </h4>
        </div>
      </div>
      <div className="relative z-10 flex-1 min-w-0 w-full">
        <div className="hidden sm:flex items-center gap-2 mb-1">
          <h4 className="text-[14px] font-extrabold text-[#1E3A8A] truncate uppercase tracking-tight">
            {customer.customer_name}
          </h4>
        </div>
        <div className="flex items-center flex-wrap gap-x-2 sm:gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-1.5 bg-white/60 px-2 py-0.5 rounded-lg border border-white/50 shadow-sm">
            <Calendar size={11} className="text-blue-400" />
            <span className="text-[10px] text-gray-500 font-bold">{formattedStart}</span>
          </div>
          {customer.status !== CustomerStatus.DELETED && (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border shadow-sm ${daysLeft < 0 ? 'bg-red-50 text-red-500 border-red-100' : daysLeft <= 5 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
               <span className="text-[10px] font-black uppercase tracking-tighter">
                 {currentDay > 0 ? currentDay : 0}/{daysLeft < 0 ? 'HH' : `${daysLeft}D`}
               </span>
            </div>
          )}
          {customer.status === CustomerStatus.DELETED && (
            <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500">Đã xóa</span>
          )}

          <div className="flex items-center gap-1 ml-auto">
            {hasPlan && customer.status !== CustomerStatus.DELETED && (
              <>
                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(customer.link); alert("Đã copy link phác đồ!"); }} className="w-7 h-7 flex items-center justify-center text-blue-600 bg-white/80 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm border border-blue-50 active:scale-90"><Copy size={12} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDuplicate(customer.customer_id); }} className="w-7 h-7 flex items-center justify-center text-orange-600 bg-white/80 hover:bg-orange-600 hover:text-white rounded-lg transition-all shadow-sm border border-orange-50 active:scale-90"><CopyPlus size={12} /></button>
              </>
            )}
            <button onClick={(e) => { e.stopPropagation(); onEdit(customer.customer_id); }} className="w-7 h-7 flex items-center justify-center text-green-600 bg-white/80 hover:bg-green-600 hover:text-white rounded-lg transition-all shadow-sm border border-green-50 active:scale-90"><Edit2 size={12} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GroupHeader: React.FC<{ icon: any; title: string; count: number; colorClass: string; isCollapsed: boolean; onToggle: () => void }> = ({ icon: Icon, title, count, colorClass, isCollapsed, onToggle }) => (
  <div 
    onClick={onToggle}
    className={`flex items-center justify-between mb-5 mt-12 first:mt-0 ${colorClass} cursor-pointer hover:opacity-80 transition-all select-none group`}
  >
    <div className="flex items-center gap-3">
      <div className="w-1.5 h-6 bg-current opacity-30 rounded-full"></div>
      <Icon size={22} strokeWidth={3} className="opacity-80" />
      <h3 className="text-[14px] font-black uppercase tracking-[0.15em] flex items-center">
        {title} <span className="ml-2 px-2 py-0.5 bg-current/10 rounded-lg text-[11px]">{count}</span>
      </h3>
    </div>
    <div className="p-1 rounded-full group-hover:bg-current/10 transition-colors">
      {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
    </div>
  </div>
);

export const Dashboard: React.FC<{ onNavigate: (page: string, params?: any) => void }> = ({ onNavigate }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateToFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    'expired': true,
    'deleted': true
  });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySearchTerm, setCopySearchTerm] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const handleAddStudent = () => {
    let defaultProducts: any[] = [];
    let defaultTotal = 0;
    if (products.length > 0) {
      const firstP = products[0];
      defaultProducts = [{ 
        id_sp: firstP.id_sp, ten_sp: firstP.ten_sp, so_luong: 1, 
        don_gia: firstP.gia_ban, gia_nhap: firstP.gia_nhap, thanh_tien: firstP.gia_ban 
      }];
      defaultTotal = firstP.gia_ban;
    }

    setFormData({
      customer_name: '',
      sdt: '',
      email: '',
      dia_chi: '',
      ma_vd: '',
      trang_thai_gan: 'Chưa gán',
      trang_thai: 0,
      start_date: toISODateKey(new Date()),
      duration_days: 62,
      san_pham: defaultProducts,
      gia_tien: defaultTotal,
      status: CustomerStatus.ACTIVE,
      link: '',
      video_date: ''
    });
    setIsAddModalOpen(true);
    setShowProductDropdown(false);
  };

  const handleSave = async () => {
    if (!formData.customer_name) {
      alert("Vui lòng nhập tên học viên!");
      return;
    }
    setIsSaving(true);
    try {
      const payload = { ...formData };
      payload.customer_id = 'C' + Date.now();
      payload.created_at = new Date().toISOString();
      
      const result = await api.upsertCustomer(payload);
      setCustomers(prev => [result, ...prev]);
      
      alert("Đã thêm học viên mới thành công!");
      setIsAddModalOpen(false);
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

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

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
    const defaults = getDefaultDateRange();
    setDateToFrom(defaults.from);
    setDateTo(defaults.to);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cust, prod] = await Promise.all([api.getCustomers(), api.getProducts()]);
        setCustomers(Array.isArray(cust) ? cust : []);
        setProducts(Array.isArray(prod) ? prod : []);
      } catch (e) { 
        console.error('Lỗi load dữ liệu:', e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchData();
  }, []);

  const todayStr = toISODateKey(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calcInfo = (c: Customer) => {
    const start = parseVNDate(c.start_date) || new Date();
    const end = parseVNDate(c.end_date);
    const diff = today.getTime() - start.getTime();
    const currentDay = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    
    let daysLeft = 0;
    if (end) {
      const diffEnd = end.getTime() - today.getTime();
      daysLeft = Math.ceil(diffEnd / (1000 * 60 * 60 * 24));
    } else {
      daysLeft = (c.duration_days || 62) - (currentDay > 0 ? currentDay : 0);
    }
    
    return { currentDay, daysLeft, start };
  };

  const filteredBySearch = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return customers.filter(c => {
      const matchSearch = String(c.customer_name || '').toLowerCase().includes(term) || 
                          String(c.ma_vd || '').toLowerCase().includes(term) || 
                          String(c.sdt || '').includes(searchTerm);
      
      const category = getCategory(c, products);
      const matchColor = !colorFilter || category === colorFilter;

      return matchSearch && matchColor;
    });
  }, [customers, searchTerm, colorFilter, products]);

  // Helper function for sorting by most recent creation (using full timestamp)
  const getCreationTime = (c: Customer) => {
    if (c.created_at) {
      const t = new Date(c.created_at).getTime();
      if (!isNaN(t)) return t;
    }
    // Fallback: Use timestamp from customer_id (e.g., C1705123456789)
    const idMatch = c.customer_id?.match(/C(\d+)/);
    return idMatch ? parseInt(idMatch[1]) : 0;
  };

  const groups = useMemo(() => {
    const deleted = filteredBySearch.filter(c => c.status === CustomerStatus.DELETED)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const candidates = filteredBySearch.filter(c => c.status !== CustomerStatus.DELETED);

    // Sort "New Today" group by exact creation timestamp descending (most recent first)
    const newToday = candidates.filter(c => toISODateKey(c.created_at) === todayStr)
      .sort((a, b) => getCreationTime(b) - getCreationTime(a));
    
    const expiring = candidates.filter(c => { 
      if (c.status !== CustomerStatus.ACTIVE) return false;
      const { daysLeft } = calcInfo(c); 
      return daysLeft >= 0 && daysLeft <= 5 && !!c.video_date; 
    }).sort((a, b) => calcInfo(a).daysLeft - calcInfo(b).daysLeft);

    const active = candidates.filter(c => { 
      if (c.status !== CustomerStatus.ACTIVE) return false;
      const { daysLeft } = calcInfo(c); 
      if (daysLeft <= 0) return false;
      
      // Lọc theo ngày tạo (created_at)
      const createdAtISO = toISODateKey(c.created_at);
      const matchDate = (!dateFrom || createdAtISO >= dateFrom) && (!dateTo || createdAtISO <= dateTo);
      return matchDate;
    }).sort((a, b) => calcInfo(a).daysLeft - calcInfo(b).daysLeft);

    const notStarted = candidates.filter(c => {
      if (c.status !== CustomerStatus.ACTIVE) return false;
      return calcInfo(c).currentDay < 1;
    }).sort((a, b) => calcInfo(a).start.getTime() - calcInfo(b).start.getTime());
    
    const expired = candidates.filter(c => {
      if (c.status !== CustomerStatus.ACTIVE) return false;
      return calcInfo(c).daysLeft < 0;
    }).sort((a, b) => (calcInfo(b).start.getTime() + (b.duration_days || 0) * 86400000) - (calcInfo(a).start.getTime() + (a.duration_days || 0) * 86400000));
    
    return { newToday, expiring, active, notStarted, expired, deleted };
  }, [filteredBySearch, todayStr, dateFrom, dateTo]);

  const summaryStats = useMemo(() => {
    return { 
      new: groups.newToday.length, 
      active: groups.active.length, 
      expiring: groups.expiring.length, 
      total: customers.filter(c => c.status !== CustomerStatus.DELETED).length
    };
  }, [groups, customers]);

  const colorStats = useMemo(() => {
    const stats = { orange: 0, green: 0, gray: 0, brown: 0 };
    customers.filter(c => c.status !== CustomerStatus.DELETED).forEach(c => {
      const category = getCategory(c, products);
      if (category === 'orange') stats.orange++;
      else if (category === 'green') stats.green++;
      else if (category === 'gray') stats.gray++;
      else if (category === 'brown') stats.brown++;
    });
    return stats;
  }, [customers, products]);

  const isSearching = searchTerm.trim() !== "";
  const formatVND = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

  const totalProfit = useMemo(() => {
    return customers
      .filter(c => c.status !== CustomerStatus.DELETED)
      .filter(c => {
        const createdAtISO = toISODateKey(c.created_at);
        return (!dateFrom || createdAtISO >= dateFrom) && (!dateTo || createdAtISO <= dateTo);
      })
      .reduce((acc, c) => {
        const fin = calcRevenueCostProfit(c, products);
        return acc + fin.profit;
      }, 0);
  }, [customers, products, dateFrom, dateTo]);

  return (
    <Layout 
      title={
        <a 
          href="https://docs.google.com/spreadsheets/d/1SV3Zwk93Kti3YxyYuRfTwkM9arm893t0rAMT7iAWeP0/edit?gid=0#gid=0" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-blue-600 transition-colors"
        >
          MAGA PHƯƠNG ADMIN
        </a>
      }
      onIconClick={handleAddStudent}
      actions={
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => onNavigate('plan-editor')}>
            <Plus size={14} className="mr-1.5" /> Tạo PĐ
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('management')}>
            <Users size={14} className="mr-1.5" /> HV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('products')}>
             <Package size={14} className="mr-1.5" /> SP
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('video-groups')}>
            <List size={14} className="mr-1.5" /> PĐ mẫu
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 sm:gap-6 pb-20">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-x-8 sm:gap-y-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-blue-900 px-1 py-1">
             <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-blue-50 sm:border-none sm:p-0"><Zap size={14} className="text-orange-500" /> {summaryStats.new} Mới</div>
             <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-blue-50 sm:border-none sm:p-0"><CheckCircle size={14} className="text-green-500" /> {summaryStats.active} Hoạt động</div>
             <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-blue-50 sm:border-none sm:p-0"><AlertTriangle size={14} className="text-orange-400" /> {summaryStats.expiring} Sắp hết hạn</div>
             <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-blue-50 sm:border-none sm:p-0"><Clock size={14} className="text-blue-500" /> {summaryStats.total} Tổng</div>
             <div className="flex items-center gap-2 bg-green-50 p-2 rounded-xl border border-green-100 sm:border-none sm:p-0 text-green-700"><CheckCircle size={14} className="text-green-600" /> {formatVND(totalProfit)}</div>
          </div>
          
          <div className="flex overflow-x-auto gap-3 sm:gap-x-4 sm:gap-y-2 mt-1 px-1 items-center scrollbar-hide pb-2 sm:pb-0">
             <button onClick={() => setColorFilter(colorFilter === 'orange' ? null : 'orange')} className={`shrink-0 group flex items-center gap-2 transition-all p-2 px-3 rounded-xl border ${colorFilter === 'orange' ? 'bg-orange-50 border-orange-200 shadow-sm scale-105' : 'bg-white border-blue-50 sm:bg-transparent sm:border-transparent opacity-70 hover:opacity-100 hover:bg-gray-50'}`}><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div><span className={`text-[10px] font-black uppercase tracking-tight ${colorFilter === 'orange' ? 'text-orange-700' : 'text-orange-600'}`}>Chưa gán - Mail<span className="text-black ml-1">:{colorStats.orange}</span></span></button>
             <button onClick={() => setColorFilter(colorFilter === 'green' ? null : 'green')} className={`shrink-0 group flex items-center gap-2 transition-all p-2 px-3 rounded-xl border ${colorFilter === 'green' ? 'bg-green-50 border-green-200 shadow-sm scale-105' : 'bg-white border-blue-50 sm:bg-transparent sm:border-transparent opacity-70 hover:opacity-100 hover:bg-gray-50'}`}><div className="w-2.5 h-2.5 rounded-full bg-green-600"></div><span className={`text-[10px] font-black uppercase tracking-tight ${colorFilter === 'green' ? 'text-green-800' : 'text-green-700'}`}>Chưa gán + Mail<span className="text-black ml-1">:{colorStats.green}</span></span></button>
             <button onClick={() => setColorFilter(colorFilter === 'gray' ? null : 'gray')} className={`shrink-0 group flex items-center gap-2 transition-all p-2 px-3 rounded-xl border ${colorFilter === 'gray' ? 'bg-slate-100 border-slate-300 shadow-sm scale-105' : 'bg-white border-blue-50 sm:bg-transparent sm:border-transparent opacity-70 hover:opacity-100 hover:bg-gray-50'}`}><div className="w-2.5 h-2.5 rounded-full bg-[#4B5563]"></div><span className={`text-[10px] font-black uppercase tracking-tight ${colorFilter === 'gray' ? 'text-slate-900' : 'text-slate-600'}`}>Gán - ĐC (Vốn)<span className="text-black ml-1">:{colorStats.gray}</span></span></button>
             <button onClick={() => setColorFilter(colorFilter === 'brown' ? null : 'brown')} className={`shrink-0 group flex items-center gap-2 transition-all p-2 px-3 rounded-xl border ${colorFilter === 'brown' ? 'bg-amber-100 border-amber-300 shadow-sm scale-105' : 'bg-white border-blue-50 sm:bg-transparent sm:border-transparent opacity-70 hover:opacity-100 hover:bg-gray-50'}`}><div className="w-2.5 h-2.5 rounded-full bg-[#8B4513]"></div><span className={`text-[10px] font-black uppercase tracking-tight ${colorFilter === 'brown' ? 'text-amber-950' : 'text-amber-800'}`}>Gán - MVĐ (ĐC)<span className="text-black ml-1">:{colorStats.brown}</span></span></button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end px-1 py-1">
          <div className="relative flex-1 w-full">
            <Search size={20} className="absolute left-0 top-1/2 -translate-y-1/2 text-blue-300" />
            <input 
              className="line-input pl-8 text-base font-bold text-blue-900 placeholder:text-blue-100" 
              placeholder="Tên, SĐT, Mã VD..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-4 w-full md:w-auto">
            <div className="w-full sm:w-40">
              <LineInput 
                label="Từ ngày"
                type="date" 
                value={dateFrom} 
                onChange={e => setDateToFrom(e.target.value)} 
              />
            </div>
            <div className="w-full sm:w-40 relative">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Đến ngày</label>
                <button 
                  onClick={() => { 
                    setSearchTerm(""); 
                    const def = getDefaultDateRange();
                    setDateToFrom(def.from); 
                    setDateTo(def.to); 
                    setColorFilter(null); 
                  }} 
                  className="text-gray-400 hover:text-red-500 transition-all active:scale-90" 
                  title="Xóa bộ lọc"
                >
                  <Eraser size={14} />
                </button>
              </div>
              <DateInput 
                value={dateTo} 
                onChange={val => setDateTo(val)} 
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="flex flex-col gap-6 px-1">
            {groups.newToday.length > 0 && (
              <div>
                <GroupHeader icon={Zap} title="Mới tạo hôm nay" count={groups.newToday.length} colorClass="text-orange-700" isCollapsed={!!collapsedGroups['newToday'] && !isSearching} onToggle={() => toggleGroup('newToday')} />
                {(!collapsedGroups['newToday'] || isSearching) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    {groups.newToday.map(c => <CustomerCard key={c.customer_id} customer={c} products={products} onEdit={(id) => onNavigate('plan-editor', { customerId: id })} onPreview={(id) => onNavigate('preview', { customerId: id })} onDuplicate={(id) => onNavigate('plan-editor', { templateId: id })} onDetail={(id) => onNavigate('management', { customerId: id })} groupColor="text-orange-600" groupIcon={Zap} />)}
                  </div>
                )}
              </div>
            )}
            {groups.expiring.length > 0 && (
              <div>
                <GroupHeader icon={AlertTriangle} title="Sắp hết hạn" count={groups.expiring.length} colorClass="text-amber-700" isCollapsed={!!collapsedGroups['expiring'] && !isSearching} onToggle={() => toggleGroup('expiring')} />
                {(!collapsedGroups['expiring'] || isSearching) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    {groups.expiring.map(c => <CustomerCard key={c.customer_id} customer={c} products={products} onEdit={(id) => onNavigate('plan-editor', { customerId: id })} onPreview={(id) => onNavigate('preview', { customerId: id })} onDuplicate={(id) => onNavigate('plan-editor', { templateId: id })} onDetail={(id) => onNavigate('management', { customerId: id })} groupColor="text-orange-50" groupIcon={AlertTriangle} />)}
                  </div>
                )}
              </div>
            )}
            {groups.active.length > 0 && (
              <div>
                <GroupHeader icon={CheckCircle} title="Đang hoạt động" count={groups.active.length} colorClass="text-green-800" isCollapsed={!!collapsedGroups['active'] && !isSearching} onToggle={() => toggleGroup('active')} />
                {(!collapsedGroups['active'] || isSearching) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    {groups.active.map(c => <CustomerCard key={c.customer_id} customer={c} products={products} onEdit={(id) => onNavigate('plan-editor', { customerId: id })} onPreview={(id) => onNavigate('preview', { customerId: id })} onDuplicate={(id) => onNavigate('plan-editor', { templateId: id })} onDetail={(id) => onNavigate('management', { customerId: id })} groupColor="text-green-600" groupIcon={CheckCircle} />)}
                  </div>
                )}
              </div>
            )}
            {groups.notStarted.length > 0 && (
              <div>
                <GroupHeader icon={Clock} title="Chưa bắt đầu" count={groups.notStarted.length} colorClass="text-blue-800" isCollapsed={!!collapsedGroups['notStarted'] && !isSearching} onToggle={() => toggleGroup('notStarted')} />
                {(!collapsedGroups['notStarted'] || isSearching) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    {groups.notStarted.map(c => <CustomerCard key={c.customer_id} customer={c} products={products} onEdit={(id) => onNavigate('plan-editor', { customerId: id })} onPreview={(id) => onNavigate('preview', { customerId: id })} onDuplicate={(id) => onNavigate('plan-editor', { templateId: id })} onDetail={(id) => onNavigate('management', { customerId: id })} groupColor="text-blue-500" groupIcon={Clock} />)}
                  </div>
                )}
              </div>
            )}
            {groups.expired.length > 0 && (
              <div>
                <GroupHeader icon={Archive} title="Đã kết thúc" count={groups.expired.length} colorClass="text-red-800" isCollapsed={!!collapsedGroups['expired'] && !isSearching} onToggle={() => toggleGroup('expired')} />
                {(!collapsedGroups['expired'] || isSearching) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    {groups.expired.map(c => <CustomerCard key={c.customer_id} customer={c} products={products} onEdit={(id) => onNavigate('plan-editor', { customerId: id })} onPreview={(id) => onNavigate('preview', { customerId: id })} onDuplicate={(id) => onNavigate('plan-editor', { templateId: id })} onDetail={(id) => onNavigate('management', { customerId: id })} groupColor="text-red-500" groupIcon={Archive} />)}
                  </div>
                )}
              </div>
            )}
            {groups.deleted.length > 0 && (
              <div>
                <GroupHeader icon={Trash2} title="Đã xóa" count={groups.deleted.length} colorClass="text-gray-500" isCollapsed={!!collapsedGroups['deleted'] && !isSearching} onToggle={() => toggleGroup('deleted')} />
                {(!collapsedGroups['deleted'] || isSearching) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300 opacity-70 grayscale-[0.3]">
                    {groups.deleted.map(c => <CustomerCard key={c.customer_id} customer={c} products={products} onEdit={(id) => onNavigate('plan-editor', { customerId: id })} onPreview={(id) => onNavigate('preview', { customerId: id })} onDuplicate={(id) => onNavigate('plan-editor', { templateId: id })} onDetail={(id) => onNavigate('management', { customerId: id })} groupColor="text-gray-400" groupIcon={Trash2} />)}
                  </div>
                )}
              </div>
            )}
            {groups.newToday.length === 0 && groups.expiring.length === 0 && groups.active.length === 0 && groups.notStarted.length === 0 && groups.expired.length === 0 && groups.deleted.length === 0 && !loading && (
              <div className="py-24 text-center bg-gray-50/50 rounded-[2.5rem] border border-dashed border-gray-200">
                <p className="text-gray-400 italic text-sm font-medium">Hệ thống không tìm thấy học viên nào khớp với bộ lọc...</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="THÊM HỌC VIÊN MỚI"
        maxWidth="max-w-4xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>HỦY BỎ</Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <RefreshCw size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
              LƯU HỌC VIÊN
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-1">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
              <h3 className="text-[13px] font-black text-blue-900 uppercase tracking-widest">Thông tin cơ bản</h3>
            </div>
            
            <LineInput 
              label="Tên học viên" 
              placeholder="VÍ DỤ: NGUYỄN THỊ MAI" 
              icon={<User size={14} />}
              value={formData.customer_name} 
              onChange={e => setFormData({ ...formData, customer_name: e.target.value.toUpperCase() })} 
            />
            
            <div className="grid grid-cols-2 gap-4">
              <LineInput 
                label="Số điện thoại" 
                placeholder="09xx..." 
                icon={<Phone size={14} />}
                value={formData.sdt} 
                onChange={e => setFormData({ ...formData, sdt: e.target.value })} 
              />
              <LineInput 
                label="Email" 
                placeholder="example@mail.com" 
                icon={<Mail size={14} />}
                value={formData.email} 
                onChange={e => setFormData({ ...formData, email: e.target.value })} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <LineInput 
                label="Ngày bắt đầu" 
                type="date" 
                value={formData.start_date} 
                onChange={e => setFormData({ ...formData, start_date: e.target.value })} 
              />
              <LineInput 
                label="Số ngày tập" 
                type="number" 
                value={formData.duration_days} 
                onChange={e => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 0 })} 
              />
            </div>

            <LineInput 
              label="Mã vận đơn" 
              placeholder="Mã vận đơn..." 
              icon={<Truck size={14} />}
              value={formData.ma_vd} 
              onChange={e => setFormData({ ...formData, ma_vd: e.target.value })} 
            />

            <LineInput 
              label="Địa chỉ" 
              placeholder="Số nhà, tên đường, quận/huyện..." 
              icon={<MapPin size={14} />}
              value={formData.dia_chi} 
              onChange={e => setFormData({ ...formData, dia_chi: e.target.value })} 
            />
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                <h3 className="text-[13px] font-black text-blue-900 uppercase tracking-widest">Đơn hàng & Sản phẩm</h3>
              </div>
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
            </div>

            <div className="bg-gray-50/50 rounded-3xl p-6 border border-blue-50">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">PHÁC ĐỒ:</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setIsAddModalOpen(false);
                      onNavigate('plan-editor', { draftCustomer: formData });
                    }}
                    className="flex items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all border border-blue-100 hover:scale-110"
                    title="Thêm phác đồ mới"
                  >
                    <Plus size={22} />
                  </button>
                  <button 
                    onClick={() => setIsCopyModalOpen(true)}
                    className="flex items-center justify-center w-10 h-10 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-all border border-orange-100 hover:scale-110"
                    title="Copy phác đồ từ học viên khác"
                  >
                    <CopyPlus size={22} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                {(formData.san_pham || []).map(item => (
                  <div key={item.id_sp} className="flex items-center justify-between group bg-white p-3 rounded-2xl border border-blue-50/50 shadow-sm">
                    <div className="flex-1">
                      <div className="text-[12px] font-black text-blue-900 uppercase">{item.ten_sp}</div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-[11px] font-bold text-gray-400">SL: <input type="number" className="w-8 bg-transparent outline-none font-bold text-blue-600 border-b border-blue-50 focus:border-blue-400" value={item.so_luong || 0} onChange={e => updateProductQty(item.id_sp, parseInt(e.target.value) || 0)} /></span>
                        <span className="text-[11px] font-bold text-gray-400">GIÁ: <input type="text" className="w-20 bg-transparent outline-none font-bold text-blue-900 border-b border-blue-50 focus:border-blue-400" value={formatVND(item.don_gia || 0)} onChange={e => updateProductPrice(item.id_sp, parseInt(e.target.value.replace(/\D/g, '')) || 0)} /></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-blue-600">{formatVND(item.thanh_tien)}</span>
                      <button onClick={() => toggleProduct(products.find(p => p.id_sp === item.id_sp)!)} className="text-red-200 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {(formData.san_pham || []).length === 0 && (
                  <div className="py-10 text-center">
                    <ShoppingBag size={32} className="mx-auto text-blue-100 mb-2" />
                    <p className="text-gray-400 italic text-[11px]">Chưa chọn sản phẩm nào cho đơn hàng này</p>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-blue-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TỔNG THANH TOÁN</span>
                  <span className="text-2xl font-black text-blue-600">{formatVND(formData.gia_tien || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => { setIsCopyModalOpen(false); setCopySearchTerm(""); }}
        title="CHỌN HỌC VIÊN ĐỂ COPY PHÁC ĐỒ"
        maxWidth="max-w-2xl"
      >
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Tìm tên, SĐT học viên..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold text-blue-900"
              value={copySearchTerm}
              onChange={(e) => setCopySearchTerm(e.target.value)}
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
            {customers
              .filter(c => c.video_date && (
                c.customer_name.toLowerCase().includes(copySearchTerm.toLowerCase()) ||
                c.sdt.includes(copySearchTerm)
              ))
              .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
              .map(c => (
                <div 
                  key={c.customer_id}
                  onClick={async () => {
                    if (isCopying) return;
                    setIsCopying(true);
                    try {
                      onNavigate('plan-editor', { draftCustomer: formData, templateId: c.customer_id });
                      setIsCopyModalOpen(false);
                      setIsAddModalOpen(false);
                    } catch (e) {
                      alert("Lỗi khi copy phác đồ!");
                    } finally {
                      setIsCopying(false);
                    }
                  }}
                  className="flex items-center justify-between p-4 hover:bg-blue-50 rounded-2xl cursor-pointer border border-transparent hover:border-blue-100 transition-all group"
                >
                  <div className="flex flex-col">
                    <span className="font-black text-blue-900 uppercase text-sm group-hover:text-blue-600">{c.customer_name}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SĐT: {c.sdt || '---'} | NGÀY: {formatDDMMYYYY(c.video_date)}</span>
                  </div>
                  <CopyPlus size={18} className="text-gray-300 group-hover:text-blue-600" />
                </div>
              ))}
            {customers.filter(c => c.video_date).length === 0 && (
              <div className="py-10 text-center text-gray-400 italic text-sm">Chưa có học viên nào có phác đồ để copy...</div>
            )}
          </div>
        </div>
      </Modal>
    </Layout>
  );
};
