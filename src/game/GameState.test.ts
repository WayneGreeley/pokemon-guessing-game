/**
 * Unit tests for GameState implementation
 * Tests game state initialization, updates, and queries
 */

import { GameStateManager } from './GameState';
import { PokemonData, GAME_CONSTANTS } from '../types';
import { createMockPokemonData } from '../test-setup';
import * as fc from 'fast-check';

describe('GameStateManager', () => {
  let gameState: GameStateManager;
  let mockPokemon: PokemonData;

  beforeEach(() => {
    gameState = new GameStateManager();
    mockPokemon = createMockPokemonData({
      name: 'pikachu',
      generation: 1,
      types: ['electric'],
      abilities: ['static', 'lightning-rod'],
      id: 25
    });
  });

  describe('initialization', () => {
    it('should create initial state with correct default values', () => {
      // Given - new GameStateManager
      // When - getting current state
      const state = gameState.getCurrentState();

      // Then - should have initial values
      expect(state.currentPokemon).toBeNull();
      expect(state.revealedName).toBe('');
      expect(state.guessedLetters.correct).toEqual([]);
      expect(state.guessedLetters.incorrect).toEqual([]);
      expect(state.remainingGuesses).toBe(GAME_CONSTANTS.INITIAL_GUESSES);
      expect(state.gameStatus).toBe('playing');
      expect(state.hintsUsed).toBe(0);
    });

    it('should return immutable copy of state', () => {
      // Given - game state with some data
      gameState.initializeNewGame(mockPokemon);
      
      // When - getting state twice
      const state1 = gameState.getCurrentState();
      const state2 = gameState.getCurrentState();

      // Then - should be different objects but equal content
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
      
      // Modifying returned state should not affect internal state
      (state1.guessedLetters.correct as string[]).push('a');
      const state3 = gameState.getCurrentState();
      expect(state3.guessedLetters.correct).toEqual([]);
    });
  });

  describe('initializeNewGame', () => {
    it('should initialize game with Pokemon and create blank name', () => {
      // Given - valid Pokemon data
      // When - initializing new game
      gameState.initializeNewGame(mockPokemon);
      const state = gameState.getCurrentState();

      // Then - should set Pokemon and create blank name
      expect(state.currentPokemon).toEqual(mockPokemon);
      expect(state.revealedName).toBe('_______'); // 7 underscores for "pikachu"
      expect(state.remainingGuesses).toBe(GAME_CONSTANTS.INITIAL_GUESSES);
      expect(state.gameStatus).toBe('playing');
      expect(state.hintsUsed).toBe(0);
      expect(state.guessedLetters.correct).toEqual([]);
      expect(state.guessedLetters.incorrect).toEqual([]);
    });

    it('should handle Pokemon names with non-alphabetic characters', () => {
      // Given - Pokemon with hyphen in name
      const pokemonWithHyphen = createMockPokemonData({
        name: 'ho-oh'
      });

      // When - initializing new game
      gameState.initializeNewGame(pokemonWithHyphen);
      const state = gameState.getCurrentState();

      // Then - should preserve non-alphabetic characters
      expect(state.revealedName).toBe('__-__'); // underscores for letters, hyphen preserved
    });

    it('should throw error for invalid Pokemon data', () => {
      // Given - invalid Pokemon data
      const invalidPokemon = createMockPokemonData({
        name: ''
      });

      // When/Then - should throw validation error
      expect(() => gameState.initializeNewGame(invalidPokemon))
        .toThrow('Pokemon must have a valid name');
    });
  });

  describe('resetGame', () => {
    it('should reset all state to initial values', () => {
      // Given - game with progress
      gameState.initializeNewGame(mockPokemon);
      gameState.addCorrectGuess('p');
      gameState.addIncorrectGuess('x');
      gameState.incrementHintsUsed();

      // When - resetting game
      gameState.resetGame();
      const state = gameState.getCurrentState();

      // Then - should return to initial state
      expect(state.currentPokemon).toBeNull();
      expect(state.revealedName).toBe('');
      expect(state.guessedLetters.correct).toEqual([]);
      expect(state.guessedLetters.incorrect).toEqual([]);
      expect(state.remainingGuesses).toBe(GAME_CONSTANTS.INITIAL_GUESSES);
      expect(state.gameStatus).toBe('playing');
      expect(state.hintsUsed).toBe(0);
    });
  });

  describe('letter guessing', () => {
    beforeEach(() => {
      gameState.initializeNewGame(mockPokemon);
    });

    it('should add correct letter guess', () => {
      // Given - initialized game
      // When - adding correct guess
      gameState.addCorrectGuess('p');
      const state = gameState.getCurrentState();

      // Then - should add to correct guesses
      expect(state.guessedLetters.correct).toContain('p');
      expect(state.guessedLetters.incorrect).toEqual([]);
      expect(state.remainingGuesses).toBe(GAME_CONSTANTS.INITIAL_GUESSES);
    });

    it('should add incorrect letter guess and decrease remaining guesses', () => {
      // Given - initialized game
      // When - adding incorrect guess
      gameState.addIncorrectGuess('x');
      const state = gameState.getCurrentState();

      // Then - should add to incorrect guesses and decrease counter
      expect(state.guessedLetters.incorrect).toContain('x');
      expect(state.guessedLetters.correct).toEqual([]);
      expect(state.remainingGuesses).toBe(GAME_CONSTANTS.INITIAL_GUESSES - 1);
    });

    it('should not add duplicate correct guesses', () => {
      // Given - letter already guessed correctly
      gameState.addCorrectGuess('p');

      // When - guessing same letter again
      gameState.addCorrectGuess('p');
      const state = gameState.getCurrentState();

      // Then - should not duplicate
      expect(state.guessedLetters.correct).toEqual(['p']);
    });

    it('should not add duplicate incorrect guesses', () => {
      // Given - letter already guessed incorrectly
      gameState.addIncorrectGuess('x');
      const initialGuesses = gameState.getCurrentState().remainingGuesses;

      // When - guessing same letter again
      gameState.addIncorrectGuess('x');
      const state = gameState.getCurrentState();

      // Then - should not duplicate or decrease guesses again
      expect(state.guessedLetters.incorrect).toEqual(['x']);
      expect(state.remainingGuesses).toBe(initialGuesses);
    });

    it('should handle case insensitive guesses', () => {
      // Given - initialized game
      // When - adding guesses with different cases
      gameState.addCorrectGuess('P');
      gameState.addIncorrectGuess('X');
      const state = gameState.getCurrentState();

      // Then - should store as lowercase
      expect(state.guessedLetters.correct).toContain('p');
      expect(state.guessedLetters.incorrect).toContain('x');
    });

    it('should validate letter input', () => {
      // Given - initialized game
      // When/Then - should throw for invalid input
      expect(() => gameState.addCorrectGuess('')).toThrow('Letter must be a single character string');
      expect(() => gameState.addCorrectGuess('ab')).toThrow('Letter must be a single character string');
      expect(() => gameState.addCorrectGuess('1')).toThrow('Letter must be alphabetic');
    });
  });

  describe('hasLetterBeenGuessed', () => {
    beforeEach(() => {
      gameState.initializeNewGame(mockPokemon);
      gameState.addCorrectGuess('p');
      gameState.addIncorrectGuess('x');
    });

    it('should return true for correctly guessed letters', () => {
      // Given - letter guessed correctly
      // When/Then - should return true
      expect(gameState.hasLetterBeenGuessed('p')).toBe(true);
      expect(gameState.hasLetterBeenGuessed('P')).toBe(true); // case insensitive
    });

    it('should return true for incorrectly guessed letters', () => {
      // Given - letter guessed incorrectly
      // When/Then - should return true
      expect(gameState.hasLetterBeenGuessed('x')).toBe(true);
      expect(gameState.hasLetterBeenGuessed('X')).toBe(true); // case insensitive
    });

    it('should return false for unguessed letters', () => {
      // Given - letter not guessed
      // When/Then - should return false
      expect(gameState.hasLetterBeenGuessed('a')).toBe(false);
      expect(gameState.hasLetterBeenGuessed('z')).toBe(false);
    });
  });

  describe('game status management', () => {
    beforeEach(() => {
      gameState.initializeNewGame(mockPokemon);
    });

    it('should update game status', () => {
      // Given - initialized game
      // When - updating status
      gameState.updateGameStatus('won');
      const state = gameState.getCurrentState();

      // Then - should update status
      expect(state.gameStatus).toBe('won');
    });

    it('should check if game is complete', () => {
      // Given - game in progress
      expect(gameState.isGameComplete()).toBe(false);

      // When - game won
      gameState.updateGameStatus('won');
      expect(gameState.isGameComplete()).toBe(true);

      // When - game lost
      gameState.updateGameStatus('lost');
      expect(gameState.isGameComplete()).toBe(true);
    });
  });

  describe('name completion checking', () => {
    beforeEach(() => {
      gameState.initializeNewGame(mockPokemon);
    });

    it('should return false when name has unrevealed letters', () => {
      // Given - name with underscores
      gameState.updateRevealedName('p______');

      // When/Then - should not be complete
      expect(gameState.isNameComplete()).toBe(false);
    });

    it('should return true when all letters are revealed', () => {
      // Given - fully revealed name
      gameState.updateRevealedName('pikachu');

      // When/Then - should be complete
      expect(gameState.isNameComplete()).toBe(true);
    });

    it('should return false when no Pokemon is set', () => {
      // Given - no Pokemon set
      gameState.resetGame();

      // When/Then - should not be complete
      expect(gameState.isNameComplete()).toBe(false);
    });
  });

  describe('hints and guess management', () => {
    beforeEach(() => {
      gameState.initializeNewGame(mockPokemon);
    });

    it('should decrease remaining guesses', () => {
      // Given - initial guesses
      const initial = gameState.getCurrentState().remainingGuesses;

      // When - decreasing guesses
      gameState.decreaseGuesses(2);
      const state = gameState.getCurrentState();

      // Then - should decrease by specified amount
      expect(state.remainingGuesses).toBe(initial - 2);
    });

    it('should not allow negative guesses', () => {
      // Given - game with few guesses left
      gameState.decreaseGuesses(GAME_CONSTANTS.INITIAL_GUESSES);

      // When - decreasing more
      gameState.decreaseGuesses(5);
      const state = gameState.getCurrentState();

      // Then - should not go below zero
      expect(state.remainingGuesses).toBe(0);
    });

    it('should increment hints used', () => {
      // Given - no hints used
      expect(gameState.getCurrentState().hintsUsed).toBe(0);

      // When - using hints
      gameState.incrementHintsUsed();
      gameState.incrementHintsUsed();
      const state = gameState.getCurrentState();

      // Then - should increment counter
      expect(state.hintsUsed).toBe(2);
    });

    it('should throw error for negative decrease amount', () => {
      // Given - initialized game
      // When/Then - should throw for negative amount
      expect(() => gameState.decreaseGuesses(-1))
        .toThrow('Cannot decrease guesses by negative amount');
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      gameState.initializeNewGame(mockPokemon);
    });

    it('should get Pokemon name in lowercase', () => {
      // Given - Pokemon with mixed case name
      const mixedCasePokemon = createMockPokemonData({
        name: 'Pikachu'
      });
      gameState.initializeNewGame(mixedCasePokemon);

      // When - getting lowercase name
      const name = gameState.getPokemonNameLowercase();

      // Then - should return lowercase
      expect(name).toBe('pikachu');
    });

    it('should return empty string when no Pokemon set', () => {
      // Given - no Pokemon set
      gameState.resetGame();

      // When - getting Pokemon name
      const name = gameState.getPokemonNameLowercase();

      // Then - should return empty string
      expect(name).toBe('');
    });

    it('should update revealed name', () => {
      // Given - initialized game
      // When - updating revealed name
      gameState.updateRevealedName('p______');
      const state = gameState.getCurrentState();

      // Then - should update revealed name
      expect(state.revealedName).toBe('p______');
    });

    it('should validate revealed name input', () => {
      // Given - initialized game
      // When/Then - should throw for invalid input
      expect(() => gameState.updateRevealedName(null as any))
        .toThrow('Revealed name must be a string');
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 4: Game Initialization State', () => {
      it('should always initialize with correct default state for any valid Pokemon', () => {
        /**
         * **Validates: Requirements 2.1**
         * 
         * Property 4: Game Initialization State
         * For any new game start, the initial state should have exactly 7 remaining guesses, 
         * no guessed letters, and 'playing' status
         */
        
        // Generator for valid Pokemon data
        const pokemonArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]+(-[a-z]+)*$/), // Valid Pokemon names (alphabetic with optional hyphens)
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.stringMatching(/^[a-z]+$/), { minLength: 1, maxLength: 3 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]+$/), { minLength: 0, maxLength: 4 }),
          id: fc.integer({ min: 1, max: 1010 })
        }).map(data => createMockPokemonData(data));

        fc.assert(
          fc.property(pokemonArbitrary, (pokemon) => {
            // Given - a new GameStateManager
            const gameStateManager = new GameStateManager();
            
            // When - initializing a new game with any valid Pokemon
            gameStateManager.initializeNewGame(pokemon);
            const state = gameStateManager.getCurrentState();
            
            // Then - the initial state should always have the correct properties
            expect(state.remainingGuesses).toBe(GAME_CONSTANTS.INITIAL_GUESSES); // Exactly 7 guesses
            expect(state.guessedLetters.correct).toEqual([]); // No correct guesses
            expect(state.guessedLetters.incorrect).toEqual([]); // No incorrect guesses
            expect(state.gameStatus).toBe('playing'); // Playing status
            expect(state.hintsUsed).toBe(0); // No hints used
            expect(state.currentPokemon).toEqual(pokemon); // Pokemon should be set
            expect(state.revealedName).toMatch(/^[_-]+$/); // Should be blanks and hyphens only
          }),
          { numRuns: 100 }
        );
      });

      it('should always reset to correct initial state regardless of previous game state', () => {
        /**
         * **Validates: Requirements 2.1**
         * 
         * Property 4: Game Initialization State (Reset variant)
         * For any game reset, the state should return to initial values with no Pokemon
         */
        
        // Generator for game modifications (simulating various game states)
        const gameModificationArbitrary = fc.record({
          correctGuesses: fc.array(fc.char().filter(c => /[a-z]/.test(c)), { maxLength: 5 }),
          incorrectGuesses: fc.array(fc.char().filter(c => /[a-z]/.test(c)), { maxLength: 7 }),
          hintsUsed: fc.integer({ min: 0, max: 5 }),
          revealedName: fc.string({ minLength: 1, maxLength: 20 })
        });

        const pokemonArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]+(-[a-z]+)*$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.stringMatching(/^[a-z]+$/), { minLength: 1, maxLength: 3 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]+$/), { minLength: 0, maxLength: 4 }),
          id: fc.integer({ min: 1, max: 1010 })
        }).map(data => createMockPokemonData(data));

        fc.assert(
          fc.property(pokemonArbitrary, gameModificationArbitrary, (pokemon, modifications) => {
            // Given - a game with some progress
            const gameStateManager = new GameStateManager();
            gameStateManager.initializeNewGame(pokemon);
            
            // Simulate various game states
            modifications.correctGuesses.forEach(letter => {
              try {
                gameStateManager.addCorrectGuess(letter);
              } catch {
                // Ignore validation errors for property test
              }
            });
            
            modifications.incorrectGuesses.forEach(letter => {
              try {
                gameStateManager.addIncorrectGuess(letter);
              } catch {
                // Ignore validation errors for property test
              }
            });
            
            for (let i = 0; i < modifications.hintsUsed; i++) {
              gameStateManager.incrementHintsUsed();
            }
            
            try {
              gameStateManager.updateRevealedName(modifications.revealedName);
            } catch {
              // Ignore validation errors for property test
            }
            
            // When - resetting the game
            gameStateManager.resetGame();
            const state = gameStateManager.getCurrentState();
            
            // Then - should always return to initial state
            expect(state.currentPokemon).toBeNull(); // No Pokemon
            expect(state.revealedName).toBe(''); // Empty revealed name
            expect(state.guessedLetters.correct).toEqual([]); // No correct guesses
            expect(state.guessedLetters.incorrect).toEqual([]); // No incorrect guesses
            expect(state.remainingGuesses).toBe(GAME_CONSTANTS.INITIAL_GUESSES); // Exactly 7 guesses
            expect(state.gameStatus).toBe('playing'); // Playing status
            expect(state.hintsUsed).toBe(0); // No hints used
          }),
          { numRuns: 100 }
        );
      });
    });
  });
});