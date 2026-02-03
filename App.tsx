
import React, { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { CustomerManagement } from './pages/CustomerManagement';
import { PlanEditor } from './pages/PlanEditor';
import { ProductManagement } from './pages/ProductManagement';
import { ClientView } from './pages/ClientView';
import { VideoGroupManagement } from './pages/VideoGroupManagement';

type Page = 'dashboard' | 'management' | 'plan-editor' | 'products' | 'preview' | 'video-groups';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [pageParams, setPageParams] = useState<any>({});

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

  const navigate = (page: string, params?: any) => {
    setCurrentPage(page as Page);
    setPageParams(params || {});
    if (page !== 'preview') {
      window.location.hash = '';
    }
  };

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
