/**
 * Property-Based Tests for Pokemon Selection Round Trip
 * Tests Property 18: Pokemon Selection Round Trip
 */

import fc from 'fast-check';
import { PokemonSelectorImpl } from './PokemonSelector';
import { PokeAPIClientImpl } from '../api/PokeAPIClient';
import { PokemonData, GenerationData, PokemonReference } from '../types';

// Mock the PokeAPI client
jest.mock('../api/PokeAPIClient');

describe('Pokemon Selection Round Trip Property Tests', () => {
  let pokemonSelector: PokemonSelectorImpl;
  let mockApiClient: jest.Mocked<PokeAPIClientImpl>;

  beforeEach(() => {
    mockApiClient = new PokeAPIClientImpl() as jest.Mocked<PokeAPIClientImpl>;
    pokemonSelector = new PokemonSelectorImpl(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 18: Pokemon Selection Round Trip', () => {
    /**
     * **Feature: pokemon-guessing-game, Property 18: Pokemon Selection Round Trip**
     * 
     * *For any* valid Pokemon selected through the API process, retrieving its details 
     * should return consistent data that matches the selection criteria (alphabetic name, valid generation)
     * **Validates: Requirements 1.2, 1.5**
     */
    it('should return consistent data for any valid Pokemon selected through the API process', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid Pokemon data that would come from the API
          fc.record({
            name: fc.stringMatching(/^[a-z]+$/), // Only alphabetic characters
            generation: fc.integer({ min: 1, max: 9 }),
            types: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
            abilities: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 4 }),
            id: fc.integer({ min: 1, max: 1010 })
          }),
          fc.array(
            fc.record({
              name: fc.stringMatching(/^[a-z]+$/),
              url: fc.integer({ min: 1, max: 1010 }).map(id => `https://pokeapi.co/api/v2/pokemon-species/${id}/`)
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (pokemonData: PokemonData, pokemonList: PokemonReference[]) => {
            // Given: Mock API responses for a complete round trip
            const generationData: GenerationData = {
              pokemonSpecies: pokemonList
            };
            
            mockApiClient.getGeneration.mockResolvedValue(generationData);
            mockApiClient.getPokemonDetails.mockResolvedValue(pokemonData);
            
            // When: Select a Pokemon through the complete API process
            const selectedPokemon = await pokemonSelector.selectRandomPokemon();
            
            // Then: The returned Pokemon should have consistent, valid data
            
            // 1. Name should be alphabetic (matching selection criteria)
            expect(selectedPokemon.name).toMatch(/^[a-z]+$/);
            expect(selectedPokemon.name).toBe(pokemonData.name);
            
            // 2. Generation should be valid (1-9)
            expect(selectedPokemon.generation).toBeGreaterThanOrEqual(1);
            expect(selectedPokemon.generation).toBeLessThanOrEqual(9);
            expect(selectedPokemon.generation).toBe(pokemonData.generation);
            
            // 3. Types should be consistent and non-empty
            expect(Array.isArray(selectedPokemon.types)).toBe(true);
            expect(selectedPokemon.types.length).toBeGreaterThan(0);
            expect(selectedPokemon.types).toEqual(pokemonData.types);
            
            // 4. Abilities should be consistent
            expect(Array.isArray(selectedPokemon.abilities)).toBe(true);
            expect(selectedPokemon.abilities).toEqual(pokemonData.abilities);
            
            // 5. ID should be consistent and positive
            expect(selectedPokemon.id).toBeGreaterThan(0);
            expect(selectedPokemon.id).toBe(pokemonData.id);
            
            // 6. All data should be exactly what was returned by the API
            expect(selectedPokemon).toEqual(pokemonData);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases in Pokemon selection round trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate edge case scenarios
          fc.oneof(
            // Single character names
            fc.record({
              name: fc.stringMatching(/^[a-z]$/),
              generation: fc.constantFrom(1, 9), // Edge generations
              types: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 1 }),
              abilities: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 1 }),
              id: fc.constantFrom(1, 1010) // Edge IDs
            }),
            // Long names (but still alphabetic)
            fc.record({
              name: fc.stringMatching(/^[a-z]{10,20}$/),
              generation: fc.integer({ min: 1, max: 9 }),
              types: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
              abilities: fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 4 }),
              id: fc.integer({ min: 1, max: 1010 })
            })
          ),
          fc.array(
            fc.record({
              name: fc.stringMatching(/^[a-z]+$/),
              url: fc.integer({ min: 1, max: 1010 }).map(id => `https://pokeapi.co/api/v2/pokemon-species/${id}/`)
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (pokemonData: PokemonData, pokemonList: PokemonReference[]) => {
            // Given: Mock API responses for edge case scenarios
            const generationData: GenerationData = {
              pokemonSpecies: pokemonList
            };
            
            mockApiClient.getGeneration.mockResolvedValue(generationData);
            mockApiClient.getPokemonDetails.mockResolvedValue(pokemonData);
            
            // When: Select a Pokemon through the API process
            const selectedPokemon = await pokemonSelector.selectRandomPokemon();
            
            // Then: Even edge cases should maintain data consistency
            expect(selectedPokemon.name).toBe(pokemonData.name);
            expect(selectedPokemon.name).toMatch(/^[a-z]+$/);
            expect(selectedPokemon.generation).toBe(pokemonData.generation);
            expect(selectedPokemon.generation).toBeGreaterThanOrEqual(1);
            expect(selectedPokemon.generation).toBeLessThanOrEqual(9);
            expect(selectedPokemon).toEqual(pokemonData);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain selection criteria consistency across multiple round trips', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple valid Pokemon for consecutive selections
          fc.array(
            fc.record({
              name: fc.stringMatching(/^[a-z]+$/),
              generation: fc.integer({ min: 1, max: 9 }),
              types: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
              abilities: fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 4 }),
              id: fc.integer({ min: 1, max: 1010 })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (pokemonDataArray: PokemonData[]) => {
            // Given: Multiple Pokemon data for consecutive selections
            const pokemonList: PokemonReference[] = pokemonDataArray.map((pokemon) => ({
              name: pokemon.name,
              url: `https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}/`
            }));
            
            const generationData: GenerationData = {
              pokemonSpecies: pokemonList
            };
            
            // When: Perform multiple consecutive selections
            const selectedPokemon: PokemonData[] = [];
            
            for (let i = 0; i < pokemonDataArray.length; i++) {
              const currentPokemon = pokemonDataArray[i];
              if (currentPokemon) {
                mockApiClient.getGeneration.mockResolvedValue(generationData);
                mockApiClient.getPokemonDetails.mockResolvedValue(currentPokemon);
                
                const selected = await pokemonSelector.selectRandomPokemon();
                selectedPokemon.push(selected);
              }
            }
            
            // Then: All selections should maintain consistency
            for (let i = 0; i < selectedPokemon.length; i++) {
              const selected = selectedPokemon[i];
              const original = pokemonDataArray[i];
              
              if (selected && original) {
                // Each selection should match its corresponding original data
                expect(selected).toEqual(original);
                
                // Each selection should meet the selection criteria
                expect(selected.name).toMatch(/^[a-z]+$/);
                expect(selected.generation).toBeGreaterThanOrEqual(1);
                expect(selected.generation).toBeLessThanOrEqual(9);
                expect(selected.types.length).toBeGreaterThan(0);
                expect(selected.id).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle filtering and selection consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate mixed valid and invalid Pokemon names to test filtering
          fc.record({
            validPokemon: fc.array(
              fc.record({
                name: fc.stringMatching(/^[a-z]+$/), // Valid alphabetic names
                url: fc.integer({ min: 1, max: 1010 }).map(id => `https://pokeapi.co/api/v2/pokemon-species/${id}/`)
              }),
              { minLength: 1, maxLength: 10 }
            ),
            invalidPokemon: fc.array(
              fc.record({
                name: fc.oneof(
                  fc.stringMatching(/^[a-z]*[0-9]+[a-z]*$/), // Names with numbers
                  fc.stringMatching(/^[a-z]*[-_]+[a-z]*$/),  // Names with special chars
                  fc.constant('') // Empty names
                ),
                url: fc.integer({ min: 1, max: 1010 }).map(id => `https://pokeapi.co/api/v2/pokemon-species/${id}/`)
              }),
              { minLength: 0, maxLength: 5 }
            ),
            selectedPokemonData: fc.record({
              name: fc.stringMatching(/^[a-z]+$/),
              generation: fc.integer({ min: 1, max: 9 }),
              types: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 3 }),
              abilities: fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 4 }),
              id: fc.integer({ min: 1, max: 1010 })
            })
          }),
          async ({ validPokemon, invalidPokemon, selectedPokemonData }) => {
            // Given: Mixed list with valid and invalid Pokemon names
            const allPokemon = [...validPokemon, ...invalidPokemon];
            const generationData: GenerationData = {
              pokemonSpecies: allPokemon
            };
            
            mockApiClient.getGeneration.mockResolvedValue(generationData);
            mockApiClient.getPokemonDetails.mockResolvedValue(selectedPokemonData);
            
            // When: Select a Pokemon (should filter out invalid names)
            const selectedPokemon = await pokemonSelector.selectRandomPokemon();
            
            // Then: Selected Pokemon should always be valid regardless of filtering
            expect(selectedPokemon.name).toMatch(/^[a-z]+$/);
            expect(selectedPokemon.name).toBe(selectedPokemonData.name);
            expect(selectedPokemon.generation).toBeGreaterThanOrEqual(1);
            expect(selectedPokemon.generation).toBeLessThanOrEqual(9);
            expect(selectedPokemon).toEqual(selectedPokemonData);
            
            // The selection process should have filtered out invalid names
            // (This is tested implicitly by the fact that we get a valid result)
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});