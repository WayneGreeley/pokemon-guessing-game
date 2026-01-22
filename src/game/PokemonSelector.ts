/**
 * Pokemon Selector implementation
 * Handles Pokemon selection logic and API data retrieval
 */

import {
  PokemonSelector,
  PokemonData,
  PokemonReference,
  PokeAPIClient,
  GAME_CONSTANTS,
  ValidationError
} from '../types';

/**
 * Implementation of Pokemon selector with generation selection and filtering
 */
export class PokemonSelectorImpl implements PokemonSelector {
  private readonly apiClient: PokeAPIClient;

  constructor(apiClient: PokeAPIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Select a random Pokemon from a random generation
   * @returns Promise resolving to selected Pokemon data
   */
  public async selectRandomPokemon(): Promise<PokemonData> {
    let lastError: Error | null = null;
    
    // Try multiple generations if the first one fails
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Select random generation between 1 and 9 (inclusive)
        const generationId = this.selectRandomGeneration();
        
        // Get Pokemon list for the selected generation
        const generationData = await this.apiClient.getGeneration(generationId);
        
        // Filter Pokemon to only include those with alphabetic names
        const validPokemon = this.filterValidPokemon(generationData.pokemonSpecies);
        
        if (validPokemon.length === 0) {
          // Try another generation if this one has no valid Pokemon
          if (attempt < 3) {
            continue;
          }
          throw new ValidationError(`No valid Pokemon found after trying multiple generations`);
        }
        
        // Select random Pokemon from filtered list
        const selectedPokemon = this.selectRandomFromList(validPokemon);
        
        // Extract Pokemon ID from URL and get detailed data
        const pokemonId = this.extractPokemonIdFromUrl(selectedPokemon.url);
        return await this.apiClient.getPokemonDetails(pokemonId);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If this is the last attempt or a validation error, throw immediately
        if (attempt === 3 || error instanceof ValidationError) {
          throw lastError;
        }
        
        // Wait a bit before retrying
        await this.delay(1000 * attempt);
      }
    }
    
    // This should never be reached, but just in case
    throw lastError || new Error('Failed to select Pokemon after multiple attempts');
  }

  /**
   * Filter Pokemon list to only include those with alphabetic names
   * @param pokemonList List of Pokemon references to filter
   * @returns Filtered list containing only Pokemon with alphabetic names
   */
  public filterValidPokemon(pokemonList: readonly PokemonReference[]): readonly PokemonReference[] {
    return pokemonList.filter(pokemon => this.isValidPokemonName(pokemon.name));
  }

  /**
   * Select a random generation number between 1 and 9 (inclusive)
   * This is the core function that Property 1 tests
   * @returns Random generation number (1-9)
   */
  public selectRandomGeneration(): number {
    const min = GAME_CONSTANTS.MIN_GENERATION;
    const max = GAME_CONSTANTS.MAX_GENERATION;
    
    // Generate random integer between min and max (inclusive)
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Check if a Pokemon name contains only alphabetic characters
   * @param name Pokemon name to validate
   * @returns True if name contains only alphabetic characters
   */
  private isValidPokemonName(name: string): boolean {
    return /^[a-zA-Z]+$/.test(name);
  }

  /**
   * Select a random item from a non-empty array
   * @param items Array to select from
   * @returns Randomly selected item
   */
  private selectRandomFromList<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new ValidationError('Cannot select from empty list');
    }
    
    const randomIndex = Math.floor(Math.random() * items.length);
    const selectedItem = items[randomIndex];
    
    if (selectedItem === undefined) {
      throw new ValidationError('Failed to select item from list');
    }
    
    return selectedItem;
  }

  /**
   * Extract Pokemon ID from PokeAPI URL
   * @param url PokeAPI Pokemon species URL
   * @returns Pokemon ID
   */
  private extractPokemonIdFromUrl(url: string): number {
    // URL format: https://pokeapi.co/api/v2/pokemon-species/{id}/
    const matches = url.match(/\/pokemon-species\/(\d+)\//);
    
    if (!matches || !matches[1]) {
      throw new ValidationError(`Invalid Pokemon URL format: ${url}`);
    }
    
    const id = parseInt(matches[1], 10);
    
    if (isNaN(id) || id < 1) {
      throw new ValidationError(`Invalid Pokemon ID extracted from URL: ${url}`);
    }
    
    return id;
  }

  /**
   * Delay execution for specified milliseconds
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}