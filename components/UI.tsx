
import React from 'react';
import { DateInput } from './DateInput';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    warning: 'btn-warning',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    outline: 'btn-ghost border-2 border-blue-100',
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-[10px]',
    md: 'px-6 py-3 text-[12px]',
    lg: 'px-8 py-4 text-[14px]',
  };

  return (
    <button 
      className={`btn-modern ${variantClasses[variant as keyof typeof variantClasses]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  isTextArea?: boolean;
  icon?: React.ReactNode;
}

export const LineInput: React.FC<InputProps> = ({ label, isTextArea, icon, className = '', ...props }) => {
  if (props.type === 'date') {
    return (
      <DateInput
        label={label}
        value={String(props.value || '')}
        onChange={(iso) => {
          if (props.onChange) {
            // Tạo một synthetic event giả lập để tương thích với các handler hiện có
            const syntheticEvent = {
              target: { value: iso, name: props.name },
              currentTarget: { value: iso, name: props.name }
            } as any;
            props.onChange(syntheticEvent);
          }
        }}
        icon={icon}
        className={className}
        disabled={props.disabled}
      />
    );
  }

  const Component = isTextArea ? 'textarea' : 'input';
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">{label}</label>}
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        <Component 
          className={`line-input w-full ${icon ? 'pl-7' : ''}`} 
          {...(props as any)} 
        />
      </div>
    </div>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; borderSide?: string; id?: string }> = ({ children, className = '', borderSide, id }) => {
  const borderStyles = borderSide ? `border-l-4 ${borderSide}` : 'border border-blue-100';
  return (
    <div id={id} className={`bg-white rounded-3xl p-6 transition-all hover:shadow-[0_10px_30px_rgba(37,99,235,0.06)] ${borderStyles} ${className}`}>
      {children}
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md" onClick={onClose}></div>
      <div className={`bg-white w-full ${maxWidth} rounded-[2.5rem] relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300`}>
        <div className="p-8 border-b border-blue-50">
          <h3 className="text-xl font-extrabold text-blue-900 uppercase tracking-tight">{title}</h3>
        </div>
        <div className="p-8 text-sm text-gray-600 leading-relaxed font-medium">
          {children}
        </div>
        {footer && (
          <div className="p-6 bg-blue-50/50 flex justify-end gap-3 px-8">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
