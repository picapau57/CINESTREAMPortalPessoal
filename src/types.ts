export interface MediaItem {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl?: string;
  category: 'filmes' | 'series' | 'musicas' | 'podcasts' | 'canais';
  isFavorite: boolean;
  addedAt: string;
  type: 'video' | 'audio';
}

export interface PlaybackState {
  mediaId: string;
  progress: number; // in seconds
  duration: number; // in seconds
  lastPlayedAt: string;
}

export type CategoryFilter = 'all' | 'filmes' | 'series' | 'musicas' | 'podcasts' | 'canais' | 'favorites';
