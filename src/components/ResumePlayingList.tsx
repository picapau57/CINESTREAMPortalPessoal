import React from 'react';
import { Play, RotateCcw, Clock, Trash2, Film, Tv, FileAudio, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MediaItem, PlaybackState } from '../types';

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
    'from-[#ff007f] via-[#7b2cbf] to-[#03001e]',
    'from-[#00c9ff] via-[#92fe9d] to-[#0f2027]',
    'from-[#f12711] via-[#f5af19] to-[#0f0c1b]',
    'from-[#8a2387] via-[#e94057] to-[#f27121]',
    'from-[#00f2fe] via-[#4facfe] to-[#1e3c72]'
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

interface ResumePlayingListProps {
  items: MediaItem[];
  playbackStates: { [key: string]: PlaybackState };
  onSelectMedia: (item: MediaItem, progress: number) => void;
  onClearProgress: (mediaId: string) => void;
}

export default function ResumePlayingList({
  items,
  playbackStates,
  onSelectMedia,
  onClearProgress
}: ResumePlayingListProps) {
  
  // Filter items that have saved playback state, are not completed (>1% and <95%)
  const resumeItems = items.filter(item => {
    const state = playbackStates[item.id];
    if (!state) return false;
    const progressPercent = (state.progress / state.duration) * 100;
    return progressPercent > 1 && progressPercent < 95;
  }).sort((a, b) => {
    const timeA = new Date(playbackStates[a.id].lastPlayedAt).getTime();
    const timeB = new Date(playbackStates[b.id].lastPlayedAt).getTime();
    return timeB - timeA; // most recently played first
  });

  if (resumeItems.length === 0) return null;

  // Format seconds to text: eg "Parou em 14:20"
  const formatProgressTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    const remainingSecs = Math.floor(secs % 60);

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(remainingMins)}:${pad(remainingSecs)}`;
    }
    return `${pad(remainingMins)}:${pad(remainingSecs)}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pb-4 border-b border-white/5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-2">
          <Clock size={16} className="text-blue-500" /> Continuar de Onde Parou
        </h3>
        <span className="text-[10px] text-zinc-500 bg-[#0c0c10]/70 border border-white/5 px-2.5 py-0.5 rounded-full uppercase font-semibold">
          {resumeItems.length} mídias em andamento
        </span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-zinc-850 scrollbar-track-transparent">
        <AnimatePresence mode="popLayout">
          {resumeItems.map((item) => {
            const state = playbackStates[item.id];
            const percent = (state.progress / state.duration) * 100;

            return (
              <motion.div
                key={`resume-${item.id}`}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex-none w-64 bg-zinc-950/50 backdrop-blur-md border border-white/[0.08] rounded-xl overflow-hidden hover:border-blue-500/50 hover:ring-1 hover:ring-blue-500/20 transition-all duration-300 group relative cursor-pointer shadow-md hover:shadow-xl"
                onClick={() => onSelectMedia(item, state.progress)}
              >
                {/* Image / Thumbnail Container */}
                <div className="relative aspect-video w-full bg-[#08080a] overflow-hidden">
                  {item.thumbnailUrl ? (
                    <>
                      <img 
                        src={item.thumbnailUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 contrast-[1.05] saturate-[1.05] brightness-95 group-hover:brightness-100"
                        referrerPolicy="no-referrer"
                      />
                      {/* Elegant bottom shadow with title */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-2.5 pt-8 flex flex-col justify-end z-10">
                        <span className="text-white font-extrabold text-[11px] sm:text-xs tracking-tight leading-tight line-clamp-1 group-hover:text-blue-400 transition-colors drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)]">
                          {item.title}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${getGradientStyle(item.title, item.category)} p-3 text-center relative group-hover:scale-105 transition-transform duration-500`}>
                      <div className="absolute inset-0 bg-black/20 mix-blend-multiply" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
                      
                      {/* Prominent title directly on the center of the card when there is no cover */}
                      <div className="relative z-10 flex flex-col items-center justify-center gap-1 h-full w-full">
                        <span className="text-white text-[11px] sm:text-xs font-extrabold tracking-tight leading-snug line-clamp-2 px-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] uppercase font-sans">
                          {item.title}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                    <div className="p-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
                      <Play size={14} fill="currentColor" className="ml-0.5" />
                    </div>
                  </div>

                  {/* Category badge */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 backdrop-blur-md border border-white/10 rounded text-[8px] uppercase tracking-wider font-extrabold text-blue-400 z-20">
                    {CATEGORY_LABELS[item.category] || item.category}
                  </div>

                  {/* Dismiss / clear progress button */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearProgress(item.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 border border-white/10 text-zinc-300 hover:text-red-400 hover:bg-red-500/25 hover:border-red-500/40 transition-all active:scale-90 z-20"
                    title="Remover progresso"
                  >
                    <Trash2 size={11} />
                  </button>

                  {/* Progress Line */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-1 bg-zinc-950/20">
                  <h4 className="text-xs font-bold text-white tracking-tight truncate group-hover:text-blue-400 transition">
                    {item.title}
                  </h4>
                  <div className="flex justify-between items-center text-[9px] text-zinc-400 font-medium">
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Clock size={9} /> Parou em {formatProgressTime(state.progress)}
                    </span>
                    <span className="font-mono text-zinc-500">{Math.round(percent)}% concluído</span>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
