
import React from 'react';
import { User, Package, Plus, Info, Home, ChevronLeft } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, onBack, actions }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-blue-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack ? (
            <button onClick={onBack} className="p-2 hover:bg-blue-50 rounded-full transition-colors">
              <ChevronLeft size={20} className="text-blue-600" />
            </button>
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              M
            </div>
          )}
          <h1 className="text-lg font-bold text-blue-900 tracking-tight">
            {title || "MAGA PHƯƠNG ADMIN"}
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {actions}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};
