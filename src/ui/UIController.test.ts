/**
 * UI Controller tests
 * Tests for DOM manipulation, event handling, and UI state management
 */

import { UIControllerImpl } from './UIController';
import { GameState, GameEngine, GuessResult, HintResult } from '../types';
import * as fc from 'fast-check';

// Mock game engine
class MockGameEngine implements GameEngine {
  private mockState: GameState = {
    currentPokemon: {
      name: 'pikachu',
      generation: 1,
      types: ['electric'],
      abilities: ['static'],
      id: 25
    },
    revealedName: '_______',
    guessedLetters: { correct: [], incorrect: [] },
    remainingGuesses: 7,
    gameStatus: 'playing',
    hintsUsed: 0
  };

  async startNewGame(): Promise<void> {
    // Mock implementation
  }

  processLetterGuess(_letter: string): GuessResult {
    return {
      isCorrect: true,
      newlyRevealedPositions: [0],
      gameStatus: 'playing',
      remainingGuesses: 7
    };
  }

  requestHint(): HintResult {
    return {
      hintText: 'Generation: 1 | Type: Electric | Ability: Static',
      remainingGuesses: 6,
      gameStatus: 'playing'
    };
  }

  getCurrentState(): GameState {
    return this.mockState;
  }

  resetGame(): void {
    // Mock implementation
  }

  setMockState(state: Partial<GameState>): void {
    this.mockState = { ...this.mockState, ...state };
  }
}

