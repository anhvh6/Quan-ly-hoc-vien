
import React, { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { CustomerManagement } from './pages/CustomerManagement';
import { PlanEditor } from './pages/PlanEditor';
import { ProductManagement } from './pages/ProductManagement';
import { ClientView } from './pages/ClientView';
import { VideoGroupManagement } from './pages/VideoGroupManagement';
import { api } from './services/api';
import { AlertCircle, Terminal, RefreshCw, Globe, ShieldAlert, Zap } from 'lucide-react';
import { Button } from './components/UI';

type Page = 'dashboard' | 'management' | 'plan-editor' | 'products' | 'preview' | 'video-groups';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [pageParams, setPageParams] = useState<any>({});
  const [connectionStatus, setConnectionStatus] = useState<{ status: 'loading' | 'ok' | 'error', error?: string, code?: any }>({ status: 'loading' });

  // Routing Logic
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/client/')) {
        const id = hash.replace('#/client/', '');
        setCurrentPage('preview');
        setPageParams({ customerId: id });
      } else if (hash === '#/dashboard') {
        setCurrentPage('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Health Check logic
  const checkConnection = async () => {
    setConnectionStatus({ status: 'loading' });
    try {
      const result = await api.testConnection();
      if (result.ok) {
        setConnectionStatus({ status: 'ok' });
      } else {
        let errorMsg = (result as any).error || "Không thể kết nối máy chủ";
        if (errorMsg === 'Failed to fetch') {
          errorMsg = "Lỗi CORS hoặc Network: Không thể truy cập Google Apps Script. Hãy đảm bảo Script đã được Deploy ở chế độ 'Anyone'.";
        }
        setConnectionStatus({ status: 'error', error: errorMsg });
      }
    } catch (e: any) {
      let errorMsg = e.message;
      if (errorMsg === 'Failed to fetch') {
        errorMsg = "Lỗi CORS hoặc Network: Không thể truy cập Google Apps Script. Hãy đảm bảo Script đã được Deploy ở chế độ 'Anyone'.";
      }
      setConnectionStatus({ status: 'error', error: errorMsg });
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const navigate = (page: string, params?: any) => {
    setCurrentPage(page as Page);
    setPageParams(params || {});
    if (page !== 'preview') {
      window.location.hash = '';
    }
  };

  const renderSetupGuide = () => (
    <div className="min-h-screen bg-[#F0F7FF] flex items-center justify-center p-6 font-['Plus_Jakarta_Sans']">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_20px_60px_rgba(37,99,235,0.15)] overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-12 border-b border-blue-50 bg-gradient-to-br from-red-50 to-white">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-14 h-14 bg-red-100 rounded-[1.25rem] flex items-center justify-center text-red-600 shadow-sm"><AlertCircle size={32} /></div>
            <div>
              <h1 className="text-2xl font-[900] text-red-900 uppercase tracking-tight">LỖI KẾT NỐI MÁY CHỦ</h1>
              <p className="text-xs font-bold text-red-400 uppercase tracking-widest mt-1">Hệ thống không thể truy cập Google Sheets</p>
            </div>
          </div>
          <div className="bg-red-600/5 p-5 rounded-2xl border border-red-100">
             <p className="text-red-700 font-extrabold text-sm leading-relaxed flex items-center gap-2">
               <ShieldAlert size={16} /> Thông báo lỗi: {connectionStatus.error || "Không thể kết nối máy chủ"}
             </p>
          </div>
        </div>
        
        <div className="p-12 flex flex-col gap-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-5">
              <h3 className="text-blue-900 font-black text-xs uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <Terminal size={16} className="text-blue-500" /> Giải pháp nhanh
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4 group">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center font-black text-[10px] shadow-lg group-hover:scale-110 transition-transform">1</div>
                  <p className="text-gray-600 text-[13px] font-medium leading-relaxed">Sử dụng <b>TAB ẨN DANH</b> (Incognito) để tránh lỗi xung đột tài khoản Google.</p>
                </div>
                <div className="flex gap-4 group">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center font-black text-[10px] shadow-lg group-hover:scale-110 transition-transform">2</div>
                  <p className="text-gray-600 text-[13px] font-medium leading-relaxed">Kiểm tra lại <b>API_URL</b> trong <code>services/api.ts</code>.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <h3 className="text-blue-900 font-black text-xs uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                <Zap size={16} className="text-orange-500" /> Cấu hình Deploy
              </h3>
              <div className="space-y-4">
                <div className="flex gap-4 group">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex-shrink-0 flex items-center justify-center font-black text-[10px] shadow-lg group-hover:scale-110 transition-transform">!</div>
                  <p className="text-gray-600 text-[13px] font-medium leading-relaxed">Mục <b>Who has access</b> PHẢI chọn <b>Anyone</b> (Bất kỳ ai).</p>
                </div>
                <div className="flex gap-4 group">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex-shrink-0 flex items-center justify-center font-black text-[10px] shadow-lg group-hover:scale-110 transition-transform">!</div>
                  <p className="text-gray-600 text-[13px] font-medium leading-relaxed">Chọn <b>Execute as</b>: <b>Me</b> (Chạy dưới tên tôi).</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-blue-50 rounded-[1.5rem] border border-blue-100 flex items-center gap-4">
             <Globe size={24} className="text-blue-400 shrink-0" />
             <p className="text-[11px] text-blue-800 font-bold italic leading-relaxed">
               Lỗi '403 Forbidden' thường do Google chặn yêu cầu khi bạn đăng nhập nhiều tài khoản cùng lúc. Hãy thử Tab ẩn danh trước khi Deploy lại.
             </p>
          </div>

          <div className="flex justify-center">
            <Button variant="primary" onClick={checkConnection} className="px-16 py-4 shadow-xl shadow-blue-200">
              <RefreshCw size={18} className="mr-2" /> KIỂM TRA LẠI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (connectionStatus.status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 font-['Plus_Jakarta_Sans']">
        <div className="w-12 h-12 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">Đang kết nối API...</p>
      </div>
    );
  }

  if (connectionStatus.status === 'error') {
    return renderSetupGuide();
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'management':
        return <CustomerManagement onNavigate={navigate} customerId={pageParams.customerId} />;
      case 'plan-editor':
        return (
          <PlanEditor 
            onNavigate={navigate} 
            customerId={pageParams.customerId} 
            templateId={pageParams.templateId} 
            draftCustomer={pageParams.draftCustomer}
          />
        );
      case 'products':
        return <ProductManagement onNavigate={navigate} />;
      case 'preview':
        return <ClientView customerId={pageParams.customerId} onNavigate={navigate} />;
      case 'video-groups':
        return <VideoGroupManagement onNavigate={navigate} />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderPage()}
    </div>
  );
};

export default App;
