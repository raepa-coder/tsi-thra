import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { auth, logout } from '../firebase';

interface TopBarProps {
  title: string;
  subtitle: string;
  settings: any;
}

const TopBar: React.FC<TopBarProps> = ({ title, subtitle, settings }) => {
  const user = auth.currentUser;

  return (
    <div className="p-4 border-b border-[rgba(249,115,22,0.1)] flex items-center justify-between bg-slate-50 dark:bg-slate-950 relative overflow-hidden shrink-0 transition-colors duration-300 no-print">
      <div className="weave-bg absolute inset-0 pointer-events-none opacity-50 dark:opacity-20"></div>
      
      <div className="relative z-10 flex items-center justify-between w-full gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {settings.logo && (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm border border-[rgba(249,115,22,0.1)] flex-shrink-0 sm:hidden">
              <img src={settings.logo} alt="Logo" className="w-full h-full object-contain p-1" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 truncate">{title}</h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate max-w-md">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={14} className="text-slate-400 dark:text-slate-500" />
                )}
              </div>
              <div className="hidden sm:block">
                <div className="text-[10px] font-extrabold text-slate-900 dark:text-slate-100 leading-none">{user.displayName}</div>
                <div className="text-[8px] font-bold text-slate-400 dark:text-slate-500 leading-none mt-0.5 truncate max-w-[100px]">{user.email}</div>
              </div>
              <button 
                onClick={() => logout()}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
