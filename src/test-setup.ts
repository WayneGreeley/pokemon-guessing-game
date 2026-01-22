/**
 * Test setup configuration for Jest
 * This file is run before each test suite to configure the testing environment
 */

// Mock fetch for API testing
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Mock console.error and console.warn to prevent noise in test output
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore console methods after each test
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidPokemonName(): R;
      toBeValidGeneration(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidPokemonName(received: string) {
    const isValid = /^[a-zA-Z]+$/.test(received);
    return {
      message: () => `expected ${received} to be a valid Pokemon name (alphabetic characters only)`,
      pass: isValid,
    };
  },
  
  toBeValidGeneration(received: number) {
    const isValid = Number.isInteger(received) && received >= 1 && received <= 9;
    return {
      message: () => `expected ${received} to be a valid generation number (1-9)`,
      pass: isValid,
    };
  },
});

// Test data factories for consistent test data
export const createMockPokemonData = (overrides: Partial<import('./types').PokemonData> = {}) => ({
  name: 'pikachu',
  generation: 1,
  types: ['electric'],
  abilities: ['static', 'lightning-rod'],
  id: 25,
  ...overrides,
});

export const createMockGameState = (overrides: Partial<import('./types').GameState> = {}) => ({
  currentPokemon: createMockPokemonData(),
  revealedName: '_ _ _ _ _ _ _',
  guessedLetters: { correct: [], incorrect: [] },
  remainingGuesses: 7,
  gameStatus: 'playing' as const,
  hintsUsed: 0,
  ...overrides,
});

export const createMockPokemonReference = (overrides: Partial<import('./types').PokemonReference> = {}) => ({
  name: 'pikachu',
  url: 'https://pokeapi.co/api/v2/pokemon-species/25/',
  ...overrides,
});

// Mock API responses
export const mockGenerationResponse = {
  pokemon_species: [
    { name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' },
    { name: 'ivysaur', url: 'https://pokeapi.co/api/v2/pokemon-species/2/' },
    { name: 'venusaur', url: 'https://pokeapi.co/api/v2/pokemon-species/3/' },
  ],
};

export const mockPokemonResponse = {
  name: 'pikachu',
  id: 25,
  types: [
    { type: { name: 'electric' } },
  ],
  abilities: [
    { ability: { name: 'static' } },
    { ability: { name: 'lightning-rod' } },
  ],
};