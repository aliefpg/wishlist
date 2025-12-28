
import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, color = 'bg-slate-900' }) => {
  const percentage = Math.min(Math.round((current / total) * 100), 100);
  
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-900">
        <span>{percentage}% TERKUMPUL</span>
        <span>Rp {current.toLocaleString('id-ID')} / {total.toLocaleString('id-ID')}</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-3">
        <div 
          className={`${color} h-3 rounded-full transition-all duration-700 ease-out`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
