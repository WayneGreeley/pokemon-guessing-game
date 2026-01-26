/**
 * UI Controller implementation
 * Handles DOM manipulation, event handlers, and UI updates based on game state
 */

import {
  UIController,
  GameState,
  GameEngine,
  ImageDisplay,
  ValidationError
} from '../types';

import { ImageDisplayImpl } from './ImageDisplay';

/**
 * Implementation of UI Controller that manages user interface interactions
 */
export class UIControllerImpl implements UIController {
  private gameEngine: GameEngine | null = null;
  private imageDisplay: ImageDisplay;
  
  // DOM element references
  private readonly pokemonNameElement: HTMLElement;
  private readonly guessCountElement: HTMLElement;
  private readonly correctLettersElement: HTMLElement;
  private readonly incorrectLettersElement: HTMLElement;
  private readonly letterInputElement: HTMLInputElement;
  private readonly guessButtonElement: HTMLButtonElement;
  private readonly hintButtonElement: HTMLButtonElement;
  private readonly newGameButtonElement: HTMLButtonElement;
  private readonly hintDisplayElement: HTMLElement;
  private readonly hintContentElement: HTMLElement;
  private readonly gameMessageElement: HTMLElement;
  private readonly messageContentElement: HTMLElement;
  private readonly loadingElement: HTMLElement;
  private readonly errorElement: HTMLElement;
  private readonly errorMessageElement: HTMLElement;
  private readonly retryButtonElement: HTMLButtonElement;

  constructor() {
    // Initialize ImageDisplay component
    this.imageDisplay = new ImageDisplayImpl();
    
    // Get DOM element references
    this.pokemonNameElement = this.getRequiredElement('pokemon-name');
    this.guessCountElement = this.getRequiredElement('guess-count');
    this.correctLettersElement = this.getRequiredElement('correct-letters');
    this.incorrectLettersElement = this.getRequiredElement('incorrect-letters');
    this.letterInputElement = this.getRequiredElement('letter-input') as HTMLInputElement;
    this.guessButtonElement = this.getRequiredElement('guess-button') as HTMLButtonElement;
    this.hintButtonElement = this.getRequiredElement('hint-button') as HTMLButtonElement;
    this.newGameButtonElement = this.getRequiredElement('new-game-button') as HTMLButtonElement;
    this.hintDisplayElement = this.getRequiredElement('hint-display');
    this.hintContentElement = this.getRequiredElement('hint-content');
    this.gameMessageElement = this.getRequiredElement('game-message');
    this.messageContentElement = this.getRequiredElement('message-content');
    this.loadingElement = this.getRequiredElement('loading');
    this.errorElement = this.getRequiredElement('error');
    this.errorMessageElement = this.getRequiredElement('error-message');
    this.retryButtonElement = this.getRequiredElement('retry-button') as HTMLButtonElement;
  }

  /**
   * Initialize the UI Controller and set up event handlers
   */
  public initialize(): void {
    this.setupEventHandlers();
    this.resetUI();
  }

  /**
   * Set the game engine reference for handling user actions
   * @param gameEngine The game engine instance
   */
  public setGameEngine(gameEngine: GameEngine): void {
    this.gameEngine = gameEngine;
  }

