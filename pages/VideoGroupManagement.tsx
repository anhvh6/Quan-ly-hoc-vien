
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Plus, Trash2, Calendar, CheckSquare, Square, Loader2, ChevronDown, Target, CheckCircle2, Zap, Users, RefreshCw, AlertCircle, Play, FileSpreadsheet, Edit3, Eye } from 'lucide-react';
import { Layout as MainLayout } from '../components/Layout';
import { Button, LineInput, Modal } from '../components/UI';
import { api } from '../services/api';
import { VideoGroup, ExerciseTask, ExerciseType } from '../types';
import { EXERCISE_TYPES } from '../constants';
import { formatDDMM, formatDDMMYYYY, toISODateKey } from '../utils/date';

export const VideoGroupManagement: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [groups, setGroups] = useState<VideoGroup[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [tasks, setTasks] = useState<ExerciseTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<ExerciseTask | null>(null);
  const [newGroupDate, setNewGroupDate] = useState(""); 
  const [contentSearch, setContentSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{task: ExerciseTask, groupDateKey: string} | null>(null);
  const [newTaskData, setNewTaskData] = useState<Partial<ExerciseTask>>({ day: 1, type: ExerciseType.MANDATORY, title: "", detail: "", link: "" });
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; type: 'task' | 'group'; payload: any; title: string; message: string; }>({ isOpen: false, type: 'task', payload: null, title: "", message: "" });

  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(contentSearch), 300);
    return () => clearTimeout(handler);
  }, [contentSearch]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownContainerRef.current && !dropdownContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const groupStats = useMemo(() => {
    const studentCount = groups.filter(g => selectedKeys.includes(g.video_date_key)).reduce((acc, curr) => acc + (curr.active_students || 0), 0);
    return {
      totalTasks: tasks.length,
      mandatory: tasks.filter(t => String(t.type).includes('Bắt buộc')).length,
      optional: tasks.filter(t => String(t.type).includes('Bổ trợ')).length,
      uniqueDays: new Set(tasks.map(t => t.day)).size,
      studentCount
    };
  }, [tasks, groups, selectedKeys]);

  const fetchTasksForSelected = useCallback(async (keys: string[]) => {
    if (!keys.length) { setTasks([]); return; }
    setTasksLoading(true);
    try {
      const results = await Promise.all(keys.map(k => api.getPlan("NEW", k)));
      const all: ExerciseTask[] = [];
      results.forEach((data, idx) => {
        if (Array.isArray(data)) {
          all.push(...data.map(t => ({ 
            ...t, 
            video_date: formatDDMM(keys[idx]), 
            _video_date_key: keys[idx] 
          })));
        }
      });
      setTasks(all.sort((a, b) => (b._video_date_key || '').localeCompare(a._video_date_key || '') || (a.day - b.day)));
    } catch (e) { console.error(e); } finally { setTasksLoading(false); }
  }, []);

  const fetchInitialData = useCallback(async (targetKeyToSelect?: string) => {
    setLoading(true);
    try {
      const data = await api.getVideoGroups();
      setGroups(data || []);
      
      let keyToUse = targetKeyToSelect;
      if (!keyToUse && data?.length) {
        keyToUse = data[0].video_date_key;
      }
      
      if (keyToUse) {
        setSelectedKeys([keyToUse]);
        await fetchTasksForSelected([keyToUse]);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [fetchTasksForSelected]);

  useEffect(() => { 
    fetchInitialData(); 
  }, []); 

  useEffect(() => { 
    if (!loading && selectedKeys.length > 0) {
      fetchTasksForSelected(selectedKeys); 
    }
  }, [selectedKeys, loading, fetchTasksForSelected]);

  const handleConfirmedDelete = async () => {
    const { type, payload } = confirmDelete;
    setConfirmDelete(prev => ({ ...prev, isOpen: false }));
    if (type === 'task') {
      const task = payload as ExerciseTask;
      setTasksLoading(true);
      try {
        await api.deleteVideoTask(task._rowNumber!);
        await fetchTasksForSelected(selectedKeys);
      } catch (e) { alert("Xóa thất bại"); } finally { setTasksLoading(false); }
    } else {
      const group = payload as VideoGroup;
      setDeletingKey(group.video_date_key);
      try {
        await api.deleteVideoGroup(group.video_date_key);
        setGroups(prev => prev.filter(g => g.video_date_key !== group.video_date_key));
        const newSelected = selectedKeys.filter(k => k !== group.video_date_key);
        setSelectedKeys(newSelected);
        if (newSelected.length > 0) fetchTasksForSelected(newSelected);
      } catch (e) { alert("Xóa thất bại"); } finally { setDeletingKey(null); }
    }
  };

  const exportToExcel = () => {
    if (tasks.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }
    const headers = ["Ngày tập", "Loại", "Tên bài tập", "Chi tiết", "Link Video", "Nhóm Video"];
    const rows = tasks.map(t => [
      t.day,
      t.type,
      t.title,
      t.detail.replace(/\n/g, ' '),
      t.link,
      t.video_date
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = selectedKeys.length === 1 
      ? `PhacDoMau_${formatDDMM(selectedKeys[0]).replace(/\//g, '-')}.csv` 
      : `PhacDoMau_TongHop.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTasks = useMemo(() => {
    const s = debouncedSearch.toLowerCase();
    return s ? tasks.filter(t => t.title.toLowerCase().includes(s) || t.detail.toLowerCase().includes(s)) : tasks;
  }, [tasks, debouncedSearch]);

  const handleEditClick = (e: React.MouseEvent, task: ExerciseTask) => {
    e.stopPropagation(); // Ngăn sự kiện click dòng (View Modal)
    setEditingTask({ task: task, groupDateKey: task._video_date_key! });
    setNewTaskData(task);
    setIsTaskModalOpen(true);
  };

  const handleRowClick = (task: ExerciseTask) => {
    setViewingTask(task);
    setIsViewModalOpen(true);
  };

  return (
    <MainLayout title="QUẢN LÝ PHÁC ĐỒ MẪU" onBack={() => onNavigate('dashboard')} actions={
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => fetchInitialData()}><RefreshCw size={14} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Tải lại</Button>
        <Button variant="outline" size="sm" onClick={exportToExcel} disabled={tasks.length === 0}><FileSpreadsheet size={16} className="mr-2 text-green-600" /> XUẤT EXCEL</Button>
        {selectedKeys.length === 1 && (
          <Button variant="primary" size="sm" onClick={() => { setIsTaskModalOpen(true); setEditingTask(null); setNewTaskData({ day: 1, type: ExerciseType.MANDATORY, title: "", detail: "", link: "" }); }}><Plus size={16} className="mr-2" /> THÊM BÀI TẬP</Button>
        )}
      </div>
    }>
      <div className="flex flex-col gap-6">
        {/* Thống kê nhanh */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-blue-900 text-white p-4 rounded-2xl shadow-lg border border-blue-800">
            <div className="text-[10px] font-black uppercase opacity-60 mb-1">Tổng bài tập</div>
            <div className="text-2xl font-black flex items-center gap-2"><Target size={20} className="text-blue-400"/> {groupStats.totalTasks}</div>
          </div>
          {[{l: 'Bắt buộc', v: groupStats.mandatory, i: Zap, c: 'text-orange-500'}, {l: 'Bổ trợ', v: groupStats.optional, i: CheckCircle2, c: 'text-green-500'}, {l: 'Ngày tập', v: groupStats.uniqueDays, i: Calendar, c: 'text-blue-500'}, {l: 'Học viên', v: groupStats.studentCount, i: Users, c: 'text-purple-500'}].map(s => (
            <div key={s.l} className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
              <div className="text-[10px] font-black uppercase text-blue-600 mb-1">{s.l}</div>
              <div className={`text-2xl font-black text-blue-900 flex items-center gap-2`}><s.i size={20} className={s.c}/> {s.v}</div>
            </div>
          ))}
        </div>

        {/* Bộ lọc và Tìm kiếm */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col gap-2" ref={dropdownContainerRef}>
            <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest px-1">Chọn Nhóm Video</label>
            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full bg-white border border-blue-100 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-sm hover:border-blue-300 transition-all text-sm font-bold text-blue-900">
                <div className="flex items-center gap-2"><Calendar size={18} className="text-blue-500" /><span>{selectedKeys.length} nhóm đang chọn</span></div>
                <ChevronDown size={18} className={`text-blue-300 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-[100] mt-2 bg-white border border-blue-50 rounded-2xl shadow-2xl max-h-80 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2">
                  <button onClick={() => { setIsNewGroupModalOpen(true); setIsDropdownOpen(false); }} className="w-full mb-2 flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase shadow-md"><Plus size={16} /> Thêm nhóm mới</button>
                  {groups.map(g => (
                    <div key={g.video_date_key} className="flex items-center justify-between hover:bg-blue-50 rounded-xl p-3 cursor-pointer group" onClick={() => setSelectedKeys(prev => prev.includes(g.video_date_key) ? prev.filter(k => k !== g.video_date_key) : [...prev, g.video_date_key])}>
                      <div className="flex items-center gap-3">{selectedKeys.includes(g.video_date_key) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-gray-300" />}<span className="text-sm font-bold text-blue-900">{formatDDMM(g.video_date)}</span></div>
                      {(g.active_students || 0) === 0 && (
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete({ isOpen: true, type: 'group', payload: g, title: "XÓA NHÓM", message: `Xóa toàn bộ dữ liệu mẫu của ngày ${formatDDMMYYYY(g.video_date)}?` }); }} className="text-red-200 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-8 flex flex-col gap-2">
            <label className="text-[11px] font-black text-blue-600 uppercase tracking-widest px-1">Tìm bài tập</label>
            <div className="relative"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300" /><input className="w-full bg-white border border-blue-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-blue-900 outline-none focus:border-blue-300 shadow-sm" placeholder="Tìm tên bài hoặc chi tiết..." value={contentSearch} onChange={e => setContentSearch(e.target.value)} /></div>
          </div>
        </div>

        {/* Bảng danh sách bài tập */}
        <div className="bg-white rounded-3xl border border-blue-50 shadow-xl overflow-hidden min-h-[400px]">
          <table className="w-full text-left">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase w-16 text-center">Row</th>
                <th className="p-4 text-[10px] font-black uppercase w-24">Nhóm</th>
                <th className="p-4 text-[10px] font-black uppercase w-16 text-center">Day</th>
                <th className="p-4 text-[10px] font-black uppercase w-28">Loại</th>
                <th className="p-4 text-[10px] font-black uppercase">Tên bài tập</th>
                <th className="p-4 text-[10px] font-black uppercase w-24 text-center">Thao tác</th>
                <th className="p-4 text-center text-[10px] font-black uppercase w-16">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasksLoading ? (
                <tr><td colSpan={7} className="p-20 text-center"><Loader2 size={32} className="animate-spin text-blue-600 mx-auto" /></td></tr>
              ) : filteredTasks.map((t, idx) => {
                const hasLink = !!t.link && t.link.trim() !== "";
                return (
                  <tr key={idx} className={`${!hasLink ? 'bg-blue-50/60' : 'bg-white'} hover:bg-blue-100/40 cursor-pointer transition-colors`} onClick={() => handleRowClick(t)}>
                    <td className="p-4 text-center text-[10px] font-bold text-gray-400">#{t._rowNumber}</td>
                    <td className="p-4 text-[11px] font-black text-blue-600">{t.video_date}</td>
                    <td className="p-4 text-sm font-black text-blue-900 text-center">{t.day}</td>
                    <td className="p-4"><span className={`text-[9px] font-black px-2 py-1 rounded-full border ${String(t.type).includes('Bắt buộc') ? 'bg-blue-600 text-white' : 'bg-green-100 text-green-700'}`}>{t.type}</span></td>
                    <td className="p-4 text-sm font-black text-blue-900">
                      <div className="flex items-center gap-2">
                        {hasLink && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); window.open(t.link, '_blank'); }}
                            className="p-1.5 hover:bg-blue-200 rounded-lg transition-colors group"
                            title="Xem video"
                          >
                            <Play size={14} className="text-blue-600 flex-shrink-0 group-hover:scale-110" fill="currentColor" />
                          </button>
                        )}
                        <span>{t.title}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                       <span 
                         onClick={(e) => handleEditClick(e, t)}
                         className="text-[10px] font-black text-blue-600 uppercase underline cursor-pointer hover:text-blue-800 flex items-center justify-center gap-1"
                       >
                         <Edit3 size={12} /> Chi tiết
                       </span>
                    </td>
                    <td className="p-4 text-center"><button onClick={e => { e.stopPropagation(); setConfirmDelete({ isOpen: true, type: 'task', payload: t, title: "XÓA BÀI", message: `Xóa bài "${t.title}"?` }); }} className="text-red-200 hover:text-red-500"><Trash2 size={16} /></button></td>
                  </tr>
                );
              })}
              {!tasksLoading && filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-20 text-center text-gray-400 italic font-medium">Không tìm thấy bài tập nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isNewGroupModalOpen} onClose={() => setIsNewGroupModalOpen(false)} title="TẠO NHÓM MỚI">
        <LineInput label="Ngày khởi tạo" type="date" value={newGroupDate} onChange={e => setNewGroupDate(e.target.value)} />
        <Button variant="primary" className="w-full mt-6" onClick={async () => {
          setIsCreatingGroup(true);
          try {
            const res = await api.saveVideoGroupTasks(newGroupDate, [{ day: 1, type: ExerciseType.MANDATORY, title: "Khởi động phác đồ", detail: "Bài tập mặc định", link: "", is_deleted: false }]);
            await fetchInitialData(res.targetKey);
            setIsNewGroupModalOpen(false);
          } finally { setIsCreatingGroup(false); }
        }} disabled={isCreatingGroup || !newGroupDate}>{isCreatingGroup ? <Loader2 size={16} className="animate-spin" /> : "KHỞI TẠO"}</Button>
      </Modal>

      {/* MODAL SỬA BÀI TẬP (Popup khi nhấn chữ "Chi tiết") */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={editingTask ? "SỬA BÀI TẬP MẪU" : "THÊM BÀI TẬP MẪU"} maxWidth="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <LineInput type="number" label="Ngày tập" value={newTaskData.day} onChange={e => setNewTaskData({...newTaskData, day: parseInt(e.target.value) || 1})} />
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mt-4">Loại bài tập</label>
            <select className="line-input font-bold" value={newTaskData.type} onChange={e => setNewTaskData({...newTaskData, type: e.target.value as ExerciseType})}>{EXERCISE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
          </div>
        </div>
        <LineInput label="Tiêu đề bài tập" value={newTaskData.title} onChange={e => setNewTaskData({...newTaskData, title: e.target.value})} />
        <LineInput isTextArea label="Nội dung chi tiết" className="h-48" value={newTaskData.detail} onChange={e => setNewTaskData({...newTaskData, detail: e.target.value})} />
        <LineInput label="Link Video hướng dẫn" value={newTaskData.link} onChange={e => setNewTaskData({...newTaskData, link: e.target.value})} />
        <Button variant="primary" className="w-full mt-6 py-4" onClick={async () => {
          setSaving(true);
          try {
            const currentGroupKey = editingTask ? editingTask.groupDateKey : selectedKeys[0];
            const dateStr = groups.find(g => g.video_date_key === currentGroupKey)?.video_date || "";
            const currentGroupTasks = tasks.filter(x => x._video_date_key === currentGroupKey);
            
            const nextTasks = editingTask 
              ? currentGroupTasks.map(x => x._rowNumber === editingTask.task._rowNumber ? (newTaskData as ExerciseTask) : x) 
              : [...currentGroupTasks, newTaskData as ExerciseTask];
            
            await api.saveVideoGroupTasks(dateStr, nextTasks);
            await fetchTasksForSelected(selectedKeys);
            setIsTaskModalOpen(false);
          } finally { setSaving(false); }
        }} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin mr-2" /> : "LƯU THAY ĐỔI"}</Button>
      </Modal>

      {/* MODAL XEM CHI TIẾT (Popup khi nhấn vào 1 dòng) */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="CHI TIẾT NỘI DUNG BÀI TẬP" maxWidth="max-w-3xl">
        {viewingTask && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-blue-50 pb-4">
               <div>
                 <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Ngày {viewingTask.day} • {viewingTask.type}</div>
                 <h2 className="text-2xl font-black text-blue-900 leading-tight">{viewingTask.title}</h2>
               </div>
               {viewingTask.link && (
                 <button 
                   onClick={() => window.open(viewingTask.link, '_blank')}
                   className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase shadow-lg shadow-blue-100 transition-all hover:bg-blue-700 active:scale-95"
                 >
                   <Play size={14} fill="currentColor" /> Xem Video
                 </button>
               )}
            </div>
            
            <div className="bg-blue-50/30 p-8 rounded-[2rem] border border-blue-50 max-h-96 overflow-y-auto custom-scrollbar">
               <div className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><Eye size={14} /> Nội dung hướng dẫn chi tiết:</div>
               <p className="text-base text-gray-700 leading-relaxed font-medium whitespace-pre-line text-justify">
                 {viewingTask.detail || "Nội dung đang được cập nhật..."}
               </p>
            </div>

            <div className="flex justify-end gap-3 mt-2">
               <Button variant="ghost" onClick={() => setIsViewModalOpen(false)}>Đóng</Button>
               <Button variant="primary" onClick={(e) => { setIsViewModalOpen(false); handleEditClick(e as any, viewingTask); }}><Edit3 size={14} className="mr-2" /> CHỈNH SỬA</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={confirmDelete.isOpen} onClose={() => setConfirmDelete(prev => ({...prev, isOpen: false}))} title={confirmDelete.title}>
        <div className="text-center py-4">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-4" />
          <p className="font-medium text-gray-600">{confirmDelete.message}</p>
          <div className="flex gap-3 mt-6"><Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(prev => ({...prev, isOpen: false}))}>HỦY</Button><Button variant="danger" className="flex-1" onClick={handleConfirmedDelete}>XÓA</Button></div>
        </div>
      </Modal>
    </div>
  );
};
