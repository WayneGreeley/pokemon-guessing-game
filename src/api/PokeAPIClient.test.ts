/**
 * Tests for PokeAPI Client implementation
 */

import { PokeAPIClientImpl } from './PokeAPIClient';
import { APIError, ValidationError, GAME_CONSTANTS } from '../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('PokeAPIClientImpl', () => {
  let client: PokeAPIClientImpl;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Given
    client = new PokeAPIClientImpl();
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getGeneration', () => {
    it('should successfully fetch generation data', async () => {
      // Given
      const mockResponse = {
        pokemon_species: [
          { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
          { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon-species/2/' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      // When
      const result = await client.getGeneration(1);

      // Then
      expect(result).toEqual({
        pokemonSpecies: [
          { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
          { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon-species/2/' }
        ]
      });
      expect(mockFetch).toHaveBeenCalledWith(
        `${GAME_CONSTANTS.API_BASE_URL}/generation/1`,
        expect.objectContaining({
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should validate generation ID range', async () => {
      // Given
      const invalidIds = [0, 10, -1, 1.5];

      // When & Then
      for (const id of invalidIds) {
        await expect(client.getGeneration(id)).rejects.toThrow(ValidationError);
      }
    });

    it('should handle malformed generation response', async () => {
      // Given
      const malformedResponse = { invalid: 'data' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => malformedResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      // When & Then
      await expect(client.getGeneration(1)).rejects.toThrow(ValidationError);
    });
  });

  describe('getPokemonDetails', () => {
    it('should successfully fetch Pokemon details', async () => {
      // Given
      const mockResponse = {
        name: 'pikachu',
        id: 25,
        types: [
          { type: { name: 'electric' } }
        ],
        abilities: [
          { ability: { name: 'static' } },
          { ability: { name: 'lightning-rod' } }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      // When
      const result = await client.getPokemonDetails(25);

      // Then
      expect(result).toEqual({
        name: 'pikachu',
        id: 25,
        generation: 1, // Pikachu is Gen 1
        types: ['electric'],
        abilities: ['static', 'lightning-rod']
      });
    });

    it('should validate Pokemon ID', async () => {
      // Given
      const invalidIds = [0, -1, 1.5];

      // When & Then
      for (const id of invalidIds) {
        await expect(client.getPokemonDetails(id)).rejects.toThrow(ValidationError);
      }
    });

    it('should handle ID mismatch in response', async () => {
      // Given
      const mockResponse = {
        name: 'pikachu',
        id: 26, // Wrong ID
        types: [{ type: { name: 'electric' } }],
        abilities: [{ ability: { name: 'static' } }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      // When & Then
      await expect(client.getPokemonDetails(25)).rejects.toThrow(ValidationError);
    });

    it('should handle malformed Pokemon response', async () => {
      // Given
      const malformedResponse = { name: 'pikachu' }; // Missing required fields

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => malformedResponse,
        status: 200,
        statusText: 'OK'
      } as Response);

      // When & Then
      await expect(client.getPokemonDetails(25)).rejects.toThrow(ValidationError);
    });
  });

  describe('error handling', () => {
    it('should handle HTTP errors', async () => {
      // Given
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);

      // When & Then
      await expect(client.getGeneration(1)).rejects.toThrow(APIError);
    });

    it('should handle network errors', async () => {
      // Given
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // When & Then
      await expect(client.getGeneration(1)).rejects.toThrow(APIError);
    });

    it('should handle timeout errors', async () => {
      // Given
      const shortTimeoutClient = new PokeAPIClientImpl(GAME_CONSTANTS.API_BASE_URL, 100, 1);
      
      // Mock a slow response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      // When & Then
      await expect(shortTimeoutClient.getGeneration(1)).rejects.toThrow(APIError);
    });

    it('should retry on server errors', async () => {
      // Given
      const clientWithRetries = new PokeAPIClientImpl(GAME_CONSTANTS.API_BASE_URL, 5000, 2);
      
      // First call fails with 500, second succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            pokemon_species: [
              { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' }
            ]
          }),
          status: 200,
          statusText: 'OK'
        } as Response);

      // When
      const result = await clientWithRetries.getGeneration(1);

      // Then
      expect(result.pokemonSpecies).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on client errors', async () => {
      // Given
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as Response);

      // When & Then
      await expect(client.getGeneration(1)).rejects.toThrow(APIError);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should exhaust retries and throw final error', async () => {
      // Given
      const clientWithRetries = new PokeAPIClientImpl(GAME_CONSTANTS.API_BASE_URL, 5000, 2);
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      // When & Then
      await expect(clientWithRetries.getGeneration(1)).rejects.toThrow(APIError);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });
  });

  describe('handleApiError', () => {
    it('should handle APIError', () => {
      // Given
      const error = new APIError('Test API error', 404);
      const consoleSpy = jest.spyOn(console, 'error');

      // When
      const result = client.handleApiError(error);

      // Then
      expect(consoleSpy).toHaveBeenCalledWith('API Error (404): Test API error');
      expect(result).toBe('The requested Pokemon data was not found. Please try starting a new game.');
    });

    it('should handle ValidationError', () => {
      // Given
      const error = new ValidationError('Test validation error');
      const consoleSpy = jest.spyOn(console, 'error');

      // When
      const result = client.handleApiError(error);

      // Then
      expect(consoleSpy).toHaveBeenCalledWith('Validation Error: Test validation error');
      expect(result).toBe('The Pokemon data received was invalid. Please try again.');
    });

    it('should handle generic Error', () => {
      // Given
      const error = new Error('Generic error');
      const consoleSpy = jest.spyOn(console, 'error');

      // When
      const result = client.handleApiError(error);

      // Then
      expect(consoleSpy).toHaveBeenCalledWith('Unexpected Error: Generic error');
      expect(result).toBe('An unexpected error occurred. Please try again.');
    });

    it('should handle timeout errors with user-friendly message', () => {
      // Given
      const error = new APIError('Request timeout after 10000ms', 0);
      const consoleSpy = jest.spyOn(console, 'error');

      // When
      const result = client.handleApiError(error);

      // Then
      expect(consoleSpy).toHaveBeenCalledWith('API Error (0): Request timeout after 10000ms');
      expect(result).toBe('The Pokemon database is taking too long to respond. Please check your internet connection and try again.');
    });

    it('should handle network errors with user-friendly message', () => {
      // Given
      const error = new APIError('Network error: Failed to fetch', 0);
      const consoleSpy = jest.spyOn(console, 'error');

      // When
      const result = client.handleApiError(error);

      // Then
      expect(consoleSpy).toHaveBeenCalledWith('API Error (0): Network error: Failed to fetch');
      expect(result).toBe('Unable to connect to the Pokemon database. Please check your internet connection and try again.');
    });

    it('should handle server errors with user-friendly message', () => {
      // Given
      const error = new APIError('Internal Server Error', 500);
      const consoleSpy = jest.spyOn(console, 'error');

      // When
      const result = client.handleApiError(error);

      // Then
      expect(consoleSpy).toHaveBeenCalledWith('API Error (500): Internal Server Error');
      expect(result).toBe('The Pokemon database is temporarily unavailable. Please try again in a few moments.');
    });

    it('should handle rate limiting errors with user-friendly message', () => {
      // Given
      const error = new APIError('Too Many Requests', 429);
      const consoleSpy = jest.spyOn(console, 'error');

      // When
      const result = client.handleApiError(error);

      // Then
      expect(consoleSpy).toHaveBeenCalledWith('API Error (429): Too Many Requests');
      expect(result).toBe('Too many requests to the Pokemon database. Please wait a moment and try again.');
    });
  });

  describe('generation determination', () => {
    it('should correctly determine generation from Pokemon ID', async () => {
      // Given
      const testCases = [
        { id: 1, expectedGen: 1 },     // Bulbasaur - Gen 1
        { id: 151, expectedGen: 1 },   // Mew - Gen 1
        { id: 152, expectedGen: 2 },   // Chikorita - Gen 2
        { id: 251, expectedGen: 2 },   // Celebi - Gen 2
        { id: 252, expectedGen: 3 },   // Treecko - Gen 3
        { id: 493, expectedGen: 4 },   // Arceus - Gen 4
        { id: 649, expectedGen: 5 },   // Genesect - Gen 5
        { id: 721, expectedGen: 6 },   // Volcanion - Gen 6
        { id: 809, expectedGen: 7 },   // Melmetal - Gen 7
        { id: 905, expectedGen: 8 },   // Enamorus - Gen 8
        { id: 1000, expectedGen: 9 }   // Future Pokemon - Gen 9
      ];

      for (const testCase of testCases) {
        // Given
        const mockResponse = {
          name: 'test-pokemon',
          id: testCase.id,
          types: [{ type: { name: 'normal' } }],
          abilities: [{ ability: { name: 'test-ability' } }]
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
          status: 200,
          statusText: 'OK'
        } as Response);

        // When
        const result = await client.getPokemonDetails(testCase.id);

        // Then
        expect(result.generation).toBe(testCase.expectedGen);
      }
    });
  });
});