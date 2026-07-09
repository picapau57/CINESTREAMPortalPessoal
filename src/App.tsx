import React, { useState, useEffect } from 'react';
import { 
  Film, Music, Tv, FileAudio, Heart, LayoutGrid, Plus, 
  Search, Sparkles, User, Database, Info, RefreshCw,
  Video, Eye, Play, Star, ChevronRight, Cloud, CloudOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MediaItem, PlaybackState, CategoryFilter } from './types';
import { DEFAULT_MEDIA_ITEMS } from './data/defaultMedia';
import MediaPlayer from './components/MediaPlayer';
import AddMediaModal from './components/AddMediaModal';
import MediaGrid from './components/MediaGrid';
import ResumePlayingList from './components/ResumePlayingList';
import { db, mediaCollectionRef, progressCollectionRef } from './lib/firebase';
import { onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export default function App() {
  // --- STATE ---
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [playbackStates, setPlaybackStates] = useState<{ [key: string]: PlaybackState }>({});
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMediaItem, setActiveMediaItem] = useState<MediaItem | null>(null);
  const [initialPlayhead, setInitialPlayhead] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  
  // Custom interactive stat/info box toggle
  const [showStats, setShowStats] = useState(false);

  // User details for personalization
  const userEmail = "picapauinformatica@gmail.com";

  // --- INITIALIZATION (FIREBASE SYNCHRONIZATION) ---
  useEffect(() => {
    // 1. Sync Media Items from Firestore in real-time
    const unsubscribeMedia = onSnapshot(mediaCollectionRef, async (snapshot) => {
      if (snapshot.empty) {
        console.log("Firestore media items collection is empty. Seeding defaults...");
        try {
          // Push each default media item to Firestore
          for (const item of DEFAULT_MEDIA_ITEMS) {
            await setDoc(doc(db, 'media_items', item.id), item);
          }
        } catch (error) {
          console.error("Error seeding defaults to Firestore:", error);
        }
      } else {
        const items: MediaItem[] = [];
        snapshot.forEach((d) => {
          items.push(d.data() as MediaItem);
        });
        // Sort items by addedAt descending (newest first)
        items.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
        setMediaItems(items);
        localStorage.setItem('personal_streaming_media', JSON.stringify(items));
      }
      setIsCloudSynced(true);
    }, (error) => {
      console.error("Firestore media subscription error:", error);
      setIsCloudSynced(false);
      // Fallback to local storage if Firestore is blocked or fails
      const savedMedia = localStorage.getItem('personal_streaming_media');
      if (savedMedia) {
        try {
          setMediaItems(JSON.parse(savedMedia));
        } catch (e) {
          setMediaItems(DEFAULT_MEDIA_ITEMS);
        }
      } else {
        setMediaItems(DEFAULT_MEDIA_ITEMS);
      }
    });

    // 2. Sync Playback Progress from Firestore in real-time
    const unsubscribeProgress = onSnapshot(progressCollectionRef, (snapshot) => {
      const states: { [key: string]: PlaybackState } = {};
      snapshot.forEach((d) => {
        states[d.id] = d.data() as PlaybackState;
      });
      setPlaybackStates(states);
      localStorage.setItem('personal_streaming_progress', JSON.stringify(states));
    }, (error) => {
      console.error("Firestore progress subscription error:", error);
      const savedProgress = localStorage.getItem('personal_streaming_progress');
      if (savedProgress) {
        try {
          setPlaybackStates(JSON.parse(savedProgress));
        } catch (e) {}
      }
    });

    return () => {
      unsubscribeMedia();
      unsubscribeProgress();
    };
  }, []);

  // --- ACTION HANDLERS ---
  const handleToggleFavorite = async (id: string) => {
    const item = mediaItems.find(i => i.id === id);
    if (!item) return;

    const newFavoriteState = !item.isFavorite;

    // Optimistic local state update for instant visual response
    setMediaItems(prev => prev.map(i => i.id === id ? { ...i, isFavorite: newFavoriteState } : i));

    try {
      await updateDoc(doc(db, 'media_items', id), { isFavorite: newFavoriteState });
    } catch (e) {
      console.error("Failed to update favorite in Firestore:", e);
    }
  };

  const handleAddMedia = async (newItemOrItems: Omit<MediaItem, 'id' | 'addedAt' | 'isFavorite'> | Omit<MediaItem, 'id' | 'addedAt' | 'isFavorite'>[]) => {
    const now = new Date().toISOString();
    try {
      if (Array.isArray(newItemOrItems)) {
        for (let index = 0; index < newItemOrItems.length; index++) {
          const item = newItemOrItems[index];
          const id = `user-${Date.now()}-${index}`;
          const created: MediaItem = {
            ...item,
            id,
            addedAt: now,
            isFavorite: false
          };
          await setDoc(doc(db, 'media_items', id), created);
        }
      } else {
        const id = `user-${Date.now()}`;
        const created: MediaItem = {
          ...newItemOrItems,
          id,
          addedAt: now,
          isFavorite: false
        };
        await setDoc(doc(db, 'media_items', id), created);
      }
    } catch (e) {
      console.error("Failed to add media to Firestore:", e);
      alert("Erro ao salvar mídias na nuvem. Verifique sua conexão.");
    }
    setIsAddModalOpen(false);
  };

  const handleDeleteMedia = async (id: string) => {
    const confirmDelete = window.confirm("Tem certeza de que deseja remover esta mídia da sua lista de streaming pessoal?");
    if (!confirmDelete) return;

    // Optimistic local state update
    setMediaItems(prev => prev.filter(item => item.id !== id));

    try {
      await deleteDoc(doc(db, 'media_items', id));
      // Also clean watch progress
      await deleteDoc(doc(db, 'playback_progress', id));
    } catch (e) {
      console.error("Failed to delete from Firestore:", e);
    }
  };

  const handleProgressUpdate = async (mediaId: string, progress: number, duration: number) => {
    const lastPlayedAt = new Date().toISOString();
    const state: PlaybackState = {
      mediaId,
      progress,
      duration,
      lastPlayedAt
    };

    // Optimistic local state update
    setPlaybackStates(prev => ({
      ...prev,
      [mediaId]: state
    }));

    try {
      await setDoc(doc(db, 'playback_progress', mediaId), state);
    } catch (e) {
      console.error("Failed to update progress in Firestore:", e);
    }
  };

  const handleClearProgress = async (mediaId: string) => {
    // Optimistic local state update
    setPlaybackStates(prev => {
      const updated = { ...prev };
      delete updated[mediaId];
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'playback_progress', mediaId));
    } catch (e) {
      console.error("Failed to clear progress in Firestore:", e);
    }
  };

  const handleResetToDefaults = async () => {
    const confirmReset = window.confirm("Deseja restaurar as mídias padrões? Suas mídias adicionadas manualmente não serão removidas.");
    if (!confirmReset) return;

    const existingUrls = new Set(mediaItems.map(item => item.url));
    const toAdd = DEFAULT_MEDIA_ITEMS.filter(item => !existingUrls.has(item.url));
    
    if (toAdd.length === 0) {
      alert("Todos os canais e mídias padrão já estão na sua lista!");
      return;
    }

    try {
      for (const item of toAdd) {
        await setDoc(doc(db, 'media_items', item.id), item);
      }
      alert("Canais e mídias padrões restaurados com sucesso na nuvem!");
    } catch (e) {
      console.error("Error restoring defaults in Firestore:", e);
      alert("Erro ao restaurar mídias padrões.");
    }
  };

  const handleSelectMedia = (item: MediaItem, customProgress?: number) => {
    // If progress is supplied (from resume list), use it. Otherwise, lookup saved progress
    let startAt = 0;
    if (customProgress !== undefined) {
      startAt = customProgress;
    } else {
      const saved = playbackStates[item.id];
      if (saved) {
        const percent = (saved.progress / saved.duration) * 100;
        // Only resume if not finished (under 95%)
        if (percent > 1 && percent < 95) {
          startAt = saved.progress;
        }
      }
    }
    
    setInitialPlayhead(startAt);
    setActiveMediaItem(item);
  };

  // --- COMPUTED PROPERTIES / FILTERING ---
  const filteredItems = mediaItems.filter(item => {
    // Category match
    const categoryMatch = activeCategory === 'all' 
      || (activeCategory === 'favorites' && item.isFavorite)
      || item.category === activeCategory;

    // Search match
    const searchMatch = !searchQuery.trim()
      || item.title.toLowerCase().includes(searchQuery.toLowerCase())
      || item.description.toLowerCase().includes(searchQuery.toLowerCase());

    return categoryMatch && searchMatch;
  });

  // Calculate stats
  const totalItems = mediaItems.length;
  const videoCount = mediaItems.filter(i => i.type === 'video').length;
  const audioCount = mediaItems.filter(i => i.type === 'audio').length;
  const favoriteCount = mediaItems.filter(i => i.isFavorite).length;

  // Curated featured item for Hero Banner (use first favorite item or first item)
  const featuredItem = mediaItems.find(i => i.isFavorite && i.type === 'video') || mediaItems[0];

  return (
    <div className="min-h-screen bg-[#08080a] text-[#e2e2e7] font-sans flex flex-col md:flex-row antialiased relative overflow-hidden">
      
      {/* Sleek Background Glow highlights */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[#3b82f6] rounded-full blur-[160px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#6366f1] rounded-full blur-[140px]"></div>
      </div>

      {/* ================= SIDEBAR ================= */}
      <aside className="relative z-10 w-full md:w-64 bg-[#0c0c10]/95 backdrop-blur-md md:border-r border-white/5 flex flex-col shrink-0">
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold shadow-lg shadow-blue-500/20">
              <Tv size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-none text-white">
                CINE<span className="text-blue-500">STREAM</span>
              </h1>
              <span className="text-[9px] uppercase tracking-wider font-bold text-blue-400">
                Portal Pessoal
              </span>
            </div>
          </div>

          <span className="md:hidden p-1 bg-zinc-950 border border-zinc-800 rounded-md text-[9px] uppercase font-bold text-zinc-500">
            v1.0.0
          </span>
        </div>

        {/* Action Button: Adicionar Mídia */}
        <div className="px-4 py-4 border-b border-white/5">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20 active:scale-97 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            ADICIONAR MÍDIA
          </button>
        </div>

        {/* Categories / Filters Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-zinc-500 tracking-wider px-3 mb-2 uppercase select-none">
            Biblioteca
          </div>

          {/* All Library */}
          <button
            onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer ${
              activeCategory === 'all' 
                ? 'bg-[#181820] text-white font-bold border border-white/5' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutGrid size={15} className={activeCategory === 'all' ? 'text-blue-400' : ''} />
              <span>Todos os Streams</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 font-bold bg-zinc-950 px-2 py-0.5 rounded-full">{totalItems}</span>
          </button>

          {/* Filmes */}
          <button
            onClick={() => { setActiveCategory('filmes'); setSearchQuery(''); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer ${
              activeCategory === 'filmes' 
                ? 'bg-[#181820] text-white font-bold border border-white/5' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Film size={15} className={activeCategory === 'filmes' ? 'text-blue-400' : ''} />
              <span>Filmes</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full">
              {mediaItems.filter(i => i.category === 'filmes').length}
            </span>
          </button>

          {/* Series */}
          <button
            onClick={() => { setActiveCategory('series'); setSearchQuery(''); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer ${
              activeCategory === 'series' 
                ? 'bg-[#181820] text-white font-bold border border-white/5' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Film size={15} className={activeCategory === 'series' ? 'text-blue-400 animate-pulse' : ''} />
              <span>Séries</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full">
              {mediaItems.filter(i => i.category === 'series').length}
            </span>
          </button>

          {/* Live Channels */}
          <button
            onClick={() => { setActiveCategory('canais'); setSearchQuery(''); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer ${
              activeCategory === 'canais' 
                ? 'bg-[#181820] text-white font-bold border border-white/5' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Tv size={15} className={activeCategory === 'canais' ? 'text-blue-400' : ''} />
              <span>Canais de TV / Lives</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full">
              {mediaItems.filter(i => i.category === 'canais').length}
            </span>
          </button>

          {/* Músicas */}
          <button
            onClick={() => { setActiveCategory('musicas'); setSearchQuery(''); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer ${
              activeCategory === 'musicas' 
                ? 'bg-[#181820] text-white font-bold border border-white/5' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Music size={15} className={activeCategory === 'musicas' ? 'text-blue-400' : ''} />
              <span>Músicas</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full">
              {mediaItems.filter(i => i.category === 'musicas').length}
            </span>
          </button>

          {/* Podcasts */}
          <button
            onClick={() => { setActiveCategory('podcasts'); setSearchQuery(''); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer ${
              activeCategory === 'podcasts' 
                ? 'bg-[#181820] text-white font-bold border border-white/5' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <FileAudio size={15} className={activeCategory === 'podcasts' ? 'text-blue-400' : ''} />
              <span>Podcasts</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded-full">
              {mediaItems.filter(i => i.category === 'podcasts').length}
            </span>
          </button>

          {/* Favorites separator */}
          <div className="h-px bg-white/5 my-4" />

          {/* Favoritos */}
          <button
            onClick={() => { setActiveCategory('favorites'); setSearchQuery(''); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer ${
              activeCategory === 'favorites' 
                ? 'bg-[#181820] text-white font-bold border border-white/5' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Heart size={15} fill={activeCategory === 'favorites' ? 'currentColor' : 'none'} className={activeCategory === 'favorites' ? 'text-red-500' : ''} />
              <span>Minha Lista</span>
            </span>
            <span className="text-[10px] font-mono text-red-400/80 bg-red-950/30 px-2 py-0.5 rounded-full">{favoriteCount}</span>
          </button>
        </nav>

        {/* Sidebar Admin Footer / Status */}
        <div className="p-4 border-t border-white/5 bg-[#0c0c10]/50">
          {/* User profile capsule */}
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-950/60 border border-white/5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs">
              <User size={13} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-zinc-400 truncate">Admin Pessoal</div>
              <div className="text-[8px] text-zinc-600 font-mono truncate">{userEmail}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ================= MAIN CONTENT SPACE ================= */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
        
        {/* Top Header / Search bar bar */}
        <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between gap-4 z-10 bg-[#08080a]/65 backdrop-blur-md sticky top-0">
          
          {/* Search container */}
          <div className="flex-1 max-w-lg relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
            <input 
              type="text" 
              placeholder="Pesquisar canais, filmes, músicas ou podcasts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#12121a]/60 hover:bg-[#161622] border border-white/5 rounded-full py-1.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all duration-300"
            />
          </div>

          {/* Settings & Info toggles */}
          <div className="flex items-center gap-3">
            
            {/* Cloud Sync Status Badge */}
            {isCloudSynced ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold select-none shadow-sm">
                <Cloud size={13} className="text-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Sincronizado</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 text-[10px] font-bold select-none shadow-sm">
                <CloudOff size={13} className="animate-pulse" />
                <span className="hidden sm:inline">Conectando...</span>
              </div>
            )}

            {/* Quick stats panel toggle */}
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showStats 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                  : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Exibir Estatísticas da Biblioteca"
            >
              <Database size={15} />
            </button>

            {/* Restore defaults backup */}
            <button
              onClick={handleResetToDefaults}
              className="p-2 rounded-xl bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Restaurar Mídias Padrões"
            >
              <RefreshCw size={15} />
            </button>

          </div>
        </header>

        {/* Main Scrolling Body */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* Interactive Statistics Banner */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-[#0c0c10]/90 backdrop-blur-md border border-white/5 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1 py-1.5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Total de Mídias</p>
                    <p className="text-xl font-black text-white font-mono">{totalItems}</p>
                  </div>
                  <div className="space-y-1 py-1.5 border-l border-white/5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Filmes e Séries</p>
                    <p className="text-xl font-black text-blue-400 font-mono">{videoCount}</p>
                  </div>
                  <div className="space-y-1 py-1.5 border-l border-white/5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Áudios & Podcasts</p>
                    <p className="text-xl font-black text-cyan-400 font-mono">{audioCount}</p>
                  </div>
                  <div className="space-y-1 py-1.5 border-l border-white/5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Favoritados</p>
                    <p className="text-xl font-black text-red-500 font-mono">{favoriteCount}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Continue Watching Section */}
          <ResumePlayingList 
            items={mediaItems}
            playbackStates={playbackStates}
            onSelectMedia={handleSelectMedia}
            onClearProgress={handleClearProgress}
          />

          {/* CURATED HERO BANNER */}
          {featuredItem && activeCategory === 'all' && !searchQuery && (
            <div className="relative rounded-2xl overflow-hidden aspect-[21/9] bg-[#0c0c10] border border-white/5 shadow-2xl flex items-end">
              {/* Background Cover */}
              {featuredItem.thumbnailUrl ? (
                <img 
                  src={featuredItem.thumbnailUrl} 
                  alt={featuredItem.title} 
                  className="absolute inset-0 w-full h-full object-cover brightness-[0.4]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 to-zinc-950" />
              )}
              {/* Cinematic Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              {/* Banner Info */}
              <div className="relative p-6 sm:p-8 md:max-w-[65%] space-y-3 z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400">
                    Destaque da Lista
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-white/5 border border-white/5 text-zinc-300">
                    {featuredItem.category}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white line-clamp-1 leading-none">{featuredItem.title}</h2>
                <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2 max-w-xl">
                  {featuredItem.description}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => handleSelectMedia(featuredItem)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all cursor-pointer"
                  >
                    <Play size={14} fill="currentColor" /> ASSISTIR AGORA
                  </button>
                  <button
                    onClick={() => handleToggleFavorite(featuredItem.id)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      featuredItem.isFavorite 
                        ? 'bg-red-500/10 border-red-500/30 text-red-500' 
                        : 'bg-white/5 border border-white/5 text-zinc-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Heart size={14} fill={featuredItem.isFavorite ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Primary Library Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight capitalize">
                {activeCategory === 'all' 
                  ? 'Catálogo Completo' 
                  : activeCategory === 'favorites' 
                    ? 'Minha Lista Pessoal' 
                    : activeCategory === 'canais' 
                      ? 'Canais Live & Streams' 
                      : activeCategory
                }
              </h2>
              <p className="text-xs text-zinc-500">
                {activeCategory === 'favorites' 
                  ? 'Suas transmissões preferidas salvas localmente' 
                  : 'Navegue pelos seus arquivos de áudio e vídeo adicionados'
                }
              </p>
            </div>
            
            {/* Display Mode Indicator */}
            <div className="text-[10px] text-zinc-500 font-bold bg-white/5 border border-white/5 px-3 py-1 rounded-full uppercase tracking-wider select-none flex items-center gap-1">
              <Eye size={12} /> {filteredItems.length} mídias
            </div>
          </div>

          {/* Media Grid Catalogue */}
          <MediaGrid 
            items={filteredItems}
            playbackStates={playbackStates}
            activeCategory={activeCategory}
            searchQuery={searchQuery}
            onSelectMedia={handleSelectMedia}
            onToggleFavorite={handleToggleFavorite}
            onDeleteMedia={handleDeleteMedia}
            onOpenAddModal={() => setIsAddModalOpen(true)}
          />

        </div>
      </main>

      {/* ================= POPUP MODALS & IMPERATIVE FLOATING LAYOUTS ================= */}

      {/* Media Player Modal Overlay */}
      <AnimatePresence>
        {activeMediaItem && (
          <MediaPlayer 
            item={activeMediaItem}
            initialProgress={initialPlayhead}
            onClose={() => setActiveMediaItem(null)}
            onProgressUpdate={handleProgressUpdate}
          />
        )}
      </AnimatePresence>

      {/* Add Media Entry Form Modal Overlay */}
      <AnimatePresence>
        {isAddModalOpen && (
          <AddMediaModal 
            onClose={() => setIsAddModalOpen(false)}
            onAdd={handleAddMedia}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
