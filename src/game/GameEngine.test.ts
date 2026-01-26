/**
 * Unit tests for GameEngine implementation
 * Tests central game coordinator functionality
 */

import { GameEngineImpl } from './GameEngine';
import { GameStateManager } from './GameState';
import { LetterRevealerImpl } from './LetterRevealer';
import { HintSystemImpl } from './HintSystem';
import { PokemonData, ValidationError, PokemonGameError, GameState } from '../types';
import { createMockPokemonData } from '../test-setup';
import * as fc from 'fast-check';

// Helper function to create complete test Pokemon data
function createTestPokemon(overrides: Partial<PokemonData> = {}): PokemonData {
  return createMockPokemonData({
    name: 'pikachu',
    generation: 1,
    types: ['electric'],
    abilities: ['static', 'lightning-rod'],
    id: 25,
    ...overrides
  });
}

// Mock implementations for testing
class MockPokemonSelector {
  async selectRandomPokemon(): Promise<PokemonData> {
    return createTestPokemon();
  }

  filterValidPokemon = jest.fn();
}

describe('GameEngine', () => {
  let gameEngine: GameEngineImpl;
  let mockPokemonSelector: MockPokemonSelector;
  let letterRevealer: LetterRevealerImpl;
  let hintSystem: HintSystemImpl;
  let gameState: GameStateManager;

  beforeEach(() => {
    mockPokemonSelector = new MockPokemonSelector();
    letterRevealer = new LetterRevealerImpl();
    hintSystem = new HintSystemImpl();
    gameState = new GameStateManager();

    gameEngine = new GameEngineImpl(
      mockPokemonSelector as any,
      letterRevealer,
      hintSystem,
      gameState
    );
  });

  describe('startNewGame', () => {
    it('should initialize a new game successfully', async () => {
      // When
      await gameEngine.startNewGame();

      // Then
      const currentState = gameEngine.getCurrentState();
      expect(currentState.currentPokemon).toBeTruthy();
      expect(currentState.currentPokemon?.name).toBe('pikachu');
      expect(currentState.remainingGuesses).toBe(7);
      expect(currentState.gameStatus).toBe('playing');
      expect(currentState.hintsUsed).toBe(0);
    });

    it('should handle Pokemon selection errors', async () => {
      // Given
      mockPokemonSelector.selectRandomPokemon = jest.fn().mockRejectedValue(new Error('API Error'));

      // When & Then
      await expect(gameEngine.startNewGame()).rejects.toThrow(PokemonGameError);
    });
  });

  describe('processLetterGuess', () => {
    beforeEach(async () => {
      await gameEngine.startNewGame();
    });

    it('should process correct letter guess', () => {
      // Given
      const letter = 'p';

      // When
      const result = gameEngine.processLetterGuess(letter);

      // Then
      expect(result.isCorrect).toBe(true);
      expect(result.newlyRevealedPositions).toEqual([0]);
      expect(result.gameStatus).toBe('playing');
      expect(result.remainingGuesses).toBe(7);
    });

    it('should process incorrect letter guess', () => {
      // Given
      const letter = 'z';

      // When
      const result = gameEngine.processLetterGuess(letter);

      // Then
      expect(result.isCorrect).toBe(false);
      expect(result.newlyRevealedPositions).toEqual([]);
      expect(result.gameStatus).toBe('playing');
      expect(result.remainingGuesses).toBe(6);
    });

    it('should handle duplicate letter guess', () => {
      // Given
      gameEngine.processLetterGuess('p'); // First guess

      // When
      const result = gameEngine.processLetterGuess('p'); // Duplicate

      // Then
      expect(result.isCorrect).toBe(true);
      expect(result.newlyRevealedPositions).toEqual([]);
      expect(result.gameStatus).toBe('playing');
      expect(result.remainingGuesses).toBe(7); // Should not decrease
    });

    it('should detect win condition', () => {
      // Given - guess all letters in 'pikachu'
      const letters = ['p', 'i', 'k', 'a', 'c', 'h', 'u'];

      // When
      let result;
      for (const letter of letters) {
        result = gameEngine.processLetterGuess(letter);
      }

      // Then
      expect(result?.gameStatus).toBe('won');
    });

    it('should detect loss condition', () => {
      // Given - make 7 incorrect guesses
      const incorrectLetters = ['z', 'x', 'w', 'v', 'q', 'j', 'b'];

      // When
      let result;
      for (const letter of incorrectLetters) {
        result = gameEngine.processLetterGuess(letter);
      }

      // Then
      expect(result?.gameStatus).toBe('lost');
      expect(result?.remainingGuesses).toBe(0);
    });

    it('should throw error for invalid letter input', () => {
      // Given
      const invalidInputs = ['', 'ab', '1', '!'];

      // When & Then
      invalidInputs.forEach(input => {
        expect(() => gameEngine.processLetterGuess(input)).toThrow(ValidationError);
      });
    });

    it('should throw error when game is already complete', () => {
      // Given - complete the game
      const letters = ['p', 'i', 'k', 'a', 'c', 'h', 'u'];
      for (const letter of letters) {
        gameEngine.processLetterGuess(letter);
      }

      // When & Then
      expect(() => gameEngine.processLetterGuess('x')).toThrow(ValidationError);
    });
  });

  describe('requestHint', () => {
    beforeEach(async () => {
      await gameEngine.startNewGame();
    });

    it('should provide hint and decrease guess counter', () => {
      // When
      const result = gameEngine.requestHint();

      // Then
      expect(result.hintText).toContain('Generation: 1');
      expect(result.hintText).toContain('Type: Electric');
      expect(result.hintText).toContain('Abilities: Static, Lightning Rod');
      expect(result.remainingGuesses).toBe(6);
      expect(result.gameStatus).toBe('playing');
    });

    it('should handle multiple hint requests', () => {
      // When
      const result1 = gameEngine.requestHint();
      const result2 = gameEngine.requestHint();

      // Then
      expect(result1.remainingGuesses).toBe(6);
      expect(result2.remainingGuesses).toBe(5);
    });

    it('should cause loss when hint reduces guesses to zero', () => {
      // Given - reduce guesses to 1 using different incorrect letters
      const incorrectLetters = ['z', 'x', 'w', 'v', 'q', 'j'];
      for (let i = 0; i < 6; i++) {
        const letter = incorrectLetters[i]!; // Non-null assertion since we know the array has 6 elements
        gameEngine.processLetterGuess(letter);
      }

      // When
      const result = gameEngine.requestHint();

      // Then
      expect(result.gameStatus).toBe('lost');
      expect(result.remainingGuesses).toBe(0);
    });

    it('should throw error when game is already complete', () => {
      // Given - complete the game
      const letters = ['p', 'i', 'k', 'a', 'c', 'h', 'u'];
      for (const letter of letters) {
        gameEngine.processLetterGuess(letter);
      }

      // When & Then
      expect(() => gameEngine.requestHint()).toThrow(ValidationError);
    });

    it('should throw error when no guesses remaining', () => {
      // Given - exhaust all guesses
      const incorrectLetters = ['z', 'x', 'w', 'v', 'q', 'j', 'b'];
      for (const letter of incorrectLetters) {
        gameEngine.processLetterGuess(letter);
      }

      // When & Then
      expect(() => gameEngine.requestHint()).toThrow(ValidationError);
    });
  });

  describe('getCurrentState', () => {
    it('should return initial state before game starts', () => {
      // When
      const state = gameEngine.getCurrentState();

      // Then
      expect(state.currentPokemon).toBeNull();
      expect(state.remainingGuesses).toBe(7);
      expect(state.gameStatus).toBe('playing');
      expect(state.hintsUsed).toBe(0);
    });

    it('should return current state after game starts', async () => {
      // Given
      await gameEngine.startNewGame();

      // When
      const state = gameEngine.getCurrentState();

      // Then
      expect(state.currentPokemon).toBeTruthy();
      expect(state.currentPokemon?.name).toBe('pikachu');
      expect(state.remainingGuesses).toBe(7);
      expect(state.gameStatus).toBe('playing');
    });
  });

  describe('resetGame', () => {
    it('should reset game to initial state', async () => {
      // Given
      await gameEngine.startNewGame();
      gameEngine.processLetterGuess('p');
      gameEngine.requestHint();

      // When
      gameEngine.resetGame();

      // Then
      const state = gameEngine.getCurrentState();
      expect(state.currentPokemon).toBeNull();
      expect(state.remainingGuesses).toBe(7);
      expect(state.gameStatus).toBe('playing');
      expect(state.hintsUsed).toBe(0);
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 5: Guess Counter Behavior', () => {
      it('should maintain guess counter for correct letters and decrease by 1 for incorrect letters', async () => {
        /**
         * **Validates: Requirements 2.2, 2.3**
         * 
         * Property 5: Guess Counter Behavior
         * For any letter guess, if the letter exists in the Pokemon name (case-insensitive) 
         * then the guess counter remains unchanged, otherwise it decreases by exactly 1
         */
        
        // Generator for valid Pokemon names (alphabetic characters only)
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);
        
        // Generator for letters (both uppercase and lowercase)
        const letterArbitrary = fc.char().filter(c => /[a-zA-Z]/.test(c));

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            letterArbitrary,
            async (pokemonName, letter) => {
              // Given - a fresh game engine with a specific Pokemon
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();
              const initialState = freshGameEngine.getCurrentState();
              const initialGuesses = initialState.remainingGuesses;

              // When - processing a letter guess
              const result = freshGameEngine.processLetterGuess(letter);
              const finalState = freshGameEngine.getCurrentState();

              // Then - verify guess counter behavior based on letter correctness
              const letterExistsInName = pokemonName.toLowerCase().includes(letter.toLowerCase());
              
              if (letterExistsInName) {
                // Correct guess: counter should remain unchanged
                expect(finalState.remainingGuesses).toBe(initialGuesses);
                expect(result.isCorrect).toBe(true);
                expect(result.remainingGuesses).toBe(initialGuesses);
              } else {
                // Incorrect guess: counter should decrease by exactly 1
                expect(finalState.remainingGuesses).toBe(initialGuesses - 1);
                expect(result.isCorrect).toBe(false);
                expect(result.remainingGuesses).toBe(initialGuesses - 1);
              }

              // Additional invariants that should always hold
              expect(finalState.remainingGuesses).toBeGreaterThanOrEqual(0);
              expect(finalState.remainingGuesses).toBeLessThanOrEqual(7);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle duplicate guesses without changing counter', async () => {
        /**
         * **Validates: Requirements 2.2, 2.3**
         * 
         * Property 5: Guess Counter Behavior (Duplicate handling)
         * For any letter that has already been guessed, the guess counter should not change
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);
        const letterArbitrary = fc.char().filter(c => /[a-zA-Z]/.test(c));

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            letterArbitrary,
            async (pokemonName, letter) => {
              // Given - a fresh game engine with a specific Pokemon
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // When - making the same guess twice
              const firstResult = freshGameEngine.processLetterGuess(letter);
              const stateAfterFirst = freshGameEngine.getCurrentState();
              
              const secondResult = freshGameEngine.processLetterGuess(letter);
              const stateAfterSecond = freshGameEngine.getCurrentState();

              // Then - second guess should not change the counter
              expect(stateAfterSecond.remainingGuesses).toBe(stateAfterFirst.remainingGuesses);
              expect(secondResult.remainingGuesses).toBe(firstResult.remainingGuesses);
              
              // The correctness should be consistent
              expect(secondResult.isCorrect).toBe(firstResult.isCorrect);
              
              // No new positions should be revealed on duplicate guess
              expect(secondResult.newlyRevealedPositions).toEqual([]);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle case-insensitive letter matching correctly', async () => {
        /**
         * **Validates: Requirements 2.2, 2.3**
         * 
         * Property 5: Guess Counter Behavior (Case insensitive)
         * Letter matching should be case-insensitive for guess counter behavior
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);
        const letterArbitrary = fc.char().filter(c => /[a-zA-Z]/.test(c));

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            letterArbitrary,
            async (pokemonName, letter) => {
              // Given - two fresh game engines with the same Pokemon
              const createGameEngine = () => new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              const gameEngine1 = createGameEngine();
              const gameEngine2 = createGameEngine();
              
              await gameEngine1.startNewGame();
              await gameEngine2.startNewGame();

              // When - guessing the same letter in different cases
              const lowerResult = gameEngine1.processLetterGuess(letter.toLowerCase());
              const upperResult = gameEngine2.processLetterGuess(letter.toUpperCase());

              // Then - both should have the same effect on guess counter
              expect(lowerResult.isCorrect).toBe(upperResult.isCorrect);
              expect(lowerResult.remainingGuesses).toBe(upperResult.remainingGuesses);
              
              const finalState1 = gameEngine1.getCurrentState();
              const finalState2 = gameEngine2.getCurrentState();
              
              expect(finalState1.remainingGuesses).toBe(finalState2.remainingGuesses);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 6: Game Termination Conditions', () => {
      it('should set game status to lost when remaining guesses equals 0', async () => {
        /**
         * **Validates: Requirements 2.4, 2.5**
         * 
         * Property 6: Game Termination Conditions (Loss condition)
         * For any game state, if remaining guesses equals 0 then game status is 'lost'
         */
        
        // Generator for valid Pokemon names (alphabetic characters only)
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            async (pokemonName) => {
              // Generate exactly 7 unique incorrect letters (letters not in the Pokemon name)
              const allLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
              const incorrectLetters = allLetters.filter(
                letter => !pokemonName.toLowerCase().includes(letter)
              );
              
              // Skip if we don't have enough incorrect letters (need at least 7 unique ones)
              if (incorrectLetters.length < 7) {
                return;
              }

              // Given - a fresh game engine with a specific Pokemon
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // When - making exactly 7 unique incorrect guesses to exhaust all remaining guesses
              let finalResult;
              for (let i = 0; i < 7; i++) {
                const letter = incorrectLetters[i]!; // We know we have at least 7 unique incorrect letters
                finalResult = freshGameEngine.processLetterGuess(letter);
              }

              const finalState = freshGameEngine.getCurrentState();

              // Then - game status should be 'lost' and remaining guesses should be 0
              expect(finalState.remainingGuesses).toBe(0);
              expect(finalState.gameStatus).toBe('lost');
              expect(finalResult?.gameStatus).toBe('lost');
              expect(finalResult?.remainingGuesses).toBe(0);

              // Additional invariant: game should be complete
              expect(freshGameEngine.getCurrentState().gameStatus).not.toBe('playing');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should set game status to won when all letters are revealed', async () => {
        /**
         * **Validates: Requirements 2.4, 2.5**
         * 
         * Property 6: Game Termination Conditions (Win condition)
         * For any game state, if all letters are revealed then game status is 'won'
         */
        
        // Generator for valid Pokemon names (alphabetic characters only)
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            async (pokemonName) => {
              // Given - a fresh game engine with a specific Pokemon
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // When - guessing all unique letters in the Pokemon name
              const uniqueLetters = [...new Set(pokemonName.toLowerCase().split(''))];
              let finalResult;
              
              for (const letter of uniqueLetters) {
                finalResult = freshGameEngine.processLetterGuess(letter);
              }

              const finalState = freshGameEngine.getCurrentState();

              // Then - game status should be 'won' and all letters should be revealed
              expect(finalState.gameStatus).toBe('won');
              expect(finalResult?.gameStatus).toBe('won');
              
              // The revealed name should not contain any underscores (all letters revealed)
              expect(finalState.revealedName).not.toContain('_');
              expect(finalState.revealedName).toBe(pokemonName.toLowerCase());

              // Additional invariant: game should be complete
              expect(freshGameEngine.getCurrentState().gameStatus).not.toBe('playing');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should maintain playing status when neither termination condition is met', async () => {
        /**
         * **Validates: Requirements 2.4, 2.5**
         * 
         * Property 6: Game Termination Conditions (Playing condition)
         * For any game state, if remaining guesses > 0 and not all letters are revealed, 
         * then game status should remain 'playing'
         */
        
        // Generator for valid Pokemon names (alphabetic characters only)
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{4,15}$/); // At least 4 letters to ensure partial guessing
        
        // Generator for a subset of letters from the Pokemon name (to ensure partial revelation)
        const partialLetterGuessArbitrary = fc.integer({ min: 1, max: 3 });

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            partialLetterGuessArbitrary,
            async (pokemonName, numLettersToGuess) => {
              const uniqueLetters = [...new Set(pokemonName.toLowerCase().split(''))];
              
              // Skip if Pokemon name has too few unique letters for partial guessing
              if (uniqueLetters.length <= numLettersToGuess) {
                return;
              }

              // Given - a fresh game engine with a specific Pokemon
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // When - guessing only some of the letters (not all)
              let finalResult;
              for (let i = 0; i < numLettersToGuess; i++) {
                const letter = uniqueLetters[i]!; // We know this exists
                finalResult = freshGameEngine.processLetterGuess(letter);
              }

              const finalState = freshGameEngine.getCurrentState();

              // Then - game should still be playing (not won, not lost)
              expect(finalState.gameStatus).toBe('playing');
              expect(finalResult?.gameStatus).toBe('playing');
              
              // Remaining guesses should still be > 0 (no incorrect guesses made)
              expect(finalState.remainingGuesses).toBe(7);
              
              // Name should still contain underscores (not fully revealed)
              expect(finalState.revealedName).toContain('_');

              // Additional invariant: game should not be complete
              expect(freshGameEngine.getCurrentState().gameStatus).toBe('playing');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle mixed correct and incorrect guesses with proper termination logic', async () => {
        /**
         * **Validates: Requirements 2.4, 2.5**
         * 
         * Property 6: Game Termination Conditions (Mixed scenario)
         * For any combination of correct and incorrect guesses, termination conditions 
         * should be evaluated correctly
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{4,10}$/);
        const incorrectGuessCountArbitrary = fc.integer({ min: 1, max: 6 }); // Leave at least 1 guess
        const correctGuessCountArbitrary = fc.integer({ min: 1, max: 3 });

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            incorrectGuessCountArbitrary,
            correctGuessCountArbitrary,
            async (pokemonName, incorrectCount, correctCount) => {
              const uniqueLetters = [...new Set(pokemonName.toLowerCase().split(''))];
              
              // Generate incorrect letters (not in Pokemon name)
              const allLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
              const incorrectLetters = allLetters.filter(
                letter => !pokemonName.toLowerCase().includes(letter)
              );
              
              // Skip if we don't have enough incorrect letters or unique letters
              if (incorrectLetters.length < incorrectCount || uniqueLetters.length < correctCount) {
                return;
              }

              // Given - a fresh game engine
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // When - making some incorrect guesses
              for (let i = 0; i < incorrectCount; i++) {
                freshGameEngine.processLetterGuess(incorrectLetters[i]!);
              }

              // And making some correct guesses (but not all)
              for (let i = 0; i < correctCount && i < uniqueLetters.length; i++) {
                freshGameEngine.processLetterGuess(uniqueLetters[i]!);
              }

              const finalState = freshGameEngine.getCurrentState();

              // Then - verify termination conditions
              const expectedRemainingGuesses = 7 - incorrectCount;
              expect(finalState.remainingGuesses).toBe(expectedRemainingGuesses);

              // Check if all letters are revealed
              const allLettersRevealed = !finalState.revealedName.includes('_');
              
              if (expectedRemainingGuesses === 0) {
                // Should be lost if no guesses remaining
                expect(finalState.gameStatus).toBe('lost');
              } else if (allLettersRevealed) {
                // Should be won if all letters revealed
                expect(finalState.gameStatus).toBe('won');
              } else {
                // Should be playing if neither condition met
                expect(finalState.gameStatus).toBe('playing');
              }

              // Invariant: game status should be consistent with termination conditions
              const isTerminated = finalState.gameStatus === 'won' || finalState.gameStatus === 'lost';
              const shouldBeTerminated = expectedRemainingGuesses === 0 || allLettersRevealed;
              expect(isTerminated).toBe(shouldBeTerminated);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 8: Duplicate Guess Prevention', () => {
      it('should not change game state when guessing an already guessed letter', async () => {
        /**
         * **Validates: Requirements 3.4**
         * 
         * Property 8: Duplicate Guess Prevention
         * For any letter that has already been guessed, attempting to guess it again 
         * should not change the game state (guess counter, revealed letters, or game status)
         */
        
        // Generator for valid Pokemon names (alphabetic characters only)
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);
        
        // Generator for letters (both uppercase and lowercase)
        const letterArbitrary = fc.char().filter(c => /[a-zA-Z]/.test(c));

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            letterArbitrary,
            async (pokemonName, letter) => {
              // Given - a fresh game engine with a specific Pokemon
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // When - making the first guess
              const firstResult = freshGameEngine.processLetterGuess(letter);
              const stateAfterFirst = freshGameEngine.getCurrentState();

              // Capture complete state after first guess
              const firstGuessState = {
                remainingGuesses: stateAfterFirst.remainingGuesses,
                revealedName: stateAfterFirst.revealedName,
                gameStatus: stateAfterFirst.gameStatus,
                hintsUsed: stateAfterFirst.hintsUsed,
                guessedLetters: {
                  correct: [...stateAfterFirst.guessedLetters.correct],
                  incorrect: [...stateAfterFirst.guessedLetters.incorrect]
                }
              };

              // When - making the same guess again (duplicate)
              const secondResult = freshGameEngine.processLetterGuess(letter);
              const stateAfterSecond = freshGameEngine.getCurrentState();

              // Then - game state should be completely unchanged
              expect(stateAfterSecond.remainingGuesses).toBe(firstGuessState.remainingGuesses);
              expect(stateAfterSecond.revealedName).toBe(firstGuessState.revealedName);
              expect(stateAfterSecond.gameStatus).toBe(firstGuessState.gameStatus);
              expect(stateAfterSecond.hintsUsed).toBe(firstGuessState.hintsUsed);
              
              // Guessed letters arrays should be identical
              expect(stateAfterSecond.guessedLetters.correct).toEqual(firstGuessState.guessedLetters.correct);
              expect(stateAfterSecond.guessedLetters.incorrect).toEqual(firstGuessState.guessedLetters.incorrect);

              // Result properties should be consistent
              expect(secondResult.isCorrect).toBe(firstResult.isCorrect);
              expect(secondResult.remainingGuesses).toBe(firstResult.remainingGuesses);
              expect(secondResult.gameStatus).toBe(firstResult.gameStatus);
              
              // No new positions should be revealed on duplicate guess
              expect(secondResult.newlyRevealedPositions).toEqual([]);

              // Additional invariants
              expect(stateAfterSecond.remainingGuesses).toBeGreaterThanOrEqual(0);
              expect(stateAfterSecond.remainingGuesses).toBeLessThanOrEqual(7);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle multiple duplicate guesses consistently', async () => {
        /**
         * **Validates: Requirements 3.4**
         * 
         * Property 8: Duplicate Guess Prevention (Multiple duplicates)
         * Multiple attempts to guess the same letter should all have no effect 
         * after the first guess
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);
        const letterArbitrary = fc.char().filter(c => /[a-zA-Z]/.test(c));
        const duplicateCountArbitrary = fc.integer({ min: 2, max: 5 });

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            letterArbitrary,
            duplicateCountArbitrary,
            async (pokemonName, letter, duplicateCount) => {
              // Given - a fresh game engine
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // When - making the first guess
              const firstResult = freshGameEngine.processLetterGuess(letter);
              const stateAfterFirst = freshGameEngine.getCurrentState();

              // Capture state after first guess
              const referenceState = {
                remainingGuesses: stateAfterFirst.remainingGuesses,
                revealedName: stateAfterFirst.revealedName,
                gameStatus: stateAfterFirst.gameStatus,
                hintsUsed: stateAfterFirst.hintsUsed,
                guessedLetters: {
                  correct: [...stateAfterFirst.guessedLetters.correct],
                  incorrect: [...stateAfterFirst.guessedLetters.incorrect]
                }
              };

              // When - making multiple duplicate guesses
              for (let i = 0; i < duplicateCount; i++) {
                const duplicateResult = freshGameEngine.processLetterGuess(letter);
                const currentState = freshGameEngine.getCurrentState();

                // Then - each duplicate should have no effect
                expect(currentState.remainingGuesses).toBe(referenceState.remainingGuesses);
                expect(currentState.revealedName).toBe(referenceState.revealedName);
                expect(currentState.gameStatus).toBe(referenceState.gameStatus);
                expect(currentState.hintsUsed).toBe(referenceState.hintsUsed);
                
                expect(currentState.guessedLetters.correct).toEqual(referenceState.guessedLetters.correct);
                expect(currentState.guessedLetters.incorrect).toEqual(referenceState.guessedLetters.incorrect);

                // Result should be consistent with first guess
                expect(duplicateResult.isCorrect).toBe(firstResult.isCorrect);
                expect(duplicateResult.remainingGuesses).toBe(firstResult.remainingGuesses);
                expect(duplicateResult.gameStatus).toBe(firstResult.gameStatus);
                expect(duplicateResult.newlyRevealedPositions).toEqual([]);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle case-insensitive duplicate prevention', async () => {
        /**
         * **Validates: Requirements 3.4**
         * 
         * Property 8: Duplicate Guess Prevention (Case insensitive)
         * Guessing the same letter in different cases should be treated as duplicates
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);
        const letterArbitrary = fc.char().filter(c => /[a-zA-Z]/.test(c));

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            letterArbitrary,
            async (pokemonName, letter) => {
              // Given - a fresh game engine
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // When - guessing letter in lowercase first
              const lowerResult = freshGameEngine.processLetterGuess(letter.toLowerCase());
              const stateAfterLower = freshGameEngine.getCurrentState();

              // Capture state after lowercase guess
              const referenceState = {
                remainingGuesses: stateAfterLower.remainingGuesses,
                revealedName: stateAfterLower.revealedName,
                gameStatus: stateAfterLower.gameStatus,
                hintsUsed: stateAfterLower.hintsUsed,
                guessedLetters: {
                  correct: [...stateAfterLower.guessedLetters.correct],
                  incorrect: [...stateAfterLower.guessedLetters.incorrect]
                }
              };

              // When - guessing the same letter in uppercase (should be duplicate)
              const upperResult = freshGameEngine.processLetterGuess(letter.toUpperCase());
              const stateAfterUpper = freshGameEngine.getCurrentState();

              // Then - uppercase guess should have no effect (treated as duplicate)
              expect(stateAfterUpper.remainingGuesses).toBe(referenceState.remainingGuesses);
              expect(stateAfterUpper.revealedName).toBe(referenceState.revealedName);
              expect(stateAfterUpper.gameStatus).toBe(referenceState.gameStatus);
              expect(stateAfterUpper.hintsUsed).toBe(referenceState.hintsUsed);
              
              expect(stateAfterUpper.guessedLetters.correct).toEqual(referenceState.guessedLetters.correct);
              expect(stateAfterUpper.guessedLetters.incorrect).toEqual(referenceState.guessedLetters.incorrect);

              // Results should be consistent
              expect(upperResult.isCorrect).toBe(lowerResult.isCorrect);
              expect(upperResult.remainingGuesses).toBe(lowerResult.remainingGuesses);
              expect(upperResult.gameStatus).toBe(lowerResult.gameStatus);
              expect(upperResult.newlyRevealedPositions).toEqual([]);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should prevent duplicate guesses in mixed correct and incorrect scenarios', async () => {
        /**
         * **Validates: Requirements 3.4**
         * 
         * Property 8: Duplicate Guess Prevention (Mixed scenarios)
         * Duplicate prevention should work consistently regardless of whether 
         * the original guess was correct or incorrect
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{4,10}$/);
        const letterPairArbitrary = fc.tuple(
          fc.char().filter(c => /[a-zA-Z]/.test(c)),
          fc.char().filter(c => /[a-zA-Z]/.test(c))
        ).filter(([letter1, letter2]) => letter1.toLowerCase() !== letter2.toLowerCase());

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            letterPairArbitrary,
            async (pokemonName, [letter1, letter2]) => {
              // Given - a fresh game engine
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // When - making two different letter guesses
              const result1 = freshGameEngine.processLetterGuess(letter1);

              const result2 = freshGameEngine.processLetterGuess(letter2);
              const stateAfter2 = freshGameEngine.getCurrentState();

              // Capture state after both unique guesses
              const referenceState = {
                remainingGuesses: stateAfter2.remainingGuesses,
                revealedName: stateAfter2.revealedName,
                gameStatus: stateAfter2.gameStatus,
                hintsUsed: stateAfter2.hintsUsed,
                guessedLetters: {
                  correct: [...stateAfter2.guessedLetters.correct],
                  incorrect: [...stateAfter2.guessedLetters.incorrect]
                }
              };

              // When - attempting to duplicate the first letter
              const duplicate1Result = freshGameEngine.processLetterGuess(letter1);
              const stateAfterDuplicate1 = freshGameEngine.getCurrentState();

              // Then - first duplicate should have no effect
              expect(stateAfterDuplicate1.remainingGuesses).toBe(referenceState.remainingGuesses);
              expect(stateAfterDuplicate1.revealedName).toBe(referenceState.revealedName);
              expect(stateAfterDuplicate1.gameStatus).toBe(referenceState.gameStatus);
              expect(stateAfterDuplicate1.guessedLetters.correct).toEqual(referenceState.guessedLetters.correct);
              expect(stateAfterDuplicate1.guessedLetters.incorrect).toEqual(referenceState.guessedLetters.incorrect);
              expect(duplicate1Result.newlyRevealedPositions).toEqual([]);

              // When - attempting to duplicate the second letter
              const duplicate2Result = freshGameEngine.processLetterGuess(letter2);
              const stateAfterDuplicate2 = freshGameEngine.getCurrentState();

              // Then - second duplicate should also have no effect
              expect(stateAfterDuplicate2.remainingGuesses).toBe(referenceState.remainingGuesses);
              expect(stateAfterDuplicate2.revealedName).toBe(referenceState.revealedName);
              expect(stateAfterDuplicate2.gameStatus).toBe(referenceState.gameStatus);
              expect(stateAfterDuplicate2.guessedLetters.correct).toEqual(referenceState.guessedLetters.correct);
              expect(stateAfterDuplicate2.guessedLetters.incorrect).toEqual(referenceState.guessedLetters.incorrect);
              expect(duplicate2Result.newlyRevealedPositions).toEqual([]);

              // Verify consistency of duplicate results with original results
              expect(duplicate1Result.isCorrect).toBe(result1.isCorrect);
              expect(duplicate2Result.isCorrect).toBe(result2.isCorrect);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 10: Hint Cost Consistency', () => {
      it('should decrease guess counter by exactly 1 for each hint request', async () => {
        /**
         * **Feature: pokemon-guessing-game, Property 10: Hint Cost Consistency**
         * *For any* hint request during an active game, the guess counter should decrease by exactly 1, 
         * regardless of how many hints have been previously used
         * **Validates: Requirements 4.1, 4.5**
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);
        const hintCountArbitrary = fc.integer({ min: 1, max: 7 }); // Max 7 hints (all remaining guesses)

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            hintCountArbitrary,
            async (pokemonName, hintCount) => {
              // Given - a fresh game engine with a specific Pokemon
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['electric'],
                      abilities: ['static', 'lightning-rod'],
                      id: 25
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();
              const initialState = freshGameEngine.getCurrentState();
              const initialGuesses = initialState.remainingGuesses;

              // When - requesting multiple hints
              let currentGuesses = initialGuesses;
              for (let i = 0; i < hintCount; i++) {
                const hintResult = freshGameEngine.requestHint();
                currentGuesses--;

                // Then - each hint should decrease guess counter by exactly 1
                expect(hintResult.remainingGuesses).toBe(currentGuesses);
                expect(freshGameEngine.getCurrentState().remainingGuesses).toBe(currentGuesses);
                
                // Verify hint was actually provided
                expect(hintResult.hintText).toBeTruthy();
                expect(hintResult.hintText.length).toBeGreaterThan(0);
                
                // Verify hints used counter is incremented
                expect(freshGameEngine.getCurrentState().hintsUsed).toBe(i + 1);

                // If we've used all guesses, game should be lost
                if (currentGuesses === 0) {
                  expect(hintResult.gameStatus).toBe('lost');
                  expect(freshGameEngine.getCurrentState().gameStatus).toBe('lost');
                  break; // Can't request more hints after game ends
                } else {
                  expect(hintResult.gameStatus).toBe('playing');
                }
              }

              // Verify total guess reduction equals number of hints requested
              const finalState = freshGameEngine.getCurrentState();
              const actualHintsUsed = Math.min(hintCount, initialGuesses); // Can't use more hints than guesses available
              expect(finalState.remainingGuesses).toBe(initialGuesses - actualHintsUsed);
              expect(finalState.hintsUsed).toBe(actualHintsUsed);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle hint requests with mixed letter guesses consistently', async () => {
        /**
         * **Feature: pokemon-guessing-game, Property 10: Hint Cost Consistency**
         * Hint cost should be consistent regardless of previous letter guesses (correct or incorrect)
         * **Validates: Requirements 4.1, 4.5**
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{4,10}$/);
        const hintTimingArbitrary = fc.integer({ min: 0, max: 3 }); // When to request hint (after how many guesses)

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            hintTimingArbitrary,
            async (pokemonName, hintTiming) => {
              // Given - a fresh game engine
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // When - making some letter guesses first
              for (let i = 0; i < hintTiming; i++) {
                // Use different letters to avoid duplicates
                const testLetter = String.fromCharCode(97 + i); // 'a', 'b', 'c', etc.
                freshGameEngine.processLetterGuess(testLetter);
              }

              const stateBeforeHint = freshGameEngine.getCurrentState();
              const guessesBeforeHint = stateBeforeHint.remainingGuesses;

              // Skip hint request if game is already complete
              if (stateBeforeHint.gameStatus !== 'playing') {
                return; // Game already complete, skip this test case
              }

              // When - requesting a hint
              const hintResult = freshGameEngine.requestHint();
              const stateAfterHint = freshGameEngine.getCurrentState();

              // Then - hint should cost exactly 1 guess regardless of previous actions
              expect(hintResult.remainingGuesses).toBe(guessesBeforeHint - 1);
              expect(stateAfterHint.remainingGuesses).toBe(guessesBeforeHint - 1);
              expect(stateAfterHint.hintsUsed).toBe(stateBeforeHint.hintsUsed + 1);

              // Verify hint content is provided
              expect(hintResult.hintText).toBeTruthy();
              expect(hintResult.hintText).toContain('Generation:');

              // Game status should be consistent with remaining guesses
              if (stateAfterHint.remainingGuesses === 0) {
                expect(hintResult.gameStatus).toBe('lost');
                expect(stateAfterHint.gameStatus).toBe('lost');
              } else {
                expect(hintResult.gameStatus).toBe('playing');
                expect(stateAfterHint.gameStatus).toBe('playing');
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should prevent hint requests when game is already complete', async () => {
        /**
         * **Feature: pokemon-guessing-game, Property 10: Hint Cost Consistency**
         * Hint requests should be rejected when game is already won or lost
         * **Validates: Requirements 4.1, 4.5**
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,8}$/);

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            async (pokemonName) => {
              // Given - a fresh game engine
              const freshGameEngine = new GameEngineImpl(
                {
                  async selectRandomPokemon(): Promise<PokemonData> {
                    return createMockPokemonData({
                      name: pokemonName,
                      generation: 1,
                      types: ['normal'],
                      abilities: ['test-ability'],
                      id: 1
                    });
                  },
                  filterValidPokemon: jest.fn()
                } as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // When - completing the game by guessing all letters
              const uniqueLetters = [...new Set(pokemonName.toLowerCase().split(''))];
              for (const letter of uniqueLetters) {
                freshGameEngine.processLetterGuess(letter);
              }

              const completedState = freshGameEngine.getCurrentState();
              expect(completedState.gameStatus).toBe('won');

              // Then - hint request should be rejected
              expect(() => freshGameEngine.requestHint()).toThrow(ValidationError);
              expect(() => freshGameEngine.requestHint()).toThrow('Cannot request hint: Game is already complete');

              // Game state should remain unchanged after failed hint request
              const stateAfterFailedHint = freshGameEngine.getCurrentState();
              expect(stateAfterFailedHint.remainingGuesses).toBe(completedState.remainingGuesses);
              expect(stateAfterFailedHint.hintsUsed).toBe(completedState.hintsUsed);
              expect(stateAfterFailedHint.gameStatus).toBe(completedState.gameStatus);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 14: Game Reset Completeness', () => {
      it('should reset to clean state with no previous guesses, hints, or Pokemon data', async () => {
        /**
         * **Validates: Requirements 6.1, 6.4**
         * 
         * Property 14: Game Reset Completeness
         * For any game reset operation, the new game state should have no previous guesses, 
         * no hints used, 7 remaining guesses, and a newly selected Pokemon
         */
        
        // Generator for game actions to perform before reset
        const gameActionsArbitrary = fc.record({
          letterGuesses: fc.array(fc.char().filter(c => /[a-zA-Z]/.test(c)), { minLength: 1, maxLength: 10 }),
          hintRequests: fc.integer({ min: 0, max: 3 })
        });

        await fc.assert(
          fc.asyncProperty(
            gameActionsArbitrary,
            async (actions) => {
              // Given - a game engine with some game activity
              const freshGameEngine = new GameEngineImpl(
                mockPokemonSelector as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // Perform some game actions to create state
              for (const letter of actions.letterGuesses.slice(0, 5)) { // Limit to avoid game completion
                try {
                  freshGameEngine.processLetterGuess(letter);
                } catch {
                  // Ignore errors from duplicate guesses or completed games
                  break;
                }
              }

              for (let i = 0; i < actions.hintRequests; i++) {
                try {
                  freshGameEngine.requestHint();
                } catch {
                  // Ignore errors from completed games or no remaining guesses
                  break;
                }
              }

              const stateBeforeReset = freshGameEngine.getCurrentState();
              
              // Ensure we actually have some state to reset (skip if no changes made)
              if (stateBeforeReset.guessedLetters.correct.length === 0 && 
                  stateBeforeReset.guessedLetters.incorrect.length === 0 && 
                  stateBeforeReset.hintsUsed === 0) {
                return; // Skip this test case
              }

              // When - starting a new game (which includes reset)
              await freshGameEngine.startNewGame();
              const stateAfterReset = freshGameEngine.getCurrentState();

              // Then - all state should be reset to initial values
              
              // 1. No previous guesses should remain
              expect(stateAfterReset.guessedLetters.correct).toEqual([]);
              expect(stateAfterReset.guessedLetters.incorrect).toEqual([]);

              // 2. No hints used
              expect(stateAfterReset.hintsUsed).toBe(0);

              // 3. Full remaining guesses restored
              expect(stateAfterReset.remainingGuesses).toBe(7);

              // 4. Game status should be playing
              expect(stateAfterReset.gameStatus).toBe('playing');

              // 5. Should have a Pokemon (newly selected)
              expect(stateAfterReset.currentPokemon).toBeTruthy();
              expect(stateAfterReset.currentPokemon?.name).toBe('pikachu'); // Mock always returns pikachu

              // 6. Revealed name should be blank (all underscores)
              expect(stateAfterReset.revealedName).toMatch(/^_+$/);
              expect(stateAfterReset.revealedName).not.toContain(stateAfterReset.currentPokemon!.name);

              // 7. State should be completely independent of previous game
              expect(stateAfterReset.guessedLetters.correct.length).toBe(0);
              expect(stateAfterReset.guessedLetters.incorrect.length).toBe(0);
              
              // The new game should be fully functional
              const testResult = freshGameEngine.processLetterGuess('p');
              expect(testResult.isCorrect).toBe(true);
              expect(testResult.remainingGuesses).toBe(7); // Should still be 7 for correct guess
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle reset from any game state (playing, won, lost)', async () => {
        /**
         * **Validates: Requirements 6.1, 6.4**
         * 
         * Property 14: Game Reset Completeness (All game states)
         * Reset should work correctly regardless of the current game state
         */
        
        // Generator for different end game states
        const gameStateArbitrary = fc.oneof(
          fc.constant('playing'),
          fc.constant('won'),
          fc.constant('lost')
        );

        await fc.assert(
          fc.asyncProperty(
            gameStateArbitrary,
            async (targetState) => {
              // Given - a game engine in a specific state
              const freshGameEngine = new GameEngineImpl(
                mockPokemonSelector as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              await freshGameEngine.startNewGame();

              // Force the game into the target state
              if (targetState === 'won') {
                // Guess all letters to win
                const letters = ['p', 'i', 'k', 'a', 'c', 'h', 'u'];
                for (const letter of letters) {
                  freshGameEngine.processLetterGuess(letter);
                }
              } else if (targetState === 'lost') {
                // Make 7 incorrect guesses to lose
                const incorrectLetters = ['z', 'x', 'w', 'v', 'q', 'j', 'b'];
                for (const letter of incorrectLetters) {
                  freshGameEngine.processLetterGuess(letter);
                }
              }
              // For 'playing', just make a few guesses but don't complete

              const stateBeforeReset = freshGameEngine.getCurrentState();
              expect(stateBeforeReset.gameStatus).toBe(targetState);

              // When - starting a new game from this state
              await freshGameEngine.startNewGame();
              const stateAfterReset = freshGameEngine.getCurrentState();

              // Then - reset should be complete regardless of previous state
              expect(stateAfterReset.guessedLetters.correct).toEqual([]);
              expect(stateAfterReset.guessedLetters.incorrect).toEqual([]);
              expect(stateAfterReset.hintsUsed).toBe(0);
              expect(stateAfterReset.remainingGuesses).toBe(7);
              expect(stateAfterReset.gameStatus).toBe('playing');
              expect(stateAfterReset.currentPokemon).toBeTruthy();
              expect(stateAfterReset.revealedName).toMatch(/^_+$/);

              // The game should be fully functional after reset
              const testGuess = freshGameEngine.processLetterGuess('p');
              expect(testGuess.gameStatus).toBe('playing');
              expect(testGuess.remainingGuesses).toBe(7);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 15: Session Independence', () => {
      it('should maintain complete independence between consecutive games', async () => {
        /**
         * **Validates: Requirements 6.5**
         * 
         * Property 15: Session Independence
         * For any sequence of consecutive games, data from previous games 
         * (guesses, hints, Pokemon selection) should not affect the current game state
         */
        
        // Generator for multiple game sessions
        const gameSessionsArbitrary = fc.array(
          fc.record({
            guesses: fc.array(fc.char().filter(c => /[a-zA-Z]/.test(c)), { minLength: 1, maxLength: 5 }),
            hints: fc.integer({ min: 0, max: 2 })
          }),
          { minLength: 2, maxLength: 4 }
        );

        await fc.assert(
          fc.asyncProperty(
            gameSessionsArbitrary,
            async (sessions) => {
              // Given - a game engine for multiple sessions
              const gameEngine = new GameEngineImpl(
                mockPokemonSelector as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              const sessionStates: GameState[] = [];

              // When - playing multiple consecutive games
              for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
                const session = sessions[sessionIndex]!;
                
                // Start new game
                await gameEngine.startNewGame();
                const initialState = gameEngine.getCurrentState();
                
                // Verify each game starts with clean state
                expect(initialState.guessedLetters.correct).toEqual([]);
                expect(initialState.guessedLetters.incorrect).toEqual([]);
                expect(initialState.hintsUsed).toBe(0);
                expect(initialState.remainingGuesses).toBe(7);
                expect(initialState.gameStatus).toBe('playing');
                expect(initialState.currentPokemon).toBeTruthy();

                // Play the session
                for (const letter of session.guesses) {
                  try {
                    gameEngine.processLetterGuess(letter);
                  } catch {
                    // Ignore errors from duplicate guesses
                  }
                }

                for (let i = 0; i < session.hints; i++) {
                  try {
                    gameEngine.requestHint();
                  } catch {
                    // Ignore errors from no remaining guesses
                    break;
                  }
                }

                const finalState = gameEngine.getCurrentState();
                sessionStates.push(finalState);

                // Then - verify session independence
                if (sessionIndex > 0) {
                  const previousSession = sessionStates[sessionIndex - 1]!;
                  
                  // Current session should not be affected by previous session data
                  // (Initial state was already verified above, but let's check that the 
                  // game progressed independently)
                  
                  // Each session should have started fresh
                  expect(initialState.guessedLetters.correct).toEqual([]);
                  expect(initialState.guessedLetters.incorrect).toEqual([]);
                  expect(initialState.hintsUsed).toBe(0);
                  
                  // The Pokemon should be the same (since we're using a mock), but the
                  // game state should be independent
                  expect(initialState.currentPokemon?.name).toBe(previousSession.currentPokemon?.name);
                  
                  // But the progress should be completely separate
                  // (We can't directly compare final states since they depend on the actions taken)
                }
              }

              // Additional verification: Start one more game to ensure complete independence
              await gameEngine.startNewGame();
              const finalCleanState = gameEngine.getCurrentState();
              
              expect(finalCleanState.guessedLetters.correct).toEqual([]);
              expect(finalCleanState.guessedLetters.incorrect).toEqual([]);
              expect(finalCleanState.hintsUsed).toBe(0);
              expect(finalCleanState.remainingGuesses).toBe(7);
              expect(finalCleanState.gameStatus).toBe('playing');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle rapid consecutive game resets without state leakage', async () => {
        /**
         * **Validates: Requirements 6.5**
         * 
         * Property 15: Session Independence (Rapid resets)
         * Rapid consecutive resets should not cause state leakage between sessions
         */
        
        const rapidResetCountArbitrary = fc.integer({ min: 3, max: 10 });

        await fc.assert(
          fc.asyncProperty(
            rapidResetCountArbitrary,
            async (resetCount) => {
              // Given - a game engine
              const gameEngine = new GameEngineImpl(
                mockPokemonSelector as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              // When - performing rapid consecutive resets with some activity
              for (let i = 0; i < resetCount; i++) {
                await gameEngine.startNewGame();
                
                // Make a few actions
                try {
                  gameEngine.processLetterGuess('x'); // Likely incorrect
                  gameEngine.requestHint();
                } catch {
                  // Ignore any errors
                }
                
                // Immediately reset again
                await gameEngine.startNewGame();
                const state = gameEngine.getCurrentState();
                
                // Then - each reset should result in clean state
                expect(state.guessedLetters.correct).toEqual([]);
                expect(state.guessedLetters.incorrect).toEqual([]);
                expect(state.hintsUsed).toBe(0);
                expect(state.remainingGuesses).toBe(7);
                expect(state.gameStatus).toBe('playing');
                expect(state.currentPokemon).toBeTruthy();
                expect(state.revealedName).toMatch(/^_+$/);
              }

              // Final verification - game should still be fully functional
              const testResult = gameEngine.processLetterGuess('p');
              expect(testResult.isCorrect).toBe(true);
              expect(testResult.gameStatus).toBe('playing');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 15: Session Independence', () => {
      it('should maintain complete independence between consecutive game sessions', async () => {
        /**
         * **Validates: Requirements 6.5**
         * 
         * Property 15: Session Independence
         * For any sequence of consecutive games, data from previous games (guesses, hints, Pokemon selection) 
         * should not affect the current game state
         */
        
        // Generator for multiple game sessions with different activities
        const gameSessionsArbitrary = fc.array(
          fc.record({
            letterGuesses: fc.array(fc.char().filter(c => /[a-zA-Z]/.test(c)), { minLength: 0, maxLength: 8 }),
            hintRequests: fc.integer({ min: 0, max: 3 }),
            completeGame: fc.boolean() // Whether to complete this game session
          }),
          { minLength: 2, maxLength: 5 }
        );

        await fc.assert(
          fc.asyncProperty(
            gameSessionsArbitrary,
            async (sessions) => {
              // Given - a game engine for testing session independence
              const gameEngine = new GameEngineImpl(
                mockPokemonSelector as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              const sessionStates: GameState[] = [];

              // When - playing multiple consecutive game sessions
              for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
                const session = sessions[sessionIndex]!;
                
                // Start new game session
                await gameEngine.startNewGame();
                const initialState = gameEngine.getCurrentState();

                // Then - each session should start with completely clean state
                expect(initialState.guessedLetters.correct).toEqual([]);
                expect(initialState.guessedLetters.incorrect).toEqual([]);
                expect(initialState.hintsUsed).toBe(0);
                expect(initialState.remainingGuesses).toBe(7);
                expect(initialState.gameStatus).toBe('playing');
                expect(initialState.currentPokemon).toBeTruthy();
                expect(initialState.revealedName).toMatch(/^_+$/);

                // Verify no data from previous sessions affects this session
                if (sessionIndex > 0) {
                  const previousState = sessionStates[sessionIndex - 1]!;
                  
                  // Current session should always start fresh regardless of previous session state
                  // These should always be true for a new session, regardless of previous session
                  expect(initialState.remainingGuesses).toBe(7); // Always reset to 7
                  expect(initialState.gameStatus).toBe('playing'); // Always reset to playing
                  expect(initialState.hintsUsed).toBe(0); // Always reset to 0
                  expect(initialState.guessedLetters.correct).toEqual([]); // Always start empty
                  expect(initialState.guessedLetters.incorrect).toEqual([]); // Always start empty
                  
                  // Pokemon selection should be independent (though mock returns same Pokemon)
                  expect(initialState.currentPokemon).toBeTruthy();
                  expect(initialState.revealedName).toMatch(/^_+$/); // Always start with blanks
                  
                  // Verify that the current session is not affected by previous session's final state
                  // If previous session had any activity, current should still start clean
                  if (previousState.guessedLetters.correct.length > 0 || 
                      previousState.guessedLetters.incorrect.length > 0 || 
                      previousState.hintsUsed > 0 || 
                      previousState.remainingGuesses < 7) {
                    // Previous session had activity, but current session should still be clean
                    expect(initialState.guessedLetters.correct.length).toBe(0);
                    expect(initialState.guessedLetters.incorrect.length).toBe(0);
                    expect(initialState.hintsUsed).toBe(0);
                    expect(initialState.remainingGuesses).toBe(7);
                  }
                }

                // Perform session activities
                let currentState = initialState;
                
                // Make letter guesses
                for (const letter of session.letterGuesses.slice(0, 6)) { // Limit to avoid excessive incorrect guesses
                  try {
                    gameEngine.processLetterGuess(letter);
                    currentState = gameEngine.getCurrentState();
                    
                    // Verify game state consistency within session
                    expect(currentState.remainingGuesses).toBeGreaterThanOrEqual(0);
                    expect(currentState.remainingGuesses).toBeLessThanOrEqual(7);
                    
                    if (currentState.gameStatus !== 'playing') {
                      break; // Game completed
                    }
                  } catch {
                    // Ignore errors from duplicate guesses or completed games
                    break;
                  }
                }

                // Make hint requests
                for (let i = 0; i < session.hintRequests && currentState.gameStatus === 'playing'; i++) {
                  try {
                    gameEngine.requestHint();
                    currentState = gameEngine.getCurrentState();
                    
                    if (currentState.gameStatus !== 'playing') {
                      break; // Game completed due to hint cost
                    }
                  } catch {
                    // Ignore errors from completed games or no remaining guesses
                    break;
                  }
                }

                // Optionally complete the game
                if (session.completeGame && currentState.gameStatus === 'playing') {
                  try {
                    // Try to win by guessing all letters
                    const letters = ['p', 'i', 'k', 'a', 'c', 'h', 'u'];
                    for (const letter of letters) {
                      if (currentState.gameStatus === 'playing') {
                        gameEngine.processLetterGuess(letter);
                        currentState = gameEngine.getCurrentState();
                      }
                    }
                  } catch {
                    // Ignore any errors
                  }
                }

                // Store final state of this session
                sessionStates.push(gameEngine.getCurrentState());

                // Verify session state integrity
                const finalSessionState = gameEngine.getCurrentState();
                expect(['playing', 'won', 'lost']).toContain(finalSessionState.gameStatus);
                expect(finalSessionState.remainingGuesses).toBeGreaterThanOrEqual(0);
                expect(finalSessionState.remainingGuesses).toBeLessThanOrEqual(7);
                expect(finalSessionState.hintsUsed).toBeGreaterThanOrEqual(0);
              }

              // Final verification - each session should be completely independent
              for (let i = 1; i < sessionStates.length; i++) {
                const currentSession = sessionStates[i]!;
                const previousSession = sessionStates[i - 1]!;

                // Sessions should not share any mutable state
                // Note: We can't test Pokemon independence with mock, but we verify state independence
                
                // If both sessions have the same game status, their other properties should still be independent
                if (currentSession.gameStatus === previousSession.gameStatus && 
                    currentSession.gameStatus === 'playing') {
                  // Even if both are playing, their guesses and hints should be independent
                  // (This would only be equal by coincidence, not by state leakage)
                }

                // Verify that session boundaries are clean
                // Each session should have started fresh regardless of previous session end state
                expect(typeof currentSession.remainingGuesses).toBe('number');
                expect(typeof currentSession.hintsUsed).toBe('number');
                expect(Array.isArray(currentSession.guessedLetters.correct)).toBe(true);
                expect(Array.isArray(currentSession.guessedLetters.incorrect)).toBe(true);
              }

              // Final functional test - game should still work after all sessions
              await gameEngine.startNewGame();
              const finalTestState = gameEngine.getCurrentState();
              expect(finalTestState.gameStatus).toBe('playing');
              expect(finalTestState.remainingGuesses).toBe(7);
              
              const finalTestResult = gameEngine.processLetterGuess('p');
              expect(finalTestResult.isCorrect).toBe(true);
              expect(finalTestResult.gameStatus).toBe('playing');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should prevent state corruption during rapid session transitions', async () => {
        /**
         * **Validates: Requirements 6.5**
         * 
         * Property 15: Session Independence (Rapid transitions)
         * Rapid session transitions should not cause state corruption or leakage
         */
        
        const rapidTransitionArbitrary = fc.record({
          sessionCount: fc.integer({ min: 5, max: 15 }),
          actionsPerSession: fc.integer({ min: 1, max: 4 })
        });

        await fc.assert(
          fc.asyncProperty(
            rapidTransitionArbitrary,
            async ({ sessionCount, actionsPerSession }) => {
              // Given - a game engine for rapid session testing
              const gameEngine = new GameEngineImpl(
                mockPokemonSelector as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              // When - performing rapid session transitions
              for (let session = 0; session < sessionCount; session++) {
                await gameEngine.startNewGame();
                const sessionStartState = gameEngine.getCurrentState();

                // Then - each session should start clean
                expect(sessionStartState.guessedLetters.correct).toEqual([]);
                expect(sessionStartState.guessedLetters.incorrect).toEqual([]);
                expect(sessionStartState.hintsUsed).toBe(0);
                expect(sessionStartState.remainingGuesses).toBe(7);
                expect(sessionStartState.gameStatus).toBe('playing');
                expect(sessionStartState.currentPokemon).toBeTruthy();
                expect(sessionStartState.revealedName).toMatch(/^_+$/);

                // Perform rapid actions within session
                for (let action = 0; action < actionsPerSession; action++) {
                  try {
                    // Alternate between letter guesses and hints
                    if (action % 2 === 0) {
                      const testLetter = String.fromCharCode(97 + (action % 26)); // 'a', 'b', 'c', etc.
                      gameEngine.processLetterGuess(testLetter);
                    } else {
                      gameEngine.requestHint();
                    }
                    
                    const actionState = gameEngine.getCurrentState();
                    
                    // Verify state consistency during rapid actions
                    expect(actionState.remainingGuesses).toBeGreaterThanOrEqual(0);
                    expect(actionState.remainingGuesses).toBeLessThanOrEqual(7);
                    expect(actionState.hintsUsed).toBeGreaterThanOrEqual(0);
                    expect(['playing', 'won', 'lost']).toContain(actionState.gameStatus);
                    
                    if (actionState.gameStatus !== 'playing') {
                      break; // Session completed
                    }
                  } catch {
                    // Ignore errors from completed games or invalid actions
                    break;
                  }
                }

                // Verify session integrity before next transition
                const sessionEndState = gameEngine.getCurrentState();
                expect(sessionEndState.remainingGuesses).toBeGreaterThanOrEqual(0);
                expect(sessionEndState.hintsUsed).toBeGreaterThanOrEqual(0);
                expect(sessionEndState.currentPokemon).toBeTruthy();
              }

              // Final verification - game should still be functional after rapid transitions
              await gameEngine.startNewGame();
              const finalState = gameEngine.getCurrentState();
              
              expect(finalState.guessedLetters.correct).toEqual([]);
              expect(finalState.guessedLetters.incorrect).toEqual([]);
              expect(finalState.hintsUsed).toBe(0);
              expect(finalState.remainingGuesses).toBe(7);
              expect(finalState.gameStatus).toBe('playing');

              // Test functionality
              const functionalTest = gameEngine.processLetterGuess('p');
              expect(functionalTest.isCorrect).toBe(true);
              expect(functionalTest.gameStatus).toBe('playing');
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should maintain independence across different game completion scenarios', async () => {
        /**
         * **Validates: Requirements 6.5**
         * 
         * Property 15: Session Independence (Completion scenarios)
         * Session independence should be maintained regardless of how previous sessions ended
         */
        
        const completionScenariosArbitrary = fc.array(
          fc.oneof(
            fc.constant('win'),
            fc.constant('lose'),
            fc.constant('abandon') // Start but don't complete
          ),
          { minLength: 3, maxLength: 6 }
        );

        await fc.assert(
          fc.asyncProperty(
            completionScenariosArbitrary,
            async (scenarios) => {
              // Given - a game engine for testing different completion scenarios
              const gameEngine = new GameEngineImpl(
                mockPokemonSelector as any,
                new LetterRevealerImpl(),
                new HintSystemImpl(),
                new GameStateManager()
              );

              const completionStates: { scenario: string; finalState: GameState }[] = [];

              // When - playing sessions with different completion scenarios
              for (const scenario of scenarios) {
                await gameEngine.startNewGame();
                const startState = gameEngine.getCurrentState();

                // Then - each session should start independently
                expect(startState.guessedLetters.correct).toEqual([]);
                expect(startState.guessedLetters.incorrect).toEqual([]);
                expect(startState.hintsUsed).toBe(0);
                expect(startState.remainingGuesses).toBe(7);
                expect(startState.gameStatus).toBe('playing');

                // Execute the scenario
                let finalState: GameState;
                
                if (scenario === 'win') {
                  // Complete the game by guessing all letters
                  const letters = ['p', 'i', 'k', 'a', 'c', 'h', 'u'];
                  for (const letter of letters) {
                    gameEngine.processLetterGuess(letter);
                  }
                  finalState = gameEngine.getCurrentState();
                  expect(finalState.gameStatus).toBe('won');
                  
                } else if (scenario === 'lose') {
                  // Lose the game by making 7 incorrect guesses
                  const incorrectLetters = ['z', 'x', 'w', 'v', 'q', 'j', 'b'];
                  for (const letter of incorrectLetters) {
                    gameEngine.processLetterGuess(letter);
                  }
                  finalState = gameEngine.getCurrentState();
                  expect(finalState.gameStatus).toBe('lost');
                  expect(finalState.remainingGuesses).toBe(0);
                  
                } else { // abandon
                  // Make some progress but don't complete
                  gameEngine.processLetterGuess('p'); // Correct guess
                  gameEngine.processLetterGuess('z'); // Incorrect guess
                  gameEngine.requestHint(); // Use a hint
                  finalState = gameEngine.getCurrentState();
                  expect(finalState.gameStatus).toBe('playing');
                }

                completionStates.push({ scenario, finalState });

                // Verify state consistency for this scenario
                expect(finalState.remainingGuesses).toBeGreaterThanOrEqual(0);
                expect(finalState.remainingGuesses).toBeLessThanOrEqual(7);
                expect(finalState.hintsUsed).toBeGreaterThanOrEqual(0);
                expect(['playing', 'won', 'lost']).toContain(finalState.gameStatus);
              }

              // Verify that each new session was independent of previous completion state
              for (let i = 1; i < completionStates.length; i++) {
                // Start a new session after the current one to verify independence
                await gameEngine.startNewGame();
                const newSessionState = gameEngine.getCurrentState();

                // New session should be clean regardless of how previous session ended
                expect(newSessionState.guessedLetters.correct).toEqual([]);
                expect(newSessionState.guessedLetters.incorrect).toEqual([]);
                expect(newSessionState.hintsUsed).toBe(0);
                expect(newSessionState.remainingGuesses).toBe(7);
                expect(newSessionState.gameStatus).toBe('playing');
                expect(newSessionState.currentPokemon).toBeTruthy();
                expect(newSessionState.revealedName).toMatch(/^_+$/);

                // Verify the new session is functional regardless of previous scenario
                const testGuess = gameEngine.processLetterGuess('p');
                expect(testGuess.isCorrect).toBe(true);
                expect(testGuess.gameStatus).toBe('playing');
                expect(testGuess.remainingGuesses).toBe(7); // Correct guess doesn't decrease counter
              }

              // Final comprehensive independence test
              await gameEngine.startNewGame();
              const ultimateTestState = gameEngine.getCurrentState();
              
              // Should be completely clean regardless of all previous scenarios
              expect(ultimateTestState.guessedLetters.correct).toEqual([]);
              expect(ultimateTestState.guessedLetters.incorrect).toEqual([]);
              expect(ultimateTestState.hintsUsed).toBe(0);
              expect(ultimateTestState.remainingGuesses).toBe(7);
              expect(ultimateTestState.gameStatus).toBe('playing');
              expect(ultimateTestState.currentPokemon).toBeTruthy();
              expect(ultimateTestState.revealedName).toMatch(/^_+$/);

              // Verify full functionality
              const ultimateTest = gameEngine.processLetterGuess('i');
              expect(ultimateTest.isCorrect).toBe(true);
              expect(ultimateTest.gameStatus).toBe('playing');
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});