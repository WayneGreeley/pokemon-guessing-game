/**
 * Tests for core TypeScript interfaces and type guards
 */

import { 
  isPokemonData, 
  isGameState, 
  GAME_CONSTANTS
} from './index';
import { createMockPokemonData, createMockGameState } from '../test-setup';

describe('Type Guards', () => {
  describe('isPokemonData', () => {
    it('should return true for valid PokemonData', () => {
      // Given
      const validPokemon = createMockPokemonData();
      
      // When
      const result = isPokemonData(validPokemon);
      
      // Then
      expect(result).toBe(true);
    });

    it('should return false for invalid data', () => {
      // Given
      const invalidData = { name: 'test' }; // Missing required fields
      
      // When
      const result = isPokemonData(invalidData);
      
      // Then
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      // Given
      const nullData = null;
      
      // When
      const result = isPokemonData(nullData);
      
      // Then
      expect(result).toBe(false);
    });
  });

  describe('isGameState', () => {
    it('should return true for valid GameState', () => {
      // Given
      const validState = createMockGameState();
      
      // When
      const result = isGameState(validState);
      
      // Then
      expect(result).toBe(true);
    });

    it('should return false for invalid data', () => {
      // Given
      const invalidData = { gameStatus: 'invalid' };
      
      // When
      const result = isGameState(invalidData);
      
      // Then
      expect(result).toBe(false);
    });
  });
});

describe('Constants', () => {
  it('should have correct initial values', () => {
    // Given/When/Then
    expect(GAME_CONSTANTS.INITIAL_GUESSES).toBe(7);
    expect(GAME_CONSTANTS.MIN_GENERATION).toBe(1);
    expect(GAME_CONSTANTS.MAX_GENERATION).toBe(9);
    expect(GAME_CONSTANTS.HINT_COST).toBe(1);
    expect(GAME_CONSTANTS.API_BASE_URL).toBe('https://pokeapi.co/api/v2');
  });
});

describe('Custom Jest Matchers', () => {
  it('should validate Pokemon names correctly', () => {
    // Given/When/Then
    expect('pikachu').toBeValidPokemonName();
    expect('bulbasaur').toBeValidPokemonName();
    expect('mr-mime').not.toBeValidPokemonName(); // Contains hyphen
    expect('123').not.toBeValidPokemonName(); // Contains numbers
  });

  it('should validate generation numbers correctly', () => {
    // Given/When/Then
    expect(1).toBeValidGeneration();
    expect(5).toBeValidGeneration();
    expect(9).toBeValidGeneration();
    expect(0).not.toBeValidGeneration(); // Too low
    expect(10).not.toBeValidGeneration(); // Too high
    expect(1.5).not.toBeValidGeneration(); // Not integer
  });
});