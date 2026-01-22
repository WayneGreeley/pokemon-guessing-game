/**
 * PokeAPI Client implementation with comprehensive error handling
 * Handles API calls for generation and Pokemon detail endpoints with retry logic
 */

import {
  PokeAPIClient,
  GenerationData,
  PokemonData,
  GenerationResponse,
  PokemonResponse,
  PokemonReference,
  APIError,
  ValidationError,
  GAME_CONSTANTS
} from '../types';

/**
 * Implementation of PokeAPI client with error handling, timeouts, and retry logic
 */
export class PokeAPIClientImpl implements PokeAPIClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(
    baseUrl: string = GAME_CONSTANTS.API_BASE_URL,
    timeout: number = GAME_CONSTANTS.API_TIMEOUT,
    maxRetries: number = GAME_CONSTANTS.MAX_RETRIES
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }

  /**
   * Get generation data from PokeAPI
   * @param generationId Generation number (1-9)
   * @returns Promise resolving to generation data
   */
  public async getGeneration(generationId: number): Promise<GenerationData> {
    this.validateGenerationId(generationId);
    
    const url = `${this.baseUrl}/generation/${generationId}`;
    const response = await this.fetchWithRetry<GenerationResponse>(url);
    
    return this.transformGenerationResponse(response);
  }

  /**
   * Get Pokemon details from PokeAPI
   * @param pokemonId Pokemon ID
   * @returns Promise resolving to Pokemon data
   */
  public async getPokemonDetails(pokemonId: number): Promise<PokemonData> {
    this.validatePokemonId(pokemonId);
    
    const url = `${this.baseUrl}/pokemon/${pokemonId}`;
    const response = await this.fetchWithRetry<PokemonResponse>(url);
    
    return this.transformPokemonResponse(response, pokemonId);
  }

  /**
   * Handle API errors with appropriate user-friendly messages
   * @param error The error to handle
   * @returns User-friendly error message
   */
  public handleApiError(error: Error): string {
    if (error instanceof APIError) {
      console.error(`API Error (${error.statusCode}): ${error.message}`);
      return this.getApiErrorMessage(error);
    } else if (error instanceof ValidationError) {
      console.error(`Validation Error: ${error.message}`);
      return 'The Pokemon data received was invalid. Please try again.';
    } else {
      console.error(`Unexpected Error: ${error.message}`);
      return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Get user-friendly error message for API errors
   * @param error API error
   * @returns User-friendly message
   */
  private getApiErrorMessage(error: APIError): string {
    if (error.message.includes('timeout')) {
      return 'The Pokemon database is taking too long to respond. Please check your internet connection and try again.';
    }
    
    if (error.message.includes('Network error')) {
      return 'Unable to connect to the Pokemon database. Please check your internet connection and try again.';
    }
    
    if (error.statusCode) {
      if (error.statusCode === 404) {
        return 'The requested Pokemon data was not found. Please try starting a new game.';
      } else if (error.statusCode >= 500) {
        return 'The Pokemon database is temporarily unavailable. Please try again in a few moments.';
      } else if (error.statusCode === 429) {
        return 'Too many requests to the Pokemon database. Please wait a moment and try again.';
      }
    }
    
    return 'Unable to load Pokemon data. Please try again.';
  }

  /**
   * Fetch data with retry logic and timeout handling
   * @param url URL to fetch
   * @returns Promise resolving to parsed response
   */
  private async fetchWithRetry<T>(url: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url);
        
        if (!response.ok) {
          throw new APIError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status
          );
        }

        const data = await response.json();
        this.validateResponseData(data);
        
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on validation errors or 4xx client errors
        if (error instanceof ValidationError || 
            (error instanceof APIError && error.statusCode && error.statusCode < 500)) {
          throw error;
        }

        // Log retry attempt
        if (attempt < this.maxRetries) {
          console.warn(`API request failed (attempt ${attempt}/${this.maxRetries}): ${lastError.message}`);
          await this.delay(this.calculateBackoffDelay(attempt));
        }
      }
    }

    // All retries exhausted
    throw new APIError(
      `API request failed after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      0
    );
  }

  /**
   * Fetch with timeout handling
   * @param url URL to fetch
   * @returns Promise resolving to Response
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new APIError(`Request timeout after ${this.timeout}ms`, 0);
      }
      
      throw new APIError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`, 0);
    }
  }

  /**
   * Calculate exponential backoff delay
   * @param attempt Current attempt number
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }

  /**
   * Delay execution for specified milliseconds
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate generation ID parameter
   * @param generationId Generation ID to validate
   */
  private validateGenerationId(generationId: number): void {
    if (!Number.isInteger(generationId) || 
        generationId < GAME_CONSTANTS.MIN_GENERATION || 
        generationId > GAME_CONSTANTS.MAX_GENERATION) {
      throw new ValidationError(
        `Invalid generation ID: ${generationId}. Must be an integer between ${GAME_CONSTANTS.MIN_GENERATION} and ${GAME_CONSTANTS.MAX_GENERATION}`
      );
    }
  }

  /**
   * Validate Pokemon ID parameter
   * @param pokemonId Pokemon ID to validate
   */
  private validatePokemonId(pokemonId: number): void {
    if (!Number.isInteger(pokemonId) || pokemonId < 1) {
      throw new ValidationError(
        `Invalid Pokemon ID: ${pokemonId}. Must be a positive integer`
      );
    }
  }

  /**
   * Validate API response data structure
   * @param data Response data to validate
   */
  private validateResponseData(data: unknown): void {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Invalid API response: Expected object');
    }
  }

  /**
   * Transform generation API response to internal format
   * @param response Generation API response
   * @returns Transformed generation data
   */
  private transformGenerationResponse(response: GenerationResponse): GenerationData {
    if (!response.pokemon_species || !Array.isArray(response.pokemon_species)) {
      throw new ValidationError('Invalid generation response: Missing or invalid pokemon_species array');
    }

    const pokemonSpecies: PokemonReference[] = response.pokemon_species.map(species => {
      if (!species.name || !species.url) {
        throw new ValidationError('Invalid Pokemon species: Missing name or url');
      }
      
      return {
        name: species.name,
        url: species.url
      };
    });

    return { pokemonSpecies };
  }

  /**
   * Transform Pokemon API response to internal format
   * @param response Pokemon API response
   * @param expectedId Expected Pokemon ID for validation
   * @returns Transformed Pokemon data
   */
  private transformPokemonResponse(response: PokemonResponse, expectedId: number): PokemonData {
    // Validate required fields
    if (!response.name || typeof response.name !== 'string') {
      throw new ValidationError('Invalid Pokemon response: Missing or invalid name');
    }

    if (!response.id || response.id !== expectedId) {
      throw new ValidationError(`Invalid Pokemon response: ID mismatch (expected ${expectedId}, got ${response.id})`);
    }

    if (!response.types || !Array.isArray(response.types)) {
      throw new ValidationError('Invalid Pokemon response: Missing or invalid types array');
    }

    if (!response.abilities || !Array.isArray(response.abilities)) {
      throw new ValidationError('Invalid Pokemon response: Missing or invalid abilities array');
    }

    // Extract and validate types
    const types: string[] = response.types.map(typeObj => {
      if (!typeObj.type || !typeObj.type.name) {
        throw new ValidationError('Invalid Pokemon type: Missing type name');
      }
      return typeObj.type.name;
    });

    // Extract and validate abilities
    const abilities: string[] = response.abilities.map(abilityObj => {
      if (!abilityObj.ability || !abilityObj.ability.name) {
        throw new ValidationError('Invalid Pokemon ability: Missing ability name');
      }
      return abilityObj.ability.name;
    });

    // Determine generation from Pokemon ID (approximate mapping)
    const generation = this.determineGenerationFromId(response.id);

    return {
      name: response.name,
      generation,
      types,
      abilities,
      id: response.id
    };
  }

  /**
   * Determine Pokemon generation from ID (approximate mapping)
   * @param pokemonId Pokemon ID
   * @returns Generation number
   */
  private determineGenerationFromId(pokemonId: number): number {
    // Approximate generation boundaries based on Pokemon ID ranges
    if (pokemonId <= 151) return 1;
    if (pokemonId <= 251) return 2;
    if (pokemonId <= 386) return 3;
    if (pokemonId <= 493) return 4;
    if (pokemonId <= 649) return 5;
    if (pokemonId <= 721) return 6;
    if (pokemonId <= 809) return 7;
    if (pokemonId <= 905) return 8;
    return 9; // Generation 9 and beyond
  }
}