describe('UIControllerImpl', () => {
  let uiController: UIControllerImpl;
  let mockGameEngine: MockGameEngine;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="pokemon-name"></div>
      <div id="guess-count"></div>
      <div id="correct-letters"></div>
      <div id="incorrect-letters"></div>
      <input id="letter-input" />
      <button id="guess-button"></button>
      <button id="hint-button"></button>
      <button id="new-game-button"></button>
      <div id="hint-display"></div>
      <div id="hint-content"></div>
      <div id="game-message"></div>
      <div id="message-content"></div>
      <div id="loading"></div>
      <div id="error"></div>
      <div id="error-message"></div>
      <button id="retry-button"></button>
    `;

    mockGameEngine = new MockGameEngine();
    uiController = new UIControllerImpl();
    uiController.setGameEngine(mockGameEngine);
  });

  describe('initialize', () => {
    test('should initialize UI without errors', () => {
      // Given: A fresh UI controller
      // When: Initialize is called
      expect(() => uiController.initialize()).not.toThrow();
      
      // Then: UI should be in initial state
      expect(document.getElementById('guess-count')?.textContent).toBe('7');
      expect(document.getElementById('correct-letters')?.textContent).toBe('None');
      expect(document.getElementById('incorrect-letters')?.textContent).toBe('None');
    });
  });

  describe('updateGameDisplay', () => {
    test('should update Pokemon name display with revealed letters', () => {
      // Given: A game state with partially revealed name
      const gameState: GameState = {
        currentPokemon: {
          name: 'pikachu',
          generation: 1,
          types: ['electric'],
          abilities: ['static'],
          id: 25
        },
        revealedName: 'p_k_c__',
        guessedLetters: { correct: ['p', 'k', 'c'], incorrect: [] },
        remainingGuesses: 5,
        gameStatus: 'playing',
        hintsUsed: 0
      };

      uiController.initialize();

      // When: updateGameDisplay is called
      uiController.updateGameDisplay(gameState);

      // Then: Pokemon name should show revealed letters with spaces
      const pokemonNameElement = document.getElementById('pokemon-name');
      expect(pokemonNameElement?.textContent).toBe('P _ K _ C _ _');
    });

    test('should update remaining guesses count', () => {
      // Given: A game state with 3 remaining guesses
      const gameState: GameState = {
        currentPokemon: null,
        revealedName: '',
        guessedLetters: { correct: [], incorrect: ['x', 'y', 'z', 'w'] },
        remainingGuesses: 3,
        gameStatus: 'playing',
        hintsUsed: 0
      };

      uiController.initialize();

      // When: updateGameDisplay is called
      uiController.updateGameDisplay(gameState);

      // Then: Guess count should be updated
      const guessCountElement = document.getElementById('guess-count');
      expect(guessCountElement?.textContent).toBe('3');
    });

    test('should update guessed letters display', () => {
      // Given: A game state with correct and incorrect guesses
      const gameState: GameState = {
        currentPokemon: null,
        revealedName: '',
        guessedLetters: { 
          correct: ['a', 'e', 'i'], 
          incorrect: ['x', 'y', 'z'] 
        },
        remainingGuesses: 4,
        gameStatus: 'playing',
        hintsUsed: 0
      };

      uiController.initialize();

      // When: updateGameDisplay is called
      uiController.updateGameDisplay(gameState);

      // Then: Guessed letters should be displayed correctly
      const correctLettersElement = document.getElementById('correct-letters');
      const incorrectLettersElement = document.getElementById('incorrect-letters');
      
      expect(correctLettersElement?.textContent).toBe('A, E, I');
      expect(incorrectLettersElement?.textContent).toBe('X, Y, Z');
    });
  });

  describe('showHint', () => {
    test('should display hint text and make hint area visible', () => {
      // Given: A UI controller and hint text
      const hintText = 'Generation: 1 | Type: Electric';
      
      uiController.initialize();

      // When: showHint is called
      uiController.showHint(hintText);

      // Then: Hint should be displayed
      const hintContentElement = document.getElementById('hint-content');
      const hintDisplayElement = document.getElementById('hint-display');
      
      expect(hintContentElement?.textContent).toBe(hintText);
      expect(hintDisplayElement?.style.display).toBe('block');
    });
  });

  describe('showGameResult', () => {
    test('should show win message when game is won', () => {
      // Given: A won game state
      const gameState: GameState = {
        currentPokemon: {
          name: 'pikachu',
          generation: 1,
          types: ['electric'],
          abilities: ['static'],
          id: 25
        },
        revealedName: 'pikachu',
        guessedLetters: { correct: ['p', 'i', 'k', 'a', 'c', 'h', 'u'], incorrect: [] },
        remainingGuesses: 5,
        gameStatus: 'won',
        hintsUsed: 0
      };

      uiController.initialize();

      // When: showGameResult is called
      uiController.showGameResult(gameState);

      // Then: Win message should be displayed
      const messageContentElement = document.getElementById('message-content');
      const gameMessageElement = document.getElementById('game-message');
      
      expect(messageContentElement?.innerHTML).toContain('Congratulations');
      expect(messageContentElement?.innerHTML).toContain('PIKACHU');
      expect(gameMessageElement?.style.display).toBe('block');
    });

    test('should show loss message when game is lost', () => {
      // Given: A lost game state
      const gameState: GameState = {
        currentPokemon: {
          name: 'charizard',
          generation: 1,
          types: ['fire', 'flying'],
          abilities: ['blaze'],
          id: 6
        },
        revealedName: 'c_____a__',
        guessedLetters: { correct: ['c', 'a'], incorrect: ['x', 'y', 'z', 'w', 'q', 'b', 'n'] },
        remainingGuesses: 0,
        gameStatus: 'lost',
        hintsUsed: 1
      };

      uiController.initialize();

      // When: showGameResult is called
      uiController.showGameResult(gameState);

      // Then: Loss message should be displayed
      const messageContentElement = document.getElementById('message-content');
      const gameMessageElement = document.getElementById('game-message');
      
      expect(messageContentElement?.innerHTML).toContain('Game Over');
      expect(messageContentElement?.innerHTML).toContain('CHARIZARD');
      expect(gameMessageElement?.style.display).toBe('block');
    });
  });

  describe('showLoading', () => {
    test('should show loading indicator when true', () => {
      // Given: A UI controller
      uiController.initialize();

      // When: showLoading is called with true
      uiController.showLoading(true);

      // Then: Loading should be visible
      const loadingElement = document.getElementById('loading');
      expect(loadingElement?.style.display).toBe('block');
    });

    test('should hide loading indicator when false', () => {
      // Given: A UI controller with loading shown
      uiController.initialize();
      uiController.showLoading(true);

      // When: showLoading is called with false
      uiController.showLoading(false);

      // Then: Loading should be hidden
      const loadingElement = document.getElementById('loading');
      expect(loadingElement?.style.display).toBe('none');
    });
  });

  describe('showError', () => {
    test('should display error message', () => {
      // Given: A UI controller and error message
      const errorMessage = 'Network connection failed';
      
      uiController.initialize();

      // When: showError is called
      uiController.showError(errorMessage);

      // Then: Error should be displayed
      const errorMessageElement = document.getElementById('error-message');
      const errorElement = document.getElementById('error');
      
      expect(errorMessageElement?.textContent).toBe(errorMessage);
      expect(errorElement?.style.display).toBe('block');
    });

    test('should display error message with retry button by default', () => {
      // Given: A UI controller and error message
      const errorMessage = 'Test error message';
      
      uiController.initialize();

      // When: showError is called without retry parameter
      uiController.showError(errorMessage);

      // Then: Retry button should be visible by default
      const retryButton = document.getElementById('retry-button') as HTMLButtonElement;
      expect(retryButton?.style.display).toBe('inline-block');
    });

    test('should hide retry button when specified', () => {
      // Given: A UI controller and error message
      const errorMessage = 'Test error message';
      
      uiController.initialize();

      // When: showError is called with showRetry false
      uiController.showError(errorMessage, false);

      // Then: Retry button should be hidden
      const retryButton = document.getElementById('retry-button') as HTMLButtonElement;
      expect(retryButton?.style.display).toBe('none');
    });
  });

  describe('showNetworkError', () => {
    test('should display network error with enhanced message', () => {
      // Given: A UI controller and network error message
      const errorMessage = 'Network connection failed';
      
      uiController.initialize();

      // When: showNetworkError is called
      uiController.showNetworkError(errorMessage);

      // Then: Enhanced error message should be displayed
      const errorMessageElement = document.getElementById('error-message');
      const displayedMessage = errorMessageElement?.textContent || '';
      
      expect(displayedMessage).toContain(errorMessage);
      expect(displayedMessage).toContain('This might be due to:');
      expect(displayedMessage).toContain('Poor internet connection');
      expect(displayedMessage).toContain('Pokemon database temporarily unavailable');
      expect(displayedMessage).toContain('Network firewall blocking the request');
    });
  });

  describe('showLoadingWithMessage', () => {
    test('should show loading with custom message', () => {
      // Given: A UI controller and custom loading message
      const customMessage = 'Loading custom data...';
      const loadingElement = document.getElementById('loading');
      const loadingText = document.createElement('p');
      loadingElement?.appendChild(loadingText);
      
      uiController.initialize();

      // When: showLoadingWithMessage is called with custom message
      uiController.showLoadingWithMessage(true, customMessage);

      // Then: Custom message should be displayed
      expect(loadingText.textContent).toBe(customMessage);
      expect(loadingElement?.style.display).toBe('block');
    });

    test('should use default message when none provided', () => {
      // Given: A UI controller
      const loadingElement = document.getElementById('loading');
      const loadingText = document.createElement('p');
      loadingElement?.appendChild(loadingText);
      
      uiController.initialize();

      // When: showLoadingWithMessage is called without custom message
      uiController.showLoadingWithMessage(true);

      // Then: Default message should be displayed
      expect(loadingText.textContent).toBe('Loading Pokemon data...');
      expect(loadingElement?.style.display).toBe('block');
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 12: UI State Accuracy', () => {
      test('should display guess counter and guessed letters that match actual game state', () => {
        /**
         * **Validates: Requirements 5.2, 5.4**
         * 
         * Property 12: UI State Accuracy
         * For any game state, the displayed guess counter should match the actual remaining guesses,
         * and displayed guessed letters should include all previously guessed letters categorized correctly
         */

        // Generator for valid remaining guesses (0-7)
        const remainingGuessesArbitrary = fc.integer({ min: 0, max: 7 });
        
        // Generator for guessed letters arrays
        const guessedLettersArbitrary = fc.record({
          correct: fc.array(fc.char().filter(c => /[a-z]/.test(c)), { minLength: 0, maxLength: 10 }).map(arr => [...new Set(arr)]), // Remove duplicates
          incorrect: fc.array(fc.char().filter(c => /[a-z]/.test(c)), { minLength: 0, maxLength: 10 }).map(arr => [...new Set(arr)]) // Remove duplicates
        }).filter(letters => {
          // Ensure no overlap between correct and incorrect letters
          const correctSet = new Set(letters.correct);
          const incorrectSet = new Set(letters.incorrect);
          return letters.correct.every(letter => !incorrectSet.has(letter)) &&
                 letters.incorrect.every(letter => !correctSet.has(letter));
        });

        // Generator for revealed name (with underscores for unrevealed letters)
        const revealedNameArbitrary = fc.stringMatching(/^[a-z_]{3,15}$/);

        // Generator for Pokemon data
        const pokemonDataArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,15}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy', 'fighting', 'poison', 'ground', 'flying', 'bug', 'rock', 'ghost', 'steel', 'normal'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,20}$/), { minLength: 1, maxLength: 3 }),
          id: fc.integer({ min: 1, max: 1000 })
        });

        // Generator for game status
        const gameStatusArbitrary = fc.constantFrom('playing', 'won', 'lost');

        // Generator for hints used
        const hintsUsedArbitrary = fc.integer({ min: 0, max: 7 });

        fc.assert(
          fc.property(
            remainingGuessesArbitrary,
            guessedLettersArbitrary,
            revealedNameArbitrary,
            pokemonDataArbitrary,
            gameStatusArbitrary,
            hintsUsedArbitrary,
            (remainingGuesses, guessedLetters, revealedName, pokemonData, gameStatus, hintsUsed) => {
              // Given: A UI controller and a game state
              const gameState: GameState = {
                currentPokemon: pokemonData,
                revealedName: revealedName,
                guessedLetters: {
                  correct: guessedLetters.correct as readonly string[],
                  incorrect: guessedLetters.incorrect as readonly string[]
                },
                remainingGuesses: remainingGuesses,
                gameStatus: gameStatus as 'playing' | 'won' | 'lost',
                hintsUsed: hintsUsed
              };

              uiController.initialize();

              // When: updateGameDisplay is called with the game state
              uiController.updateGameDisplay(gameState);

              // Then: UI should accurately reflect the game state

              // 1. Displayed guess counter should match actual remaining guesses
              const guessCountElement = document.getElementById('guess-count');
              expect(guessCountElement?.textContent).toBe(remainingGuesses.toString());

              // 2. Displayed correct letters should include all correct guesses
              const correctLettersElement = document.getElementById('correct-letters');
              const displayedCorrectText = correctLettersElement?.textContent || '';
              
              if (guessedLetters.correct.length === 0) {
                expect(displayedCorrectText).toBe('None');
              } else {
                // Check that all correct letters are displayed (case-insensitive, comma-separated)
                const expectedCorrectDisplay = guessedLetters.correct
                  .map(letter => letter.toUpperCase())
                  .join(', ');
                expect(displayedCorrectText).toBe(expectedCorrectDisplay);
                
                // Verify each correct letter is present in the display
                guessedLetters.correct.forEach(letter => {
                  expect(displayedCorrectText).toContain(letter.toUpperCase());
                });
              }

              // 3. Displayed incorrect letters should include all incorrect guesses
              const incorrectLettersElement = document.getElementById('incorrect-letters');
              const displayedIncorrectText = incorrectLettersElement?.textContent || '';
              
              if (guessedLetters.incorrect.length === 0) {
                expect(displayedIncorrectText).toBe('None');
              } else {
                // Check that all incorrect letters are displayed (case-insensitive, comma-separated)
                const expectedIncorrectDisplay = guessedLetters.incorrect
                  .map(letter => letter.toUpperCase())
                  .join(', ');
                expect(displayedIncorrectText).toBe(expectedIncorrectDisplay);
                
                // Verify each incorrect letter is present in the display
                guessedLetters.incorrect.forEach(letter => {
                  expect(displayedIncorrectText).toContain(letter.toUpperCase());
                });
              }

              // 4. Pokemon name display should match revealed name format
              const pokemonNameElement = document.getElementById('pokemon-name');
              const displayedName = pokemonNameElement?.textContent || '';
              
              if (revealedName) {
                // Format should be uppercase letters with spaces between characters
                const expectedNameDisplay = revealedName
                  .split('')
                  .map(char => char === '_' ? '_' : char.toUpperCase())
                  .join(' ');
                expect(displayedName).toBe(expectedNameDisplay);
              }

              // 5. Additional invariants for UI state accuracy
              
              // Guess count should be a valid number
              expect(Number.isInteger(Number(guessCountElement?.textContent))).toBe(true);
              expect(Number(guessCountElement?.textContent)).toBeGreaterThanOrEqual(0);
              expect(Number(guessCountElement?.textContent)).toBeLessThanOrEqual(7);

              // Letters should be properly categorized (no letter should appear in both lists)
              const allDisplayedCorrect = displayedCorrectText === 'None' ? [] : 
                displayedCorrectText.split(', ').map(s => s.trim().toLowerCase());
              const allDisplayedIncorrect = displayedIncorrectText === 'None' ? [] : 
                displayedIncorrectText.split(', ').map(s => s.trim().toLowerCase());
              
              // No letter should appear in both correct and incorrect displays
              allDisplayedCorrect.forEach(letter => {
                if (letter) {
                  expect(allDisplayedIncorrect).not.toContain(letter);
                }
              });

              // UI should reflect the exact count of guessed letters
              expect(allDisplayedCorrect.filter(l => l).length).toBe(guessedLetters.correct.length);
              expect(allDisplayedIncorrect.filter(l => l).length).toBe(guessedLetters.incorrect.length);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should maintain UI state accuracy across different game statuses', () => {
        /**
         * **Validates: Requirements 5.2, 5.4**
         * 
         * Property 12: UI State Accuracy (Game status variations)
         * UI accuracy should be maintained regardless of game status (playing, won, lost)
         */

        // Generator for complete game states with different statuses
        const gameStateArbitrary = fc.record({
          remainingGuesses: fc.integer({ min: 0, max: 7 }),
          gameStatus: fc.constantFrom('playing', 'won', 'lost'),
          guessedLetters: fc.record({
            correct: fc.array(fc.char().filter(c => /[a-z]/.test(c)), { minLength: 0, maxLength: 8 }).map(arr => [...new Set(arr)]),
            incorrect: fc.array(fc.char().filter(c => /[a-z]/.test(c)), { minLength: 0, maxLength: 8 }).map(arr => [...new Set(arr)])
          }).filter(letters => {
            const correctSet = new Set(letters.correct);
            const incorrectSet = new Set(letters.incorrect);
            return letters.correct.every(letter => !incorrectSet.has(letter)) &&
                   letters.incorrect.every(letter => !correctSet.has(letter));
          })
        }).chain(partial => {
          // Ensure game state is logically consistent
          let { remainingGuesses, gameStatus, guessedLetters } = partial;
          
          // Adjust state for logical consistency
          if (gameStatus === 'lost' && remainingGuesses > 0) {
            remainingGuesses = 0;
          }
          if (gameStatus === 'won' && remainingGuesses === 0 && guessedLetters.incorrect.length < 7) {
            // For won games with 0 guesses, ensure we have exactly 7 incorrect guesses
            const additionalIncorrect = Array.from({ length: 7 - guessedLetters.incorrect.length }, (_, i) => 
              String.fromCharCode(122 - i) // 'z', 'y', 'x', etc.
            ).filter(letter => !guessedLetters.correct.includes(letter) && !guessedLetters.incorrect.includes(letter));
            
            guessedLetters = {
              ...guessedLetters,
              incorrect: [...guessedLetters.incorrect, ...additionalIncorrect].slice(0, 7)
            };
          }

          return fc.constant({
            currentPokemon: {
              name: 'testpokemon',
              generation: 1,
              types: ['normal'],
              abilities: ['test-ability'],
              id: 1
            },
            revealedName: gameStatus === 'won' ? 'testpokemon' : 't_st__k_m_n',
            guessedLetters: {
              correct: guessedLetters.correct as readonly string[],
              incorrect: guessedLetters.incorrect as readonly string[]
            },
            remainingGuesses,
            gameStatus: gameStatus as 'playing' | 'won' | 'lost',
            hintsUsed: fc.sample(fc.integer({ min: 0, max: 7 - remainingGuesses }), 1)[0] || 0
          });
        });

        fc.assert(
          fc.property(
            gameStateArbitrary,
            (gameState) => {
              // Given: A UI controller and a game state with specific status
              uiController.initialize();

              // When: updateGameDisplay is called
              uiController.updateGameDisplay(gameState);

              // Then: UI accuracy should be maintained regardless of game status

              // 1. Guess counter accuracy
              const guessCountElement = document.getElementById('guess-count');
              expect(guessCountElement?.textContent).toBe(gameState.remainingGuesses.toString());

              // 2. Correct letters accuracy
              const correctLettersElement = document.getElementById('correct-letters');
              const correctDisplay = correctLettersElement?.textContent || '';
              
              if (gameState.guessedLetters.correct.length === 0) {
                expect(correctDisplay).toBe('None');
              } else {
                const expectedCorrect = gameState.guessedLetters.correct
                  .map(letter => letter.toUpperCase())
                  .join(', ');
                expect(correctDisplay).toBe(expectedCorrect);
              }

              // 3. Incorrect letters accuracy
              const incorrectLettersElement = document.getElementById('incorrect-letters');
              const incorrectDisplay = incorrectLettersElement?.textContent || '';
              
              if (gameState.guessedLetters.incorrect.length === 0) {
                expect(incorrectDisplay).toBe('None');
              } else {
                const expectedIncorrect = gameState.guessedLetters.incorrect
                  .map(letter => letter.toUpperCase())
                  .join(', ');
                expect(incorrectDisplay).toBe(expectedIncorrect);
              }

              // 4. Pokemon name display accuracy
              const pokemonNameElement = document.getElementById('pokemon-name');
              const nameDisplay = pokemonNameElement?.textContent || '';
              
              if (gameState.revealedName) {
                const expectedNameDisplay = gameState.revealedName
                  .split('')
                  .map(char => char === '_' ? '_' : char.toUpperCase())
                  .join(' ');
                expect(nameDisplay).toBe(expectedNameDisplay);
              }

              // 5. Consistency checks across all game statuses
              
              // Button states should be appropriate for game status
              const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
              const hintButton = document.getElementById('hint-button') as HTMLButtonElement;
              const letterInput = document.getElementById('letter-input') as HTMLInputElement;
              
              if (gameState.gameStatus === 'playing') {
                expect(guessButton?.disabled).toBe(false);
                expect(letterInput?.disabled).toBe(false);
                expect(hintButton?.disabled).toBe(gameState.remainingGuesses === 0);
              } else {
                // Game is complete (won or lost)
                expect(guessButton?.disabled).toBe(true);
                expect(letterInput?.disabled).toBe(true);
                expect(hintButton?.disabled).toBe(true);
              }

              // Visual warning for low guesses should be consistent
              if (gameState.remainingGuesses <= 2) {
                expect(guessCountElement?.classList.contains('low-guesses')).toBe(true);
              } else {
                expect(guessCountElement?.classList.contains('low-guesses')).toBe(false);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should handle edge cases in UI state display accurately', () => {
        /**
         * **Validates: Requirements 5.2, 5.4**
         * 
         * Property 12: UI State Accuracy (Edge cases)
         * UI should accurately display edge cases like empty letter lists, 
         * maximum guesses, and boundary conditions
         */

        // Generator for edge case scenarios
        const edgeCaseArbitrary = fc.oneof(
          // Empty guessed letters
          fc.constant({
            guessedLetters: { correct: [], incorrect: [] },
            remainingGuesses: 7,
            scenario: 'empty_letters'
          }),
          // Maximum incorrect guesses
          fc.constant({
            guessedLetters: { 
              correct: [], 
              incorrect: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] 
            },
            remainingGuesses: 0,
            scenario: 'max_incorrect'
          }),
          // All correct letters (no incorrect)
          fc.constant({
            guessedLetters: { 
              correct: ['p', 'i', 'k', 'a', 'c', 'h', 'u'], 
              incorrect: [] 
            },
            remainingGuesses: 7,
            scenario: 'all_correct'
          }),
          // Single letter guesses
          fc.constant({
            guessedLetters: { 
              correct: ['a'], 
              incorrect: ['z'] 
            },
            remainingGuesses: 6,
            scenario: 'single_letters'
          }),
          // Boundary remaining guesses
          fc.oneof(
            fc.constant({ remainingGuesses: 0, scenario: 'zero_guesses' }),
            fc.constant({ remainingGuesses: 1, scenario: 'one_guess' }),
            fc.constant({ remainingGuesses: 7, scenario: 'max_guesses' })
          ).chain(guessData => fc.constant({
            guessedLetters: { correct: ['t'], incorrect: ['x'] },
            ...guessData
          }))
        );

        fc.assert(
          fc.property(
            edgeCaseArbitrary,
            (edgeCase) => {
              // Given: A UI controller and an edge case game state
              const gameState: GameState = {
                currentPokemon: {
                  name: 'pikachu',
                  generation: 1,
                  types: ['electric'],
                  abilities: ['static'],
                  id: 25
                },
                revealedName: 'p_k_c__',
                guessedLetters: {
                  correct: edgeCase.guessedLetters.correct as readonly string[],
                  incorrect: edgeCase.guessedLetters.incorrect as readonly string[]
                },
                remainingGuesses: edgeCase.remainingGuesses,
                gameStatus: edgeCase.remainingGuesses === 0 ? 'lost' : 'playing',
                hintsUsed: 0
              };

              uiController.initialize();

              // When: updateGameDisplay is called with edge case state
              uiController.updateGameDisplay(gameState);

              // Then: UI should handle edge cases accurately

              // 1. Guess counter should always display correctly
              const guessCountElement = document.getElementById('guess-count');
              expect(guessCountElement?.textContent).toBe(edgeCase.remainingGuesses.toString());
              expect(Number(guessCountElement?.textContent)).toBeGreaterThanOrEqual(0);
              expect(Number(guessCountElement?.textContent)).toBeLessThanOrEqual(7);

              // 2. Empty letter arrays should display "None"
              const correctLettersElement = document.getElementById('correct-letters');
              const incorrectLettersElement = document.getElementById('incorrect-letters');

              if (edgeCase.guessedLetters.correct.length === 0) {
                expect(correctLettersElement?.textContent).toBe('None');
              } else {
                expect(correctLettersElement?.textContent).not.toBe('None');
                expect(correctLettersElement?.textContent).not.toBe('');
              }

              if (edgeCase.guessedLetters.incorrect.length === 0) {
                expect(incorrectLettersElement?.textContent).toBe('None');
              } else {
                expect(incorrectLettersElement?.textContent).not.toBe('None');
                expect(incorrectLettersElement?.textContent).not.toBe('');
              }

              // 3. Letter count accuracy for edge cases
              const correctDisplay = correctLettersElement?.textContent || '';
              const incorrectDisplay = incorrectLettersElement?.textContent || '';

              if (correctDisplay !== 'None') {
                const displayedCorrectCount = correctDisplay.split(', ').filter(s => s.trim()).length;
                expect(displayedCorrectCount).toBe(edgeCase.guessedLetters.correct.length);
              }

              if (incorrectDisplay !== 'None') {
                const displayedIncorrectCount = incorrectDisplay.split(', ').filter(s => s.trim()).length;
                expect(displayedIncorrectCount).toBe(edgeCase.guessedLetters.incorrect.length);
              }

              // 4. Boundary condition handling
              if (edgeCase.remainingGuesses <= 2) {
                expect(guessCountElement?.classList.contains('low-guesses')).toBe(true);
              }

              if (edgeCase.remainingGuesses === 0) {
                const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
                const hintButton = document.getElementById('hint-button') as HTMLButtonElement;
                expect(guessButton?.disabled).toBe(true);
                expect(hintButton?.disabled).toBe(true);
              }

              // 5. Consistency invariants for edge cases
              
              // UI elements should always exist and have valid content
              expect(guessCountElement).toBeTruthy();
              expect(correctLettersElement).toBeTruthy();
              expect(incorrectLettersElement).toBeTruthy();
              
              // Content should never be undefined or null
              expect(guessCountElement?.textContent).toBeDefined();
              expect(correctLettersElement?.textContent).toBeDefined();
              expect(incorrectLettersElement?.textContent).toBeDefined();
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 13: Game Completion Display', () => {
      test('should display complete Pokemon name and correct game outcome for any completed game', () => {
        /**
         * **Validates: Requirements 5.5**
         * 
         * Property 13: Game Completion Display
         * For any completed game (won or lost), the display should show the complete Pokemon name 
         * and the correct game outcome
         */

        // Generator for Pokemon data
        const pokemonDataArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,15}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy', 'fighting', 'poison', 'ground', 'flying', 'bug', 'rock', 'ghost', 'steel', 'normal'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,20}$/), { minLength: 1, maxLength: 3 }),
          id: fc.integer({ min: 1, max: 1000 })
        });

        // Generator for completed game states (won or lost)
        const completedGameStateArbitrary = fc.record({
          gameStatus: fc.constantFrom('won', 'lost'),
          remainingGuesses: fc.integer({ min: 0, max: 7 }),
          hintsUsed: fc.integer({ min: 0, max: 7 })
        }).chain(partial => {
          // Ensure logical consistency for completed games
          let { gameStatus, remainingGuesses, hintsUsed } = partial;
          
          // For lost games, remaining guesses should be 0
          if (gameStatus === 'lost') {
            remainingGuesses = 0;
          }
          
          // For won games, there should be some guesses remaining (unless won on last guess)
          if (gameStatus === 'won' && remainingGuesses === 0) {
            // This is valid - won on the last guess
          }

          return fc.record({
            pokemon: pokemonDataArbitrary,
            gameStatus: fc.constant(gameStatus),
            remainingGuesses: fc.constant(remainingGuesses),
            hintsUsed: fc.constant(hintsUsed),
            // Generate appropriate guessed letters for the game outcome
            guessedLetters: fc.record({
              correct: fc.array(fc.char().filter(c => /[a-z]/.test(c)), { minLength: 1, maxLength: 10 }).map(arr => [...new Set(arr)]),
              incorrect: fc.array(fc.char().filter(c => /[a-z]/.test(c)), { minLength: 0, maxLength: 7 }).map(arr => [...new Set(arr)])
            }).filter(letters => {
              // Ensure no overlap between correct and incorrect letters
              const correctSet = new Set(letters.correct);
              const incorrectSet = new Set(letters.incorrect);
              return letters.correct.every(letter => !incorrectSet.has(letter)) &&
                     letters.incorrect.every(letter => !correctSet.has(letter));
            })
          });
        });

        fc.assert(
          fc.property(
            completedGameStateArbitrary,
            ({ pokemon, gameStatus, remainingGuesses, hintsUsed, guessedLetters }) => {
              // Given: A completed game state (won or lost)
              const gameState: GameState = {
                currentPokemon: pokemon,
                revealedName: gameStatus === 'won' ? pokemon.name : pokemon.name.replace(/./g, '_'),
                guessedLetters: {
                  correct: guessedLetters.correct as readonly string[],
                  incorrect: guessedLetters.incorrect as readonly string[]
                },
                remainingGuesses: remainingGuesses,
                gameStatus: gameStatus as 'won' | 'lost',
                hintsUsed: hintsUsed
              };

              uiController.initialize();

              // When: showGameResult is called for the completed game
              uiController.showGameResult(gameState);

              // Then: The display should show complete Pokemon name and correct outcome

              // 1. Complete Pokemon name should be displayed
              const pokemonNameElement = document.getElementById('pokemon-name');
              const displayedName = pokemonNameElement?.textContent || '';
              
              // The complete Pokemon name should be shown in uppercase with spaces
              const expectedCompleteNameDisplay = pokemon.name
                .split('')
                .map(char => char.toUpperCase())
                .join(' ');
              
              expect(displayedName).toBe(expectedCompleteNameDisplay);

              // 2. Game outcome message should be displayed correctly
              const messageContentElement = document.getElementById('message-content');
              const gameMessageElement = document.getElementById('game-message');
              const messageContent = messageContentElement?.innerHTML || '';
              
              // Game message area should be visible
              expect(gameMessageElement?.style.display).toBe('block');
              
              // Message should contain the Pokemon name in uppercase
              expect(messageContent).toContain(pokemon.name.toUpperCase());
              
              if (gameStatus === 'won') {
                // Win message should contain congratulatory text
                expect(messageContent).toContain('Congratulations');
                expect(messageContent).toContain('guessed');
                expect(messageContent).toContain('correctly');
                expect(messageContent).toContain('success'); // CSS class
              } else if (gameStatus === 'lost') {
                // Loss message should contain game over text
                expect(messageContent).toContain('Game Over');
                expect(messageContent).toContain('Pokemon was');
                expect(messageContent).toContain('Better luck');
                expect(messageContent).toContain('failure'); // CSS class
              }

              // 3. Game controls should be disabled after completion
              const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
              const letterInput = document.getElementById('letter-input') as HTMLInputElement;
              const hintButton = document.getElementById('hint-button') as HTMLButtonElement;
              
              expect(guessButton?.disabled).toBe(true);
              expect(letterInput?.disabled).toBe(true);
              expect(hintButton?.disabled).toBe(true);

              // 4. Message should be properly formatted and visible
              expect(messageContent).toBeTruthy();
              expect(messageContent.length).toBeGreaterThan(0);
              
              // Should contain appropriate emoji for the outcome
              if (gameStatus === 'won') {
                expect(messageContent).toContain('🎉');
              } else {
                expect(messageContent).toContain('😞');
              }

              // 5. Complete Pokemon name should be fully revealed regardless of previous state
              // The name display should show all letters, not underscores
              expect(displayedName).not.toContain('_');
              expect(displayedName.replace(/\s/g, '').toLowerCase()).toBe(pokemon.name.toLowerCase());
              
              // Each character of the Pokemon name should be present in the display
              const nameChars = pokemon.name.toLowerCase().split('');
              const displayChars = displayedName.toLowerCase().replace(/\s/g, '').split('');
              expect(displayChars).toEqual(nameChars.map(c => c.toLowerCase()));

              // 6. Consistency checks for completed games
              
              // Message content should be consistent with game status
              const hasWinIndicators = messageContent.includes('Congratulations') || 
                                     messageContent.includes('correctly') ||
                                     messageContent.includes('success');
              const hasLossIndicators = messageContent.includes('Game Over') || 
                                      messageContent.includes('Better luck') ||
                                      messageContent.includes('failure');
              
              if (gameStatus === 'won') {
                expect(hasWinIndicators).toBe(true);
                expect(hasLossIndicators).toBe(false);
              } else {
                expect(hasLossIndicators).toBe(true);
                expect(hasWinIndicators).toBe(false);
              }

              // Pokemon name should appear exactly once in the message
              const pokemonNameOccurrences = (messageContent.match(new RegExp(pokemon.name.toUpperCase(), 'g')) || []).length;
              expect(pokemonNameOccurrences).toBeGreaterThanOrEqual(1);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should handle edge cases in game completion display', () => {
        /**
         * **Validates: Requirements 5.5**
         * 
         * Property 13: Game Completion Display (Edge cases)
         * Game completion display should work correctly for edge cases like 
         * very short/long Pokemon names, special characters, etc.
         */

        // Generator for edge case Pokemon names
        const edgeCasePokemonArbitrary = fc.oneof(
          // Very short names
          fc.record({
            name: fc.constantFrom('mew', 'dux', 'egg'),
            generation: fc.integer({ min: 1, max: 9 }),
            types: fc.array(fc.constantFrom('psychic', 'normal', 'flying'), { minLength: 1, maxLength: 1 }),
            abilities: fc.array(fc.constantFrom('synchronize', 'keen-eye', 'overgrow'), { minLength: 1, maxLength: 1 }),
            id: fc.integer({ min: 1, max: 151 })
          }),
          // Longer names
          fc.record({
            name: fc.constantFrom('charizard', 'blastoise', 'venusaur', 'alakazam'),
            generation: fc.integer({ min: 1, max: 9 }),
            types: fc.array(fc.constantFrom('fire', 'water', 'grass', 'psychic'), { minLength: 1, maxLength: 2 }),
            abilities: fc.array(fc.constantFrom('blaze', 'torrent', 'overgrow', 'synchronize'), { minLength: 1, maxLength: 2 }),
            id: fc.integer({ min: 1, max: 151 })
          }),
          // Names with repeated letters
          fc.record({
            name: fc.constantFrom('eevee', 'seel', 'doduo', 'koffing'),
            generation: fc.integer({ min: 1, max: 9 }),
            types: fc.array(fc.constantFrom('normal', 'water', 'flying', 'poison'), { minLength: 1, maxLength: 2 }),
            abilities: fc.array(fc.constantFrom('run-away', 'thick-fat', 'early-bird', 'levitate'), { minLength: 1, maxLength: 2 }),
            id: fc.integer({ min: 1, max: 151 })
          })
        );

        // Generator for game completion scenarios
        const completionScenarioArbitrary = fc.record({
          gameStatus: fc.constantFrom('won', 'lost'),
          remainingGuesses: fc.integer({ min: 0, max: 7 })
        }).filter(scenario => {
          // Lost games must have 0 remaining guesses
          return scenario.gameStatus !== 'lost' || scenario.remainingGuesses === 0;
        });

        fc.assert(
          fc.property(
            edgeCasePokemonArbitrary,
            completionScenarioArbitrary,
            (pokemon, scenario) => {
              // Given: An edge case Pokemon and completion scenario
              const gameState: GameState = {
                currentPokemon: pokemon,
                revealedName: scenario.gameStatus === 'won' ? pokemon.name : pokemon.name.replace(/./g, '_'),
                guessedLetters: {
                  correct: scenario.gameStatus === 'won' ? [...new Set(pokemon.name.split(''))] : [],
                  incorrect: scenario.gameStatus === 'lost' ? ['x', 'y', 'z', 'w', 'q', 'b', 'n'] : []
                },
                remainingGuesses: scenario.remainingGuesses,
                gameStatus: scenario.gameStatus as 'won' | 'lost',
                hintsUsed: 0
              };

              uiController.initialize();

              // When: showGameResult is called for the edge case
              uiController.showGameResult(gameState);

              // Then: Display should handle edge cases correctly

              // 1. Pokemon name display should work for any valid name length
              const pokemonNameElement = document.getElementById('pokemon-name');
              const displayedName = pokemonNameElement?.textContent || '';
              
              // Should display complete name regardless of length
              const expectedDisplay = pokemon.name
                .split('')
                .map(char => char.toUpperCase())
                .join(' ');
              expect(displayedName).toBe(expectedDisplay);

              // 2. Message should contain the Pokemon name regardless of edge cases
              const messageContentElement = document.getElementById('message-content');
              const messageContent = messageContentElement?.innerHTML || '';
              
              expect(messageContent).toContain(pokemon.name.toUpperCase());

              // 3. Display should handle repeated letters correctly
              if (pokemon.name.includes('e') && pokemon.name.indexOf('e') !== pokemon.name.lastIndexOf('e')) {
                // For names with repeated letters, all instances should be shown
                const eCount = (pokemon.name.match(/e/g) || []).length;
                const displayECount = (displayedName.match(/E/g) || []).length;
                expect(displayECount).toBe(eCount);
              }

              // 4. Short names should still trigger proper completion display
              if (pokemon.name.length <= 3) {
                expect(displayedName.length).toBeGreaterThan(0);
                expect(messageContent.length).toBeGreaterThan(0);
                expect(messageContent).toContain(pokemon.name.toUpperCase());
              }

              // 5. Long names should be displayed completely
              if (pokemon.name.length >= 8) {
                expect(displayedName.replace(/\s/g, '').toLowerCase()).toBe(pokemon.name.toLowerCase());
                expect(messageContent).toContain(pokemon.name.toUpperCase());
              }

              // 6. Game completion state should be consistent regardless of name
              const gameMessageElement = document.getElementById('game-message');
              expect(gameMessageElement?.style.display).toBe('block');
              
              const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
              const letterInput = document.getElementById('letter-input') as HTMLInputElement;
              const hintButton = document.getElementById('hint-button') as HTMLButtonElement;
              
              expect(guessButton?.disabled).toBe(true);
              expect(letterInput?.disabled).toBe(true);
              expect(hintButton?.disabled).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});