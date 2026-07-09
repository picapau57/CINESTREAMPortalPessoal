import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Film, Music, Tv, FileAudio, Info, Plus, 
  Upload, List, CheckCircle2, Trash2, ArrowRight, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MediaItem } from '../types';

interface AddMediaModalProps {
  onClose: () => void;
  onAdd: (newItemOrItems: Omit<MediaItem, 'id' | 'addedAt' | 'isFavorite'> | Omit<MediaItem, 'id' | 'addedAt' | 'isFavorite'>[]) => void;
}

const CATEGORY_ICONS = {
  filmes: <Film size={14} />,
  series: <Film size={14} />,
  musicas: <Music size={14} />,
  podcasts: <FileAudio size={14} />,
  canais: <Tv size={14} />
};

const CATEGORY_LABELS = {
  filmes: 'Filme',
  series: 'Série',
  musicas: 'Música',
  podcasts: 'Podcast',
  canais: 'Canal TV'
};

// --- HELPER TO DETECT CATEGORY AND TYPE FROM TITLE/URL/GROUP-TITLE ---
const detectCategoryAndType = (
  title: string,
  url: string,
  groupTitle?: string,
  selectedCategory: 'auto' | 'filmes' | 'series' | 'musicas' | 'podcasts' | 'canais' = 'auto'
): { category: 'filmes' | 'series' | 'musicas' | 'podcasts' | 'canais'; type: 'video' | 'audio' } => {
  const combined = `${title} ${url} ${groupTitle || ''}`.toLowerCase();
  
  // Audio files vs video files hints
  const isAudioFile = url.toLowerCase().match(/\.(mp3|wav|ogg|aac|m4a|flac|m3u)(\?|$)/i);
  const isVideoFile = url.toLowerCase().match(/\.(mp4|mkv|webm|avi|mov|m3u8|ts)(\?|$)/i);

  // If a manual specific category is selected, respect it!
  if (selectedCategory !== 'auto') {
    let type: 'video' | 'audio' = 'video';
    if (selectedCategory === 'musicas' || selectedCategory === 'podcasts') {
      type = 'audio';
    }
    if (isAudioFile) {
      type = 'audio';
    } else if (isVideoFile) {
      type = 'video';
    }
    return { category: selectedCategory, type };
  }

  // Auto-detect mode
  let category: 'filmes' | 'series' | 'musicas' | 'podcasts' | 'canais' = 'musicas';
  let type: 'video' | 'audio' = 'audio';

  // group-title hints
  const groupLower = (groupTitle || '').toLowerCase();
  
  if (
    groupLower.includes('filme') || groupLower.includes('movie') || groupLower.includes('cinema') || groupLower.includes('vod filmes') ||
    combined.includes('filme') || combined.includes('movie') || combined.includes('cinema')
  ) {
    category = 'filmes';
    type = 'video';
  } else if (
    groupLower.includes('serie') || groupLower.includes('série') || groupLower.includes('show') || groupLower.includes('vod series') ||
    combined.includes('série') || combined.includes('series') || combined.includes('season') || 
    combined.includes('temp') || combined.includes('episodio') || combined.includes('episode') || 
    combined.includes('ep.') || combined.match(/s\d{2}e\d{2}/i) || combined.match(/e\d{2}/i)
  ) {
    category = 'series';
    type = 'video';
  } else if (
    groupLower.includes('canal') || groupLower.includes('canais') || groupLower.includes('tv') || groupLower.includes('live') || groupLower.includes('stream') || groupLower.includes('iptv') ||
    combined.includes('canal') || combined.includes('canais') || combined.includes('tv') || combined.includes('live') || combined.includes('ao vivo') ||
    combined.includes('globo') || combined.includes('sbt') || combined.includes('record') || combined.includes('cnn') || combined.includes('news')
  ) {
    category = 'canais';
    type = 'video';
  } else if (
    groupLower.includes('podcast') ||
    combined.includes('podcast') || combined.includes('pod') || combined.includes('entrevista')
  ) {
    category = 'podcasts';
    type = isVideoFile ? 'video' : 'audio';
  } else {
    // default based on url file types
    if (isAudioFile) {
      category = 'musicas';
      type = 'audio';
    } else if (isVideoFile) {
      category = 'filmes';
      type = 'video';
    } else {
      category = 'musicas';
      type = 'audio';
    }
  }

  return { category, type };
};

