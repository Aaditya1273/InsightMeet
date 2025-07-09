import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, id, className }) => {
  return (
    <div className={`flex items-center ${className || ''}`}>
      <div className="relative inline-block w-10 mr-2 align-middle select-none">
        <input
          type="checkbox"
          id={id || 'toggle'}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`block h-6 rounded-full transition-colors duration-200 ease-in-out ${
            checked ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        ></div>
        <div
          className={`dot absolute left-1 top-1 h-4 w-4 rounded-full transition-transform duration-200 ease-in-out bg-white transform ${
            checked ? 'translate-x-4' : ''
          }`}
        ></div>
      </div>
      {label && (
        <label htmlFor={id || 'toggle'} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
    </div>
  );
};
