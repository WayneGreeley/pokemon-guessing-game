/**
 * Tests for the main application entry point
 */

import { PokemonGuessingGame } from './main';

// Mock the components to avoid actual API calls and DOM dependencies
jest.mock('./game/GameEngine');
jest.mock('./game/GameState');
jest.mock('./game/PokemonSelector');
jest.mock('./game/LetterRevealer');
jest.mock('./game/HintSystem');
jest.mock('./api/PokeAPIClient');
jest.mock('./ui/UIController');

describe('PokemonGuessingGame', () => {
  let game: PokemonGuessingGame;

  beforeEach(() => {
    // Given: Set up DOM elements that the UI Controller expects
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
      <div id="error" style="display: none;">
        <p id="error-message"></p>
      </div>
      <button id="retry-button"></button>
    `;
    
    game = new PokemonGuessingGame();
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully with mocked components', async () => {
      // Given: Console spy to track initialization messages
      const consoleSpy = jest.spyOn(console, 'log');
      
      // When: Initialize the game
      await game.initialize();
      
      // Then: Should log initialization messages
      expect(consoleSpy).toHaveBeenCalledWith('Initializing Pokemon Guessing Game...');
      expect(consoleSpy).toHaveBeenCalledWith('Pokemon Guessing Game initialized successfully!');
    });

    it('should handle initialization errors gracefully', async () => {
      // Given: Error elements and console spy
      const errorElement = document.getElementById('error') as HTMLElement;
      const errorMessageElement = document.getElementById('error-message') as HTMLElement;
      const consoleErrorSpy = jest.spyOn(console, 'error');
      
      // Mock the GameEngineImpl constructor to throw an error
      const { GameEngineImpl } = require('./game/GameEngine');
      GameEngineImpl.mockImplementation(() => {
        throw new Error('Test initialization error');
      });
      
      // When: Initialize the game (should fail)
      await game.initialize();
      
      // Then: Should handle error gracefully
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize Pokemon Guessing Game:', 
        expect.any(Error)
      );
      expect(errorElement.style.display).toBe('block');
      expect(errorMessageElement.textContent).toBe(
        'Failed to initialize the game: Test initialization error'
      );
    });
  });
});