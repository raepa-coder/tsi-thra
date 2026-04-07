import React, { useState, useEffect, useRef } from 'react';
import { Customer } from '../types';
import { Search, User, Phone, MapPin } from 'lucide-react';

interface CustomerDropdownProps {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}

const CustomerDropdown: React.FC<CustomerDropdownProps> = ({ customers, onSelect, onClose, anchorRef }) => {
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState<Customer[]>(customers);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      setFiltered(customers);
      return;
    }
    const res = customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
    setFiltered(res);
  }, [query, customers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          anchorRef.current && !anchorRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  const getPosition = () => {
    if (!anchorRef.current) return {};
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 350;
    
    return {
      top: spaceBelow > dropdownHeight ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
      left: Math.min(rect.left, window.innerWidth - 420),
      width: '400px',
    };
  };

  return (
    <div 
      ref={dropdownRef}
      className="fixed z-[9999] bg-white border-2 border-[rgba(14,165,233,0.3)] rounded-xl shadow-2xl flex flex-col overflow-hidden"
      style={getPosition()}
    >
      <div className="p-3 border-b-2 border-slate-100 bg-[#f8fafc] flex items-center gap-3">
        <Search size={18} className="text-slate-400" />
        <input 
          autoFocus
          className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 placeholder:text-slate-400"
          placeholder="Search by name or phone..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      
      <div className="overflow-y-auto max-h-[280px] flex-1">
        {filtered.length > 0 ? (
          filtered.map((c, idx) => (
            <div 
              key={idx}
              onClick={() => onSelect(c)}
              className="px-4 py-3 cursor-pointer border-b border-slate-50 hover:bg-[#fff7ed] transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[rgba(249,115,22,0.1)] group-hover:text-orange-primary transition-colors">
                    <User size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900 leading-tight">{c.name}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <Phone size={10} /> {c.phone}
                      </div>
                      {c.address && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          <MapPin size={10} /> {c.address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-slate-400 font-bold text-sm">No customers found</div>
        )}
      </div>
      
      <div className="p-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 font-bold text-center">
        {filtered.length} customers found
      </div>
    </div>
  );
};

export default CustomerDropdown;
