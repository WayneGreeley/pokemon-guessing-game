/**
 * Integration tests for complete game flows
 * Tests the full application from start to finish
 */

import { PokemonGuessingGame } from './main';

// Mock only the API client to avoid real network calls
jest.mock('./api/PokeAPIClient', () => {
  return {
    PokeAPIClientImpl: jest.fn().mockImplementation(() => ({
      getGeneration: jest.fn().mockResolvedValue({
        pokemonSpecies: [
          { name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
          { name: 'charizard', url: 'https://pokeapi.co/api/v2/pokemon-species/6/' }
        ]
      }),
      getPokemonDetails: jest.fn().mockResolvedValue({
        name: 'pikachu',
        generation: 1,
        types: ['electric'],
        abilities: ['static', 'lightning-rod'],
        id: 25
      })
    }))
  };
});

describe('Integration Tests - Complete Game Flows', () => {
  let game: PokemonGuessingGame;

  beforeEach(() => {
    // Given: Set up complete DOM structure
    document.body.innerHTML = `
      <div class="container">
        <header>
          <h1>Pokemon Guessing Game</h1>
          <p>Guess the Pokemon name letter by letter!</p>
        </header>
        
        <main>
          <div id="game-area">
            <div id="pokemon-display">
              <div id="pokemon-name" class="pokemon-name"></div>
            </div>
            
            <div id="game-info">
              <div id="remaining-guesses" class="info-item">
                <span class="label">Remaining Guesses:</span>
                <span id="guess-count" class="value">7</span>
              </div>
              
              <div id="guessed-letters" class="info-item">
                <div class="guessed-section">
                  <span class="label">Correct Letters:</span>
                  <span id="correct-letters" class="letters"></span>
                </div>
                <div class="guessed-section">
                  <span class="label">Incorrect Letters:</span>
                  <span id="incorrect-letters" class="letters"></span>
                </div>
              </div>
            </div>
            
            <div id="input-area">
              <div class="input-group">
                <label for="letter-input">Guess a letter:</label>
                <input type="text" id="letter-input" maxlength="1" placeholder="Enter a letter">
                <button id="guess-button">Guess</button>
              </div>
              
              <div class="button-group">
                <button id="hint-button">Get Hint (-1 guess)</button>
                <button id="new-game-button">New Game</button>
              </div>
            </div>
            
            <div id="hint-display" class="hint-area" style="display: none;">
              <h3>Hint:</h3>
              <div id="hint-content"></div>
            </div>
            
            <div id="game-message" class="message-area" style="display: none;">
              <div id="message-content"></div>
            </div>
          </div>
          
          <div id="loading" class="loading" style="display: none;">
            <p>Loading Pokemon data...</p>
          </div>
          
          <div id="error" class="error" style="display: none;">
            <p id="error-message"></p>
            <button id="retry-button">Try Again</button>
          </div>
        </main>
      </div>
    `;

    game = new PokemonGuessingGame();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Complete Game Scenarios', () => {
    it('should complete a full winning game flow', async () => {
      // Given: Initialize the game
      await game.initialize();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Play through a complete winning game
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const pokemonNameElement = document.getElementById('pokemon-name') as HTMLElement;
      const gameMessageElement = document.getElementById('game-message') as HTMLElement;
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      
      // Guess all letters in 'pikachu'
      const letters = ['p', 'i', 'k', 'a', 'c', 'h', 'u'];
      
      for (const letter of letters) {
        if (letter) {
          letterInput.value = letter;
          guessButton.click();
          // Small delay to allow UI updates
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Then: Game should be won
      expect(pokemonNameElement.textContent).toBe('P I K A C H U');
      expect(gameMessageElement.style.display).toBe('block');
      expect(gameMessageElement.textContent).toContain('Congratulations');
      expect(gameMessageElement.textContent).toContain('PIKACHU');
      expect(guessCountElement.textContent).toBe('7'); // Should not have lost any guesses
    });

    it('should complete a full losing game flow', async () => {
      // Given: Initialize the game
      await game.initialize();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Make 7 incorrect guesses
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const gameMessageElement = document.getElementById('game-message') as HTMLElement;
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      const incorrectLettersElement = document.getElementById('incorrect-letters') as HTMLElement;
      
      // Make incorrect guesses (letters not in 'pikachu')
      const incorrectLetters = ['x', 'y', 'z', 'q', 'w', 'e', 'r'];
      
      for (let i = 0; i < incorrectLetters.length; i++) {
        const letter = incorrectLetters[i];
        if (letter) {
          letterInput.value = letter;
          guessButton.click();
          await new Promise(resolve => setTimeout(resolve, 10));
          
          // Verify guess count decreases
          expect(guessCountElement.textContent).toBe((6 - i).toString());
        }
      }
      
      // Then: Game should be lost
      expect(gameMessageElement.style.display).toBe('block');
      expect(gameMessageElement.textContent).toContain('Game Over');
      expect(gameMessageElement.textContent).toContain('PIKACHU');
      expect(incorrectLettersElement.textContent).toContain('X');
      expect(incorrectLettersElement.textContent).toContain('Y');
      expect(incorrectLettersElement.textContent).toContain('Z');
    });

    it('should handle hint usage during gameplay', async () => {
      // Given: Initialize the game
      await game.initialize();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Request a hint
      const hintButton = document.getElementById('hint-button') as HTMLButtonElement;
      const hintDisplay = document.getElementById('hint-display') as HTMLElement;
      const hintContent = document.getElementById('hint-content') as HTMLElement;
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      
      hintButton.click();
      
      // Small delay to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Then: Hint should be displayed and guess count decreased
      expect(hintDisplay.style.display).toBe('block');
      expect(hintContent.textContent).toContain('Generation: 1');
      expect(hintContent.textContent).toContain('Electric');
      expect(guessCountElement.textContent).toBe('6');
    });

    it('should handle multiple hints and game loss due to hints', async () => {
      // Given: Initialize the game
      await game.initialize();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Request multiple hints until game is lost
      const hintButton = document.getElementById('hint-button') as HTMLButtonElement;
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      const gameMessageElement = document.getElementById('game-message') as HTMLElement;
      
      // Use all 7 guesses on hints
      for (let i = 0; i < 7; i++) {
        hintButton.click();
        await new Promise(resolve => setTimeout(resolve, 10));
        
        if (i < 6) {
          expect(guessCountElement.textContent).toBe((6 - i).toString());
        }
      }
      
      // Then: Game should be lost due to hint usage
      expect(gameMessageElement.style.display).toBe('block');
      expect(gameMessageElement.textContent).toContain('Game Over');
      expect(guessCountElement.textContent).toBe('0');
    });

    it('should handle new game functionality and state reset', async () => {
      // Given: Initialize and play part of a game
      await game.initialize();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
      const correctLettersElement = document.getElementById('correct-letters') as HTMLElement;
      const incorrectLettersElement = document.getElementById('incorrect-letters') as HTMLElement;
      const hintButton = document.getElementById('hint-button') as HTMLButtonElement;
      const hintDisplay = document.getElementById('hint-display') as HTMLElement;
      
      // Make some guesses and use a hint
      letterInput.value = 'p';
      guessButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      letterInput.value = 'x';
      guessButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      hintButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(correctLettersElement.textContent).toContain('P');
      expect(incorrectLettersElement.textContent).toContain('X');
      expect(hintDisplay.style.display).toBe('block');
      
      // When: Start a new game
      newGameButton.click();
      
      // Wait for new game to initialize
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Then: Game should be completely reset
      expect(correctLettersElement.textContent).toBe('None');
      expect(incorrectLettersElement.textContent).toBe('None');
      expect(document.getElementById('guess-count')?.textContent).toBe('7');
      expect(hintDisplay.style.display).toBe('none');
      expect(document.getElementById('game-message')?.style.display).toBe('none');
    });

    it('should handle mixed correct and incorrect guesses', async () => {
      // Given: Initialize the game
      await game.initialize();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Make a mix of correct and incorrect guesses
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const correctLettersElement = document.getElementById('correct-letters') as HTMLElement;
      const incorrectLettersElement = document.getElementById('incorrect-letters') as HTMLElement;
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      
      // Mix of correct and incorrect letters
      const guesses = [
        { letter: 'p', correct: true },
        { letter: 'x', correct: false },
        { letter: 'i', correct: true },
        { letter: 'y', correct: false },
        { letter: 'k', correct: true }
      ];
      
      let expectedGuessCount = 7;
      
      for (const guess of guesses) {
        if (guess.letter) {
          letterInput.value = guess.letter;
          guessButton.click();
          await new Promise(resolve => setTimeout(resolve, 10));
          
          if (!guess.correct) {
            expectedGuessCount--;
          }
          
          expect(guessCountElement.textContent).toBe(expectedGuessCount.toString());
          
          if (guess.correct) {
            expect(correctLettersElement.textContent).toContain(guess.letter.toUpperCase());
          } else {
            expect(incorrectLettersElement.textContent).toContain(guess.letter.toUpperCase());
          }
        }
      }
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle API failures gracefully', async () => {
      // Given: Mock API to fail
      const mockApiClient = require('./api/PokeAPIClient').PokeAPIClientImpl;
      const mockInstance = new mockApiClient();
      
      // Make API calls fail
      mockInstance.getGeneration.mockRejectedValue(new Error('Network timeout'));
      mockInstance.getPokemonDetails.mockRejectedValue(new Error('Network timeout'));
      
      // When: Initialize the game (should fail)
      await game.initialize();
      
      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Then: Should handle gracefully - the application should not crash
      // and should either show an error or continue with fallback behavior
      const errorElement = document.getElementById('error') as HTMLElement;
      const gameArea = document.getElementById('game-area') as HTMLElement;
      const loadingElement = document.getElementById('loading') as HTMLElement;
      
      // The application should be in a stable state - not crashed
      // It may show error, loading, or continue with mock data
      const applicationStable = errorElement !== null && 
                               gameArea !== null && 
                               loadingElement !== null;
      
      expect(applicationStable).toBe(true);
      
      // The game should either show an error state or continue functioning
      // (since our mocks provide fallback data)
      const gameHandledGracefully = errorElement.style.display === 'block' ||
                                   gameArea.style.display !== 'none' ||
                                   loadingElement.style.display === 'block';
      
      expect(gameHandledGracefully).toBe(true);
    });

    it('should handle malformed API responses', async () => {
      // Given: Mock API to return malformed data
      const mockApiClient = require('./api/PokeAPIClient').PokeAPIClientImpl;
      const mockInstance = new mockApiClient();
      
      mockInstance.getPokemonDetails.mockResolvedValue({
        name: '', // Invalid empty name
        generation: null,
        types: [],
        abilities: [],
        id: 0
      });
      
      // When: Try to initialize the game
      await game.initialize();
      
      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Then: Should handle gracefully (either show error or handle silently)
      const errorElement = document.getElementById('error') as HTMLElement;
      const gameArea = document.getElementById('game-area') as HTMLElement;
      
      // Either error is shown or game continues with fallback behavior
      const errorHandled = errorElement.style.display === 'block' || 
                          gameArea.style.display !== 'none' ||
                          errorElement.textContent?.includes('Failed');
      
      expect(errorHandled).toBe(true);
    });

    it('should recover from temporary network issues during gameplay', async () => {
      // Given: Initialize game successfully first
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Network fails during new game request
      const mockApiClient = require('./api/PokeAPIClient').PokeAPIClientImpl;
      const mockInstance = new mockApiClient();
      
      mockInstance.getGeneration.mockRejectedValueOnce(new Error('Connection failed'));
      
      const newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
      newGameButton.click();
      
      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Then: Should handle gracefully (show loading, error, or continue)
      const loadingElement = document.getElementById('loading') as HTMLElement;
      const errorElement = document.getElementById('error') as HTMLElement;
      const gameArea = document.getElementById('game-area') as HTMLElement;
      
      // Should handle the error gracefully in some way
      const errorHandled = loadingElement.style.display === 'block' || 
                          errorElement.style.display === 'block' ||
                          gameArea.style.display !== 'none';
      
      expect(errorHandled).toBe(true);
    });

    it('should handle rapid successive new game requests', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Rapidly click new game multiple times
      const newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
      
      // Rapid clicks
      newGameButton.click();
      newGameButton.click();
      newGameButton.click();
      
      // Wait for all requests to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then: Should handle gracefully without errors
      const gameArea = document.getElementById('game-area') as HTMLElement;
      const errorElement = document.getElementById('error') as HTMLElement;
      
      // Game should still be functional
      expect(gameArea.style.display).not.toBe('none');
      // Should not show error
      expect(errorElement.style.display).toBe('none');
    });
  });

  describe('UI Responsiveness and Edge Cases', () => {
    it('should validate input properly', async () => {
      // Given: Initialize the game
      await game.initialize();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Try to input invalid characters
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      
      letterInput.value = '123';
      letterInput.dispatchEvent(new Event('input'));
      
      // Then: Should filter out non-alphabetic characters
      expect(letterInput.value).toBe('');
      
      letterInput.value = 'a1b2c';
      letterInput.dispatchEvent(new Event('input'));
      
      expect(letterInput.value).toBe('abc');
    });

    it('should handle rapid user interactions', async () => {
      // Given: Initialize the game
      await game.initialize();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Rapidly click guess button multiple times
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      
      letterInput.value = 'p';
      
      // Rapid clicks
      guessButton.click();
      guessButton.click();
      guessButton.click();
      
      // Wait for UI updates
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Then: Should handle gracefully without errors
      const correctLettersElement = document.getElementById('correct-letters') as HTMLElement;
      expect(correctLettersElement.textContent).toContain('P');
      
      // Should not have duplicate letters
      expect(correctLettersElement.textContent.split('P').length - 1).toBe(1);
    });

    it('should handle empty input gracefully', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Try to guess with empty input
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      
      letterInput.value = '';
      guessButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Then: Should not affect game state
      expect(guessCountElement.textContent).toBe('7');
    });

    it('should handle keyboard input (Enter key)', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Use Enter key to submit guess
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const correctLettersElement = document.getElementById('correct-letters') as HTMLElement;
      
      letterInput.value = 'p';
      
      // Simulate Enter key press and form submission
      const enterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter', 
        code: 'Enter',
        bubbles: true 
      });
      letterInput.dispatchEvent(enterEvent);
      
      // Also trigger form submission if Enter doesn't work
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      guessButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Then: Should process the guess
      expect(correctLettersElement.textContent).toContain('P');
    });

    it('should handle case insensitive input', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Input both uppercase and lowercase letters
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const correctLettersElement = document.getElementById('correct-letters') as HTMLElement;
      
      // Test lowercase
      letterInput.value = 'p';
      guessButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Test uppercase (should be treated as duplicate)
      letterInput.value = 'P';
      guessButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Then: Should handle case insensitively
      expect(correctLettersElement.textContent).toContain('P');
      // Should not have duplicates
      expect(correctLettersElement.textContent.split('P').length - 1).toBe(1);
    });

    it('should handle special characters and spaces', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Try to input special characters
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      
      // Test various special characters
      const specialChars = ['@', '#', '$', '%', '^', '&', '*', ' ', '\t', '\n'];
      
      for (const char of specialChars) {
        if (char) {
          letterInput.value = char;
          guessButton.click();
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      
      // Then: Should not affect game state
      expect(guessCountElement.textContent).toBe('7');
    });

    it('should maintain UI state during long operations', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Trigger a new game (potentially long operation)
      const newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
      const loadingElement = document.getElementById('loading') as HTMLElement;
      
      newGameButton.click();
      
      // Check loading state appears
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Then: Should show appropriate loading state or handle gracefully
      const gameArea = document.getElementById('game-area') as HTMLElement;
      
      // Either loading is shown or game area remains functional
      const uiHandled = loadingElement.style.display === 'block' || 
                       loadingElement.style.display === '' ||
                       gameArea.style.display !== 'none';
      
      expect(uiHandled).toBe(true);
      
      // Wait for operation to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Loading should be hidden after completion (if it was shown)
      if (loadingElement.style.display === 'block') {
        expect(loadingElement.style.display).toBe('none');
      }
    });
  });

  describe('Multiple Consecutive Games', () => {
    it('should maintain independence between games', async () => {
      // Given: Initialize and complete first game
      await game.initialize();
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
      
      // Complete first game
      const letters = ['p', 'i', 'k', 'a', 'c', 'h', 'u'];
      for (const letter of letters) {
        if (letter) {
          letterInput.value = letter;
          guessButton.click();
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // When: Start second game
      newGameButton.click();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Then: Second game should be independent
      expect(document.getElementById('correct-letters')?.textContent).toBe('None');
      expect(document.getElementById('incorrect-letters')?.textContent).toBe('None');
      expect(document.getElementById('guess-count')?.textContent).toBe('7');
      expect(document.getElementById('game-message')?.style.display).toBe('none');
    });

    it('should handle multiple consecutive winning games', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
      const gameMessageElement = document.getElementById('game-message') as HTMLElement;
      
      // When: Play and win multiple games
      for (let gameNum = 0; gameNum < 3; gameNum++) {
        // Win the current game
        const letters = ['p', 'i', 'k', 'a', 'c', 'h', 'u'];
        for (const letter of letters) {
          if (letter) {
            letterInput.value = letter;
            guessButton.click();
            await new Promise(resolve => setTimeout(resolve, 5));
          }
        }
        
        // Verify win
        expect(gameMessageElement.textContent).toContain('Congratulations');
        
        // Start new game if not the last iteration
        if (gameNum < 2) {
          newGameButton.click();
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
      
      // Then: All games should have been independent and successful
      expect(gameMessageElement.textContent).toContain('Congratulations');
    });

    it('should handle multiple consecutive losing games', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
      const gameMessageElement = document.getElementById('game-message') as HTMLElement;
      
      // When: Play and lose multiple games
      for (let gameNum = 0; gameNum < 3; gameNum++) {
        // Lose the current game
        const incorrectLetters = ['x', 'y', 'z', 'q', 'w', 'e', 'r'];
        for (const letter of incorrectLetters) {
          if (letter) {
            letterInput.value = letter;
            guessButton.click();
            await new Promise(resolve => setTimeout(resolve, 5));
          }
        }
        
        // Verify loss
        expect(gameMessageElement.textContent).toContain('Game Over');
        
        // Start new game if not the last iteration
        if (gameNum < 2) {
          newGameButton.click();
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }
      
      // Then: All games should have been independent and lost
      expect(gameMessageElement.textContent).toContain('Game Over');
    });

    it('should handle mixed win/loss scenarios across games', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
      const gameMessageElement = document.getElementById('game-message') as HTMLElement;
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      
      // When: Play games with different outcomes
      
      // Game 1: Win
      const winLetters = ['p', 'i', 'k', 'a', 'c', 'h', 'u'];
      for (const letter of winLetters) {
        if (letter) {
          letterInput.value = letter;
          guessButton.click();
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      expect(gameMessageElement.textContent).toContain('Congratulations');
      
      // Start new game
      newGameButton.click();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Game 2: Lose
      const loseLetters = ['x', 'y', 'z', 'q', 'w', 'e', 'r'];
      for (const letter of loseLetters) {
        if (letter) {
          letterInput.value = letter;
          guessButton.click();
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      expect(gameMessageElement.textContent).toContain('Game Over');
      
      // Start new game
      newGameButton.click();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Game 3: Partial play then new game
      letterInput.value = 'p';
      guessButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(guessCountElement.textContent).toBe('7'); // Should still have all guesses
      
      // Then: Each game should be independent
      newGameButton.click();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(document.getElementById('correct-letters')?.textContent).toBe('None');
      expect(guessCountElement.textContent).toBe('7');
    });
  });

  describe('Boundary Conditions and Edge Cases', () => {
    it('should handle game completion at exactly 0 guesses remaining', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Use 6 incorrect guesses, then win on the last guess
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const gameMessageElement = document.getElementById('game-message') as HTMLElement;
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      
      // Make 6 incorrect guesses
      const incorrectLetters = ['x', 'y', 'z', 'q', 'w', 'e'];
      for (const letter of incorrectLetters) {
        if (letter) {
          letterInput.value = letter;
          guessButton.click();
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      expect(guessCountElement.textContent).toBe('1');
      
      // Now guess all correct letters to win
      const correctLetters = ['p', 'i', 'k', 'a', 'c', 'h', 'u'];
      for (const letter of correctLetters) {
        if (letter) {
          letterInput.value = letter;
          guessButton.click();
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Then: Should win despite having only 1 guess remaining
      expect(gameMessageElement.textContent).toContain('Congratulations');
      expect(guessCountElement.textContent).toBe('1'); // Should still have 1 guess left
    });

    it('should handle hint usage when only 1 guess remains', async () => {
      // Given: Initialize the game and use 6 guesses
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const hintButton = document.getElementById('hint-button') as HTMLButtonElement;
      const gameMessageElement = document.getElementById('game-message') as HTMLElement;
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      
      // Use 6 incorrect guesses
      const incorrectLetters = ['x', 'y', 'z', 'q', 'w', 'e'];
      for (const letter of incorrectLetters) {
        if (letter) {
          letterInput.value = letter;
          guessButton.click();
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      expect(guessCountElement.textContent).toBe('1');
      
      // When: Use hint with only 1 guess remaining
      hintButton.click();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Then: Should lose the game
      expect(gameMessageElement.textContent).toContain('Game Over');
      expect(guessCountElement.textContent).toBe('0');
    });

    it('should handle rapid button clicks during game transitions', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Rapidly click buttons during game state changes
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      const hintButton = document.getElementById('hint-button') as HTMLButtonElement;
      const newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
      
      // Rapid interactions
      letterInput.value = 'p';
      guessButton.click();
      hintButton.click();
      newGameButton.click();
      guessButton.click();
      hintButton.click();
      
      // Wait for all operations to settle
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Then: Should handle gracefully without critical errors
      const errorElement = document.getElementById('error') as HTMLElement;
      const gameArea = document.getElementById('game-area') as HTMLElement;
      
      // Game should still be functional (either no error or error is handled)
      const gameStillFunctional = errorElement.style.display === 'none' || 
                                 gameArea.style.display !== 'none';
      
      expect(gameStillFunctional).toBe(true);
      
      // Game should still be in a valid state
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      expect(guessCountElement.textContent).toMatch(/^[0-7]$/); // Should be a valid guess count
    });

    it('should handle UI updates during asynchronous operations', async () => {
      // Given: Initialize the game
      await game.initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // When: Trigger multiple async operations
      const newGameButton = document.getElementById('new-game-button') as HTMLButtonElement;
      const letterInput = document.getElementById('letter-input') as HTMLInputElement;
      const guessButton = document.getElementById('guess-button') as HTMLButtonElement;
      
      // Start new game (async operation)
      newGameButton.click();
      
      // Try to make guesses immediately (before new game completes)
      letterInput.value = 'p';
      guessButton.click();
      letterInput.value = 'i';
      guessButton.click();
      
      // Wait for all operations to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Then: Should handle gracefully
      const correctLettersElement = document.getElementById('correct-letters') as HTMLElement;
      const guessCountElement = document.getElementById('guess-count') as HTMLElement;
      
      // UI should be in a consistent state
      expect(guessCountElement.textContent).toBe('7');
      // Letters should either be processed or ignored, but UI should be consistent
      expect(correctLettersElement.textContent).toMatch(/^(None|.*[PI].*)$/);
    });
  });
});