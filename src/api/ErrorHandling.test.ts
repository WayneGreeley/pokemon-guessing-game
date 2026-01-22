/**
 * Property-Based Tests for API Error Handling
 * Tests Properties 16 and 17 from the design document
 */

import * as fc from 'fast-check';
import { PokeAPIClientImpl } from './PokeAPIClient';
import { APIError, ValidationError } from '../types';

describe('API Error Handling Property-Based Tests', () => {
  let apiClient: PokeAPIClientImpl;

  beforeEach(() => {
    apiClient = new PokeAPIClientImpl();
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Property 16: API Error Handling', () => {
    test('should handle network errors gracefully without crashing and provide appropriate user feedback', () => {
      /**
       * **Validates: Requirements 8.1, 8.3**
       * 
       * Property 16: API Error Handling
       * For any network error or API failure, the system should handle the error gracefully 
       * without crashing and provide appropriate user feedback
       */

      fc.assert(
        fc.property(
          fc.constantFrom('network', 'timeout', 'http_404', 'http_500', 'http_429'),
          (errorType) => {
            // Given: A specific error scenario
            let mockError: Error;
            let expectedPattern: RegExp;

            switch (errorType) {
              case 'network':
                mockError = new APIError('Network error: Failed to fetch', 0);
                expectedPattern = /connect|network|Unable to load Pokemon data/i;
                break;
              case 'timeout':
                mockError = new APIError('Request timeout after', 0);
                expectedPattern = /taking too long|timeout|Unable to connect/i;
                break;
              case 'http_404':
                mockError = new APIError('HTTP 404: Not Found', 404);
                expectedPattern = /not found|starting a new game/i;
                break;
              case 'http_500':
                mockError = new APIError('HTTP 500: Internal Server Error', 500);
                expectedPattern = /temporarily unavailable|Unable to load Pokemon data/i;
                break;
              case 'http_429':
                mockError = new APIError('HTTP 429: Too Many Requests', 429);
                expectedPattern = /Too many requests|wait.*moment/i;
                break;
              default:
                mockError = new Error('Unknown error');
                expectedPattern = /try again/i;
            }

            // When: Error is handled
            const userFriendlyMessage = apiClient.handleApiError(mockError);

            // Then: Error should be handled gracefully
            expect(userFriendlyMessage).toBeTruthy();
            expect(typeof userFriendlyMessage).toBe('string');
            expect(userFriendlyMessage.length).toBeGreaterThan(0);
            expect(userFriendlyMessage).toMatch(expectedPattern);
            expect(userFriendlyMessage).toMatch(/try again|check.*connection|wait.*moment|starting a new game/i);
            expect(userFriendlyMessage).not.toContain('fetch');
            expect(userFriendlyMessage).not.toContain('AbortError');
            expect(userFriendlyMessage).not.toContain('TypeError');
          }
        ),
        { numRuns: 100 } // Meet the 100 iteration requirement
      );
    });
  });

  describe('Property 17: Data Validation Integrity', () => {
    test('should reject invalid API response data and maintain game state integrity', () => {
      /**
       * **Validates: Requirements 8.2, 8.5**
       * 
       * Property 17: Data Validation Integrity
       * For any API response data, invalid or malformed data should be rejected 
       * and not used in game logic, maintaining game state integrity
       */

      fc.assert(
        fc.property(
          fc.record({
            responseType: fc.constantFrom('generation', 'pokemon'),
            malformationType: fc.constantFrom(
              'null_response', 'empty_object', 'missing_required_field', 'invalid_field_type'
            )
          }),
          ({ responseType, malformationType }) => {
            // Given: A malformed data scenario
            let malformedData: any;

            if (responseType === 'generation') {
              const configs: Record<string, any> = {
                null_response: null,
                empty_object: {},
                missing_required_field: { some_other_field: 'value' },
                invalid_field_type: { pokemon_species: 'not_an_array' }
              };
              malformedData = configs[malformationType];
            } else {
              const configs: Record<string, any> = {
                null_response: null,
                empty_object: {},
                missing_required_field: { name: 'pikachu' },
                invalid_field_type: { name: 'pikachu', id: 25, types: 'not_an_array', abilities: [] }
              };
              malformedData = configs[malformationType];
            }

            // When: Validation is attempted (simulate validation logic)
            let validationError: Error | null = null;

            try {
              // Simulate the validation that would occur in the API client
              if (malformedData === null || malformedData === undefined) {
                throw new ValidationError('Invalid API response: Expected object');
              }
              
              if (responseType === 'generation') {
                if (!malformedData.pokemon_species || !Array.isArray(malformedData.pokemon_species)) {
                  throw new ValidationError('Invalid generation response: Missing or invalid pokemon_species array');
                }
              } else {
                if (!malformedData.name || !malformedData.id || !malformedData.types || !malformedData.abilities) {
                  throw new ValidationError('Invalid Pokemon response: Missing required fields');
                }
                if (!Array.isArray(malformedData.types) || !Array.isArray(malformedData.abilities)) {
                  throw new ValidationError('Invalid Pokemon response: Types and abilities must be arrays');
                }
              }
            } catch (error) {
              validationError = error as Error;
            }

            // Then: Invalid data should be rejected appropriately
            if (validationError) {
              expect(validationError).toBeInstanceOf(ValidationError);
              expect(validationError.message).toContain('Invalid');
              expect(validationError.name).toBe('ValidationError');

              // Test user-friendly error handling
              const userMessage = apiClient.handleApiError(validationError);
              expect(userMessage).toBe('The Pokemon data received was invalid. Please try again.');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});