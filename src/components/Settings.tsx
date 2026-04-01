import React, { useState } from 'react';
import { AppState } from '../utils';
import { Settings as SettingsType } from '../types';
import { Save, Building2, MapPin, Phone, Mail, AlertTriangle, Upload, X, Moon, Sun } from 'lucide-react';

interface SettingsProps {
  state: AppState;
  onSave: (settings: SettingsType) => void;
  onResetInventory: () => void;
  showNotification: (msg: string, type?: 'success' | 'error') => void;
}

const Settings: React.FC<SettingsProps> = ({ state, onSave, onResetInventory, showNotification }) => {
  const [settings, setSettings] = useState<SettingsType>(state.settings);

  const handleReset = () => {
    onResetInventory();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_HEIGHT = 100;
        const scale = MAX_HEIGHT / img.height;
        canvas.height = MAX_HEIGHT;
        canvas.width = img.width * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/png');
          setSettings({ ...settings, logo: base64 });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setSettings({ ...settings, logo: undefined });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 bg-[rgba(255,247,237,0.5)] border-2 border-[rgba(249,115,22,0.2)] rounded-full px-4 py-1.5 w-fit">
        <span className="text-[11px] font-extrabold text-orange-primary uppercase tracking-widest">⚙️ Business Settings</span>
        <span className="w-1 h-1 rounded-full bg-[rgba(249,115,22,0.3)]"></span>
        <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">Configure Company Details</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-container p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <Building2 size={16} className="text-orange-primary" />
              Company Identity
            </h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Shop / Company Name</label>
              <input 
                className="input-field" 
                value={settings.companyName} 
                onChange={e => setSettings({ ...settings, companyName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Address</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  className="input-field pl-10" 
                  value={settings.address} 
                  onChange={e => setSettings({ ...settings, address: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Business Logo</label>
              <div className="flex items-start gap-4">
                {settings.logo ? (
                  <div className="relative group">
                    <img 
                      src={settings.logo} 
                      alt="Logo Preview" 
                      className="h-20 w-auto rounded-xl border-2 border-slate-100 bg-white p-2"
                    />
                    <button 
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-32 h-20 border-2 border-dashed border-slate-200 rounded-2xl hover:border-[rgba(249,115,22,0.5)] hover:bg-[rgba(255,247,237,0.3)] cursor-pointer transition-all group">
                    <Upload size={20} className="text-slate-400 group-hover:text-orange-primary mb-1" />
                    <span className="text-[9px] font-bold text-slate-400 group-hover:text-orange-primary uppercase">Upload Logo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                )}
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    Upload your shop logo (PNG, JPG, SVG). It will be automatically resized to fit your invoices.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-container p-6 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <Phone size={16} className="text-orange-primary" />
              Contact Information
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Phone Number</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  className="input-field pl-10" 
                  value={settings.phone} 
                  onChange={e => setSettings({ ...settings, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="email"
                  className="input-field pl-10" 
                  value={settings.email} 
                  onChange={e => setSettings({ ...settings, email: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <div className="card-container p-6 space-y-4 col-span-full">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <AlertTriangle size={16} className="text-orange-primary" />
              Inventory Controls
            </h3>

            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="space-y-1 max-w-xs">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Low Stock Threshold</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number"
                    className="input-field" 
                    value={settings.lowStockThreshold} 
                    onChange={e => setSettings({ ...settings, lowStockThreshold: +e.target.value })}
                    required
                    min="0"
                  />
                  <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Units remaining</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic mt-1">
                  Items with stock at or below this level will trigger alerts.
                </p>
              </div>

              <div className="p-4 bg-[rgba(254,242,242,0.5)] border-2 border-[rgba(239,68,68,0.1)] rounded-2xl space-y-3 max-w-sm dark:bg-[rgba(69,10,10,0.2)] dark:border-[rgba(127,29,29,0.2)]">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle size={16} />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest">Danger Zone</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium dark:text-slate-400">
                  Use this to permanently remove all items from your inventory.
                </p>
                <button 
                  type="button"
                  onClick={handleReset}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all"
                >
                  Clear Inventory
                </button>
              </div>
            </div>
          </div>

          <div className="card-container p-6 space-y-4 col-span-full">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wider">
              <Sun size={16} className="text-orange-primary" />
              Appearance & Theme
            </h3>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[rgba(30,41,59,0.5)] rounded-2xl border-2 border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Interface Theme</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Switch between light and dark mode for the application.</p>
              </div>
              
              <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, theme: 'light' })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    settings.theme !== 'dark' 
                      ? 'bg-white text-orange-primary shadow-sm dark:bg-slate-600 dark:text-white' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Sun size={14} />
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, theme: 'dark' })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    settings.theme === 'dark' 
                      ? 'bg-white text-orange-primary shadow-sm dark:bg-slate-600 dark:text-white' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Moon size={14} />
                  Dark
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary flex items-center gap-2 px-8 py-3">
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
