export enum BeatGenre {
  ELECTRO = 'Electrobeat',
  TRAP = 'Trap',
  DRILL = 'Drill',
  BOOM_BAP = 'Boom Bap',
  DOUBLE_TEMPO = 'Doble Tempo',
  DANCEHALL = 'Dancehall'
}

export interface Beat {
  genre: BeatGenre;
  videoId: string; // YouTube Video ID
  title: string;
}

export enum AppMode {
  TRAINING = 'Entrenamiento',
  VISUALS = 'Visuales',
}

export enum TrainingFormat {
  FOUR_BY_FOUR = '4x4',
  EIGHT_BY_EIGHT = '8x8',
  TWO_BY_TWO = '2x2',
  MINUTE = 'Minuto y Minuto',
  KICK_BACK = 'Kick Back'
}

export type TrainingMode = 'themes' | 'free' | 'terminations' | 'characters' | 'questions' | 'role_play' | 'structure_easy' | 'structure_hard' | 'structure_duplas' | 'news';

export const ALL_TRAINING_MODES: TrainingMode[] = [
  'themes',
  'terminations',
  'characters',
  'questions',
  'news',
  'role_play',
  'structure_easy',
  'structure_hard',
  'structure_duplas',
  'free'
];

export interface GeneratedImage {
  imageUrl: string;
  prompt: string;
}

export type AppStep = 'names' | 'slots' | 'summary' | 'arena' | 'voting';

export interface SpectatorState {
  step: AppStep;
  rivalA: string;
  rivalB: string;
  winner: 'A' | 'B' | null;
  selectedFormat: TrainingFormat | null;
  selectedMode: TrainingMode | null;
  selectedGenre: BeatGenre | null;
  preGeneratedTopic: string | null;
  preGeneratedImage: string | null;
  preGeneratedPool: string[];
  countdown: string | null;
  isReplica: boolean;
  loserImage: string | null;
  showWinnerScreen: boolean;
  votingBg: string | null;
  currentSlotValues?: { format: TrainingFormat, mode: TrainingMode, genre: BeatGenre } | null;
  spinAttempts: number;
  league?: LeagueSettings;
  showLeagueTable?: boolean;
}

export interface LeagueParticipant {
  id: string;
  name: string;
  points: number;
  battles: number;
  active: boolean; // if false, cannot be selected anymore (e.g. max battles reached)
}

export interface LeagueSettings {
  maxBattlesPerPerson: number;
  participants: LeagueParticipant[];
  isLeagueMode: boolean;
}