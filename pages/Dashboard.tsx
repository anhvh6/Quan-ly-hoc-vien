
import React, { useState, useEffect, useMemo } from 'react';
import { Search, UserPlus, Users, Calendar, ExternalLink, Edit2, Copy, Package, Clock, AlertTriangle, CheckCircle, Archive, Zap, CopyPlus, UserCircle, Filter, Eraser, AlertCircle, X, Plus, Mail, MapPin, Truck, FileWarning, User, Play, List, ChevronDown, ChevronRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Card, Button, LineInput } from '../components/UI';
import { api } from '../services/api'; 
import { Customer, CustomerStatus, Product } from '../types';
import { calcRevenueCostProfit, isChuaGan } from '../utils/finance';
import { formatDDMM, formatDDMMYYYY, toISODateKey } from '../utils/date';

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

const CustomerCard: React.FC<CustomerCardProps> = ({ customer, products, onEdit, onPreview, onDuplicate, onDetail, groupColor, groupIcon: GroupIcon }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(customer.start_date);
  start.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - start.getTime();
  const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const daysLeft = (customer.duration_days || 62) - (currentDay > 0 ? currentDay : 0);

  const formattedStart = formatDDMM(customer.start_date);
  
  const hasPlan = !!customer.video_date && String(customer.video_date).trim() !== "";
  const isNotAssigned = isChuaGan(customer);
  const hasEmail = !!customer.email && String(customer.email).trim() !== "";
  const hasAddress = !!customer.dia_chi && String(customer.dia_chi).trim() !== "";
  const hasMvd = !!customer.ma_vd && String(customer.ma_vd).trim() !== "";
  const { hasVon } = calcRevenueCostProfit(customer, products);

  let StatusIcon = GroupIcon;
  let iconColorClass = "text-blue-500";
  let iconBgClass = "bg-blue-100/50";
  let cardBorderClass = "border-blue-100";
  let cardGradientClass = "bg-gradient-to-r from-blue-50/80 to-white";

  if (!hasPlan) {
    StatusIcon = FileWarning; 
    iconColorClass = "text-red-500";
    iconBgClass = "bg-red-100";
    cardBorderClass = "border-red-200";
    cardGradientClass = "bg-gradient-to-r from-red-50/60 to-white";
  } else if (isNotAssigned) {
    if (!hasEmail) {
      StatusIcon = Mail; 
      iconColorClass = "text-orange-600";
      iconBgClass = "bg-orange-100";
      cardBorderClass = "border-orange-200";
      cardGradientClass = "bg-gradient-to-r from-orange-50/60 to-white";
    } else {
      StatusIcon = Play; 
      iconColorClass = "text-green-600";
      iconBgClass = "bg-green-100";
      cardBorderClass = "border-green-200";
      cardGradientClass = "bg-gradient-to-r from-green-50/60 to-white";
    }
  } else if (hasVon) {
    if (!hasAddress) {
      StatusIcon = MapPin; 
      iconColorClass = "text-slate-600";
      iconBgClass = "bg-slate-200";
      cardBorderClass = "border-slate-300";
      cardGradientClass = "bg-gradient-to-r from-slate-50 to-white";
    } else if (!hasMvd) {
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
  }

  const handleCardClick = () => {
    if (hasPlan) onPreview(customer.customer_id);
    else onEdit(customer.customer_id);
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`relative flex items-center gap-4 p-4 ${cardGradientClass} border ${cardBorderClass} rounded-[1.5rem] transition-all hover:shadow-xl hover:-translate-y-1 group cursor-pointer shadow-sm overflow-hidden`}
    >
      <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div 
        onClick={(e) => { e.stopPropagation(); onDetail(customer.customer_id); }}
        className={`relative z-10 w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center ${iconBgClass} ${iconColorClass} shadow-inner transition-transform group-hover:scale-105 active:scale-95`}
        title="Quản lý chi tiết học viên"
      >
        <StatusIcon size={26} strokeWidth={1.5} />
      </div>
      <div className="relative z-10 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-[14px] font-extrabold text-[#1E3A8A] truncate uppercase tracking-tight">
            {customer.customer_name}
          </h4>
        </div>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5 bg-white/60 px-2 py-0.5 rounded-lg border border-white/50 shadow-sm">
            <Calendar size={11} className="text-blue-400" />
            <span className="text-[10px] text-gray-500 font-bold">{formattedStart}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/60 px-2 py-0.5 rounded-lg border border-white/50 shadow-sm">
             <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">Ngày {currentDay > 0 ? currentDay : 0}</span>
          </div>
          <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-lg ${daysLeft < 0 ? 'bg-red-50 text-red-500' : daysLeft <= 5 ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-500'}`}>
            {daysLeft < 0 ? 'Hết hạn' : `Còn ${daysLeft}D`}
          </span>
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-1.5 ml-2">
        {hasPlan && (
          <>
            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(customer.link); alert("Đã copy link phác đồ!"); }} className="w-9 h-9 flex items-center justify-center text-blue-600 bg-white hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm border border-blue-50 active:scale-90"><Copy size={16} /></button>
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(customer.customer_id); }} className="w-9 h-9 flex items-center justify-center text-orange-600 bg-white hover:bg-orange-600 hover:text-white rounded-xl transition-all shadow-sm border border-orange-50 active:scale-90"><CopyPlus size={16} /></button>
          </>
        )}
        <button onClick={(e) => { e.stopPropagation(); onEdit(customer.customer_id); }} className="w-9 h-9 flex items-center justify-center text-green-600 bg-white hover:bg-green-600 hover:text-white rounded-xl transition-all shadow-sm border border-green-50 active:scale-90"><Edit2 size={16} /></button>
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
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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
    const start = new Date(c.start_date);
    start.setHours(0, 0, 0, 0);
    const diff = today.getTime() - start.getTime();
    const currentDay = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    const daysLeft = (c.duration_days || 62) - (currentDay > 0 ? currentDay : 0);
    return { currentDay, daysLeft, start };
  };

  const filteredBySearchAndDate = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return customers.filter(c => {
      if (c.status === CustomerStatus.DELETED) return false;
      const matchSearch = String(c.customer_name || '').toLowerCase().includes(term) || String(c.ma_vd || '').toLowerCase().includes(term);
      
      const createdAtISO = toISODateKey(c.created_at);
      const matchDate = (!dateFrom || createdAtISO >= dateFrom) && (!dateTo || createdAtISO <= dateTo);
      
      return matchSearch && matchDate;
    });
  }, [customers, searchTerm, dateFrom, dateTo]);

  const colorStats = useMemo(() => {
    const stats = { orange: 0, green: 0, gray: 0, brown: 0 };
    filteredBySearchAndDate.forEach(c => {
      const isNotAssigned = isChuaGan(c);
      const { hasVon } = calcRevenueCostProfit(c, products);
      const hasEmail = !!c.email && String(c.email).trim() !== "";
      const hasAddress = !!c.dia_chi && String(c.dia_chi).trim() !== "";
      const hasMvd = !!c.ma_vd && String(c.ma_vd).trim() !== "";
      if (isNotAssigned && !hasEmail) stats.orange++;
      else if (isNotAssigned && hasEmail) stats.green++;
      else if (!isNotAssigned && c.trang_thai === 1 && hasVon && !hasAddress) stats.gray++;
      else if (!isNotAssigned && c.trang_thai === 1 && hasVon && hasAddress && !hasMvd) stats.brown++;
    });
    return stats;
  }, [filteredBySearchAndDate, products]);

  const handleColorFilterClick = (filter: string) => {
    const newVal = colorFilter === filter ? null : filter;
    setColorFilter(newVal);
    // Khi chọn bộ lọc màu, tự động mở rộng tất cả các nhóm để xem ngay kết quả học viên thỏa mãn điều kiện
    if (newVal) {
      setCollapsedGroups({
        newToday: false,
        expiring: false,
        active: false,
        notStarted: false,
        expired: false
      });
    }
  };

  const baseFiltered = useMemo(() => {
    return filteredBySearchAndDate.filter(c => {
      if (!colorFilter) return true;
      const isNotAssigned = isChuaGan(c);
      const { hasVon } = calcRevenueCostProfit(c, products);
      const hasEmail = !!c.email && String(c.email).trim() !== "";
      const hasAddress = !!c.dia_chi && String(c.dia_chi).trim() !== "";
      const hasMvd = !!c.ma_vd && String(c.ma_vd).trim() !== "";
      if (colorFilter === 'orange') return isNotAssigned && !hasEmail;
      if (colorFilter === 'green') return isNotAssigned && hasEmail;
      if (colorFilter === 'gray') return !isNotAssigned && c.trang_thai === 1 && hasVon && !hasAddress;
      if (colorFilter === 'brown') return !isNotAssigned && c.trang_thai === 1 && hasVon && hasAddress && !hasMvd;
      return true;
    });
  }, [filteredBySearchAndDate, colorFilter, products]);

  const summaryStats = useMemo(() => {
    const newCount = baseFiltered.filter(c => toISODateKey(c.created_at) === todayStr).length;
    const expiringCount = baseFiltered.filter(c => {
      const { currentDay, daysLeft } = calcInfo(c);
      return currentDay >= 1 && daysLeft >= 0 && daysLeft <= 5;
    }).length;
    return { new: newCount, active: baseFiltered.filter(c => calcInfo(c).daysLeft >= 0).length, expiring: expiringCount, total: baseFiltered.length };
  }, [baseFiltered, todayStr]);

  const groups = useMemo(() => {
    const newToday = baseFiltered.filter(c => toISODateKey(c.created_at) === todayStr).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const expiring = baseFiltered.filter(c => { const { currentDay, daysLeft } = calcInfo(c); return currentDay >= 1 && daysLeft >= 0 && daysLeft <= 5 && !!c.video_date; }).sort((a, b) => calcInfo(a).daysLeft - calcInfo(b).daysLeft);
    const active = baseFiltered.filter(c => { const { currentDay, daysLeft } = calcInfo(c); return currentDay >= 1 && daysLeft >= 0 && !newToday.includes(c) && !expiring.includes(c); }).sort((a, b) => calcInfo(a).start.getTime() - calcInfo(b).start.getTime());
    const notStarted = baseFiltered.filter(c => calcInfo(c).currentDay < 1).sort((a, b) => calcInfo(a).start.getTime() - calcInfo(b).start.getTime());
    const expired = baseFiltered.filter(c => calcInfo(c).daysLeft < 0).sort((a, b) => (calcInfo(b).start.getTime() + b.duration_days * 86400000) - (calcInfo(a).start.getTime() + a.duration_days * 86400000));
    return { newToday, expiring, active, notStarted, expired };
  }, [baseFiltered, todayStr]);

  return (
    <Layout 
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onNavigate('video-groups')}>
            <List size={14} className="mr-1.5" /> Phác đồ mẫu
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('management')}>
            <Users size={14} className="mr-1.5" /> Học viên
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onNavigate('products')}>
             <Package size={14} className="mr-1.5" /> Sản phẩm
          </Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate('plan-editor')}>
            <Plus size={14} className="mr-1.5" /> Tạo PĐ
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6 pb-20">
        {/* Khu vực thống kê: Đã lược bỏ nền trắng và khung viền để tiết kiệm diện tích */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-[11px] font-black uppercase tracking-widest text-blue-900 px-1 py-1">
             <div className="flex items-center gap-2"><Zap size={14} className="text-orange-500" /> {summaryStats.new} Mới tạo</div>
             <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> {summaryStats.active} Hoạt động</div>
             <div className="flex items-center gap-2"><AlertTriangle size={14} className="text-orange-400" /> {summaryStats.expiring} Sắp hết hạn</div>
             <div className="flex items-center gap-2"><Clock size={14} className="text-blue-500" /> {summaryStats.total} Tổng số</div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1 px-1 items-center">
             <button onClick={() => handleColorFilterClick('orange')} className={`group flex items-center gap-2 transition-all p-2 px-3 rounded-xl border ${colorFilter === 'orange' ? 'bg-orange-50 border-orange-200 shadow-sm scale-105' : 'bg-transparent border-transparent opacity-70 hover:opacity-100 hover:bg-gray-50'}`}><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div><span className={`text-[10px] font-black uppercase tracking-tight ${colorFilter === 'orange' ? 'text-orange-700' : 'text-orange-600'}`}>Chưa gán + Thiếu Email<span className="text-black ml-1">:{colorStats.orange}</span></span></button>
             <button onClick={() => handleColorFilterClick('green')} className={`group flex items-center gap-2 transition-all p-2 px-3 rounded-xl border ${colorFilter === 'green' ? 'bg-green-50 border-green-200 shadow-sm scale-105' : 'bg-transparent border-transparent opacity-70 hover:opacity-100 hover:bg-gray-50'}`}><div className="w-2.5 h-2.5 rounded-full bg-green-600"></div><span className={`text-[10px] font-black uppercase tracking-tight ${colorFilter === 'green' ? 'text-green-800' : 'text-green-700'}`}>Chưa gán + Có Email<span className="text-black ml-1">:{colorStats.green}</span></span></button>
             <button onClick={() => handleColorFilterClick('gray')} className={`group flex items-center gap-2 transition-all p-2 px-3 rounded-xl border ${colorFilter === 'gray' ? 'bg-slate-100 border-slate-300 shadow-sm scale-105' : 'bg-transparent border-transparent opacity-70 hover:opacity-100 hover:bg-gray-50'}`}><div className="w-2.5 h-2.5 rounded-full bg-[#4B5563]"></div><span className={`text-[10px] font-black uppercase tracking-tight ${colorFilter === 'gray' ? 'text-slate-900' : 'text-slate-600'}`}>Đã gán + Thiếu Địa chỉ<span className="text-black ml-1">:{colorStats.gray}</span></span></button>
             <button onClick={() => handleColorFilterClick('brown')} className={`group flex items-center gap-2 transition-all p-2 px-3 rounded-xl border ${colorFilter === 'brown' ? 'bg-amber-100 border-amber-300 shadow-sm scale-105' : 'bg-transparent border-transparent opacity-70 hover:opacity-100 hover:bg-gray-50'}`}><div className="w-2.5 h-2.5 rounded-full bg-[#8B4513]"></div><span className={`text-[10px] font-black uppercase tracking-tight ${colorFilter === 'brown' ? 'text-amber-950' : 'text-amber-800'}`}>Đã gán + Thiếu MVĐ<span className="text-black ml-1">:{colorStats.brown}</span></span></button>
          </div>
        </div>

        {/* Khu vực tìm kiếm và bộ lọc ngày: Đã tối giản, loại bỏ khung bao ngoài */}
        <div className="flex flex-col md:flex-row gap-4 items-end px-1 py-1">
          <div className="relative flex-1 w-full">
            <Search size={20} className="absolute left-0 top-1/2 -translate-y-1/2 text-blue-300" />
            <input 
              className="line-input pl-8 text-base font-bold text-blue-900 placeholder:text-blue-100" 
              placeholder="Tìm kiếm theo Tên, SĐT, Mã VD..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <div className="flex-1 md:w-40">
              <LineInput 
                placeholder={`Từ (${formatDDMMYYYY(dateFrom)})`}
                type="date" 
                value={dateFrom} 
                onChange={e => setDateToFrom(e.target.value)} 
              />
            </div>
            <div className="flex-1 md:w-40">
              <LineInput 
                placeholder={`Đến (${formatDDMMYYYY(dateTo)})`}
                type="date" 
                value={dateTo} 
                onChange={e => setDateTo(e.target.value)} 
              />
            </div>
            <button 
              onClick={() => { 
                setSearchTerm(""); 
                const def = getDefaultDateRange();
                setDateToFrom(def.from); 
                setDateTo(def.to); 
                setColorFilter(null); 
              }} 
              className="p-2 text-gray-400 hover:text-red-500 transition-all active:scale-90" 
              title="Xóa bộ lọc"
            >
              <Eraser size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : (
          <div className="flex flex-col gap-6 px-1">
            {groups.newToday.length > 0 && (
              <div>
                <GroupHeader 
                  icon={Zap} 
                  title="Mới tạo hôm nay" 
                  count={groups.newToday.length} 
                  colorClass="text-orange-700" 
                  isCollapsed={!!collapsedGroups['newToday']}
                  onToggle={() => toggleGroup('newToday')}
                />
                {!collapsedGroups['newToday'] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    {groups.newToday.map(c => <CustomerCard key={c.customer_id} customer={c} products={products} onEdit={(id) => onNavigate('plan-editor', { customerId: id })} onPreview={(id) => onNavigate('preview', { customerId: id })} onDuplicate={(id) => onNavigate('plan-editor', { templateId: id })} onDetail={(id) => onNavigate('management', { customerId: id })} groupColor="text-orange-600" groupIcon={Zap} />)}
                  </div>
                )}
              </div>
            )}
            {groups.expiring.length > 0 && (
              <div>
                <GroupHeader 
                  icon={AlertTriangle} 
                  title="Sắp hết hạn" 
                  count={groups.expiring.length} 
                  colorClass="text-amber-700" 
                  isCollapsed={!!collapsedGroups['expiring']}
                  onToggle={() => toggleGroup('expiring')}
                />
                {!collapsedGroups['expiring'] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    {groups.expiring.map(c => <CustomerCard key={c.customer_id} customer={c} products={products} onEdit={(id) => onNavigate('plan-editor', { customerId: id })} onPreview={(id) => onNavigate('preview', { customerId: id })} onDuplicate={(id) => onNavigate('plan-editor', { templateId: id })} onDetail={(id) => onNavigate('management', { customerId: id })} groupColor="text-orange-50" groupIcon={AlertTriangle} />)}
                  </div>
                )}
              </div>
            )}
            {groups.active.length > 0 && (
              <div>
                <GroupHeader 
                  icon={CheckCircle} 
                  title="Đang hoạt động" 
                  count={groups.active.length} 
                  colorClass="text-green-800" 
                  isCollapsed={!!collapsedGroups['active']}
                  onToggle={() => toggleGroup('active')}
                />
                {!collapsedGroups['active'] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    {groups.active.map(c => <CustomerCard key={c.customer_id} customer={c} products={products} onEdit={(id) => onNavigate('plan-editor', { customerId: id })} onPreview={(id) => onNavigate('preview', { customerId: id })} onDuplicate={(id) => onNavigate('plan-editor', { templateId: id })} onDetail={(id) => onNavigate('management', { customerId: id })} groupColor="text-green-600" groupIcon={CheckCircle} />)}
                  </div>
                )}
              </div>
            )}
            {groups.notStarted.length > 0 && (
              <div>
                <GroupHeader 
                  icon={Clock} 
                  title="Chưa bắt đầu" 
                  count={groups.notStarted.length} 
                  colorClass="text-blue-800" 
                  isCollapsed={!!collapsedGroups['notStarted']}
                  onToggle={() => toggleGroup('notStarted')}
                />
                {!collapsedGroups['notStarted'] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    {groups.notStarted.map(c => <CustomerCard key={c.customer_id} customer={c} products={products} onEdit={(id) => onNavigate('plan-editor', { customerId: id })} onPreview={(id) => onNavigate('preview', { customerId: id })} onDuplicate={(id) => onNavigate('plan-editor', { templateId: id })} onDetail={(id) => onNavigate('management', { customerId: id })} groupColor="text-blue-500" groupIcon={Clock} />)}
                  </div>
                )}
              </div>
            )}
            {groups.expired.length > 0 && (
              <div>
                <GroupHeader 
                  icon={Archive} 
                  title="Đã kết thúc" 
                  count={groups.expired.length} 
                  colorClass="text-red-800" 
                  isCollapsed={!!collapsedGroups['expired']}
                  onToggle={() => toggleGroup('expired')}
                />
                {!collapsedGroups['expired'] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-6 animate-in slide-in-from-top-2 duration-300">
                    {groups.expired.map(c => <CustomerCard key={c.customer_id} customer={c} products={products} onEdit={(id) => onNavigate('plan-editor', { customerId: id })} onPreview={(id) => onNavigate('preview', { customerId: id })} onDuplicate={(id) => onNavigate('plan-editor', { templateId: id })} onDetail={(id) => onNavigate('management', { customerId: id })} groupColor="text-red-500" groupIcon={Archive} />)}
                  </div>
                )}
              </div>
            )}
            {baseFiltered.length === 0 && !loading && (<div className="py-24 text-center bg-gray-50/50 rounded-[2.5rem] border border-dashed border-gray-200"><p className="text-gray-400 italic text-sm font-medium">Hệ thống không tìm thấy học viên nào trong danh sách hiện tại...</p></div>)}
          </div>
        )}
      </div>
    </Layout>
  );
};
