
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { WishlistItem, ExternalWebsite } from './types';
import ItemCard from './components/ItemCard';

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<'tracker' | 'websites' | 'settings'>('tracker');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default Data
  const defaultCategories = ['Belanja', 'Elektronik', 'Tabungan'];
  const defaultWebsites: ExternalWebsite[] = [
    {
      id: '1',
      name: 'OmniPro',
      description: 'OmniPro adalah pusat kendali produktivitas All-in-One: Kelola keuangan cerdas, timeline rapat profesional, dan sistem manajemen tugas dalam satu dashboard adaptif.',
      url: 'https://omni-ruby.vercel.app/'
    }
  ];

  // Tracker State
  const [items, setItems] = useState<WishlistItem[]>(() => {
    try {
      const saved = localStorage.getItem('dreamfund_items');
      return saved ? (JSON.parse(saved) as WishlistItem[]) : [];
    } catch {
      return [];
    }
  });
  
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    const saved = localStorage.getItem('dreamfund_wallet');
    return saved ? parseInt(saved) : 0;
  });

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dreamfund_categories');
      return saved ? (JSON.parse(saved) as string[]) : defaultCategories;
    } catch {
      return defaultCategories;
    }
  });

  const [otherWebsites, setOtherWebsites] = useState<ExternalWebsite[]>(() => {
    try {
      const saved = localStorage.getItem('dreamfund_external_webs');
      return saved ? (JSON.parse(saved) as ExternalWebsite[]) : defaultWebsites;
    } catch {
      return defaultWebsites;
    }
  });

  // UI States
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingWeb, setIsAddingWeb] = useState(false);
  const [isManagingCats, setIsManagingCats] = useState(false);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0); 
  const [newCatName, setNewCatName] = useState('');
  const [tempWalletInput, setTempWalletInput] = useState('');
  const [balanceAnimation, setBalanceAnimation] = useState<{show: boolean, amount: string}>({show: false, amount: ''});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

  const [newItem, setNewItem] = useState({ 
    name: '', 
    price: '', 
    category: '', 
    priority: 'Medium' as 'Low'|'Medium'|'High' 
  });

  const [newWeb, setNewWeb] = useState({
    name: '',
    url: '',
    description: ''
  });

  useEffect(() => {
    if (isAdding && !newItem.category && categories.length > 0) {
      setNewItem(prev => ({ ...prev, category: categories[0] }));
    }
  }, [isAdding, categories, newItem.category]);

  useEffect(() => {
    localStorage.setItem('dreamfund_items', JSON.stringify(items));
    localStorage.setItem('dreamfund_wallet', walletBalance.toString());
    localStorage.setItem('dreamfund_categories', JSON.stringify(categories));
    localStorage.setItem('dreamfund_external_webs', JSON.stringify(otherWebsites));
  }, [items, walletBalance, categories, otherWebsites]);

  // DATA HANDLERS
  const handleExportData = () => {
    const data = { items, walletBalance, categories, otherWebsites };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dreamfund_backup.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.items) setItems(json.items);
        if (typeof json.walletBalance === 'number') setWalletBalance(json.walletBalance);
        if (json.categories) setCategories(json.categories);
        if (json.otherWebsites) setOtherWebsites(json.otherWebsites);
        alert("Berhasil impor data!");
        setCurrentView('tracker');
      } catch (err) { alert("Format file salah."); }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const performFinalReset = () => {
    setItems([]);
    setWalletBalance(0);
    setCategories(defaultCategories);
    setOtherWebsites(defaultWebsites);
    localStorage.clear();
    setResetStep(0);
    setCurrentView('tracker');
    alert("Semua data telah dibersihkan.");
  };

  const stats = useMemo(() => {
    const activeItems = items.filter(item => item.savedAmount < item.price);
    const remainingNeeded = activeItems.reduce((sum, item) => sum + (item.price - item.savedAmount), 0);
    const totalGoal = items.reduce((sum, item) => sum + item.price, 0);
    const totalSaved = items.reduce((sum, item) => sum + item.savedAmount, 0);
    const percentage = totalGoal > 0 ? Math.round((totalSaved / totalGoal) * 100) : 0;
    return { remainingNeeded, percentage, allDone: items.length > 0 && activeItems.length === 0 };
  }, [items]);

  const groupedItems = useMemo<Record<string, WishlistItem[]>>(() => {
    const groups: Record<string, WishlistItem[]> = {};
    categories.forEach(cat => groups[cat] = []);
    items.forEach(item => {
      const cat = categories.includes(item.category) ? item.category : 'Lainnya';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    const orderedGroups: Record<string, WishlistItem[]> = {};
    categories.forEach(cat => {
      if (groups[cat] && groups[cat].length > 0) orderedGroups[cat] = groups[cat];
    });
    const others = items.filter(item => !categories.includes(item.category));
    if (others.length > 0) orderedGroups['Lainnya'] = others;
    return orderedGroups;
  }, [items, categories]);

  const cleanToNumber = (val: string) => val.replace(/\D/g, '');
  const formatRupiah = (val: string | number) => {
    const num = typeof val === 'string' ? cleanToNumber(val) : val.toString();
    return num ? parseInt(num).toLocaleString('id-ID') : '';
  };

  const addToWallet = () => {
    const amount = parseInt(cleanToNumber(tempWalletInput));
    if (!isNaN(amount) && amount > 0) {
      setBalanceAnimation({ show: true, amount: formatRupiah(amount) });
      setWalletBalance(prev => prev + amount);
      setTempWalletInput('');
      setTimeout(() => setBalanceAnimation({show: false, amount: ''}), 2000);
    }
  };

  const allocateFromWallet = useCallback((id: string, amount: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, savedAmount: item.savedAmount + amount } : item));
    setWalletBalance(prev => prev - amount);
  }, []);

  // ALGORITMA BARU: Bagi Saldo Proporsional Berbobot (Weighted Distribution)
  const autoDistribute = () => {
    if (walletBalance <= 0 || items.length === 0) return;
    
    let currentItems = items.map(item => ({ ...item }));
    let pool = walletBalance;
    
    // Bobot untuk masing-masing prioritas
    const weights: Record<string, number> = {
      'High': 3,
      'Medium': 2,
      'Low': 1
    };

    // Kita lakukan iterasi sampai uang habis atau semua barang penuh
    let continueLoop = true;
    while (pool > 0 && continueLoop) {
      // Cari barang yang masih butuh dana
      const activeIndices = currentItems
        .map((item, idx) => item.savedAmount < item.price ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (activeIndices.length === 0) {
        continueLoop = false;
        break;
      }

      // Hitung total bobot dari barang-barang yang masih aktif
      let totalWeight = activeIndices.reduce((sum, idx) => sum + weights[currentItems[idx].priority], 0);
      
      let distributedInThisPass = 0;
      let someItemFinished = false;

      // Alokasikan dana berdasarkan proporsi bobot
      const tempAllocations: {idx: number, amount: number}[] = [];
      activeIndices.forEach(idx => {
        const item = currentItems[idx];
        const weight = weights[item.priority];
        const needed = item.price - item.savedAmount;
        
        // Jatah seharusnya berdasarkan bobot
        let share = Math.floor((pool * weight) / totalWeight);
        
        // Minimal alokasi 1 rupiah jika pool masih ada dan barang butuh
        if (share === 0 && pool > 0) share = 1;
        
        // Jangan melebihi kebutuhan barang
        const finalAllocation = Math.min(share, needed, pool);
        
        if (finalAllocation > 0) {
          tempAllocations.push({idx, amount: finalAllocation});
          distributedInThisPass += finalAllocation;
        }
      });

      // Update data barang
      tempAllocations.forEach(alloc => {
        currentItems[alloc.idx].savedAmount += alloc.amount;
        pool -= alloc.amount;
        if (currentItems[alloc.idx].savedAmount >= currentItems[alloc.idx].price) {
          someItemFinished = true;
        }
      });

      // Jika dalam satu putaran tidak ada uang yang bisa dibagi lagi, hentikan
      if (distributedInThisPass === 0) {
        continueLoop = false;
      }
      
      // Jika ada barang yang selesai, loop akan menghitung ulang totalWeight di putaran berikutnya 
      // agar sisa jatahnya (overflow) dibagi ke barang lain yang belum selesai.
    }

    setItems(currentItems);
    setWalletBalance(Math.max(0, pool));
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseInt(cleanToNumber(newItem.price));
    if (!newItem.name || isNaN(priceNum)) return;
    const item: WishlistItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name,
      price: priceNum,
      savedAmount: 0,
      category: newItem.category || categories[0],
      createdAt: Date.now(),
      priority: newItem.priority,
    };
    setItems([item, ...items]);
    setIsAdding(false);
    setNewItem({ name: '', price: '', category: categories[0], priority: 'Medium' });
  };

  const addWeb = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeb.name || !newWeb.url) return;
    const web: ExternalWebsite = {
      id: Math.random().toString(36).substr(2, 9),
      name: newWeb.name,
      url: newWeb.url.startsWith('http') ? newWeb.url : `https://${newWeb.url}`,
      description: newWeb.description
    };
    setOtherWebsites([...otherWebsites, web]);
    setIsAddingWeb(false);
    setNewWeb({ name: '', url: '', description: '' });
  };

  const deleteWeb = (id: string) => setOtherWebsites(otherWebsites.filter(w => w.id !== id));

  const addCategory = () => {
    if (newCatName && !categories.includes(newCatName)) {
      setCategories([...categories, newCatName]);
      setNewCatName('');
    }
  };

  const removeCategory = (cat: string) => setCategories(categories.filter(c => c !== cat));

  const handleDragStart = (index: number) => setDraggedItemIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newCats = [...categories];
    const draggedItem = newCats[draggedItemIndex];
    newCats.splice(draggedItemIndex, 1);
    newCats.splice(index, 0, draggedItem);
    setCategories(newCats);
    setDraggedItemIndex(index);
  };

  const updateItemAmount = useCallback((id: string, newAmount: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, savedAmount: newAmount } : item));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      setItems(prev => prev.filter(item => item.id !== id));
      setDeletingId(null);
    }, 400);
  }, []);

  return (
    <div className="min-h-screen pb-20 bg-slate-50 font-sans selection:bg-indigo-100">
      <style>{`
        @keyframes floatUp { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(-30px); opacity: 0; } }
        .animate-float-up { animation: floatUp 1.5s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <input type="file" ref={fileInputRef} onChange={handleImportData} accept=".json" className="hidden" />

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('tracker')}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">D</div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">DreamFund</h1>
          </div>
          <nav className="flex items-center gap-1">
            <button onClick={() => setCurrentView('tracker')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentView === 'tracker' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-900'}`}>DASHBOARD</button>
            <button onClick={() => setCurrentView('websites')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentView === 'websites' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-900'}`}>WEB</button>
            <button onClick={() => setCurrentView('settings')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentView === 'settings' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-slate-900'}`}>SETTING</button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6">
        {currentView === 'tracker' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="sm:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Saldo Tersedia</p>
                <div className="relative inline-block mb-4">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">Rp {walletBalance.toLocaleString('id-ID')}</h2>
                  {balanceAnimation.show && <div className="absolute top-0 -right-20 text-emerald-500 font-bold text-lg animate-float-up">+{balanceAnimation.amount}</div>}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                    <input type="text" inputMode="numeric" placeholder="Isi saldo..." value={formatRupiah(tempWalletInput)} onChange={(e) => setTempWalletInput(cleanToNumber(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
                  <button onClick={addToWallet} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-sm">SIMPAN</button>
                </div>
              </div>
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Target Kurang</p>
                  <h3 className="text-xl font-bold">{stats.allDone ? "Selesai! ✓" : `Rp ${stats.remainingNeeded.toLocaleString('id-ID')}`}</h3>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span className="text-slate-400 uppercase tracking-widest">PROGRESS</span>
                    <span className="text-indigo-400">{stats.percentage}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${stats.percentage}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mb-6 px-1">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Wishlist Anda</h3>
                <button onClick={() => setIsAdding(true)} className="bg-emerald-500 text-white p-1 rounded-full hover:bg-emerald-600 transition-all active:scale-90 shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
              <div className="flex gap-3">
                {walletBalance > 0 && items.some(i => i.savedAmount < i.price) && (
                  <button onClick={autoDistribute} className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-tight">BAGI SALDO</button>
                )}
                <button onClick={() => setIsManagingCats(true)} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase">KATEGORI</button>
              </div>
            </div>
            {Object.keys(groupedItems).length > 0 ? (
              <div className="space-y-8">
                {Object.entries(groupedItems).map(([category, catItems]) => (
                  <section key={category}>
                    <div className="flex items-center gap-2 mb-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{category}</h4>
                      <div className="flex-1 h-[1px] bg-slate-200"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {catItems.map((item) => (
                        <div key={item.id} className={deletingId === item.id ? 'opacity-0 scale-90 transition-all duration-400' : ''}>
                          <ItemCard item={item} walletBalance={walletBalance} onUpdate={updateItemAmount} onDelete={deleteItem} onAllocateFromWallet={allocateFromWallet} />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 text-sm font-bold">Daftar wishlist masih kosong.</p>
              </div>
            )}
          </>
        ) : currentView === 'websites' ? (
          <div className="py-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Ekosistem Digital</h2>
              {/* TOMBOL TAMBAH SITUS - DINONAKTIFKAN SEMENTARA */}
              {/* 
              <button onClick={() => setIsAddingWeb(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-indigo-700 transition-all active:scale-95">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                Tambah Situs
              </button>
              */}
            </div>
            {otherWebsites.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {otherWebsites.map((web) => (
                  <div key={web.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-indigo-500 transition-all group relative">
                    {/* TOMBOL HAPUS SITUS - DINONAKTIFKAN SEMENTARA */}
                    {/* 
                    <button onClick={() => deleteWeb(web.id)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    */}
                    <h3 className="font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{web.name}</h3>
                    <p className="text-slate-500 text-xs mb-5 line-clamp-2 leading-relaxed font-medium">{web.description || 'Tidak ada deskripsi.'}</p>
                    <a href={web.url} target="_blank" className="text-[10px] font-black text-indigo-600 hover:underline flex items-center tracking-widest uppercase">
                      KUNJUNGI SITUS 
                      <svg className="w-3 h-3 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400 text-sm font-bold">Belum ada situs yang ditambahkan.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 space-y-6">
            <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Pengaturan</h2>
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Apa itu DreamFund?</h3>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                DreamFund adalah platform cerdas untuk mengelola daftar barang impian (wishlist) dan memantau progres tabungan secara mandiri. Melalui visualisasi yang intuitif, Anda dapat mengatur prioritas target finansial dan merencanakan pembelian masa depan dengan lebih baik. Seluruh data Anda tersimpan 100% lokal di browser, menjamin privasi penuh.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Cadangkan & Pemulihan</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={handleExportData} className="flex flex-col items-center p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-indigo-50 transition-all group">
                  <svg className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 9l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-tight">Ekspor JSON</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-emerald-50 transition-all group">
                  <svg className="w-6 h-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M8 8l4-4m0 0l4 4m-4-4v12" /></svg>
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-tight">Impor JSON</span>
                </button>
              </div>
            </div>
            <div className="bg-white border border-red-100 rounded-3xl p-6 shadow-sm">
               <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Zona Bahaya</h3>
               <button onClick={() => setResetStep(1)} className="w-full py-4 bg-red-600 text-white text-xs font-black uppercase rounded-2xl transition-all hover:bg-red-700 active:scale-[0.98] shadow-md tracking-widest border-b-4 border-red-800">
                Hapus Seluruh Data Permanen
              </button>
              <p className="text-[10px] text-slate-400 mt-4 text-center font-bold italic opacity-70">*Aksi ini tidak dapat dibatalkan.</p>
            </div>
          </div>
        )}
      </main>

      {/* MODAL RESET */}
      {resetStep > 0 && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl animate-fade-in border border-slate-200 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3 uppercase tracking-tight">{resetStep === 1 ? "Apakah Anda Yakin?" : "Konfirmasi Terakhir"}</h3>
            <p className="text-sm text-slate-600 mb-8 leading-relaxed font-medium">
              {resetStep === 1 ? "Seluruh wishlist, saldo, dan kategori akan dihapus selamanya." : "Tindakan ini permanen. Hapus semua data sekarang?"}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => resetStep === 1 ? setResetStep(2) : performFinalReset()} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all active:scale-95">{resetStep === 1 ? "YA, LANJUTKAN" : "HAPUS SEKARANG"}</button>
              <button onClick={() => setResetStep(0)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">BATAL</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH WISHLIST */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl animate-fade-in border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Tambah Wishlist</h3>
            <form onSubmit={addItem} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Nama Barang</label>
                <input required placeholder="Misal: Kamera Mirrorless" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Harga (Rp)</label>
                  <input required type="text" inputMode="numeric" placeholder="0" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500" value={formatRupiah(newItem.price)} onChange={e => setNewItem({...newItem, price: cleanToNumber(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-wider">Kategori</label>
                  <select className="w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-wider">Prioritas</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button key={p} type="button" onClick={() => setNewItem({...newItem, priority: p as any})} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black border transition-all ${newItem.priority === p ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>{p.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-200 border border-slate-300 active:scale-95">BATAL</button>
                <button type="submit" className="flex-[2] bg-slate-900 text-white py-4 rounded-xl text-xs font-bold shadow-lg hover:bg-indigo-600 active:scale-95">TAMBAH</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KATEGORI */}
      {isManagingCats && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl animate-fade-in border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Kelola Kategori</h3>
            <div className="flex gap-2 mb-6">
              <input placeholder="Nama kategori..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} />
              <button onClick={addCategory} className="bg-indigo-600 text-white px-4 py-3 rounded-xl text-xs font-bold active:scale-95 shadow-sm">TAMBAH</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 mb-8 no-scrollbar pr-1">
              {categories.map((cat, idx) => (
                <div key={cat} draggable onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} className={`flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200 cursor-move active:bg-indigo-50 transition-all ${draggedItemIndex === idx ? 'opacity-40 grayscale' : ''}`}>
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{cat}</span>
                  </div>
                  <button onClick={() => removeCategory(cat)} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setIsManagingCats(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 shadow-lg border-b-4 border-slate-950">Selesai</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