export default function AddMediaModal({ onClose, onAdd }: AddMediaModalProps) {
  // --- TAB CONTROL ---
  const [activeTab, setActiveTab] = useState<'single' | 'playlist'>('single');

  // --- SINGLE MEDIA FORM STATE ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [category, setCategory] = useState<'filmes' | 'series' | 'musicas' | 'podcasts' | 'canais'>('musicas');
  const [type, setType] = useState<'video' | 'audio'>('audio');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // --- PLAYLIST / BULK LIST STATE ---
  const [playlistText, setPlaylistText] = useState('');
  const [playlistCategory, setPlaylistCategory] = useState<'auto' | 'filmes' | 'series' | 'musicas' | 'podcasts' | 'canais'>('auto');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PLAYLIST TRACKS PARSED AND MANAGED IN STATE ---
  const [playlistTracks, setPlaylistTracks] = useState<{
    title: string;
    url: string;
    category: 'filmes' | 'series' | 'musicas' | 'podcasts' | 'canais';
    type: 'video' | 'audio';
  }[]>([]);

  // --- PARSE TEXT AND LOAD INTO STATE ---
  useEffect(() => {
    if (!playlistText.trim()) {
      setPlaylistTracks([]);
      return;
    }

    const lines = playlistText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: typeof playlistTracks = [];
    let currentTitle = '';
    let currentGroupTitle = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('#EXTINF:')) {
        const commaIdx = line.indexOf(',');
        if (commaIdx !== -1) {
          currentTitle = line.slice(commaIdx + 1).trim();
        }
        const groupTitleMatch = line.match(/group-title="([^"]+)"/i);
        if (groupTitleMatch) {
          currentGroupTitle = groupTitleMatch[1];
        }
      } else if (line.startsWith('#')) {
        continue;
      } else if (line.startsWith('http://') || line.startsWith('https://') || line.includes('.') || line.startsWith('/')) {
        const trackUrl = line;
        let trackTitle = currentTitle;

        if (!trackTitle) {
          try {
            const parsedUrl = new URL(trackUrl);
            const pathname = parsedUrl.pathname;
            const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
            trackTitle = decodeURIComponent(filename.replace(/\.[^/.]+$/, "")).replace(/[-_]/g, ' ');
          } catch (_) {
            const lastSlash = trackUrl.lastIndexOf('/');
            if (lastSlash !== -1) {
              const filePart = trackUrl.substring(lastSlash + 1);
              trackTitle = decodeURIComponent(filePart.replace(/\.[^/.]+$/, "")).replace(/[-_]/g, ' ');
            } else {
              trackTitle = `Faixa ${parsed.length + 1}`;
            }
          }
        }

        if (!trackTitle.trim()) {
          trackTitle = `Faixa ${parsed.length + 1}`;
        }

        const { category, type } = detectCategoryAndType(trackTitle, trackUrl, currentGroupTitle, playlistCategory);

        parsed.push({ 
          title: trackTitle, 
          url: trackUrl,
          category,
          type
        });

        currentTitle = ''; // Reset for next loop
        currentGroupTitle = '';
      } else if (line.includes('|')) {
        // Name | URL
        const parts = line.split('|');
        const customTitle = parts[0].trim();
        const customUrl = parts[1]?.trim() || '';
        const customCategoryHint = parts[2]?.trim()?.toLowerCase() || '';

        if (customUrl) {
          let customTitleFinal = customTitle;
          if (!customTitleFinal) {
            customTitleFinal = `Faixa ${parsed.length + 1}`;
          }

          let manualCategory: 'filmes' | 'series' | 'musicas' | 'podcasts' | 'canais' | 'auto' = playlistCategory;
          if (['filmes', 'filme', 'movies', 'movie'].includes(customCategoryHint)) manualCategory = 'filmes';
          else if (['series', 'série', 'séries', 'serie'].includes(customCategoryHint)) manualCategory = 'series';
          else if (['musicas', 'música', 'músicas', 'music', 'songs'].includes(customCategoryHint)) manualCategory = 'musicas';
          else if (['podcasts', 'podcast', 'pod'].includes(customCategoryHint)) manualCategory = 'podcasts';
          else if (['canais', 'canal', 'tv', 'live'].includes(customCategoryHint)) manualCategory = 'canais';

          const { category, type } = detectCategoryAndType(customTitleFinal, customUrl, undefined, manualCategory);

          parsed.push({ 
            title: customTitleFinal, 
            url: customUrl,
            category,
            type
          });
        }
      }
    }

    setPlaylistTracks(parsed);
  }, [playlistText, playlistCategory]);

  // --- BULK COVER GRAPHICS ---
  const getBulkCoverUrl = (categoryType: string, index: number) => {
    const templates: Record<string, string[]> = {
      filmes: [
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80'
      ],
      series: [
        'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
      ],
      musicas: [
        'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&auto=format&fit=crop&q=80'
      ],
      podcasts: [
        'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=80'
      ],
      canais: [
        'https://images.unsplash.com/photo-1598257006458-087169a1f08d?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&auto=format&fit=crop&q=80'
      ]
    };
    const pool = templates[categoryType] || templates.musicas;
    return pool[index % pool.length];
  };

  // --- AUTOMATIC TYPE SELECTION SINGLE ---
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);

    const lower = value.toLowerCase();
    if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg') || lower.endsWith('.aac') || category === 'musicas' || category === 'podcasts') {
      setType('audio');
    } else {
      setType('video');
    }
  };

  const handleCategoryChange = (cat: 'filmes' | 'series' | 'musicas' | 'podcasts' | 'canais') => {
    setCategory(cat);
    if (cat === 'musicas' || cat === 'podcasts') {
      setType('audio');
    } else {
      setType('video');
    }
  };

  // --- UNPLASH COVER GENERATION SINGLE ---
  const handleGenerateThumbnail = (categoryType: string) => {
    const templates: Record<string, string[]> = {
      filmes: [
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80'
      ],
      series: [
        'https://images.unsplash.com/photo-1574375927938-d5a98e8edd86?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'
      ],
      musicas: [
        'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80'
      ],
      podcasts: [
        'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=80'
      ],
      canais: [
        'https://images.unsplash.com/photo-1598257006458-087169a1f08d?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=800&auto=format&fit=crop&q=80'
      ]
    };
    const pool = templates[categoryType] || templates.filmes;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setThumbnailUrl(chosen);
  };

  // --- VALIDATION SINGLE ---
  const validateSingle = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!title.trim()) tempErrors.title = 'O título é obrigatório.';
    if (!url.trim()) {
      tempErrors.url = 'A URL de transmissão é obrigatória.';
    } else {
      try {
        new URL(url);
      } catch (_) {
        tempErrors.url = 'Insira uma URL válida (ex: https://site.com/video.mp4).';
      }
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSingle()) return;

    onAdd({
      title: title.trim(),
      description: description.trim() || 'Sem descrição fornecida.',
      url: url.trim(),
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      category,
      type
    });
  };

  // --- FILE DRAG & DROP HANDLERS ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      readFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      readFile(e.target.files[0]);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPlaylistText(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  // --- INTERACTIVE TRACK EDITORS ---
  const handleTrackFieldChange = (index: number, field: string, value: string) => {
    setPlaylistTracks(prev => prev.map((track, idx) => {
      if (idx !== index) return track;
      const updated = { ...track, [field]: value };
      
      // Auto-toggle type if user changes category
      if (field === 'category') {
        const cat = value as 'filmes' | 'series' | 'musicas' | 'podcasts' | 'canais';
        updated.type = (cat === 'musicas' || cat === 'podcasts') ? 'audio' : 'video';
      }
      return updated;
    }));
  };

  const handleRemoveTrack = (index: number) => {
    setPlaylistTracks(prev => prev.filter((_, idx) => idx !== index));
  };

  // --- PLAYLIST SUBMIT ---
  const handlePlaylistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playlistTracks.length === 0) return;

    const itemsToImport = playlistTracks.map((track, idx) => ({
      title: track.title.trim(),
      description: `Importado em lote (${CATEGORY_LABELS[track.category]}) em ${new Date().toLocaleDateString('pt-BR')}`,
      url: track.url,
      thumbnailUrl: getBulkCoverUrl(track.category, idx),
      category: track.category,
      type: track.type
    }));

    onAdd(itemsToImport);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-[#0c0c10] border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/5 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus size={18} className="text-blue-500" /> Adicionar Mídias ao Sistema
              </h3>
              <p className="text-xs text-zinc-400 font-sans">Carregue vídeos, canais, músicas ou separe automaticamente filmes e séries por lote</p>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-black p-1 rounded-xl border border-white/5 w-full">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Plus size={14} />
              Mídia Individual
            </button>
            <button
              onClick={() => setActiveTab('playlist')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'playlist'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List size={14} />
              Importar Lista Completa (Filmes, Séries, Músicas...)
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'single' ? (
              <motion.form 
                key="single-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleSingleSubmit}
                className="space-y-4"
              >
                {/* URL Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex justify-between">
                    <span>URL do Streaming/Arquivo *</span>
                    <span className="text-[10px] text-zinc-500 lowercase normal-case">Suporta MP4, MP3, M3U8, etc.</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="https://exemplo.com/filme.mp4 ou arquivo.mp3"
                    value={url}
                    onChange={handleUrlChange}
                    className={`w-full px-3 py-2 bg-black border rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition ${
                      errors.url ? 'border-red-500' : 'border-white/5'
                    }`}
                  />
                  {errors.url ? (
                    <p className="text-xs text-red-500 mt-1">{errors.url}</p>
                  ) : (
                    <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 font-sans">
                      <Info size={11} /> Deve ser um link de acesso direto ao arquivo de mídia.
                    </p>
                  )}
                </div>

                {/* Title Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Título da Mídia *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ex: Minha Série Favorita - Temp 1 Ep 1"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full px-3 py-2 bg-black border rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition ${
                      errors.title ? 'border-red-500' : 'border-white/5'
                    }`}
                  />
                  {errors.title && (
                    <p className="text-xs text-red-500 mt-1">{errors.title}</p>
                  )}
                </div>

                {/* Description Input */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Descrição / Detalhes
                  </label>
                  <textarea 
                    placeholder="Escreva um breve resumo, sinopse ou anotação pessoal sobre esta mídia..."
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-white/5 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition resize-none"
                  />
                </div>

                {/* Category Filter Cards */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Categoria
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {(['filmes', 'series', 'musicas', 'podcasts', 'canais'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryChange(cat)}
                        className={`py-2 px-1 border rounded-lg flex flex-col items-center justify-center gap-1.5 transition text-xs cursor-pointer capitalize ${
                          category === cat 
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-medium shadow-md shadow-blue-500/5' 
                            : 'border-white/5 bg-black hover:border-white/10 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {CATEGORY_ICONS[cat]}
                        <span>{cat === 'canais' ? 'Canais Live' : cat}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type Picker & Thumbnail Generator */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Type Selector */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Tipo do Reprodutor
                    </label>
                    <div className="flex bg-black p-0.5 rounded-lg border border-white/5">
                      <button
                        type="button"
                        onClick={() => setType('video')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                          type === 'video' 
                            ? 'bg-white/10 text-white shadow' 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Vídeo Player
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('audio')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                          type === 'audio' 
                            ? 'bg-white/10 text-white shadow' 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Áudio Player
                      </button>
                    </div>
                  </div>

                  {/* Cover Image Input */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex justify-between">
                      <span>URL da Capa (Opcional)</span>
                      <button 
                        type="button"
                        onClick={() => handleGenerateThumbnail(category)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase transition cursor-pointer"
                      >
                        Gerar Capa ⚡
                      </button>
                    </label>
                    <input 
                      type="text" 
                      placeholder="https://exemplo.com/capa.jpg"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-white/5 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition"
                    />
                  </div>
                </div>

                {/* Visual Preview */}
                {thumbnailUrl && (
                  <div className="pt-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Pré-visualização da Capa</span>
                    <div className="relative w-full h-24 bg-black rounded-lg overflow-hidden border border-white/5">
                      <img 
                        src={thumbnailUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        onError={() => setThumbnailUrl('')}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex items-end p-2">
                        <span className="text-xs font-bold text-white truncate w-full">{title || 'Título da Mídia'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.form>
            ) : (
              <motion.form 
                key="playlist-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handlePlaylistSubmit}
                className="space-y-4"
              >
                {/* Drag & Drop File Loader / Instructions */}
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-500/5' 
                      : 'border-white/5 bg-black hover:border-white/10'
                  }`}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".m3u,.txt" 
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 text-zinc-400">
                    <Upload size={24} className="text-blue-500" />
                    <p className="text-xs font-semibold text-white">Arraste sua lista de canais, filmes ou séries (.m3u ou .txt)</p>
                    <p className="text-[10px] text-zinc-500">ou clique para <span onClick={() => fileInputRef.current?.click()} className="text-blue-400 font-bold hover:underline cursor-pointer">procurar arquivo</span></p>
                  </div>
                </div>

                {/* Plain Text input list */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex justify-between">
                    <span>Cole as mídias da lista (Formato M3U ou Um Link por Linha)</span>
                    <span className="text-[10px] text-blue-400 font-medium flex items-center gap-1">
                      <Sparkles size={11} /> Auto-separa canais, séries e filmes
                    </span>
                  </label>
                  <textarea 
                    rows={5}
                    placeholder={`Exemplo de lista M3U:&#10;#EXTINF:-1 group-title="Filmes de Ação",Matrix (1999)&#10;https://servidor.com/matrix.mp4&#10;&#10;#EXTINF:-1 group-title="Séries",Stranger Things S01E01&#10;https://servidor.com/st_1_1.mp4&#10;&#10;Ou formato simplificado Título | Link | Categoria (filmes, series, musicas, canais, podcasts):&#10;Batman o Cavaleiro das Trevas | https://site.com/batman.mp4 | filmes&#10;Rádio Mix FM | https://site.com/mix.mp3 | canais`}
                    value={playlistText}
                    onChange={(e) => setPlaylistText(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-white/5 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition font-mono"
                  />
                </div>

                {/* Category Settings for Playlist */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Modo de Classificação / Destino Padrão
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-1 bg-black p-0.5 border border-white/5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPlaylistCategory('auto')}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition capitalize cursor-pointer flex items-center justify-center gap-1 ${
                        playlistCategory === 'auto' 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <Sparkles size={11} />
                      <span>Auto (Separar)</span>
                    </button>
                    {(['filmes', 'series', 'musicas', 'podcasts', 'canais'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPlaylistCategory(cat)}
                        className={`py-1.5 text-[10px] font-bold rounded-lg transition capitalize cursor-pointer flex items-center justify-center gap-1 ${
                          playlistCategory === cat 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {CATEGORY_ICONS[cat]}
                        <span>{cat === 'canais' ? 'canais' : cat}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 font-sans">
                    <Info size={11} /> 
                    {playlistCategory === 'auto' 
                      ? 'O sistema lê títulos e tags da lista para decidir automaticamente se é Filme, Série, Canal Live, etc.'
                      : `Força que todas as mídias importadas desta lista sejam colocadas como "${CATEGORY_LABELS[playlistCategory]}".`
                    }
                  </p>
                </div>

                {/* Parsed Live Preview items with INDIVIDUAL Category / Title override */}
                {playlistTracks.length > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-zinc-400 text-xs mb-2.5 font-semibold font-sans">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 size={13} /> {playlistTracks.length} itens prontos para separação
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setPlaylistText('')}
                        className="text-[10px] text-red-400 hover:text-red-300 font-bold flex items-center gap-1 uppercase transition cursor-pointer"
                      >
                        <Trash2 size={11} /> Limpar Lista
                      </button>
                    </div>

                    {/* INTERACTIVE COMPONENT GRID */}
                    <div className="max-h-56 overflow-y-auto bg-black border border-white/5 rounded-xl divide-y divide-white/5 scrollbar-thin scrollbar-thumb-zinc-800 p-1 space-y-1.5">
                      {playlistTracks.map((track, idx) => (
                        <div 
                          key={idx} 
                          className="p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/[0.01] hover:bg-white/[0.03] transition-all rounded-lg border border-white/[0.02]"
                        >
                          {/* Number & Editable Title */}
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="text-zinc-600 text-xs font-mono font-bold select-none w-5">#{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <input 
                                type="text"
                                value={track.title}
                                onChange={(e) => handleTrackFieldChange(idx, 'title', e.target.value)}
                                className="w-full bg-transparent hover:bg-white/5 focus:bg-black border-none focus:ring-1 focus:ring-blue-500/50 rounded px-1.5 py-1 text-xs text-white font-bold truncate focus:overflow-visible focus:whitespace-normal"
                              />
                              <p className="text-[9px] text-zinc-500 font-mono truncate px-1.5 mt-0.5">{track.url}</p>
                            </div>
                          </div>

                          {/* Quick controls per track: Category Dropdown, Type Toggle, Delete */}
                          <div className="flex items-center gap-2 justify-end select-none">
                            {/* Category Selector */}
                            <div className="relative">
                              <select
                                value={track.category}
                                onChange={(e) => handleTrackFieldChange(idx, 'category', e.target.value)}
                                className="bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              >
                                <option value="filmes" className="bg-[#0c0c10] text-white">🎬 Filme</option>
                                <option value="series" className="bg-[#0c0c10] text-white">📺 Série</option>
                                <option value="canais" className="bg-[#0c0c10] text-white">📡 Canal Live</option>
                                <option value="musicas" className="bg-[#0c0c10] text-white">🎵 Música</option>
                                <option value="podcasts" className="bg-[#0c0c10] text-white">🎙️ Podcast</option>
                              </select>
                            </div>

                            {/* Type audio/video toggle */}
                            <button
                              type="button"
                              onClick={() => handleTrackFieldChange(idx, 'type', track.type === 'video' ? 'audio' : 'video')}
                              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition border border-white/5 cursor-pointer ${
                                track.type === 'video' 
                                  ? 'bg-blue-500/10 text-blue-400' 
                                  : 'bg-emerald-500/10 text-emerald-400'
                              }`}
                              title="Clique para alternar o reprodutor"
                            >
                              {track.type === 'video' ? 'VÍDEO' : 'ÁUDIO'}
                            </button>

                            {/* Delete single row */}
                            <button
                              type="button"
                              onClick={() => handleRemoveTrack(idx)}
                              className="p-1.5 rounded-full hover:bg-red-500/15 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                              title="Remover este item do lote"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-[10px] text-zinc-500 mt-2 font-sans">
                      💡 <strong>Dica:</strong> Você pode ajustar os nomes e alterar a categoria de cada item individualmente na tabela acima antes de importar tudo de uma vez.
                    </p>
                  </div>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 px-6 py-4 bg-black border-t border-white/5 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 transition cursor-pointer"
          >
            Cancelar
          </button>
          
          {activeTab === 'single' ? (
            <button
              type="button"
              onClick={handleSingleSubmit}
              className="px-5 py-2 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 flex items-center gap-1 cursor-pointer"
            >
              Salvar Mídia
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePlaylistSubmit}
              disabled={playlistTracks.length === 0}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer ${
                playlistTracks.length > 0
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'
              }`}
            >
              <span>Importar {playlistTracks.length} Mídias</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
}
