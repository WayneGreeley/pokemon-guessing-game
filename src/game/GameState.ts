/**
 * GameState implementation
 * Manages game state structure, initialization, and state updates
 */

import {
  GameState,
  GameStatus,
  PokemonData,
  GAME_CONSTANTS,
  ValidationError
} from '../types';

/**
 * Implementation of game state management with initialization and update methods
 */
export class GameStateManager {
  private state: GameState;

  /**
   * Initialize a new game state with default values
   */
  constructor() {
    this.state = this.createInitialState();
  }

  /**
   * Get the current game state (immutable copy)
   * @returns Current game state
   */
  public getCurrentState(): GameState {
    return {
      ...this.state,
      guessedLetters: {
        correct: [...this.state.guessedLetters.correct],
        incorrect: [...this.state.guessedLetters.incorrect]
      }
    };
  }

  /**
   * Initialize a new game with a selected Pokemon
   * @param pokemon The Pokemon for the new game
   */
  public initializeNewGame(pokemon: PokemonData): void {
    this.validatePokemonData(pokemon);
    
    this.state = {
      ...this.createInitialState(),
      currentPokemon: pokemon,
      revealedName: this.createBlankName(pokemon.name)
    };
  }

  /**
   * Reset the game state to initial values (no Pokemon selected)
   */
  public resetGame(): void {
    this.state = this.createInitialState();
  }

  /**
   * Update the revealed name based on guessed letters
   * @param newRevealedName The updated revealed name string
   */
  public updateRevealedName(newRevealedName: string): void {
    if (typeof newRevealedName !== 'string') {
      throw new ValidationError('Revealed name must be a string');
    }
    
    this.state = {
      ...this.state,
      revealedName: newRevealedName
    };
  }

  /**
   * Add a correct letter guess
   * @param letter The correctly guessed letter
   */
  public addCorrectGuess(letter: string): void {
    this.validateLetter(letter);
    
    if (this.state.guessedLetters.correct.includes(letter.toLowerCase())) {
      return; // Already guessed, no change
    }
    
    this.state = {
      ...this.state,
      guessedLetters: {
        ...this.state.guessedLetters,
        correct: [...this.state.guessedLetters.correct, letter.toLowerCase()]
      }
    };
  }

  /**
   * Add an incorrect letter guess and decrease remaining guesses
   * @param letter The incorrectly guessed letter
   */
  public addIncorrectGuess(letter: string): void {
    this.validateLetter(letter);
    
    if (this.state.guessedLetters.incorrect.includes(letter.toLowerCase())) {
      return; // Already guessed, no change
    }
    
    const newRemainingGuesses = Math.max(0, this.state.remainingGuesses - 1);
    
    this.state = {
      ...this.state,
      guessedLetters: {
        ...this.state.guessedLetters,
        incorrect: [...this.state.guessedLetters.incorrect, letter.toLowerCase()]
      },
      remainingGuesses: newRemainingGuesses
    };
  }

  /**
   * Decrease remaining guesses (used for hints)
   * @param amount Amount to decrease (default: 1)
   */
  public decreaseGuesses(amount: number = 1): void {
    if (amount < 0) {
      throw new ValidationError('Cannot decrease guesses by negative amount');
    }
    
    this.state = {
      ...this.state,
      remainingGuesses: Math.max(0, this.state.remainingGuesses - amount)
    };
  }

  /**
   * Increment the hints used counter
   */
  public incrementHintsUsed(): void {
    this.state = {
      ...this.state,
      hintsUsed: this.state.hintsUsed + 1
    };
  }

  /**
   * Update the game status
   * @param status New game status
   */
  public updateGameStatus(status: GameStatus): void {
    this.state = {
      ...this.state,
      gameStatus: status
    };
  }

  /**
   * Check if a letter has already been guessed
   * @param letter Letter to check
   * @returns True if letter has been guessed (correct or incorrect)
   */
  public hasLetterBeenGuessed(letter: string): boolean {
    this.validateLetter(letter);
    const lowerLetter = letter.toLowerCase();
    
    return this.state.guessedLetters.correct.includes(lowerLetter) ||
           this.state.guessedLetters.incorrect.includes(lowerLetter);
  }

  /**
   * Check if the game is in a terminal state (won or lost)
   * @returns True if game is won or lost
   */
  public isGameComplete(): boolean {
    return this.state.gameStatus === 'won' || this.state.gameStatus === 'lost';
  }

  /**
   * Check if all letters in the Pokemon name have been revealed
   * @returns True if name is complete
   */
  public isNameComplete(): boolean {
    if (!this.state.currentPokemon) {
      return false;
    }
    
    return !this.state.revealedName.includes('_');
  }

  /**
   * Get the Pokemon name in lowercase for comparison
   * @returns Pokemon name in lowercase, or empty string if no Pokemon
   */
  public getPokemonNameLowercase(): string {
    return this.state.currentPokemon?.name.toLowerCase() || '';
  }

  /**
   * Create initial game state with default values
   * @returns Initial game state
   */
  private createInitialState(): GameState {
    return {
      currentPokemon: null,
      revealedName: '',
      guessedLetters: {
        correct: [],
        incorrect: []
      },
      remainingGuesses: GAME_CONSTANTS.INITIAL_GUESSES,
      gameStatus: 'playing',
      hintsUsed: 0
    };
  }

  /**
   * Create a blank name string with underscores for each letter
   * @param pokemonName The Pokemon name to create blanks for
   * @returns String with underscores for letters and spaces preserved
   */
  private createBlankName(pokemonName: string): string {
    return pokemonName
      .toLowerCase()
      .split('')
      .map(char => /[a-z]/.test(char) ? '_' : char)
      .join('');
  }

  /**
   * Validate Pokemon data
   * @param pokemon Pokemon data to validate
   */
  private validatePokemonData(pokemon: PokemonData): void {
    if (!pokemon) {
      throw new ValidationError('Pokemon data is required');
    }
    
    if (!pokemon.name || typeof pokemon.name !== 'string') {
      throw new ValidationError('Pokemon must have a valid name');
    }
    
    if (typeof pokemon.generation !== 'number' || pokemon.generation < 1 || pokemon.generation > 9) {
      throw new ValidationError('Pokemon must have a valid generation (1-9)');
    }
    
    if (!Array.isArray(pokemon.types) || pokemon.types.length === 0) {
      throw new ValidationError('Pokemon must have at least one type');
    }
    
    if (!Array.isArray(pokemon.abilities)) {
      throw new ValidationError('Pokemon must have abilities array');
    }
    
    if (typeof pokemon.id !== 'number' || pokemon.id < 1) {
      throw new ValidationError('Pokemon must have a valid ID');
    }
  }

  /**
   * Validate letter input
   * @param letter Letter to validate
   */
  private validateLetter(letter: string): void {
    if (typeof letter !== 'string' || letter.length !== 1) {
      throw new ValidationError('Letter must be a single character string');
    }
    
    if (!/[a-zA-Z]/.test(letter)) {
      throw new ValidationError('Letter must be alphabetic');
    }
  }
}