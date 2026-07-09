import { MediaItem } from '../types';

export const DEFAULT_MEDIA_ITEMS: MediaItem[] = [
  {
    id: '1',
    title: 'Big Buck Bunny',
    description: 'Um coelho gigante e amigável resolve dar uma lição inesquecível em três roedores bagunceiros que insistem em perturbar a paz da floresta.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
    category: 'filmes',
    isFavorite: true,
    addedAt: '2026-07-08T10:00:00Z',
    type: 'video'
  },
  {
    id: '2',
    title: 'Sintel - A Jornada',
    description: 'Uma jovem guerreira chamada Sintel cuida de um pequeno dragão bebê. Quando ele é raptado por uma fera, ela inicia uma jornada épica e perigosa para resgatá-lo.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
    category: 'filmes',
    isFavorite: false,
    addedAt: '2026-07-08T10:05:00Z',
    type: 'video'
  },
  {
    id: '3',
    title: 'Tears of Steel (Sci-Fi)',
    description: 'Filme de ficção científica ambientado em Amsterdã que explora um futuro distópico, com naves gigantes, ciborgues e efeitos visuais impressionantes de código aberto.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg',
    category: 'series',
    isFavorite: true,
    addedAt: '2026-07-08T10:10:00Z',
    type: 'video'
  },
  {
    id: '4',
    title: 'Elephants Dream',
    description: 'Uma jornada surrealista e instigante de dois personagens, Proog e Emo, que navegam por um mundo industrial e mecânico que reflete suas próprias mentes.',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg',
    category: 'filmes',
    isFavorite: false,
    addedAt: '2026-07-08T10:15:00Z',
    type: 'video'
  },
  {
    id: '5',
    title: 'Sintonia Espacial (Synthwave)',
    description: 'Uma incrível jornada instrumental de sintetizadores analógicos retro, batidas de ficção científica dos anos 80 e ritmos espaciais profundos.',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    category: 'musicas',
    isFavorite: false,
    addedAt: '2026-07-08T10:20:00Z',
    type: 'audio'
  },
  {
    id: '6',
    title: 'Café Acústico - Instrumental',
    description: 'Melodia relaxante de guitarra acústica e percussão leve, perfeita para criar um ambiente de foco, leitura ou descanso à tarde.',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=800&auto=format&fit=crop&q=80',
    category: 'musicas',
    isFavorite: true,
    addedAt: '2026-07-08T10:25:00Z',
    type: 'audio'
  },
  {
    id: '7',
    title: 'Sessão Lo-Fi para Codar',
    description: 'Batidas aconchegantes e texturas em vinil selecionadas para acompanhar longas sessões de programação, estudos e concentração profunda.',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80',
    category: 'musicas',
    isFavorite: false,
    addedAt: '2026-07-08T10:30:00Z',
    type: 'audio'
  },
  {
    id: '8',
    title: 'Podcast: O Futuro da Inteligência Artificial',
    description: 'Episódio especial de debate sobre as últimas revoluções em LLMs, agentes autônomos, robótica cognitiva e o impacto no desenvolvimento de software.',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    thumbnailUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&auto=format&fit=crop&q=80',
    category: 'podcasts',
    isFavorite: true,
    addedAt: '2026-07-08T10:35:00Z',
    type: 'audio'
  }
];
