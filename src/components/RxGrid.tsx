import React from 'react';
import { Prescription, RxData } from '../types';
import { formatRxValue } from '../utils';

interface RxGridProps {
  rx: Prescription;
  onChange: (rx: Prescription) => void;
  readOnly?: boolean;
}

const RxGrid: React.FC<RxGridProps> = ({ rx, onChange, readOnly = false }) => {
  const handleChange = (eye: 'od' | 'os', field: keyof RxData, value: string) => {
    if (readOnly) return;
    
    // Auto-sign logic on blur or specific triggers could be added, 
    // but for now we'll just update the value.
    const newRx = { ...rx };
    newRx[eye] = { ...newRx[eye], [field]: value };
    onChange(newRx);
  };

  const handleBlur = (eye: 'od' | 'os', field: keyof RxData, value: string) => {
    if (readOnly) return;
    if (field === 'sph' || field === 'cyl' || field === 'add') {
      const formatted = formatRxValue(value);
      const newRx = { ...rx };
      newRx[eye] = { ...newRx[eye], [field]: formatted };
      onChange(newRx);
    }
  };

  const fields: (keyof RxData)[] = ['sph', 'cyl', 'axis', 'add', 'pd'];

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="grid grid-cols-6 bg-gray-50 border-b border-gray-200">
        <div className="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200">Eye</div>
        {fields.map(f => (
          <div key={f} className="p-2 text-xs font-bold text-gray-500 uppercase tracking-wider text-center border-r border-gray-200 last:border-r-0">
            {f}
          </div>
        ))}
      </div>
      
      {/* Right Eye (OD) */}
      <div className="grid grid-cols-6 border-b border-gray-200">
        <div className="p-3 text-sm font-bold text-blue-600 bg-[rgba(239,246,255,0.3)] flex items-center justify-center border-r border-gray-200">OD</div>
        {fields.map(f => (
          <div key={f} className="p-1 border-r border-gray-200 last:border-r-0">
            <input
              type="text"
              value={rx.od[f]}
              onChange={(e) => handleChange('od', f, e.target.value)}
              onBlur={(e) => handleBlur('od', f, e.target.value)}
              disabled={readOnly}
              placeholder="0.00"
              className="w-full p-2 text-sm text-center border-0 focus:ring-2 focus:ring-blue-500 rounded bg-transparent"
            />
          </div>
        ))}
      </div>

      {/* Left Eye (OS) */}
      <div className="grid grid-cols-6">
        <div className="p-3 text-sm font-bold text-green-600 bg-[rgba(240,253,244,0.3)] flex items-center justify-center border-r border-gray-200">OS</div>
        {fields.map(f => (
          <div key={f} className="p-1 border-r border-gray-200 last:border-r-0">
            <input
              type="text"
              value={rx.os[f]}
              onChange={(e) => handleChange('os', f, e.target.value)}
              onBlur={(e) => handleBlur('os', f, e.target.value)}
              disabled={readOnly}
              placeholder="0.00"
              className="w-full p-2 text-sm text-center border-0 focus:ring-2 focus:ring-blue-500 rounded bg-transparent"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RxGrid;
