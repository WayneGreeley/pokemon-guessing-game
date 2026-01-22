/**
 * Main entry point for the Pokemon Guessing Game
 * This file initializes the application and wires all components together
 */

// Import components
import { GameEngineImpl } from './game/GameEngine';
import { GameStateManager } from './game/GameState';
import { PokemonSelectorImpl } from './game/PokemonSelector';
import { LetterRevealerImpl } from './game/LetterRevealer';
import { HintSystemImpl } from './game/HintSystem';
import { PokeAPIClientImpl } from './api/PokeAPIClient';
import { UIControllerImpl } from './ui/UIController';

/**
 * Application class that manages the overall game lifecycle
 */
class PokemonGuessingGame {
  private gameEngine: GameEngineImpl | null = null;
  private uiController: UIControllerImpl | null = null;

  /**
   * Initialize the application
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing Pokemon Guessing Game...');
      
      // Initialize components
      const apiClient = new PokeAPIClientImpl();
      const pokemonSelector = new PokemonSelectorImpl(apiClient);
      const letterRevealer = new LetterRevealerImpl();
      const hintSystem = new HintSystemImpl();
      const gameState = new GameStateManager();
      
      // Initialize game engine with all dependencies
      this.gameEngine = new GameEngineImpl(
        pokemonSelector,
        letterRevealer,
        hintSystem,
        gameState
      );
      
      // Initialize UI controller
      this.uiController = new UIControllerImpl();
      this.uiController.initialize();
      this.uiController.setGameEngine(this.gameEngine);
      
      // Start the first game with enhanced error handling
      this.uiController.showLoadingWithMessage(true, 'Initializing Pokemon Guessing Game...');
      
      try {
        await this.gameEngine.startNewGame();
        
        // Update UI with initial game state
        const initialState = this.gameEngine.getCurrentState();
        this.uiController.updateGameDisplay(initialState);
        this.uiController.showLoading(false);
        
        console.log('Pokemon Guessing Game initialized successfully!');
      } catch (gameError) {
        // Handle game initialization errors specifically
        this.uiController.showLoading(false);
        const errorMessage = gameError instanceof Error ? gameError.message : 'Unknown error occurred';
        
        if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connect')) {
          this.uiController.showNetworkError(`Failed to load initial Pokemon: ${errorMessage}`);
        } else {
          this.uiController.showError(`Failed to load initial Pokemon: ${errorMessage}`, true);
        }
      }
      
    } catch (error) {
      console.error('Failed to initialize Pokemon Guessing Game:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showError(`Failed to initialize the game: ${errorMessage}`);
    }
  }

  /**
   * Show error message to user
   */
  private showError(message: string): void {
    if (this.uiController) {
      this.uiController.showError(message);
    } else {
      // Fallback if UI controller is not available
      const errorElement = document.getElementById('error');
      const errorMessageElement = document.getElementById('error-message');
      
      if (errorElement && errorMessageElement) {
        errorMessageElement.textContent = message;
        errorElement.style.display = 'block';
      }
    }
  }
}

/**
 * Initialize the application when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  const game = new PokemonGuessingGame();
  await game.initialize();
});

// Export for testing
export { PokemonGuessingGame };