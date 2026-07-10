import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  RotateCcw, RotateCw, X, 
  Music, Tv, Volume1, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Hls from 'hls.js';
import { MediaItem } from '../types';

interface MediaPlayerProps {
  item: MediaItem;
  initialProgress?: number;
  onClose: () => void;
  onProgressUpdate: (mediaId: string, progress: number, duration: number) => void;
}

export default function MediaPlayer({ item, initialProgress = 0, onClose, onProgressUpdate }: MediaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('player_volume');
    return saved ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRef = item.type === 'video' ? videoRef : audioRef;

  // Check if URL is a webpage/site (neither video nor audio direct stream)
  const isWebPage = !item.url.toLowerCase().match(/\.(mp4|mkv|webm|avi|mov|m3u8|ts|mp3|wav|ogg|aac|m4a|flac|m3u)(\?|$)/i) && 
                    (item.url.includes('.') || item.url.toLowerCase().startsWith('http'));

  const getNormalizedUrl = (urlStr: string) => {
    if (!urlStr) return '';
    const trimmed = urlStr.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      return 'https://' + trimmed;
    }
    return trimmed;
  };

  // Manage Video/Audio source loading, including HLS (.m3u8) streams
  useEffect(() => {
    if (isWebPage) return; // Skip standard direct media loading for websites
    setErrorMsg(null);
    const isVideo = item.type === 'video';
    const isAudio = item.type === 'audio';

    let hls: Hls | null = null;

    if (isVideo && videoRef.current) {
      const video = videoRef.current;
      const isM3U8 = item.url.toLowerCase().includes('.m3u8') || item.url.toLowerCase().includes('.ts') || item.url.includes('m3u8');

      if (isM3U8) {
        if (Hls.isSupported()) {
          hls = new Hls({
            maxMaxBufferLength: 10,
            enableWorker: true,
            lowLatencyMode: true,
          });
          hls.loadSource(item.url);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (initialProgress > 0) {
              video.currentTime = initialProgress;
            }
            video.play()
              .then(() => setIsPlaying(true))
              .catch((err) => {
                console.log('Autoplay blocked or failed:', err);
                setIsPlaying(false);
              });
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.warn("HLS fatal network error, trying to recover...");
                  hls?.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.warn("HLS fatal media error, trying to recover...");
                  hls?.recoverMediaError();
                  break;
                default:
                  console.error("HLS fatal error:", data);
                  handleError();
                  break;
              }
            }
          });
        } else {
          // Force native stream setting (highly compatible fallback for Android TV, TV Box, Safari, and other Smart TVs)
          console.log("Hls.js not supported. Attempting native HLS stream playback.");
          video.src = item.url;
          video.currentTime = initialProgress;
          video.play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.warn('Native autoplay failed, waiting for user interaction:', err);
              setIsPlaying(false);
            });
        }
      } else {
        // Regular non-HLS video
        video.src = item.url;
        video.currentTime = initialProgress;
        video.play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.log('Autoplay blocked or failed:', err);
            setIsPlaying(false);
          });
      }
    }

    if (isAudio && audioRef.current) {
      const audio = audioRef.current;
      audio.src = item.url;
      audio.currentTime = initialProgress;
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.log('Autoplay blocked or failed:', err);
          setIsPlaying(false);
        });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      if (videoRef.current) {
        videoRef.current.src = '';
      }
      if (audioRef.current) {
        audioRef.current.src = '';
      }
    };
  }, [item.id, item.url, item.type]);

  // Handle auto-saving progress
  useEffect(() => {
    if (!isPlaying || isWebPage) return;

    const interval = setInterval(() => {
      const media = mediaRef.current;
      if (media && media.duration) {
        onProgressUpdate(item.id, media.currentTime, media.duration);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying, item.id, mediaRef]);

  // Handle mouse move to show/hide video controls
  useEffect(() => {
    if (item.type !== 'video' || !isPlaying) {
      setShowControls(true);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, [isPlaying, item.type]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const media = mediaRef.current;
      if (!media) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.05);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          if (item.type === 'video') {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          } else {
            onClose();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, item.type]);

  // Media Event Handlers
  const handleTimeUpdate = () => {
    const media = mediaRef.current;
    if (media) {
      setCurrentTime(media.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const media = mediaRef.current;
    if (media) {
      setDuration(media.duration);
      setErrorMsg(null);
      if (initialProgress > 0) {
        media.currentTime = initialProgress;
      }
    }
  };

  const handleError = () => {
    const isHttpsSite = window.location.protocol === 'https:';
    const isHttpLink = item.url.toLowerCase().startsWith('http://');
    
    if (isHttpsSite && isHttpLink) {
      setErrorMsg('Erro de Protocolo Seguro (Conteúdo Misto): Você está tentando reproduzir um link HTTP ("http://") em uma página segura HTTPS. Navegadores bloqueiam conexões não seguras por segurança. Tente obter a versão HTTPS do link ou utilize um navegador ou aplicativo externo configurado para permitir conteúdo misto.');
    } else if (item.url.includes('youtube.com') || item.url.includes('youtu.be')) {
      setErrorMsg('Link de Página do YouTube Detectado: Este reprodutor de mídia direta não suporta links de páginas web do YouTube diretamente. Insira uma URL direta de streaming de arquivo (.mp4, .m3u8, etc.).');
    } else if (item.url.includes('drive.google.com') || item.url.includes('dropbox.com')) {
      setErrorMsg('Link de Armazenamento na Web Detectado: Links do Google Drive ou Dropbox precisam ser convertidos para links de download direto para que possam ser reproduzidos aqui.');
    } else {
      const media = mediaRef.current;
      if (media && media.error) {
        switch (media.error.code) {
          case 1:
            setErrorMsg('O carregamento da mídia foi abortado pelo usuário ou pelo sistema.');
            break;
          case 2:
            setErrorMsg('Erro de Rede: Falha na conexão de rede ao tentar carregar a mídia. Verifique se o servidor de streaming está online e aceita conexões.');
            break;
          case 3:
            setErrorMsg('Erro de Decodificação: O arquivo está corrompido ou o navegador não possui os codecs necessários para este formato de áudio/vídeo.');
            break;
          case 4:
            setErrorMsg('Erro de Origem Não Suportada: O arquivo de mídia não pôde ser carregado. O formato pode não ser compatível, ou o servidor bloqueou o acesso direto (Erro CORS ou Link Expirado).');
            break;
          default:
            setErrorMsg(`Erro de Carregamento (${media.error.code}): Não foi possível carregar esta mídia.`);
            break;
        }
      } else {
        setErrorMsg('Não foi possível carregar esta mídia. Verifique se a URL de streaming é válida, ativa e suporta requisições HTTP Diretas (CORS).');
      }
    }
    setIsPlaying(false);
  };

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
      onProgressUpdate(item.id, media.currentTime, media.duration || duration);
    } else {
      media.play()
        .then(() => setIsPlaying(true))
        .catch(handleError);
    }
  };

  const seekRelative = (seconds: number) => {
    const media = mediaRef.current;
    if (!media) return;
    const newTime = Math.max(0, Math.min(media.duration || duration, media.currentTime + seconds));
    media.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const media = mediaRef.current;
    if (!media) return;
    const newTime = parseFloat(e.target.value);
    media.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    try {
      localStorage.setItem('player_volume', newVol.toString());
    } catch (err) {
      console.warn("Failed to save player_volume to localStorage", err);
    }
    const media = mediaRef.current;
    if (media) {
      media.volume = newVol;
      media.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const adjustVolume = (amount: number) => {
    const newVol = Math.max(0, Math.min(1, volume + amount));
    setVolume(newVol);
    try {
      localStorage.setItem('player_volume', newVol.toString());
    } catch (err) {
      console.warn("Failed to save player_volume to localStorage", err);
    }
    const media = mediaRef.current;
    if (media) {
      media.volume = newVol;
      media.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    media.muted = nextMuted;
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      media.volume = 0.5;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    const media = mediaRef.current;
    if (media) {
      media.playbackRate = rate;
    }
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error('Fullscreen failed:', err));
    } else {
      exitFullscreen();
    }
  };

  const exitFullscreen = () => {
    document.exitFullscreen()
      .then(() => setIsFullscreen(false))
      .catch((err) => console.error('Exit fullscreen failed:', err));
  };

  // Listen to fullscreen changes via browser escape / buttons
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (time: number) => {
    if (isNaN(time)) return '00:00';
    const hrs = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);

    const formattedMins = mins.toString().padStart(2, '0');
    const formattedSecs = secs.toString().padStart(2, '0');

    if (hrs > 0) {
      return `${hrs}:${formattedMins}:${formattedSecs}`;
    }
    return `${formattedMins}:${formattedSecs}`;
  };

  // Close media player and update final progress
  const handleClose = () => {
    const media = mediaRef.current;
    if (media) {
      media.pause();
      onProgressUpdate(item.id, media.currentTime, media.duration || duration);
    }
    onClose();
  };

  const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden text-white"
    >
      {/* Keyboard Shortcuts Help Button/Box */}
      <div className="absolute top-4 left-4 z-50 group">
        <button className="p-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 text-xs">
          <HelpCircle size={15} />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">Atalhos de Teclado</span>
        </button>
        <div className="absolute left-0 mt-2 p-3 bg-[#0c0c10]/95 backdrop-blur border border-white/5 rounded-lg shadow-xl text-xs space-y-1.5 hidden group-hover:block w-56 z-50">
          <p className="font-semibold border-b border-white/5 pb-1 mb-2 text-zinc-300">Controles do Teclado</p>
          <div className="flex justify-between"><span className="text-zinc-500">Espaço</span> <span className="font-mono text-zinc-300">Play/Pause</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">← / →</span> <span className="font-mono text-zinc-300">-10s / +10s</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">↑ / ↓</span> <span className="font-mono text-zinc-300">Volume</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">M</span> <span className="font-mono text-zinc-300">Mutar</span></div>
          {item.type === 'video' && <div className="flex justify-between"><span className="text-zinc-500">F</span> <span className="font-mono text-zinc-300">Tela Cheia</span></div>}
          <div className="flex justify-between"><span className="text-zinc-500">ESC</span> <span className="font-mono text-zinc-300">Fechar/Sair</span></div>
        </div>
      </div>

      {/* Main Container */}
      <div 
        ref={containerRef}
        className={`relative w-full max-w-5xl aspect-video bg-[#08080a] flex items-center justify-center rounded-2xl overflow-hidden group border border-white/5 shadow-2xl ${
          isFullscreen ? 'max-w-none w-screen h-screen rounded-none border-none' : ''
        }`}
      >
        {/* Closed Button - Top Right */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
          title="Fechar Reprodutor (ESC)"
        >
          <X size={20} />
        </button>

        {/* --- ERROR SCREEN --- */}
        {errorMsg && (
          <div className="absolute inset-0 bg-[#08080a] flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 animate-pulse">
              <Tv size={32} />
            </div>
            <h3 className="text-lg font-bold text-red-400 mb-2">Erro de Carregamento</h3>
            <p className="text-xs text-zinc-400 max-w-md leading-relaxed mb-6">
              {errorMsg}
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => { setErrorMsg(null); const media = mediaRef.current; if (media) { media.load(); } }}
                className="px-4 py-2 bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg text-xs transition"
              >
                Tentar Novamente
              </button>
              <button 
                onClick={handleClose}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-xs transition"
              >
                Voltar ao Menu
              </button>
            </div>
          </div>
        )}

        {/* --- PORTAL WEB PAGE / BROWSER COMPONENT --- */}
        {isWebPage && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c10] to-[#08080a] flex flex-col z-10 rounded-2xl overflow-hidden">
            {/* Browser Navigation Bar */}
            <div className="bg-[#12121a] px-4 py-3 border-b border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 select-none">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-zinc-500 font-mono text-xs px-2 select-none">|</span>
                <span className="text-xs font-bold text-zinc-300 truncate">{item.title}</span>
              </div>
              
              <div className="flex-1 max-w-xl mx-auto w-full bg-black/40 border border-white/5 rounded-lg px-3 py-1 flex items-center justify-between gap-2 text-[11px] text-zinc-400 font-mono truncate">
                <span className="truncate select-all">{getNormalizedUrl(item.url)}</span>
                <span className="text-zinc-600 text-[10px]">CORS/X-Frame Seguro</span>
              </div>

              <div className="flex items-center gap-2">
                <a 
                  href={getNormalizedUrl(item.url)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-bold shadow-md shadow-blue-500/10 flex items-center gap-1.5 transition active:scale-95 whitespace-nowrap"
                >
                  Abrir em Nova Guia ↗
                </a>
              </div>
            </div>

            {/* Smart Notice */}
            <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-2.5 text-[11px] text-blue-300 flex items-start gap-2 leading-relaxed">
              <span className="text-base select-none mt-0.5">⚠️</span>
              <div>
                <strong className="text-white">Aviso sobre o site Google e similares:</strong> O Google e outros grandes portais impedem por segurança que suas páginas sejam exibidas dentro de outros sistemas (erro de "Recusa de Conexão" ou "Tela Branca"). Se o site não abrir ou ficar em branco abaixo, clique no botão <span className="font-bold text-white">"Abrir em Nova Guia ↗"</span> acima para usá-lo livremente sem restrições.
              </div>
            </div>

            {/* Web Frame Viewport */}
            <div className="flex-1 w-full bg-white relative">
              <iframe 
                src={getNormalizedUrl(item.url)} 
                title={item.title}
                className="w-full h-full border-none bg-white"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}

        {/* --- VIDEO PLAYER COMPONENT --- */}
        {item.type === 'video' && !isWebPage && (
          <video
            ref={videoRef}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={handleError}
            playsInline
          />
        )}

        {/* --- AUDIO PLAYER VISUALIZER --- */}
        {item.type === 'audio' && !isWebPage && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c0c10]/95 to-[#08080a] flex flex-col items-center justify-center p-8">
            <audio
              ref={audioRef}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onError={handleError}
            />

            {/* Rotating Vinyl Record for Audio */}
            <div className="relative flex flex-col items-center select-none mb-4">
              <motion.div 
                className={`relative w-44 h-44 rounded-full bg-black border-4 border-white/5 flex items-center justify-center shadow-2xl ${
                  isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''
                }`}
              >
                {/* Vinyl Grooves */}
                <div className="absolute inset-2 rounded-full border border-white/5" />
                <div className="absolute inset-6 rounded-full border border-white/5" />
                <div className="absolute inset-10 rounded-full border border-white/5" />
                <div className="absolute inset-14 rounded-full border border-white/5" />
                
                {/* Album Cover Center */}
                <div className="w-20 h-20 rounded-full overflow-hidden bg-[#0c0c10] border border-white/5 flex items-center justify-center relative">
                  {item.thumbnailUrl ? (
                    <img 
                      src={item.thumbnailUrl} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Music className="text-blue-400" size={32} />
                  )}
                  {/* Center Hole */}
                  <div className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-black border border-white/5" />
                </div>
              </motion.div>

              {/* Player Tone Arm (Interactive Animation effect) */}
              <div 
                className={`absolute top-0 right-4 w-16 h-20 origin-top-left transition-transform duration-700 pointer-events-none ${
                  isPlaying ? 'rotate-[18deg]' : 'rotate-[-10deg]'
                }`}
                style={{ transformBox: 'fill-box' }}
              >
                {/* SVG path of standard tonearm */}
                <svg width="40" height="80" viewBox="0 0 40 80" fill="none">
                  <circle cx="10" cy="10" r="6" fill="#4b5563" />
                  <path d="M10 10 L25 45 L20 70" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" />
                  <rect x="15" y="70" width="10" height="6" rx="1" fill="#ef4444" />
                </svg>
              </div>
            </div>

            {/* Audio Info */}
            <div className="text-center max-w-md px-4 mt-2">
              <h4 className="text-lg font-bold tracking-tight text-white mb-1 line-clamp-1">{item.title}</h4>
              <p className="text-xs text-zinc-400 line-clamp-2 min-h-[2rem] leading-relaxed">{item.description}</p>
            </div>
          </div>
        )}

        {/* --- CUSTOM OVERLAY CONTROLS --- */}
        {!isWebPage && (
          <AnimatePresence>
            {showControls && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60 flex flex-col justify-between p-4 pointer-events-none z-20"
            >
              {/* Top Bar Info */}
              <div className="flex justify-between items-start w-full pointer-events-auto">
                <div className="max-w-[70%] select-none">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {item.category === 'canais' ? 'Canais Live' : item.category}
                    </span>
                    {item.type === 'audio' && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                        <Music size={10} /> Áudio
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white line-clamp-1 drop-shadow">{item.title}</h3>
                </div>
              </div>

              {/* Big Center Play / Pause & Quick Seek buttons (for Video double click support/immersive feel) */}
              <div className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-none select-none">
                <button 
                  onClick={() => seekRelative(-10)} 
                  className="p-3 rounded-full bg-black/50 hover:bg-black/70 border border-white/5 text-zinc-300 hover:text-white transition duration-200 pointer-events-auto cursor-pointer"
                  title="Recuar 10 segundos (Seta Esquerda)"
                >
                  <RotateCcw size={22} />
                </button>
                
                <button 
                  onClick={togglePlay} 
                  className="p-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white hover:scale-110 active:scale-95 transition-all pointer-events-auto shadow-lg shadow-blue-500/20 cursor-pointer"
                  title={isPlaying ? "Pausar (Espaço)" : "Reproduzir (Espaço)"}
                >
                  {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
                </button>

                <button 
                  onClick={() => seekRelative(10)} 
                  className="p-3 rounded-full bg-black/50 hover:bg-black/70 border border-white/5 text-zinc-300 hover:text-white transition duration-200 pointer-events-auto cursor-pointer"
                  title="Avançar 10 segundos (Seta Direita)"
                >
                  <RotateCw size={22} />
                </button>
              </div>

              {/* Bottom Control Bar */}
              <div className="w-full flex flex-col gap-2 mt-auto pointer-events-auto">
                
                {/* Progress / Seek bar */}
                <div className="flex items-center gap-3 select-none">
                  <span className="text-xs font-mono text-zinc-300 w-12 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <div className="relative flex-1 group/slider">
                    <input 
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleProgressChange}
                      className="w-full h-1.5 rounded-lg bg-white/5 appearance-none cursor-pointer accent-blue-500 focus:outline-none focus:ring-0 active:accent-blue-400 transition"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((currentTime / (duration || 100)) * 100)}%, #27272a ${((currentTime / (duration || 100)) * 100)}%, #27272a 100%)`
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-zinc-300 w-12">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Control buttons & volume */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Tiny Play/Pause */}
                    <button 
                      onClick={togglePlay} 
                      className="text-zinc-300 hover:text-white transition cursor-pointer"
                    >
                      {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>

                    {/* Mute/Volume controls */}
                    <div className="flex items-center gap-2 group/volume">
                      <button 
                        onClick={toggleMute} 
                        className="text-zinc-300 hover:text-white transition cursor-pointer"
                        title="Mutar/Desmutar (M)"
                      >
                        {isMuted || volume === 0 ? <VolumeX size={18} /> : volume < 0.4 ? <Volume1 size={18} /> : <Volume2 size={18} />}
                      </button>
                      <input 
                        type="range" 
                        min={0} 
                        max={1} 
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-0 group-hover/volume:w-20 transition-all duration-300 overflow-hidden h-1 rounded-lg bg-white/5 appearance-none accent-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Settings & Fullscreen */}
                  <div className="flex items-center gap-3 relative">
                    {/* Speed rate picker */}
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className="text-xs font-mono px-2.5 py-1 bg-white/5 border border-white/5 text-zinc-300 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                    >
                      {playbackRate}x
                    </button>

                    {/* Speed selection popup */}
                    <AnimatePresence>
                      {showSettings && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-10 right-8 bg-[#0c0c10] border border-white/5 rounded-lg p-1.5 shadow-xl flex flex-col gap-1 w-24 z-30"
                        >
                          <div className="text-[10px] text-zinc-500 font-bold tracking-wider px-2 py-1 select-none border-b border-white/5">VELOCIDADE</div>
                          {rates.map((rate) => (
                            <button
                              key={rate}
                              onClick={() => handleRateChange(rate)}
                              className={`text-left text-xs font-mono px-2 py-1 rounded hover:bg-white/10 text-zinc-300 hover:text-white transition ${
                                playbackRate === rate ? 'text-blue-400 font-semibold' : ''
                              }`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Fullscreen (video only) */}
                    {item.type === 'video' && (
                      <button 
                        onClick={toggleFullscreen} 
                        className="text-zinc-300 hover:text-white transition cursor-pointer"
                        title="Tela Cheia (F)"
                      >
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