  /**
   * Update the game display based on current game state
   * @param gameState Current game state to display
   */
  public updateGameDisplay(gameState: GameState): void {
    try {
      // Update Pokemon name display
      this.updatePokemonNameDisplay(gameState);
      
      // Update remaining guesses
      this.updateGuessCount(gameState.remainingGuesses);
      
      // Update guessed letters display
      this.updateGuessedLetters(gameState.guessedLetters);
      
      // Update button states based on game status
      this.updateButtonStates(gameState);
      
      // Hide any previous messages or hints if game is still playing
      if (gameState.gameStatus === 'playing') {
        this.hideGameMessage();
        this.hideEndGameComponents();
        // Focus the input when game is active
        this.focusLetterInput();
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showError(`Failed to update display: ${errorMessage}`);
    }
  }

  /**
   * Show a hint to the player
   * @param hint Hint text to display
   */
  public showHint(hint: string): void {
    this.hintContentElement.textContent = hint;
    this.hintDisplayElement.style.display = 'block';
  }

  /**
   * Show the game result when game ends
   * @param gameState Final game state
   */
  public showGameResult(gameState: GameState): void {
    if (!gameState.currentPokemon) {
      this.showError('Cannot show game result: No Pokemon data available');
      return;
    }

    let message: string;
    let messageClass: string;

    if (gameState.gameStatus === 'won') {
      message = `🎉 Congratulations! You guessed "${gameState.currentPokemon.name.toUpperCase()}" correctly!`;
      messageClass = 'success';
    } else if (gameState.gameStatus === 'lost') {
      message = `😞 Game Over! The Pokemon was "${gameState.currentPokemon.name.toUpperCase()}". Better luck next time!`;
      messageClass = 'failure';
    } else {
      return; // Game is still playing
    }

    // Show the complete Pokemon name
    this.pokemonNameElement.textContent = gameState.currentPokemon.name
      .split('')
      .map(char => char.toUpperCase())
      .join(' ');

    // Show the game result message
    this.messageContentElement.innerHTML = `<div class="${messageClass}">${message}</div>`;
    this.gameMessageElement.style.display = 'block';

    // Display Pokemon image
    try {
      this.imageDisplay.displayPokemonImage(gameState.currentPokemon);
    } catch (error) {
      console.error('Error displaying Pokemon image:', error);
      // Continue with game result display even if image fails
    }

    // Disable input controls
    this.disableGameControls();
  }

  /**
   * Show or hide loading indicator
   * @param show Whether to show the loading indicator
   */
  public showLoading(show: boolean): void {
    this.loadingElement.style.display = show ? 'block' : 'none';
    
    if (show) {
      this.disableGameControls();
    } else {
      this.enableGameControls();
    }
  }

  /**
   * Show an error message to the user with enhanced functionality
   * @param message Error message to display
   * @param showRetry Whether to show the retry button
   */
  public showError(message: string, showRetry: boolean = true): void {
    this.errorMessageElement.textContent = message;
    this.errorElement.style.display = 'block';
    this.retryButtonElement.style.display = showRetry ? 'inline-block' : 'none';
    this.hideLoading();
  }

  /**
   * Show a network-specific error with retry options
   * @param message Error message to display
   */
  public showNetworkError(message: string): void {
    const enhancedMessage = `${message}\n\nThis might be due to:\n• Poor internet connection\n• Pokemon database temporarily unavailable\n• Network firewall blocking the request`;
    this.showError(enhancedMessage, true);
  }

  /**
   * Show loading with custom message
   * @param show Whether to show the loading indicator
   * @param message Custom loading message
   */
  public showLoadingWithMessage(show: boolean, message: string = 'Loading Pokemon data...'): void {
    if (show) {
      const loadingText = this.loadingElement.querySelector('p');
      if (loadingText) {
        loadingText.textContent = message;
      }
    }
    this.showLoading(show);
  }

  /**
   * Hide the error message
   */
  public hideError(): void {
    this.errorElement.style.display = 'none';
  }

  /**
   * Hide the loading indicator
   */
  private hideLoading(): void {
    this.loadingElement.style.display = 'none';
  }

  /**
   * Hide the game message
   */
  private hideGameMessage(): void {
    this.gameMessageElement.style.display = 'none';
  }

  /**
   * Hide end-game components (image)
   */
  private hideEndGameComponents(): void {
    try {
      this.imageDisplay.hideImage();
    } catch (error) {
      console.error('Error hiding Pokemon image:', error);
    }
  }

  /**
   * Update the Pokemon name display with blanks and revealed letters
   * @param gameState Current game state
   */
  private updatePokemonNameDisplay(gameState: GameState): void {
    if (gameState.revealedName) {
      // Format the revealed name for display with spaces between characters
      const displayName = gameState.revealedName
        .split('')
        .map(char => char === '_' ? '_' : char.toUpperCase())
        .join(' ');
      
      this.pokemonNameElement.textContent = displayName;
    } else {
      this.pokemonNameElement.textContent = '';
    }
  }

  /**
   * Update the remaining guesses display
   * @param remainingGuesses Number of remaining guesses
   */
  private updateGuessCount(remainingGuesses: number): void {
    this.guessCountElement.textContent = remainingGuesses.toString();
    
    // Add visual warning for low guesses
    if (remainingGuesses <= 2) {
      this.guessCountElement.classList.add('low-guesses');
    } else {
      this.guessCountElement.classList.remove('low-guesses');
    }
  }

  /**
   * Update the display of guessed letters
   * @param guessedLetters Object containing correct and incorrect letters
   */
  private updateGuessedLetters(guessedLetters: { correct: readonly string[]; incorrect: readonly string[] }): void {
    // Display correct letters
    this.correctLettersElement.textContent = guessedLetters.correct
      .map(letter => letter.toUpperCase())
      .join(', ') || 'None';

    // Display incorrect letters
    this.incorrectLettersElement.textContent = guessedLetters.incorrect
      .map(letter => letter.toUpperCase())
      .join(', ') || 'None';
  }

  /**
   * Update button states based on game status
   * @param gameState Current game state
   */
  private updateButtonStates(gameState: GameState): void {
    const isGameActive = gameState.gameStatus === 'playing';
    const hasGuessesRemaining = gameState.remainingGuesses > 0;

    // Enable/disable guess button and input
    this.guessButtonElement.disabled = !isGameActive;
    this.letterInputElement.disabled = !isGameActive;

    // Enable/disable hint button (only if game is active and has guesses)
    this.hintButtonElement.disabled = !isGameActive || !hasGuessesRemaining;

    // New game button is always enabled
    this.newGameButtonElement.disabled = false;
  }

  /**
   * Disable all game control elements
   */
  private disableGameControls(): void {
    this.guessButtonElement.disabled = true;
    this.letterInputElement.disabled = true;
    this.hintButtonElement.disabled = true;
  }

  /**
   * Enable all game control elements
   */
  private enableGameControls(): void {
    this.guessButtonElement.disabled = false;
    this.letterInputElement.disabled = false;
    this.hintButtonElement.disabled = false;
  }

  /**
   * Focus the letter input element
   */
  private focusLetterInput(): void {
    // Use setTimeout to ensure DOM updates are complete
    setTimeout(() => {
      if (this.letterInputElement && !this.letterInputElement.disabled) {
        this.letterInputElement.focus();
      }
    }, 100);
  }

  /**
   * Reset the UI to initial state
   */
  private resetUI(): void {
    this.pokemonNameElement.textContent = '';
    this.guessCountElement.textContent = '7';
    this.correctLettersElement.textContent = 'None';
    this.incorrectLettersElement.textContent = 'None';
    this.letterInputElement.value = '';
    this.hintDisplayElement.style.display = 'none';
    this.gameMessageElement.style.display = 'none';
    this.hideError();
    this.hideLoading();
    this.enableGameControls();
    
    // Hide Pokemon image
    try {
      this.imageDisplay.hideImage();
    } catch (error) {
      console.error('Error hiding Pokemon image:', error);
      // Continue with UI reset even if image hiding fails
    }
  }

  /**
   * Set up event handlers for user interactions
   */
  private setupEventHandlers(): void {
    // Letter guess button click
    this.guessButtonElement.addEventListener('click', () => {
      this.handleLetterGuess();
    });

    // Enter key in letter input
    this.letterInputElement.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        this.handleLetterGuess();
      }
    });

    // Letter input validation (only allow alphabetic characters)
    this.letterInputElement.addEventListener('input', (event) => {
      const input = event.target as HTMLInputElement;
      const value = input.value;
      
      // Remove non-alphabetic characters
      const filteredValue = value.replace(/[^a-zA-Z]/g, '');
      
      if (filteredValue !== value) {
        input.value = filteredValue;
      }
    });

    // Hint button click
    this.hintButtonElement.addEventListener('click', () => {
      this.handleHintRequest();
    });

    // New game button click
    this.newGameButtonElement.addEventListener('click', () => {
      this.handleNewGame();
    });

    // Retry button click (for errors)
    this.retryButtonElement.addEventListener('click', () => {
      this.hideError();
      this.handleNewGame();
    });
  }

  /**
   * Handle letter guess submission
   */
  private handleLetterGuess(): void {
    if (!this.gameEngine) {
      this.showError('Game engine not initialized');
      return;
    }

    const letter = this.letterInputElement.value.trim();
    
    if (!letter) {
      this.showError('Please enter a letter');
      return;
    }

    try {
      this.gameEngine.processLetterGuess(letter);
      
      // Clear the input and refocus
      this.letterInputElement.value = '';
      this.focusLetterInput();
      
      // Update the display with new game state
      const gameState = this.gameEngine.getCurrentState();
      this.updateGameDisplay(gameState);
      
      // Show game result if game ended
      if (gameState.gameStatus !== 'playing') {
        this.showGameResult(gameState);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showError(`Error processing guess: ${errorMessage}`);
    }
  }

  /**
   * Handle hint request
   */
  private handleHintRequest(): void {
    if (!this.gameEngine) {
      this.showError('Game engine not initialized');
      return;
    }

    try {
      const result = this.gameEngine.requestHint();
      
      // Show the hint
      this.showHint(result.hintText);
      
      // Update the display with new game state
      const gameState = this.gameEngine.getCurrentState();
      this.updateGameDisplay(gameState);
      
      // Check if game ended due to hint cost
      if (gameState.gameStatus !== 'playing') {
        this.showGameResult(gameState);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showError(`Error requesting hint: ${errorMessage}`);
    }
  }

  /**
   * Handle new game request with enhanced error handling and retry logic
   */
  private async handleNewGame(): Promise<void> {
    if (!this.gameEngine) {
      this.showError('Game engine not initialized', false);
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Show loading with attempt information
        const loadingMessage = retryCount === 0 
          ? 'Loading Pokemon data...' 
          : `Retrying... (Attempt ${retryCount + 1}/${maxRetries})`;
        
        this.showLoadingWithMessage(true, loadingMessage);
        this.hideError();
        this.resetUI();
        
        await this.gameEngine.startNewGame();
        
        const gameState = this.gameEngine.getCurrentState();
        this.updateGameDisplay(gameState);
        
        this.showLoading(false);
        return; // Success - exit the retry loop
        
      } catch (error) {
        retryCount++;
        this.showLoading(false);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        if (retryCount >= maxRetries) {
          // Final attempt failed
          if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connect')) {
            this.showNetworkError(`Failed to start new game after ${maxRetries} attempts: ${errorMessage}`);
          } else {
            this.showError(`Failed to start new game: ${errorMessage}`, true);
          }
          return;
        } else {
          // Show temporary error message and retry
          this.showError(`Attempt ${retryCount} failed: ${errorMessage}. Retrying...`, false);
          
          // Wait before retrying (exponential backoff)
          await this.delay(1000 * Math.pow(2, retryCount - 1));
        }
      }
    }
  }

  /**
   * Delay execution for specified milliseconds
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get a required DOM element by ID
   * @param id Element ID
   * @returns The DOM element
   * @throws ValidationError if element is not found
   */
  private getRequiredElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new ValidationError(`Required DOM element not found: ${id}`);
    }
    return element;
  }
}