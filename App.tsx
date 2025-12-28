
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WishlistItem, ExternalWebsite } from './types';
import ItemCard from './components/ItemCard';

const App: React.FC = () => {
  // Navigation State
  const [currentView, setCurrentView] = useState<'tracker' | 'websites'>('tracker');

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
      return saved ? (JSON.parse(saved) as string[]) : ['Belanja', 'Elektronik', 'Tabungan'];
    } catch {
      return ['Belanja', 'Elektronik', 'Tabungan'];
    }
  });

  // Dynamic External Websites State
  const [otherWebsites, setOtherWebsites] = useState<ExternalWebsite[]>(() => {
    try {
      const saved = localStorage.getItem('dreamfund_external_webs');
      return saved ? (JSON.parse(saved) as ExternalWebsite[]) : [
        {
          id: '1',
          name: 'Portofolio Saya',
          description: 'Kumpulan project dan pengalaman kerja saya di bidang pengembangan web.',
          url: 'https://example.com'
        },
        {
          id: '2',
          name: 'Project Demo',
          description: 'Cek demo project lainnya yang sedang dikembangkan.',
          url: 'https://example.com/demo'
        }
      ];
    } catch {
      return [];
    }
  });

  const [isAdding, setIsAdding] = useState(false);
  const [isManagingCats, setIsManagingCats] = useState(false);
  const [isAddingWeb, setIsAddingWeb] = useState(false);
  const [editingWebId, setEditingWebId] = useState<string | null>(null);

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
    description: '',
    url: ''
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

  const stats = useMemo(() => {
    const activeItems = items.filter(item => item.savedAmount < item.price);
    if (items.length > 0 && activeItems.length === 0) {
      return { remainingNeeded: 0, percentage: 100, allDone: true };
    }
    const remainingNeeded = activeItems.reduce((sum, item) => sum + (item.price - item.savedAmount), 0);
    const totalGoal = items.reduce((sum, item) => sum + item.price, 0);
    const totalSaved = items.reduce((sum, item) => sum + item.savedAmount, 0);
    const percentage = totalGoal > 0 ? Math.round((totalSaved / totalGoal) * 100) : 0;
    return { remainingNeeded, percentage, allDone: false };
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
      if (groups[cat] && groups[cat].length > 0) {
        orderedGroups[cat] = groups[cat];
      }
    });

    const others = items.filter(item => !categories.includes(item.category));
    if (others.length > 0) {
      orderedGroups['Lainnya'] = others;
    }

    return orderedGroups;
  }, [items, categories]);

  const cleanToNumber = (val: string) => val.replace(/\D/g, '');

  const formatRupiah = (val: string | number) => {
    const num = typeof val === 'string' ? cleanToNumber(val) : val.toString();
    if (!num) return '';
    return parseInt(num).toLocaleString('id-ID');
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

  const autoDistribute = () => {
    if (walletBalance <= 0 || items.length === 0) return;
    let currentItems = items.map(item => ({ ...item }));
    let remainingWallet = walletBalance;
    let activeIndices = currentItems.map((item, idx) => item.savedAmount < item.price ? idx : -1).filter(idx => idx !== -1);
    
    while (remainingWallet > 0 && activeIndices.length > 0) {
      const share = Math.floor(remainingWallet / activeIndices.length);
      if (share < 1) {
        const firstIdx = activeIndices[0];
        const needed = currentItems[firstIdx].price - currentItems[firstIdx].savedAmount;
        const finalAllocation = Math.min(needed, remainingWallet);
        currentItems[firstIdx].savedAmount += finalAllocation;
        remainingWallet -= finalAllocation;
        break; 
      }
      let distributedInThisRound = 0;
      let stillActiveInNextRound: number[] = [];
      for (const idx of activeIndices) {
        const item = currentItems[idx];
        const needed = item.price - item.savedAmount;
        const allocation = Math.min(needed, share);
        item.savedAmount += allocation;
        remainingWallet -= allocation;
        distributedInThisRound += allocation;
        if (item.savedAmount < item.price) stillActiveInNextRound.push(idx);
      }
      activeIndices = stillActiveInNextRound;
      if (distributedInThisRound === 0) break;
    }
    setItems(currentItems);
    setWalletBalance(Math.max(0, remainingWallet));
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseInt(cleanToNumber(newItem.price));
    if (!newItem.name || isNaN(priceNum)) return;
    const item: WishlistItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: newItem.name,
      price: priceNum,
      savedAmount: 0,
      category: newItem.category || categories[0] || 'Umum',
      createdAt: Date.now(),
      priority: newItem.priority,
    };
    setItems(prev => [item, ...prev]);
    setNewItem({ name: '', price: '', category: categories[0] || '', priority: 'Medium' });
    setIsAdding(false);
  };

  const addCategory = () => {
    if (newCatName && !categories.includes(newCatName)) {
      setCategories([...categories, newCatName]);
      setNewCatName('');
    }
  };

  const removeCategory = (cat: string) => {
    setCategories(categories.filter(c => c !== cat));
  };

  const handleDragStart = (index: number) => {
    setDraggedItemIndex(index);
  };

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

  const handleDragEnd = () => setDraggedItemIndex(null);

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

  // EXTERNAL WEB HANDLERS (LOGIKA TETAP ADA)
  const handleSaveWeb = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeb.name || !newWeb.url) return;
    
    let finalUrl = newWeb.url;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    if (editingWebId) {
      setOtherWebsites(prev => prev.map(w => w.id === editingWebId ? { ...w, ...newWeb, url: finalUrl } : w));
    } else {
      const web: ExternalWebsite = {
        id: Date.now().toString(),
        name: newWeb.name,
        description: newWeb.description,
        url: finalUrl
      };
      setOtherWebsites(prev => [...prev, web]);
    }

    setNewWeb({ name: '', description: '', url: '' });
    setEditingWebId(null);
    setIsAddingWeb(false);
  };

  const deleteWeb = (id: string) => {
    if (confirm("Hapus link website ini?")) {
      setOtherWebsites(prev => prev.filter(w => w.id !== id));
    }
  };

  const startEditWeb = (web: ExternalWebsite) => {
    setNewWeb({ name: web.name, description: web.description, url: web.url });
    setEditingWebId(web.id);
    setIsAddingWeb(true);
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-100 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <style>{`
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatUp { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(-40px); opacity: 0; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-float-up { animation: floatUp 2s ease-out forwards; }
        .item-card-exit { transform: scale(0.9); opacity: 0; transition: all 0.4s ease; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

      {/* HEADER */}
      <header className="bg-white border-b border-slate-300 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView('tracker')}>
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl transition-transform group-hover:scale-110">D</div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">DreamFund</h1>
          </div>
          
          <nav className="flex items-center gap-4">
            <button onClick={() => setCurrentView('tracker')} className={`text-sm font-bold transition-colors ${currentView === 'tracker' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>TABUNGAN</button>
            <button onClick={() => setCurrentView('websites')} className={`text-sm font-bold transition-colors ${currentView === 'websites' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}>WEB LAIN</button>
            <div className="w-[1px] h-6 bg-slate-200 mx-2 hidden sm:block"></div>
            
            {/* TOMBOL TAMBAH (Dinonaktifkan jika di portal web) */}
            {currentView === 'tracker' ? (
              <button onClick={() => setIsAdding(true)} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg> TAMBAH
              </button>
            ) : (
              /* Fitur Tambah Web di header dikomentari agar bisa diaktifkan nanti */
              /* <button onClick={() => { setIsAddingWeb(true); setEditingWebId(null); setNewWeb({name:'', description:'', url:''}); }} className="bg-slate-900 text-white px-5 py-2 rounded-lg font-bold hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg> TAMBAH WEB
              </button> */
              null
            )}
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-4xl mx-auto px-4 pt-8 animate-fade-in" key={currentView}>
        {currentView === 'tracker' ? (
          <>
            {/* SAVINGS TRACKER UI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="md:col-span-2 bg-white border border-slate-300 rounded-3xl p-8 shadow-sm relative overflow-hidden">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Sisa Saldo Tabungan</p>
                <div className="relative inline-block">
                  <h2 className="text-4xl font-black text-slate-900 mb-6">Rp {walletBalance.toLocaleString('id-ID')}</h2>
                  {balanceAnimation.show && (
                    <div className="absolute top-0 right-[-120px] text-emerald-500 font-black text-xl animate-float-up whitespace-nowrap">+Rp {balanceAnimation.amount}</div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                    <input type="text" inputMode="numeric" placeholder="Masukan nominal..." value={formatRupiah(tempWalletInput)} onChange={(e) => setTempWalletInput(cleanToNumber(e.target.value))} className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900" />
                  </div>
                  <button onClick={addToWallet} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 active:scale-95 transition-all">ISI SALDO</button>
                </div>
                {walletBalance > 0 && items.some(i => i.savedAmount < i.price) && (
                  <button onClick={autoDistribute} className="mt-6 w-full bg-indigo-50 border border-indigo-200 text-indigo-700 py-3 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> BAGI MERATA KE SEMUA
                  </button>
                )}
              </div>
              <div className="bg-white border border-slate-300 rounded-3xl p-8 flex flex-col justify-between shadow-sm">
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Sisa Target Aktif</p>
                  <h3 className="text-2xl font-bold text-slate-900">{stats.allDone ? "Semua Beres! ✓" : `Rp ${stats.remainingNeeded.toLocaleString('id-ID')}`}</h3>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-500 uppercase">Total Progress</span>
                    <span className="text-indigo-600 font-black">{stats.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                    <div className={`${stats.allDone ? 'bg-emerald-500' : 'bg-indigo-600'} h-4 rounded-full transition-all duration-1000`} style={{ width: `${stats.percentage}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6 flex justify-between items-center">
                <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Daftar Wishlist</h3>
                <button className="text-indigo-600 font-bold text-sm hover:underline" onClick={() => setIsManagingCats(true)}>Kelola Kategori</button>
            </div>

            {Object.keys(groupedItems).length > 0 ? (
              <div className="space-y-12">
                {Object.entries(groupedItems).map(([category, catItems]: [string, WishlistItem[]]) => (
                  <section key={category}>
                    <div className="flex items-center gap-3 mb-4 sticky top-[72px] bg-slate-100/95 backdrop-blur-sm py-2 z-20">
                      <h4 className="text-lg font-black text-slate-800 uppercase tracking-widest">{category}</h4>
                      <span className="bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-black">{catItems.length}</span>
                      <div className="flex-1 h-[2px] bg-slate-300"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {catItems.map((item: WishlistItem) => (
                        <div key={item.id} className={deletingId === item.id ? 'item-card-exit' : ''}>
                          <ItemCard item={item} walletBalance={walletBalance} onUpdate={updateItemAmount} onDelete={deleteItem} onAllocateFromWallet={allocateFromWallet} />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-300">
                <p className="text-slate-400 font-bold text-lg">Wishlist masih kosong.</p>
                <button onClick={() => setIsAdding(true)} className="mt-4 text-indigo-600 font-bold hover:underline">Tambah barang pertama kamu</button>
              </div>
            )}
          </>
        ) : (
          /* PORTAL WEB (Disederhanakan untuk tampilan publik/statis) */
          <div className="py-4">
            <div className="mb-10 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Portal Web Saya</h2>
                <p className="text-slate-500 font-medium italic">Koleksi project dan link favorit pilihan saya.</p>
              </div>
              
              {/* Fitur Tambah Web dinonaktifkan sementara (dikomentari) */}
              {/* <button 
                onClick={() => { setIsAddingWeb(true); setEditingWebId(null); setNewWeb({name:'', description:'', url:''}); }}
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                TAMBAH LINK BARU
              </button> */}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {otherWebsites.map((web) => (
                <div key={web.id} className="bg-white border border-slate-300 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all group relative">
                  
                  {/* Tombol Edit/Hapus disembunyikan agar tampilan bersih (Read-Only) */}
                  {/* <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEditWeb(web)} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deleteWeb(web.id)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div> */}

                  <div className="flex flex-col h-full">
                    <div className="mb-6">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{web.name}</h3>
                      <p className="text-slate-500 leading-relaxed font-medium line-clamp-3">{web.description || "Tidak ada deskripsi."}</p>
                    </div>
                    <div className="mt-auto pt-6 border-t border-slate-100">
                      <a href={web.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-indigo-600 transition-all active:scale-95 group/btn shadow-md">
                        KUNJUNGI WEB
                        <svg className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              {otherWebsites.length === 0 && (
                <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                   <p className="text-slate-400 font-bold mb-4">Belum ada link website yang tersedia.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL WEB LAIN (KODE DIBAWAH TETAP ADA, TAPI TRIGGER DISUMBUNYIKAN DIATAS) */}
      {isAddingWeb && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">{editingWebId ? "Edit Website" : "Tambah Web Baru"}</h3>
              <button onClick={() => setIsAddingWeb(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveWeb} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Nama Website</label>
                <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Contoh: My Blog" value={newWeb.name} onChange={e => setNewWeb({...newWeb, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Deskripsi Singkat</label>
                <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={3} placeholder="Apa fungsi website ini?" value={newWeb.description} onChange={e => setNewWeb({...newWeb, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">URL Tujuan</label>
                <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="google.com atau https://..." value={newWeb.url} onChange={e => setNewWeb({...newWeb, url: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-all shadow-lg hover:bg-slate-800">
                {editingWebId ? "SIMPAN PERUBAHAN" : "TAMBAHKAN LINK"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* OTHER MODALS (Wishlist & Categories) */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Barang Baru</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={addItem} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Nama Barang</label>
                <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Harga (Rp)</label>
                  <input required type="text" inputMode="numeric" className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" value={formatRupiah(newItem.price)} onChange={e => setNewItem({...newItem, price: cleanToNumber(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Kategori</label>
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">Prioritas</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button key={p} type="button" onClick={() => setNewItem({...newItem, priority: p as any})} className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${newItem.priority === p ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200 text-slate-400'}`}>
                      {p === 'High' ? 'TINGGI' : p === 'Medium' ? 'SEDANG' : 'RENDAH'}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-all shadow-lg hover:bg-slate-800">SIMPAN BARANG</button>
            </form>
          </div>
        </div>
      )}

      {isManagingCats && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Kelola Kategori</h3>
              <button onClick={() => setIsManagingCats(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex gap-2">
                <input placeholder="Nama kategori baru..." className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCategory()} />
                <button onClick={addCategory} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 active:scale-95 transition-all">TAMBAH</button>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-2 0v12a1 1 0 002 0V4zM9 4a1 1 0 00-2 0v12a1 1 0 002 0V4zM13 4a1 1 0 00-2 0v12a1 1 0 002 0V4zM17 4a1 1 0 00-2 0v12a1 1 0 002 0V4z" /></svg>
                  Tahan & Geser untuk Atur Urutan
                </p>
                <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {categories.map((cat, idx) => (
                    <div key={cat} draggable onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd} className={`flex justify-between items-center bg-slate-50 p-4 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing hover:border-indigo-200 group ${draggedItemIndex === idx ? 'opacity-40 bg-indigo-50 border-indigo-400 scale-95' : 'border-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className="text-slate-300 group-hover:text-indigo-400 transition-colors">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8h16M4 16h16" /></svg>
                        </div>
                        <span className="font-bold text-slate-800 uppercase tracking-tight">{cat}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeCategory(cat); }} className="text-slate-300 hover:text-red-500 p-2 transition-colors rounded-lg hover:bg-red-50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setIsManagingCats(false)} className="w-full border-2 border-slate-900 text-slate-900 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 active:scale-95 transition-all">SIMPAN & TUTUP</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
