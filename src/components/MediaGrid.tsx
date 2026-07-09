import React from 'react';
import { Play, Heart, Trash2, Video, Music, Calendar, Search, Film, Tv, FileAudio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MediaItem, PlaybackState } from '../types';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  filmes: <Film size={10} />,
  series: <Tv size={10} />,
  musicas: <Music size={10} />,
  podcasts: <FileAudio size={10} />,
  canais: <Tv size={10} />
};

const CATEGORY_LABELS: Record<string, string> = {
  filmes: 'Filme',
  series: 'Série',
  musicas: 'Música',
  podcasts: 'Podcast',
  canais: 'Canal TV'
};

const getGradientStyle = (title: string, category: string) => {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 5;
  
  const gradients = [
    'from-[#ff007f] via-[#7b2cbf] to-[#03001e]', // Hot synthwave
    'from-[#00c9ff] via-[#92fe9d] to-[#0f2027]', // Cyber lime/blue
    'from-[#f12711] via-[#f5af19] to-[#0f0c1b]', // Flaming orange
    'from-[#8a2387] via-[#e94057] to-[#f27121]', // Velvet sun
    'from-[#00f2fe] via-[#4facfe] to-[#1e3c72]'  // Bright ocean
  ];
  
  const categoryThemes: Record<string, string> = {
    filmes: 'from-rose-600 via-red-700 to-zinc-950',
    series: 'from-violet-600 via-indigo-700 to-zinc-950',
    canais: 'from-blue-600 via-cyan-700 to-zinc-950',
    musicas: 'from-emerald-600 via-teal-700 to-zinc-950',
    podcasts: 'from-amber-600 via-orange-700 to-zinc-950'
  };

  return categoryThemes[category] || gradients[index];
};

interface MediaGridProps {
  items: MediaItem[];
  playbackStates: { [key: string]: PlaybackState };
  activeCategory: string;
  searchQuery: string;
  onSelectMedia: (item: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onDeleteMedia: (id: string) => void;
  onOpenAddModal: () => void;
}

export default function MediaGrid({
  items,
  playbackStates,
  activeCategory,
  searchQuery,
  onSelectMedia,
  onToggleFavorite,
  onDeleteMedia,
  onOpenAddModal
}: MediaGridProps) {
  
  // Format dates elegantly
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    } catch (_) {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Result Heading */}
      {searchQuery && (
        <div className="flex items-center gap-2 text-zinc-400 text-sm border-b border-white/5 pb-3">
          <Search size={16} />
          Resultados da pesquisa por <span className="text-white font-semibold">"{searchQuery}"</span>
          <span className="text-zinc-600">({items.length} mídias encontradas)</span>
        </div>
      )}

