/**
 * Tests for Pokemon Selector implementation
 * Includes both unit tests and property-based tests
 */

import * as fc from 'fast-check';
import { PokemonSelectorImpl } from './PokemonSelector';
import { PokeAPIClient, PokemonReference, GAME_CONSTANTS } from '../types';
import { createMockPokemonData, createMockPokemonReference } from '../test-setup';

// Mock PokeAPI client for testing
const createMockApiClient = (): jest.Mocked<PokeAPIClient> => ({
  getGeneration: jest.fn(),
  getPokemonDetails: jest.fn(),
  handleApiError: jest.fn()
});

describe('PokemonSelectorImpl', () => {
  let selector: PokemonSelectorImpl;
  let mockApiClient: jest.Mocked<PokeAPIClient>;

  beforeEach(() => {
    // Given
    mockApiClient = createMockApiClient();
    selector = new PokemonSelectorImpl(mockApiClient);
  });

  describe('Property-Based Tests', () => {
    describe('Property 1: Generation Selection Range', () => {
      /**
       * **Validates: Requirements 1.1**
       * 
       * Property: For any new game initialization, the randomly selected generation number 
       * should always be between 1 and 9 (inclusive)
       * 
       * This property test verifies that the selectRandomGeneration method always returns
       * a valid generation number within the specified range, regardless of how many times
       * it's called or under what conditions.
       */
      it('should always select generation numbers between 1 and 9 (inclusive)', () => {
        // Given - Property test with 100 iterations to ensure comprehensive coverage
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 1000 }), // Number of calls to test
            (numCalls) => {
              // When - Call selectRandomGeneration multiple times
              for (let i = 0; i < numCalls; i++) {
                const generation = selector.selectRandomGeneration();
                
                // Then - Each generation must be within valid range
                expect(generation).toBeGreaterThanOrEqual(GAME_CONSTANTS.MIN_GENERATION);
                expect(generation).toBeLessThanOrEqual(GAME_CONSTANTS.MAX_GENERATION);
                expect(Number.isInteger(generation)).toBe(true);
              }
            }
          ),
          { 
            numRuns: 100,
            verbose: true
          }
        );
      });

      it('should generate all possible generation values over many calls', () => {
        // Given - Track which generations are generated
        const generatedValues = new Set<number>();
        const maxAttempts = 10000; // Large number to ensure we hit all values
        
        // When - Generate many random generations
        for (let i = 0; i < maxAttempts; i++) {
          const generation = selector.selectRandomGeneration();
          generatedValues.add(generation);
          
          // Early exit if we've seen all possible values
          if (generatedValues.size === GAME_CONSTANTS.MAX_GENERATION - GAME_CONSTANTS.MIN_GENERATION + 1) {
            break;
          }
        }
        
        // Then - All generation values should eventually be generated
        for (let gen = GAME_CONSTANTS.MIN_GENERATION; gen <= GAME_CONSTANTS.MAX_GENERATION; gen++) {
          expect(generatedValues.has(gen)).toBe(true);
        }
      });
    });

    describe('Property 2: Pokemon Name Filtering', () => {
      /**
       * **Validates: Requirements 1.3**
       * 
       * Property: For any list of Pokemon names, filtering should exclude all names 
       * containing non-alphabetic characters and preserve all names containing only 
       * alphabetic characters
       * 
       * This property test verifies that the filterValidPokemon method correctly
       * separates valid Pokemon names (alphabetic only) from invalid ones (containing
       * non-alphabetic characters) across all possible input combinations.
       */
      it('should exclude names with non-alphabetic characters and preserve alphabetic names', () => {
        // Given - Property test with 100 iterations for comprehensive coverage
        fc.assert(
          fc.property(
            fc.array(
              fc.oneof(
                // Generate valid Pokemon names (alphabetic only)
                fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
                // Generate invalid Pokemon names (containing non-alphabetic characters)
                fc.string({ minLength: 1, maxLength: 20 }).filter(s => !/^[a-zA-Z]+$/.test(s))
              ),
              { minLength: 0, maxLength: 50 }
            ),
            (pokemonNames: string[]) => {
              // When - Create Pokemon references and filter them
              const pokemonList: PokemonReference[] = pokemonNames.map((name, index) => 
                createMockPokemonReference({ 
                  name, 
                  url: `https://pokeapi.co/api/v2/pokemon-species/${index + 1}/` 
                })
              );
              
              const filtered = selector.filterValidPokemon(pokemonList);
              
              // Then - Verify filtering correctness
              // All filtered names should contain only alphabetic characters
              filtered.forEach(pokemon => {
                expect(pokemon.name).toMatch(/^[a-zA-Z]+$/);
              });
              
              // All original valid names should be preserved
              const originalValidNames = pokemonNames.filter(name => /^[a-zA-Z]+$/.test(name));
              const filteredNames = filtered.map(p => p.name);
              
              originalValidNames.forEach(validName => {
                expect(filteredNames).toContain(validName);
              });
              
              // No invalid names should remain
              const originalInvalidNames = pokemonNames.filter(name => !/^[a-zA-Z]+$/.test(name));
              originalInvalidNames.forEach(invalidName => {
                expect(filteredNames).not.toContain(invalidName);
              });
              
              // Filtered list length should equal number of valid names
              expect(filtered.length).toBe(originalValidNames.length);
            }
          ),
          { 
            numRuns: 100,
            verbose: true
          }
        );
      });

      it('should handle edge cases in Pokemon name filtering', () => {
        // Given - Property test for edge cases
        fc.assert(
          fc.property(
            fc.oneof(
              // Empty array
              fc.constant([]),
              // Array with only valid names
              fc.array(fc.string({ minLength: 1, maxLength: 15 }).filter(s => /^[a-zA-Z]+$/.test(s)), { minLength: 1, maxLength: 10 }),
              // Array with only invalid names
              fc.array(fc.string({ minLength: 1, maxLength: 15 }).filter(s => !/^[a-zA-Z]+$/.test(s)), { minLength: 1, maxLength: 10 }),
              // Mixed case names
              fc.array(fc.string({ minLength: 1, maxLength: 15 }).filter(s => /^[a-zA-Z]+$/.test(s)), { minLength: 1, maxLength: 10 })
            ),
            (testCase: string[]) => {
              // When - Create Pokemon references and filter
              const pokemonList: PokemonReference[] = testCase.map((name: string, index: number) => 
                createMockPokemonReference({ 
                  name, 
                  url: `https://pokeapi.co/api/v2/pokemon-species/${index + 1}/` 
                })
              );
              
              const filtered = selector.filterValidPokemon(pokemonList);
              
              // Then - Verify edge case handling
              // Result should always be an array
              expect(Array.isArray(filtered)).toBe(true);
              
              // All filtered names should be valid
              filtered.forEach(pokemon => {
                expect(pokemon.name).toMatch(/^[a-zA-Z]+$/);
                expect(pokemon.name.length).toBeGreaterThan(0);
              });
              
              // Filtered count should not exceed original count
              expect(filtered.length).toBeLessThanOrEqual(pokemonList.length);
            }
          ),
          { 
            numRuns: 100,
            verbose: true
          }
        );
      });
    });

    describe('Property 3: Random Selection Validity', () => {
      /**
       * **Validates: Requirements 1.4**
       * 
       * Property: For any non-empty filtered Pokemon list, random selection should always 
       * return a Pokemon that exists in that list
       * 
       * This property test verifies that the selectRandomPokemon method always returns
       * a Pokemon that was actually present in the filtered list, ensuring the random
       * selection logic maintains data integrity and never returns invalid results.
       */
      it('should always return a Pokemon that exists in the provided list', async () => {
        // Given - Property test with 100 iterations for comprehensive coverage
        await fc.assert(
          fc.asyncProperty(
            // Generate non-empty arrays of valid Pokemon names
            fc.array(
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
              { minLength: 1, maxLength: 50 }
            ).filter(names => names.length > 0), // Ensure non-empty
            async (pokemonNames) => {
              // When - Create Pokemon references with valid names
              const pokemonList: PokemonReference[] = pokemonNames.map((name, index) => 
                createMockPokemonReference({ 
                  name, 
                  url: `https://pokeapi.co/api/v2/pokemon-species/${index + 1}/` 
                })
              );
              
              // Filter to get valid Pokemon (should be all of them since we generated valid names)
              const filteredList = selector.filterValidPokemon(pokemonList);
              
              // Skip if filtering resulted in empty list (shouldn't happen with our generator)
              if (filteredList.length === 0) {
                return;
              }
              
              // Mock API calls for the test
              const mockGenerationData = { pokemonSpecies: filteredList };
              
              mockApiClient.getGeneration.mockResolvedValue(mockGenerationData);
              mockApiClient.getPokemonDetails.mockImplementation(async (id: number) => {
                // Find the Pokemon that corresponds to this ID
                const selectedPokemon = filteredList.find(p => 
                  p.url.includes(`/${id}/`)
                );
                return createMockPokemonData({ 
                  name: selectedPokemon?.name || filteredList[0]!.name,
                  id 
                });
              });
              
              // Then - The selected Pokemon should always be from the filtered list
              const selectedPokemon = await selector.selectRandomPokemon();
              
              // Verify the selected Pokemon name exists in the original filtered list
              const filteredNames = filteredList.map(p => p.name);
              expect(filteredNames).toContain(selectedPokemon.name);
              
              // Verify API calls were made correctly
              expect(mockApiClient.getGeneration).toHaveBeenCalledWith(expect.any(Number));
              expect(mockApiClient.getPokemonDetails).toHaveBeenCalledWith(expect.any(Number));
            }
          ),
          { 
            numRuns: 100,
            verbose: true
          }
        );
      });

      it('should handle single-item lists correctly', async () => {
        // Given - Property test for single-item edge case
        await fc.assert(
          fc.asyncProperty(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
            async (pokemonName) => {
              // When - Create a single-item Pokemon list
              const pokemonList: PokemonReference[] = [
                createMockPokemonReference({ 
                  name: pokemonName, 
                  url: 'https://pokeapi.co/api/v2/pokemon-species/1/' 
                })
              ];
              
              const filteredList = selector.filterValidPokemon(pokemonList);
              
              // Skip if filtering resulted in empty list
              if (filteredList.length === 0) {
                return;
              }
              
              // Mock API calls
              const mockGenerationData = { pokemonSpecies: filteredList };
              const mockPokemonData = createMockPokemonData({ 
                name: pokemonName,
                id: 1 
              });
              
              mockApiClient.getGeneration.mockResolvedValue(mockGenerationData);
              mockApiClient.getPokemonDetails.mockResolvedValue(mockPokemonData);
              
              // Then - Should always return the single Pokemon
              const selectedPokemon = await selector.selectRandomPokemon();
              expect(selectedPokemon.name).toBe(pokemonName);
            }
          ),
          { 
            numRuns: 50,
            verbose: true
          }
        );
      });

      it('should maintain selection validity across multiple calls', async () => {
        // Given - Property test for consistency across multiple selections
        await fc.assert(
          fc.asyncProperty(
            fc.array(
              fc.string({ minLength: 1, maxLength: 15 }).filter(s => /^[a-zA-Z]+$/.test(s)),
              { minLength: 2, maxLength: 20 }
            ).filter(names => names.length >= 2), // Ensure multiple options
            fc.integer({ min: 2, max: 10 }), // Number of selections to test
            async (pokemonNames, numSelections) => {
              // When - Create Pokemon list and make multiple selections
              const pokemonList: PokemonReference[] = pokemonNames.map((name, index) => 
                createMockPokemonReference({ 
                  name, 
                  url: `https://pokeapi.co/api/v2/pokemon-species/${index + 1}/` 
                })
              );
              
              const filteredList = selector.filterValidPokemon(pokemonList);
              
              // Skip if filtering resulted in insufficient Pokemon
              if (filteredList.length < 2) {
                return;
              }
              
              const filteredNames = filteredList.map(p => p.name);
              
              // Mock API calls for multiple selections
              mockApiClient.getGeneration.mockResolvedValue({ pokemonSpecies: filteredList });
              mockApiClient.getPokemonDetails.mockImplementation(async (id: number) => {
                const selectedPokemon = filteredList.find(p => 
                  p.url.includes(`/${id}/`)
                );
                return createMockPokemonData({ 
                  name: selectedPokemon?.name || filteredList[0]!.name,
                  id 
                });
              });
              
              // Then - All selections should be valid
              for (let i = 0; i < numSelections; i++) {
                const selectedPokemon = await selector.selectRandomPokemon();
                expect(filteredNames).toContain(selectedPokemon.name);
              }
            }
          ),
          { 
            numRuns: 50,
            verbose: true
          }
        );
      });
    });
  });

  describe('Unit Tests', () => {
    describe('selectRandomGeneration', () => {
      it('should return integer values only', () => {
        // Given - Multiple calls to test consistency
        const generations: number[] = [];
        
        // When - Generate several random generations
        for (let i = 0; i < 50; i++) {
          generations.push(selector.selectRandomGeneration());
        }
        
        // Then - All values should be integers
        generations.forEach(gen => {
          expect(Number.isInteger(gen)).toBe(true);
        });
      });
    });

    describe('filterValidPokemon', () => {
      it('should filter out Pokemon with non-alphabetic characters', () => {
        // Given
        const pokemonList: PokemonReference[] = [
          createMockPokemonReference({ name: 'pikachu' }), // Valid
          createMockPokemonReference({ name: 'mr-mime' }), // Invalid (hyphen)
          createMockPokemonReference({ name: 'bulbasaur' }), // Valid
          createMockPokemonReference({ name: 'ho-oh' }), // Invalid (hyphen)
          createMockPokemonReference({ name: 'charizard' }), // Valid
          createMockPokemonReference({ name: 'porygon2' }), // Invalid (number)
        ];

        // When
        const filtered = selector.filterValidPokemon(pokemonList);

        // Then
        expect(filtered).toHaveLength(3);
        expect(filtered.map(p => p.name)).toEqual(['pikachu', 'bulbasaur', 'charizard']);
      });

      it('should return empty array when no valid Pokemon exist', () => {
        // Given
        const pokemonList: PokemonReference[] = [
          createMockPokemonReference({ name: 'mr-mime' }),
          createMockPokemonReference({ name: 'ho-oh' }),
          createMockPokemonReference({ name: 'porygon2' }),
        ];

        // When
        const filtered = selector.filterValidPokemon(pokemonList);

        // Then
        expect(filtered).toHaveLength(0);
      });

      it('should handle empty input list', () => {
        // Given
        const pokemonList: PokemonReference[] = [];

        // When
        const filtered = selector.filterValidPokemon(pokemonList);

        // Then
        expect(filtered).toHaveLength(0);
      });
    });

    describe('selectRandomPokemon', () => {
      it('should successfully select a Pokemon', async () => {
        // Given
        const mockGenerationData = {
          pokemonSpecies: [
            createMockPokemonReference({ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon-species/25/' }),
            createMockPokemonReference({ name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' })
          ]
        };
        const mockPokemonData = createMockPokemonData();

        mockApiClient.getGeneration.mockResolvedValue(mockGenerationData);
        mockApiClient.getPokemonDetails.mockResolvedValue(mockPokemonData);

        // When
        const result = await selector.selectRandomPokemon();

        // Then
        expect(result).toEqual(mockPokemonData);
        expect(mockApiClient.getGeneration).toHaveBeenCalledWith(
          expect.any(Number)
        );
        expect(mockApiClient.getPokemonDetails).toHaveBeenCalledWith(
          expect.any(Number)
        );
      });

      it('should throw error when no valid Pokemon found', async () => {
        // Given
        const mockGenerationData = {
          pokemonSpecies: [
            createMockPokemonReference({ name: 'mr-mime' }), // Invalid name
            createMockPokemonReference({ name: 'ho-oh' }) // Invalid name
          ]
        };

        mockApiClient.getGeneration.mockResolvedValue(mockGenerationData);

        // When & Then
        await expect(selector.selectRandomPokemon()).rejects.toThrow('No valid Pokemon found');
      });
    });
  });
});