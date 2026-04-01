import React, { useState, useEffect, useRef } from 'react';
import { ITEMS } from '../data/btc-items';
import { BTCItem } from '../types';
import { Nu } from '../utils';
import { Search } from 'lucide-react';

interface ItemDropdownProps {
  items: BTCItem[];
  onSelect: (item: BTCItem) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}

const ItemDropdown: React.FC<ItemDropdownProps> = ({ items, onSelect, onClose, anchorRef }) => {
  const [query, setQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState<BTCItem[]>(items);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    const res = q 
      ? items.filter(i => 
          i.n.toLowerCase().includes(q) || 
          i.btc.includes(q)
        ) 
      : items;
    setFilteredItems(res);
  }, [query, items]);

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
    const dropdownHeight = 400;
    
    return {
      top: spaceBelow > dropdownHeight ? rect.bottom + 4 : rect.top - dropdownHeight - 4,
      left: Math.min(rect.left, window.innerWidth - 540),
      width: '500px',
    };
  };

  return (
    <div 
      ref={dropdownRef}
      className="fixed z-[9999] bg-white border-2 border-[rgba(249,115,22,0.3)] rounded-xl shadow-2xl flex flex-col overflow-hidden"
      style={getPosition()}
    >
      <div className="p-3 border-b-2 border-slate-100 bg-[rgba(248,250,252,0.5)] flex items-center gap-3">
        <Search size={18} className="text-slate-400" />
        <input 
          autoFocus
          className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 placeholder:text-slate-400"
          placeholder="Type item name or BTC code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      
      <div className="overflow-y-auto max-height-[320px] flex-1">
        {filteredItems.length > 0 ? (
          filteredItems.map((item, idx) => (
            <div 
              key={idx}
              onClick={() => onSelect(item)}
              className="px-4 py-3 cursor-pointer grid grid-cols-[1fr_auto] gap-4 items-center border-b border-slate-50 hover:bg-[rgba(255,247,237,0.5)] transition-colors"
            >
              <div>
                <div className="text-sm font-extrabold text-slate-900 leading-tight">{item.n}</div>
                <div className="text-[10px] font-bold text-slate-500 mt-1">
                  {item.u} &nbsp;·&nbsp; {item.sup} &nbsp;·&nbsp; BTC: {item.btc}
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-1">
                <div className="text-sm font-extrabold text-orange-primary">{Nu(item.p)}</div>
                <div className="text-[9px] font-bold text-orange-primary bg-orange-50 px-2 py-0.5 rounded-full">
                  CD {item.cd}% &nbsp; ST {item.st}%
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-slate-400 font-bold text-sm">No items found</div>
        )}
      </div>
      
      <div className="p-2 border-top border-slate-100 bg-slate-50 text-[10px] text-slate-400 font-bold flex justify-between">
        <span>{filteredItems.length} items found</span>
        <span>Showing up to 50 items</span>
      </div>
    </div>
  );
};

export default ItemDropdown;