      {/* Grid */}
      <AnimatePresence mode="popLayout">
        {items.length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {items.map((item, index) => {
              const playback = playbackStates[item.id];
              const progressPercentage = playback && playback.duration 
                ? (playback.progress / playback.duration) * 100 
                : 0;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                  className="group relative flex flex-col bg-zinc-950/50 backdrop-blur-md border border-white/[0.08] rounded-xl overflow-hidden hover:border-blue-500/50 hover:ring-1 hover:ring-blue-500/20 transition-all duration-300 shadow-md hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer"
                  onClick={() => onSelectMedia(item)}
                >
                  {/* Thumbnail / Cover */}
                  <div className="relative aspect-video w-full bg-[#08080a] overflow-hidden group">
                    {item.thumbnailUrl ? (
                      <>
                        <img 
                          src={item.thumbnailUrl} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 contrast-[1.05] saturate-[1.05] brightness-95 group-hover:brightness-100"
                          referrerPolicy="no-referrer"
                        />
                        {/* Elegant bottom gradient overlay to show the title clearly on the thumbnail (highly legible) */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-3 pt-10 flex flex-col justify-end z-10 transition-opacity">
                          <span className="text-white font-extrabold text-xs sm:text-sm tracking-tight leading-tight line-clamp-1 group-hover:text-blue-400 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            {item.title}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${getGradientStyle(item.title, item.category)} p-4 text-center relative group-hover:scale-105 transition-transform duration-500`}>
                        {/* Elegant background overlay for depth */}
                        <div className="absolute inset-0 bg-black/20 mix-blend-multiply" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        
                        {/* Huge Category Watermark Icon in background */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.12] text-white scale-[2.2] select-none pointer-events-none transition-transform group-hover:scale-[2.4] duration-500">
                          {item.category === 'filmes' ? <Film size={48} /> : 
                           item.category === 'series' ? <Tv size={48} /> : 
                           item.category === 'canais' ? <Tv size={48} /> : 
                           item.category === 'podcasts' ? <FileAudio size={48} /> : <Music size={48} />}
                        </div>
                        
                        {/* Prominent title directly on the center of the card when there is no cover */}
                        <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 h-full w-full">
                          {/* Beautiful Category Badge */}
                          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[9px] uppercase tracking-wider font-extrabold shadow-sm">
                            {CATEGORY_ICONS[item.category] || <Film size={10} />}
                            <span>{CATEGORY_LABELS[item.category] || item.category}</span>
                          </div>
                          
                          {/* The actual name of the movie/series/TV channel, huge and readable */}
                          <span className="text-white text-xs sm:text-sm font-extrabold tracking-tight leading-snug line-clamp-2 px-1 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] uppercase font-sans">
                            {item.title}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Black overlay on hover with play button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                      <div className="p-3.5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white scale-90 group-hover:scale-100 transition-all duration-300 shadow-lg shadow-blue-500/30">
                        <Play size={20} fill="currentColor" className={item.type === 'video' ? 'ml-0.5' : ''} />
                      </div>
                    </div>

                    {/* Category badge */}
                    <div className="absolute top-2.5 left-2.5 z-20 flex gap-1">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-blue-400 flex items-center gap-1">
                        {CATEGORY_ICONS[item.category] || <Film size={10} />}
                        <span>{CATEGORY_LABELS[item.category] || item.category}</span>
                      </span>
                      <span className="text-[9px] uppercase tracking-wider font-bold p-1 rounded-full bg-black/80 backdrop-blur-md text-zinc-300 border border-white/10">
                        {item.type === 'video' ? <Video size={10} /> : <Music size={10} />}
                      </span>
                    </div>

                    {/* Favorite and Delete actions container */}
                    <div className="absolute top-2.5 right-2.5 z-20 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleFavorite(item.id)}
                        className={`p-1.5 rounded-full backdrop-blur-md border transition-all duration-200 active:scale-90 ${
                          item.isFavorite 
                            ? 'bg-red-500/20 border-red-500/40 text-red-400' 
                            : 'bg-black/60 border-white/10 text-zinc-300 hover:text-white'
                        }`}
                        title={item.isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                      >
                        <Heart size={13} fill={item.isFavorite ? "currentColor" : "none"} />
                      </button>

                      <button
                        onClick={() => onDeleteMedia(item.id)}
                        className="p-1.5 rounded-full backdrop-blur-md bg-black/60 border border-white/10 text-zinc-300 hover:text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-200 active:scale-90"
                        title="Remover Mídia"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Mini Playback Progress bar */}
                    {progressPercentage > 0 && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" 
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Info Card Body */}
                  <div className="flex flex-col flex-1 p-4 space-y-1.5 bg-zinc-950/20">
                    <h4 className="font-bold text-sm text-white tracking-tight leading-snug line-clamp-1 group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 min-h-[2rem]">
                      {item.description || "Sem descrição disponível para esta mídia."}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-white/[0.06]">
                      <span className="flex items-center gap-1 font-medium text-zinc-400">
                        {item.type === 'video' ? 'Vídeo Stream' : 'Áudio Stream'}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-zinc-400">
                        <Calendar size={10} /> {formatDate(item.addedAt)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          /* Empty State */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center p-12 text-center bg-[#0c0c10]/40 border border-white/5 border-dashed rounded-2xl max-w-xl mx-auto"
          >
            <div className="w-14 h-14 rounded-full bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-600 mb-4">
              <Search size={24} />
            </div>
            <h4 className="font-bold text-base text-zinc-300">Nenhuma mídia encontrada</h4>
            <p className="text-xs text-zinc-500 mt-1.5 max-w-md leading-relaxed">
              {searchQuery 
                ? "Nenhum resultado corresponde à sua pesquisa. Tente buscar por outros termos ou limpar os filtros."
                : activeCategory === 'favorites'
                  ? "Você ainda não favoritou nenhuma mídia. Marque suas mídias favoritas para acessá-las rapidamente aqui!"
                  : `Você ainda não adicionou nenhuma mídia na categoria de ${activeCategory}. Adicione seus streams e arquivos pessoais para começar.`
              }
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={onOpenAddModal}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg transition shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 cursor-pointer"
              >
                Adicionar Nova Mídia
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
