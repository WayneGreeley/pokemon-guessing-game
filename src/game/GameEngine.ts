/**
 * Game Engine implementation
 * Central coordinator for game flow, state transitions, and component coordination
 */

import {
  GameEngine,
  GameState,
  GuessResult,
  HintResult,
  PokemonSelector,
  LetterRevealer,
  HintSystem,
  ValidationError,
  PokemonGameError
} from '../types';
import { GameStateManager } from './GameState';

/**
 * Central game coordinator managing game flow and component interactions
 */
export class GameEngineImpl implements GameEngine {
  private readonly pokemonSelector: PokemonSelector;
  private readonly letterRevealer: LetterRevealer;
  private readonly hintSystem: HintSystem;
  private readonly gameState: GameStateManager;

  constructor(
    pokemonSelector: PokemonSelector,
    letterRevealer: LetterRevealer,
    hintSystem: HintSystem,
    gameState: GameStateManager
  ) {
    this.pokemonSelector = pokemonSelector;
    this.letterRevealer = letterRevealer;
    this.hintSystem = hintSystem;
    this.gameState = gameState;
  }

  /**
   * Start a new game by selecting a Pokemon and initializing all components
   * @returns Promise that resolves when the game is ready
   */
  public async startNewGame(): Promise<void> {
    try {
      // Reset game state
      this.gameState.resetGame();
      
      // Select a random Pokemon with enhanced error handling
      const pokemon = await this.pokemonSelector.selectRandomPokemon();
      
      // Initialize all components with the selected Pokemon
      this.gameState.initializeNewGame(pokemon);
      this.letterRevealer.initializeName(pokemon.name);
      this.hintSystem.initializePokemon(pokemon);
      
    } catch (error) {
      // Enhanced error handling with more specific error types
      if (error instanceof ValidationError) {
        throw new PokemonGameError(
          'Unable to find a suitable Pokemon for the game. Please try again.',
          'POKEMON_SELECTION_ERROR'
        );
      } else if (error instanceof Error && error.message.includes('timeout')) {
        throw new PokemonGameError(
          'The Pokemon database is taking too long to respond. Please check your internet connection and try again.',
          'NETWORK_TIMEOUT_ERROR'
        );
      } else if (error instanceof Error && error.message.includes('Network error')) {
        throw new PokemonGameError(
          'Unable to connect to the Pokemon database. Please check your internet connection and try again.',
          'NETWORK_CONNECTION_ERROR'
        );
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new PokemonGameError(
          `Failed to start new game: ${errorMessage}`,
          'GAME_START_ERROR'
        );
      }
    }
  }

  /**
   * Process a letter guess and update game state accordingly
   * @param letter The letter being guessed
   * @returns Result of the guess including game status
   */
  public processLetterGuess(letter: string): GuessResult {
    // Validate input
    this.validateLetterInput(letter);
    
    // Check if game is already complete
    if (this.gameState.isGameComplete()) {
      throw new ValidationError('Cannot process guess: Game is already complete');
    }

    // Process the letter guess
    const guessResult = this.letterRevealer.guessLetter(letter);
    
    // If letter was already guessed, return current state without changes
    if (guessResult.alreadyGuessed) {
      return {
        isCorrect: guessResult.isCorrect,
        newlyRevealedPositions: [], // No new positions revealed
        gameStatus: this.gameState.getCurrentState().gameStatus,
        remainingGuesses: this.gameState.getCurrentState().remainingGuesses
      };
    }

    // Update game state based on guess result
    if (guessResult.isCorrect) {
      // Correct guess: add to correct letters and update revealed name
      this.gameState.addCorrectGuess(letter);
      this.gameState.updateRevealedName(this.letterRevealer.getRevealedName());
    } else {
      // Incorrect guess: add to incorrect letters and decrease guess counter
      this.gameState.addIncorrectGuess(letter);
    }

    // Check for game termination conditions
    this.checkAndUpdateGameStatus();

    const currentState = this.gameState.getCurrentState();
    
    return {
      isCorrect: guessResult.isCorrect,
      newlyRevealedPositions: guessResult.positions,
      gameStatus: currentState.gameStatus,
      remainingGuesses: currentState.remainingGuesses
    };
  }

  /**
   * Request a hint about the current Pokemon
   * @returns Hint result including remaining guesses
   */
  public requestHint(): HintResult {
    // Check if game is already complete
    if (this.gameState.isGameComplete()) {
      throw new ValidationError('Cannot request hint: Game is already complete');
    }

    // Check if player has remaining guesses
    const currentState = this.gameState.getCurrentState();
    if (currentState.remainingGuesses <= 0) {
      throw new ValidationError('Cannot request hint: No remaining guesses');
    }

    // Generate hint
    const hintText = this.hintSystem.generateHint();
    
    // Decrease guess counter for hint cost
    this.gameState.decreaseGuesses(1);
    this.gameState.incrementHintsUsed();

    // Check if game ends due to hint cost
    this.checkAndUpdateGameStatus();

    const updatedState = this.gameState.getCurrentState();

    return {
      hintText,
      remainingGuesses: updatedState.remainingGuesses,
      gameStatus: updatedState.gameStatus
    };
  }

  /**
   * Get the current game state
   * @returns Current game state (immutable copy)
   */
  public getCurrentState(): GameState {
    return this.gameState.getCurrentState();
  }

  /**
   * Reset the game to initial state
   */
  public resetGame(): void {
    this.gameState.resetGame();
  }

  /**
   * Check game termination conditions and update status accordingly
   */
  private checkAndUpdateGameStatus(): void {
    const currentState = this.gameState.getCurrentState();
    
    // Check for loss condition: no remaining guesses
    if (currentState.remainingGuesses <= 0) {
      this.gameState.updateGameStatus('lost');
      return;
    }

    // Check for win condition: all letters revealed
    if (this.letterRevealer.isNameComplete()) {
      this.gameState.updateGameStatus('won');
      return;
    }

    // Game continues
    this.gameState.updateGameStatus('playing');
  }

  /**
   * Validate letter input for guessing
   * @param letter Letter to validate
   */
  private validateLetterInput(letter: string): void {
    if (typeof letter !== 'string') {
      throw new ValidationError('Letter must be a string');
    }
    
    if (letter.length !== 1) {
      throw new ValidationError('Letter must be exactly one character');
    }
    
    if (!/[a-zA-Z]/.test(letter)) {
      throw new ValidationError('Letter must be alphabetic');
    }
  }
}