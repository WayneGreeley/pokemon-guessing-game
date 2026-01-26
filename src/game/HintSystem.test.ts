/**
 * Unit tests for HintSystem implementation
 * Tests Pokemon hint generation and formatting
 */

import { HintSystemImpl } from './HintSystem';
import { PokemonData, ValidationError } from '../types';
import { createMockPokemonData } from '../test-setup';
import * as fc from 'fast-check';

describe('HintSystem', () => {
  let hintSystem: HintSystemImpl;

  beforeEach(() => {
    hintSystem = new HintSystemImpl();
  });

  describe('initializePokemon', () => {
    it('should initialize with valid Pokemon data', () => {
      // Given
      const pokemon = createMockPokemonData();

      // When
      hintSystem.initializePokemon(pokemon);

      // Then
      expect(hintSystem.hasMoreHints()).toBe(true);
      expect(hintSystem.getHintsProvided()).toBe(0);
    });

    it('should throw error for null Pokemon data', () => {
      // Given
      const pokemon = null as any;

      // When & Then
      expect(() => hintSystem.initializePokemon(pokemon)).toThrow(ValidationError);
    });

    it('should throw error for invalid generation', () => {
      // Given
      const pokemon = createMockPokemonData({
        generation: 0 // Invalid generation
      });

      // When & Then
      expect(() => hintSystem.initializePokemon(pokemon)).toThrow(ValidationError);
    });

    it('should throw error for non-array types', () => {
      // Given
      const pokemon = createMockPokemonData({
        name: 'pikachu',
        generation: 1,
        types: 'electric' as any, // Should be array
        abilities: ['static'],
        id: 25
      });

      // When & Then
      expect(() => hintSystem.initializePokemon(pokemon)).toThrow(ValidationError);
    });

    it('should throw error for non-array abilities', () => {
      // Given
      const pokemon = createMockPokemonData({
        name: 'pikachu',
        generation: 1,
        types: ['electric'],
        abilities: 'static' as any, // Should be array
        id: 25
      });

      // When & Then
      expect(() => hintSystem.initializePokemon(pokemon)).toThrow(ValidationError);
    });
  });

  describe('generateHint', () => {
    beforeEach(() => {
      const pokemon = createMockPokemonData();
      hintSystem.initializePokemon(pokemon);
    });

    it('should generate hint with generation, types, and abilities', () => {
      // When
      const hint = hintSystem.generateHint();

      // Then
      expect(hint).toContain('Generation: 1');
      expect(hint).toContain('Type: Electric');
      expect(hint).toContain('Abilities: Static, Lightning Rod');
      expect(hintSystem.getHintsProvided()).toBe(1);
    });

    it('should handle multiple types correctly', () => {
      // Given
      const pokemon = createMockPokemonData({
        name: 'charizard',
        types: ['fire', 'flying'],
        abilities: ['blaze', 'solar-power'],
        id: 6
      });
      hintSystem.initializePokemon(pokemon);

      // When
      const hint = hintSystem.generateHint();

      // Then
      expect(hint).toContain('Generation: 1');
      expect(hint).toContain('Types: Fire, Flying');
      expect(hint).toContain('Abilities: Blaze, Solar Power');
    });

    it('should handle single ability correctly', () => {
      // Given
      const pokemon: PokemonData = createMockPokemonData({
        name: 'snorlax',
        generation: 1,
        types: ['normal'],
        abilities: ['immunity'],
        id: 143
      });
      hintSystem.initializePokemon(pokemon);

      // When
      const hint = hintSystem.generateHint();

      // Then
      expect(hint).toContain('Generation: 1');
      expect(hint).toContain('Type: Normal');
      expect(hint).toContain('Ability: Immunity');
    });

    it('should format hyphenated ability names correctly', () => {
      // Given
      const pokemon: PokemonData = createMockPokemonData({
        name: 'pikachu',
        generation: 1,
        types: ['electric'],
        abilities: ['lightning-rod', 'motor-drive'],
        id: 25
      });
      hintSystem.initializePokemon(pokemon);

      // When
      const hint = hintSystem.generateHint();

      // Then
      expect(hint).toContain('Abilities: Lightning Rod, Motor Drive');
    });

    it('should handle empty abilities array', () => {
      // Given
      const pokemon: PokemonData = createMockPokemonData({
        name: 'missingno',
        generation: 1,
        types: ['normal'],
        abilities: [],
        id: 0
      });
      hintSystem.initializePokemon(pokemon);

      // When
      const hint = hintSystem.generateHint();

      // Then
      expect(hint).toContain('Generation: 1');
      expect(hint).toContain('Type: Normal');
      expect(hint).not.toContain('Abilities:');
      expect(hint).not.toContain('Ability:');
    });

    it('should handle empty types array', () => {
      // Given
      const pokemon: PokemonData = createMockPokemonData({
        name: 'missingno',
        generation: 1,
        types: [],
        abilities: ['static'],
        id: 0
      });
      hintSystem.initializePokemon(pokemon);

      // When
      const hint = hintSystem.generateHint();

      // Then
      expect(hint).toContain('Generation: 1');
      expect(hint).toContain('Ability: Static');
      expect(hint).not.toContain('Types:');
      expect(hint).not.toContain('Type:');
    });

    it('should increment hints provided counter', () => {
      // When
      hintSystem.generateHint();
      hintSystem.generateHint();
      hintSystem.generateHint();

      // Then
      expect(hintSystem.getHintsProvided()).toBe(3);
    });

    it('should throw error when no Pokemon is initialized', () => {
      // Given
      const uninitializedHintSystem = new HintSystemImpl();

      // When & Then
      expect(() => uninitializedHintSystem.generateHint()).toThrow(ValidationError);
    });
  });

  describe('hasMoreHints', () => {
    it('should return false when no Pokemon is initialized', () => {
      // When
      const hasMore = hintSystem.hasMoreHints();

      // Then
      expect(hasMore).toBe(false);
    });

    it('should return true when Pokemon is initialized', () => {
      // Given
      const pokemon: PokemonData = createMockPokemonData({
        name: 'pikachu',
        generation: 1,
        types: ['electric'],
        abilities: ['static'],
        id: 25
      });
      hintSystem.initializePokemon(pokemon);

      // When
      const hasMore = hintSystem.hasMoreHints();

      // Then
      expect(hasMore).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset hint system to initial state', () => {
      // Given
      const pokemon: PokemonData = createMockPokemonData({
        name: 'pikachu',
        generation: 1,
        types: ['electric'],
        abilities: ['static'],
        id: 25
      });
      hintSystem.initializePokemon(pokemon);
      hintSystem.generateHint();
      hintSystem.generateHint();

      // When
      hintSystem.reset();

      // Then
      expect(hintSystem.hasMoreHints()).toBe(false);
      expect(hintSystem.getHintsProvided()).toBe(0);
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 11: Hint Content Completeness', () => {
      /**
       * **Feature: pokemon-guessing-game, Property 11: Hint Content Completeness**
       * *For any* Pokemon with valid data, generated hints should contain the Pokemon's generation number, all types, and all ability names
       * **Validates: Requirements 4.2**
       */
      it('should include generation, all types, and all abilities in hint for any valid Pokemon', () => {
        // Given - Property test with 100 iterations for comprehensive coverage
        fc.assert(
          fc.property(
            // Generate valid Pokemon data
            fc.record({
              name: fc.stringMatching(/^[a-z]{3,15}$/),
              generation: fc.integer({ min: 1, max: 9 }),
              types: fc.array(
                fc.oneof(
                  fc.constant('normal'), fc.constant('fire'), fc.constant('water'),
                  fc.constant('electric'), fc.constant('grass'), fc.constant('ice'),
                  fc.constant('fighting'), fc.constant('poison'), fc.constant('ground'),
                  fc.constant('flying'), fc.constant('psychic'), fc.constant('bug'),
                  fc.constant('rock'), fc.constant('ghost'), fc.constant('dragon'),
                  fc.constant('dark'), fc.constant('steel'), fc.constant('fairy')
                ),
                { minLength: 1, maxLength: 2 }
              ),
              abilities: fc.array(
                fc.oneof(
                  fc.constant('static'), fc.constant('lightning-rod'), fc.constant('motor-drive'),
                  fc.constant('blaze'), fc.constant('solar-power'), fc.constant('overgrow'),
                  fc.constant('chlorophyll'), fc.constant('torrent'), fc.constant('rain-dish')
                ),
                { minLength: 1, maxLength: 3 }
              ),
              id: fc.integer({ min: 1, max: 1000 })
            }).map(data => createMockPokemonData(data)),
            (pokemon) => {
              // When - Initialize hint system and generate hint
              hintSystem.initializePokemon(pokemon);
              const hint = hintSystem.generateHint();

              // Then - Verify hint contains all required information
              // Check generation is included
              expect(hint).toContain(`Generation: ${pokemon.generation}`);

              // Check all types are included
              pokemon.types.forEach(type => {
                const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
                expect(hint).toContain(capitalizedType);
              });

              // Check all abilities are included
              pokemon.abilities.forEach(ability => {
                const formattedAbility = ability
                  .split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                expect(hint).toContain(formattedAbility);
              });

              // Verify hint structure contains expected sections
              if (pokemon.types.length === 1) {
                expect(hint).toContain('Type:');
              } else {
                expect(hint).toContain('Types:');
              }

              if (pokemon.abilities.length === 1) {
                expect(hint).toContain('Ability:');
              } else {
                expect(hint).toContain('Abilities:');
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle edge cases with empty types or abilities arrays', () => {
        // Given - Property test for edge cases with empty arrays
        fc.assert(
          fc.property(
            fc.record({
              name: fc.stringMatching(/^[a-z]{3,15}$/),
              generation: fc.integer({ min: 1, max: 9 }),
              types: fc.oneof(
                fc.constant([]), // Empty types array
                fc.array(fc.constant('normal'), { minLength: 1, maxLength: 2 })
              ),
              abilities: fc.oneof(
                fc.constant([]), // Empty abilities array
                fc.array(fc.constant('static'), { minLength: 1, maxLength: 2 })
              ),
              id: fc.integer({ min: 1, max: 1000 })
            }).map(data => createMockPokemonData(data)),
            (pokemon) => {
              // When - Initialize hint system and generate hint
              hintSystem.initializePokemon(pokemon);
              const hint = hintSystem.generateHint();

              // Then - Verify generation is always included
              expect(hint).toContain(`Generation: ${pokemon.generation}`);

              // Verify empty arrays don't cause type/ability sections to appear
              if (pokemon.types.length === 0) {
                expect(hint).not.toContain('Type:');
                expect(hint).not.toContain('Types:');
              }

              if (pokemon.abilities.length === 0) {
                expect(hint).not.toContain('Ability:');
                expect(hint).not.toContain('Abilities:');
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should format hyphenated ability names consistently across all Pokemon', () => {
        // Given - Property test for ability name formatting consistency
        fc.assert(
          fc.property(
            fc.record({
              name: fc.stringMatching(/^[a-z]{3,15}$/),
              generation: fc.integer({ min: 1, max: 9 }),
              types: fc.array(fc.constant('normal'), { minLength: 1, maxLength: 1 }),
              abilities: fc.array(
                fc.oneof(
                  fc.constant('lightning-rod'),
                  fc.constant('motor-drive'),
                  fc.constant('solar-power'),
                  fc.constant('rain-dish'),
                  fc.constant('compound-eyes'),
                  fc.constant('keen-eye')
                ),
                { minLength: 1, maxLength: 3 }
              ),
              id: fc.integer({ min: 1, max: 1000 })
            }).map(data => createMockPokemonData(data)),
            (pokemon) => {
              // When - Initialize hint system and generate hint
              hintSystem.initializePokemon(pokemon);
              const hint = hintSystem.generateHint();

              // Then - Verify all hyphenated abilities are properly formatted
              pokemon.abilities.forEach(ability => {
                if (ability.includes('-')) {
                  // Check that the hyphenated version doesn't appear in the hint
                  expect(hint).not.toContain(ability);
                  
                  // Check that the properly formatted version appears
                  const formattedAbility = ability
                    .split('-')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                  expect(hint).toContain(formattedAbility);
                }
              });
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});