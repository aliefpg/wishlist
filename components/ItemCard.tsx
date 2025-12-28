
import React, { useState, useEffect } from 'react';
import { WishlistItem } from '../types';
import ProgressBar from './ProgressBar';

interface ItemCardProps {
  item: WishlistItem;
  walletBalance: number;
  onUpdate: (id: string, newAmount: number) => void;
  onDelete: (id: string) => void;
  onAllocateFromWallet: (id: string, amount: number) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, walletBalance, onUpdate, onDelete, onAllocateFromWallet }) => {
  const [addAmount, setAddAmount] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Timer reset untuk status hapus
  useEffect(() => {
    let timer: number;
    if (isDeleting) {
      timer = window.setTimeout(() => setIsDeleting(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [isDeleting]);

  const cleanToNumber = (val: string) => val.replace(/\D/g, '');
  
  const formatRupiah = (val: string | number) => {
    const num = typeof val === 'string' ? cleanToNumber(val) : val.toString();
    if (!num) return '';
    return parseInt(num).toLocaleString('id-ID');
  };

  const handleAddDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(cleanToNumber(addAmount));
    if (!isNaN(val) && val >= 0) {
      onUpdate(item.id, item.savedAmount + val);
      setAddAmount('');
    }
  };

  const handleQuickAllocate = () => {
    const needed = item.price - item.savedAmount;
    const canAllocate = Math.min(walletBalance, needed);
    if (canAllocate > 0) {
      onAllocateFromWallet(item.id, canAllocate);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDeleting) {
      onDelete(item.id);
    } else {
      setIsDeleting(true);
    }
  };

  const priorityStyles = {
    High: 'bg-red-100 text-red-800 border-red-200',
    Medium: 'bg-amber-100 text-amber-800 border-amber-200',
    Low: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const isCompleted = item.savedAmount >= item.price;

  return (
    <div className={`bg-white rounded-3xl border border-slate-300 p-6 shadow-sm transition-all hover:shadow-md ${isCompleted ? 'bg-emerald-50/30 border-emerald-200' : ''}`}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-widest ${priorityStyles[item.priority]}`}>
            {item.priority} Priority
          </span>
          <h3 className="text-xl font-bold text-slate-900 mt-3 leading-tight uppercase">{item.name}</h3>
        </div>
        
        {/* Tombol Delete Reaktif */}
        <button 
          type="button"
          onClick={handleDelete}
          className={`p-3 rounded-xl border transition-all active:scale-90 flex items-center justify-center ${
            isDeleting 
            ? 'bg-red-600 border-red-700 text-white font-bold text-xs px-4 py-2' 
            : 'bg-slate-50 border-slate-300 text-slate-400 hover:text-red-600 hover:border-red-300'
          }`}
        >
          {isDeleting ? (
            "HAPUS?"
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>

      <div className="mb-8">
        <ProgressBar current={item.savedAmount} total={item.price} color={isCompleted ? 'bg-emerald-500' : 'bg-slate-900'} />
      </div>

      {!isCompleted ? (
        <div className="space-y-4">
          {walletBalance > 0 && (
            <button 
              onClick={handleQuickAllocate}
              className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              TARIK SALDO (Rp{walletBalance.toLocaleString('id-ID')})
            </button>
          )}
          
          <form onSubmit={handleAddDirect} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={formatRupiah(addAmount)}
                onChange={(e) => setAddAmount(cleanToNumber(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all"
            >
              TAMBAH
            </button>
          </form>
        </div>
      ) : (
        <div className="flex items-center justify-center py-4 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-sm">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          TERPENUHI
        </div>
      )}
    </div>
  );
};

export default ItemCard;
