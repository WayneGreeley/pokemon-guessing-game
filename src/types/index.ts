/**
 * Core TypeScript interfaces for the Pokemon Guessing Game
 * These interfaces define the data structures and contracts used throughout the application
 */

// Core game data structures
export interface PokemonData {
  readonly name: string;           // Species name (e.g., "pikachu")
  readonly generation: number;     // Generation number (1-9)
  readonly types: readonly string[];     // Pokemon types (e.g., ["electric"])
  readonly abilities: readonly string[]; // Ability names
  readonly id: number;            // Pokemon ID for API calls
}

export interface GameState {
  readonly currentPokemon: PokemonData | null;
  readonly revealedName: string;          // Current state of revealed letters
  readonly guessedLetters: GuessedLetters;
  readonly remainingGuesses: number;      // Starts at 7
  readonly gameStatus: GameStatus;
  readonly hintsUsed: number;
}

export interface GuessedLetters {
  readonly correct: readonly string[];
  readonly incorrect: readonly string[];
}

export type GameStatus = 'playing' | 'won' | 'lost';

// Game operation result interfaces
export interface GuessResult {
  readonly isCorrect: boolean;
  readonly newlyRevealedPositions: readonly number[];
  readonly gameStatus: GameStatus;
  readonly remainingGuesses: number;
}

export interface HintResult {
  readonly hintText: string;
  readonly remainingGuesses: number;
  readonly gameStatus: GameStatus;
}

export interface LetterGuessResult {
  readonly isCorrect: boolean;
  readonly positions: readonly number[];
  readonly alreadyGuessed: boolean;
}

// API-related interfaces
export interface PokemonReference {
  readonly name: string;
  readonly url: string;
}

export interface GenerationData {
  readonly pokemonSpecies: readonly PokemonReference[];
}

// API response models (matching PokeAPI structure)
export interface GenerationResponse {
  readonly pokemon_species: readonly {
    readonly name: string;
    readonly url: string;
  }[];
}

export interface PokemonResponse {
  readonly name: string;
  readonly id: number;
  readonly types: readonly {
    readonly type: {
      readonly name: string;
    };
  }[];
  readonly abilities: readonly {
    readonly ability: {
      readonly name: string;
    };
  }[];
}

// Component interfaces
export interface GameEngine {
  startNewGame(): Promise<void>;
  processLetterGuess(letter: string): GuessResult;
  requestHint(): HintResult;
  getCurrentState(): GameState;
  resetGame(): void;
}

export interface PokemonSelector {
  selectRandomPokemon(): Promise<PokemonData>;
  filterValidPokemon(pokemonList: readonly PokemonReference[]): readonly PokemonReference[];
}

export interface LetterRevealer {
  initializeName(pokemonName: string): void;
  guessLetter(letter: string): LetterGuessResult;
  getRevealedName(): string;
  getDisplayName(): string;
  isNameComplete(): boolean;
  getGuessedLetters(): GuessedLetters;
}

export interface HintSystem {
  initializePokemon(pokemon: PokemonData): void;
  generateHint(): string;
  hasMoreHints(): boolean;
}

export interface PokeAPIClient {
  getGeneration(generationId: number): Promise<GenerationData>;
  getPokemonDetails(pokemonId: number): Promise<PokemonData>;
  handleApiError(error: Error): string;
}

export interface UIController {
  initialize(): void;
  updateGameDisplay(gameState: GameState): void;
  showHint(hint: string): void;
  showGameResult(gameState: GameState): void;
  showLoading(show: boolean): void;
  showLoadingWithMessage(show: boolean, message?: string): void;
  showError(message: string, showRetry?: boolean): void;
  showNetworkError(message: string): void;
}

// Error types
export class PokemonGameError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'PokemonGameError';
  }
}

export class APIError extends PokemonGameError {
  constructor(message: string, public readonly statusCode?: number) {
    super(message, 'API_ERROR');
    this.name = 'APIError';
  }
}

export class ValidationError extends PokemonGameError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

// Utility types
export type NonEmptyArray<T> = readonly [T, ...T[]];

// Constants
export const GAME_CONSTANTS = {
  INITIAL_GUESSES: 7,
  MIN_GENERATION: 1,
  MAX_GENERATION: 9,
  HINT_COST: 1,
  API_BASE_URL: 'https://pokeapi.co/api/v2',
  API_TIMEOUT: 10000,
  MAX_RETRIES: 3
} as const;

// Type guards
export function isPokemonData(obj: unknown): obj is PokemonData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as PokemonData).name === 'string' &&
    typeof (obj as PokemonData).generation === 'number' &&
    Array.isArray((obj as PokemonData).types) &&
    Array.isArray((obj as PokemonData).abilities) &&
    typeof (obj as PokemonData).id === 'number'
  );
}

export function isGameState(obj: unknown): obj is GameState {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (typeof (obj as GameState).currentPokemon === 'object' || (obj as GameState).currentPokemon === null) &&
    typeof (obj as GameState).revealedName === 'string' &&
    typeof (obj as GameState).guessedLetters === 'object' &&
    typeof (obj as GameState).remainingGuesses === 'number' &&
    ['playing', 'won', 'lost'].includes((obj as GameState).gameStatus) &&
    typeof (obj as GameState).hintsUsed === 'number'
  );
}