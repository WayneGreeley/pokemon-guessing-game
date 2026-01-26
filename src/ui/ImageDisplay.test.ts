/**
 * Unit tests for ImageDisplay component
 */

import { ImageDisplayImpl } from './ImageDisplay';
import { PokemonData } from '../types';
import { createMockPokemonData } from '../test-setup';
import * as fc from 'fast-check';

// Mock DOM elements for testing
const mockImageContainer = {
  style: { display: 'none' }
};

const mockImageElement = {
  style: { display: 'none' },
  classList: {
    add: jest.fn(),
    remove: jest.fn()
  },
  src: '',
  alt: '',
  onerror: null as (() => void) | null,
  onload: null as (() => void) | null
};

const mockPlaceholderElement = {
  style: { display: 'none' },
  querySelector: jest.fn().mockReturnValue({
    textContent: ''
  })
};

// Mock document.getElementById
const originalGetElementById = document.getElementById;
const mockGetElementById = jest.fn((id: string) => {
  switch (id) {
    case 'pokemon-image-container':
      return mockImageContainer as any;
    case 'pokemon-image':
      return mockImageElement as any;
    case 'pokemon-image-placeholder':
      return mockPlaceholderElement as any;
    default:
      return null;
  }
});

describe('ImageDisplay', () => {
  let imageDisplay: ImageDisplayImpl;
  let mockPokemon: PokemonData;

  beforeAll(() => {
    // Mock document.getElementById
    document.getElementById = mockGetElementById;
  });

  afterAll(() => {
    // Restore original function
    document.getElementById = originalGetElementById;
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockImageElement.src = '';
    mockImageElement.alt = '';
    mockImageElement.onerror = null;
    mockImageElement.onload = null;
    mockImageContainer.style.display = 'none';
    mockImageElement.style.display = 'none';
    mockPlaceholderElement.style.display = 'none';

    // Create test Pokemon data
    mockPokemon = createMockPokemonData({
      name: 'pikachu',
      generation: 1,
      types: ['electric'],
      abilities: ['static'],
      id: 25,
      sprites: {
        other: {
          'official-artwork': {
            front_default: 'https://example.com/official-artwork.png'
          }
        },
        front_default: 'https://example.com/front-default.png'
      }
    });

    imageDisplay = new ImageDisplayImpl();
  });

  describe('getImageUrl', () => {
    test('should return official artwork URL when available', () => {
      // Given: Pokemon with official artwork
      const pokemon = mockPokemon;

      // When: Getting image URL
      const result = imageDisplay.getImageUrl(pokemon);

      // Then: Should return official artwork URL
      expect(result).toBe('https://example.com/official-artwork.png');
    });

    test('should fallback to front_default when official artwork is null', () => {
      // Given: Pokemon without official artwork but with front_default
      const pokemon: PokemonData = createMockPokemonData({
        ...mockPokemon,
        sprites: {
          other: {
            'official-artwork': {
              front_default: null
            }
          },
          front_default: 'https://example.com/front-default.png'
        }
      });

      // When: Getting image URL
      const result = imageDisplay.getImageUrl(pokemon);

      // Then: Should return front_default URL
      expect(result).toBe('https://example.com/front-default.png');
    });

    test('should return empty string when no images are available', () => {
      // Given: Pokemon without any images
      const pokemon: PokemonData = createMockPokemonData({
        ...mockPokemon,
        sprites: {
          other: {
            'official-artwork': {
              front_default: null
            }
          },
          front_default: null
        }
      });

      // When: Getting image URL
      const result = imageDisplay.getImageUrl(pokemon);

      // Then: Should return empty string
      expect(result).toBe('');
    });

    test('should return empty string for invalid URLs', () => {
      // Given: Pokemon with invalid URL
      const pokemon: PokemonData = createMockPokemonData({
        ...mockPokemon,
        sprites: {
          other: {
            'official-artwork': {
              front_default: 'not-a-valid-url'
            }
          },
          front_default: null
        }
      });

      // When: Getting image URL
      const result = imageDisplay.getImageUrl(pokemon);

      // Then: Should return empty string
      expect(result).toBe('');
    });
  });

  describe('displayPokemonImage', () => {
    test('should display image when URL is available', () => {
      // Given: Pokemon with valid image URL
      const pokemon = mockPokemon;

      // When: Displaying Pokemon image
      imageDisplay.displayPokemonImage(pokemon);

      // Then: Should show image container and set image properties
      expect(mockImageContainer.style.display).toBe('block');
      expect(mockPlaceholderElement.style.display).toBe('none');
      expect(mockImageElement.style.display).toBe('block');
      expect(mockImageElement.src).toBe('https://example.com/official-artwork.png');
      expect(mockImageElement.alt).toBe('Pikachu artwork');
      expect(mockImageElement.classList.add).toHaveBeenCalledWith('loading');
    });

    test('should show placeholder when no image URL is available', () => {
      // Given: Pokemon without any images
      const pokemon: PokemonData = createMockPokemonData({
        ...mockPokemon,
        sprites: {
          other: {
            'official-artwork': {
              front_default: null
            }
          },
          front_default: null
        }
      });

      // When: Displaying Pokemon image
      imageDisplay.displayPokemonImage(pokemon);

      // Then: Should show placeholder
      expect(mockImageContainer.style.display).toBe('block');
      expect(mockImageElement.style.display).toBe('none');
      expect(mockPlaceholderElement.style.display).toBe('block');
    });
  });

  describe('hideImage', () => {
    test('should hide image container and clear image source', () => {
      // Given: Image display is currently showing
      mockImageContainer.style.display = 'block';
      mockImageElement.src = 'https://example.com/test.png';

      // When: Hiding image
      imageDisplay.hideImage();

      // Then: Should hide container and clear image
      expect(mockImageContainer.style.display).toBe('none');
      expect(mockImageElement.src).toBe('');
      expect(mockImageElement.classList.remove).toHaveBeenCalledWith('loading');
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 19: End-Game Image Display', () => {
      test('should display a Pokemon image for any completed game', () => {
        /**
         * **Validates: Requirements 8.1**
         * 
         * Property 19: End-Game Image Display
         * For any completed game (won or lost), the UI should display a Pokemon image 
         * (official artwork, front_default sprite, or placeholder)
         */

        // Generator for Pokemon sprites with various combinations
        const pokemonSpritesArbitrary = fc.oneof(
          // Case 1: Both official artwork and front_default available
          fc.record({
            other: fc.constant({
              'official-artwork': {
                front_default: 'https://example.com/official-artwork.png'
              }
            }),
            front_default: fc.constant('https://example.com/front-default.png')
          }),
          // Case 2: Only official artwork available
          fc.record({
            other: fc.constant({
              'official-artwork': {
                front_default: 'https://example.com/official-artwork.png'
              }
            }),
            front_default: fc.constant(null)
          }),
          // Case 3: Only front_default available
          fc.record({
            other: fc.constant({
              'official-artwork': {
                front_default: null
              }
            }),
            front_default: fc.constant('https://example.com/front-default.png')
          }),
          // Case 4: No images available
          fc.record({
            other: fc.constant({
              'official-artwork': {
                front_default: null
              }
            }),
            front_default: fc.constant(null)
          }),
          // Case 5: Invalid URLs
          fc.record({
            other: fc.constant({
              'official-artwork': {
                front_default: 'not-a-valid-url'
              }
            }),
            front_default: fc.constant('also-not-valid')
          })
        );

        // Generator for Pokemon data with various sprite configurations
        const pokemonDataArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,15}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy', 'fighting', 'poison', 'ground', 'flying', 'bug', 'rock', 'ghost', 'steel', 'normal'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,20}$/), { minLength: 1, maxLength: 3 }),
          id: fc.integer({ min: 1, max: 1000 }),
          sprites: pokemonSpritesArbitrary
        }).map(data => createMockPokemonData(data));

        fc.assert(
          fc.property(
            pokemonDataArbitrary,
            (pokemon) => {
              // Given: A Pokemon with any sprite configuration and a completed game
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemon.name,
                generation: pokemon.generation,
                types: pokemon.types as readonly string[],
                abilities: pokemon.abilities as readonly string[],
                id: pokemon.id,
                sprites: pokemon.sprites
              });

              // Reset mocks before each test
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';
              mockImageElement.alt = '';

              const imageDisplay = new ImageDisplayImpl();

              // When: displayPokemonImage is called for the completed game
              imageDisplay.displayPokemonImage(pokemonData);

              // Then: The UI should display some form of Pokemon image or placeholder

              // 1. Image container should always be visible for completed games
              expect(mockImageContainer.style.display).toBe('block');

              // 2. Either an image should be displayed OR a placeholder should be shown
              const imageUrl = imageDisplay.getImageUrl(pokemonData);
              
              if (imageUrl && imageUrl !== '') {
                // Case: Valid image URL available
                
                // Image element should be visible and placeholder hidden
                expect(mockImageElement.style.display).toBe('block');
                expect(mockPlaceholderElement.style.display).toBe('none');
                
                // Image source should be set to the valid URL
                expect(mockImageElement.src).toBe(imageUrl);
                
                // Alt text should be set appropriately
                const expectedAltText = `${pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1)} artwork`;
                expect(mockImageElement.alt).toBe(expectedAltText);
                
                // Loading class should be added for smooth transition
                expect(mockImageElement.classList.add).toHaveBeenCalledWith('loading');
                
                // Error handler should be set up
                expect(mockImageElement.onerror).toBeTruthy();
                expect(mockImageElement.onload).toBeTruthy();
                
              } else {
                // Case: No valid image URL available - placeholder should be shown
                
                // Placeholder should be visible and image hidden
                expect(mockPlaceholderElement.style.display).toBe('block');
                expect(mockImageElement.style.display).toBe('none');
                
                // Placeholder text should be updated with Pokemon name
                expect(mockPlaceholderElement.querySelector).toHaveBeenCalledWith('.placeholder-text');
              }

              // 3. Universal invariants for end-game image display
              
              // Container must always be visible for completed games
              expect(mockImageContainer.style.display).toBe('block');
              
              // Exactly one of image or placeholder should be visible, never both
              const imageVisible = mockImageElement.style.display === 'block';
              const placeholderVisible = mockPlaceholderElement.style.display === 'block';
              expect(imageVisible || placeholderVisible).toBe(true);
              expect(imageVisible && placeholderVisible).toBe(false);

              // 4. Image URL selection should follow priority order
              const officialArtwork = pokemonData.sprites?.other?.['official-artwork']?.front_default;
              const frontDefault = pokemonData.sprites?.front_default;
              
              if (officialArtwork && imageDisplay['isValidUrl'](officialArtwork)) {
                // Official artwork should be prioritized when available and valid
                expect(imageUrl).toBe(officialArtwork);
              } else if (frontDefault && imageDisplay['isValidUrl'](frontDefault)) {
                // Front default should be used when official artwork is not available
                expect(imageUrl).toBe(frontDefault);
              } else {
                // No valid image should result in empty string
                expect(imageUrl).toBe('');
              }

              // 5. Error handling should be properly set up for valid images
              if (imageUrl && imageUrl !== '') {
                expect(typeof mockImageElement.onerror).toBe('function');
                expect(typeof mockImageElement.onload).toBe('function');
              }

              // 6. Pokemon name should be properly formatted in alt text or placeholder
              if (imageUrl && imageUrl !== '') {
                const expectedName = pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1);
                expect(mockImageElement.alt).toContain(expectedName);
              }

              // 7. State should be consistent - no partial updates
              if (mockImageElement.style.display === 'block') {
                expect(mockImageElement.src).toBeTruthy();
                expect(mockImageElement.alt).toBeTruthy();
                expect(mockImageElement.classList.add).toHaveBeenCalledWith('loading');
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should handle edge cases in end-game image display', () => {
        /**
         * **Validates: Requirements 8.1**
         * 
         * Property 19: End-Game Image Display (Edge cases)
         * Image display should work correctly for edge cases like malformed URLs,
         * missing sprite data, and unusual Pokemon names
         */

        // Generator for edge case sprite configurations
        const edgeCaseSpritesArbitrary = fc.oneof(
          // Undefined sprites object
          fc.constant(undefined as any),
          // Empty sprites object
          fc.constant({} as any),
          // Malformed sprites structure
          fc.constant({
            other: null,
            front_default: 'https://example.com/valid.png'
          } as any),
          fc.constant({
            other: {
              'official-artwork': null
            },
            front_default: null
          } as any),
          // URLs with special characters
          fc.constant({
            other: {
              'official-artwork': {
                front_default: 'https://example.com/pokémon-image.png'
              }
            },
            front_default: 'https://example.com/sprite with spaces.png'
          }),
          // Very long URLs
          fc.constant({
            other: {
              'official-artwork': {
                front_default: 'https://example.com/' + 'a'.repeat(200) + '.png'
              }
            },
            front_default: 'https://example.com/short.png'
          })
        );

        // Generator for edge case Pokemon names
        const edgeCaseNamesArbitrary = fc.oneof(
          fc.constant('a'), // Very short name
          fc.constant('verylongpokemonname'), // Long name
          fc.constant('nidoranf'), // Name with special meaning
          fc.constant('mrrime'), // Name with abbreviation
          fc.constant('hooh') // Name with repeated letters
        );

        fc.assert(
          fc.property(
            edgeCaseNamesArbitrary,
            edgeCaseSpritesArbitrary,
            (pokemonName, sprites) => {
              // Given: A Pokemon with edge case name and sprite configuration
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemonName,
                generation: 1,
                types: ['normal'],
                abilities: ['test-ability'],
                id: 1,
                sprites: sprites || {
                  other: {
                    'official-artwork': {
                      front_default: null
                    }
                  },
                  front_default: null
                }
              });

              // Reset mocks
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';
              mockImageElement.alt = '';

              const imageDisplay = new ImageDisplayImpl();

              // When: displayPokemonImage is called with edge case data
              expect(() => {
                imageDisplay.displayPokemonImage(pokemonData);
              }).not.toThrow();

              // Then: Display should handle edge cases gracefully

              // 1. Container should always be visible regardless of edge cases
              expect(mockImageContainer.style.display).toBe('block');

              // 2. Should not crash or throw errors with malformed data
              // (This is tested by the expect().not.toThrow() above)

              // 3. Should always show either image or placeholder
              const imageVisible = mockImageElement.style.display === 'block';
              const placeholderVisible = mockPlaceholderElement.style.display === 'block';
              expect(imageVisible || placeholderVisible).toBe(true);

              // 4. Alt text should handle unusual names correctly
              if (imageVisible && mockImageElement.alt) {
                expect(mockImageElement.alt).toContain(pokemonName.charAt(0).toUpperCase());
                expect(mockImageElement.alt).toContain('artwork');
              }

              // 5. URL validation should handle edge cases
              const imageUrl = imageDisplay.getImageUrl(pokemonData);
              
              // Should return empty string for invalid/missing data rather than throwing
              expect(typeof imageUrl).toBe('string');
              
              // If URL is returned, it should be either empty or a valid URL format
              if (imageUrl !== '') {
                expect(imageUrl).toMatch(/^https?:\/\/.+/);
              }

              // 6. Placeholder should work with any name length
              if (placeholderVisible) {
                expect(mockPlaceholderElement.querySelector).toHaveBeenCalledWith('.placeholder-text');
              }

              // 7. Error handling should be robust
              if (imageVisible) {
                expect(mockImageElement.onerror).toBeTruthy();
                expect(mockImageElement.onload).toBeTruthy();
              }

              // 8. State consistency should be maintained even with edge cases
              if (mockImageElement.style.display === 'block') {
                expect(mockImageElement.classList.add).toHaveBeenCalledWith('loading');
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should maintain image display consistency across different game completion scenarios', () => {
        /**
         * **Validates: Requirements 8.1**
         * 
         * Property 19: End-Game Image Display (Game completion scenarios)
         * Image display should work consistently whether the game was won or lost,
         * and regardless of how the game ended
         */

        // Generator for game completion scenarios
        const gameCompletionArbitrary = fc.record({
          gameStatus: fc.constantFrom('won', 'lost'),
          remainingGuesses: fc.integer({ min: 0, max: 7 }),
          hintsUsed: fc.integer({ min: 0, max: 7 })
        }).filter(scenario => {
          // Lost games must have 0 remaining guesses
          return scenario.gameStatus !== 'lost' || scenario.remainingGuesses === 0;
        });

        // Generator for Pokemon with valid sprite data
        const validPokemonArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,12}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass', 'electric'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,15}$/), { minLength: 1, maxLength: 2 }),
          id: fc.integer({ min: 1, max: 500 }),
          sprites: fc.record({
            other: fc.constant({
              'official-artwork': {
                front_default: 'https://example.com/official.png'
              }
            }),
            front_default: fc.constant('https://example.com/sprite.png')
          })
        });

        fc.assert(
          fc.property(
            validPokemonArbitrary,
            gameCompletionArbitrary,
            (pokemon, _gameScenario) => {
              // Given: A completed game with any outcome and valid Pokemon data
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemon.name,
                generation: pokemon.generation,
                types: pokemon.types as readonly string[],
                abilities: pokemon.abilities as readonly string[],
                id: pokemon.id,
                sprites: pokemon.sprites
              });

              // Reset mocks
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';
              mockImageElement.alt = '';

              const imageDisplay = new ImageDisplayImpl();

              // When: displayPokemonImage is called for any completed game
              imageDisplay.displayPokemonImage(pokemonData);

              // Then: Image display behavior should be consistent regardless of game outcome

              // 1. Image should always be displayed for completed games with valid data
              expect(mockImageContainer.style.display).toBe('block');

              // 2. Behavior should be identical for won and lost games
              // (The image display doesn't depend on game outcome, only on Pokemon data)
              expect(mockImageElement.style.display).toBe('block');
              expect(mockPlaceholderElement.style.display).toBe('none');

              // 3. Image URL selection should be consistent
              const imageUrl = imageDisplay.getImageUrl(pokemonData);
              expect(imageUrl).toBe('https://example.com/official.png'); // Official artwork priority

              // 4. Image properties should be set consistently
              expect(mockImageElement.src).toBe(imageUrl);
              expect(mockImageElement.alt).toBe(`${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} artwork`);

              // 5. Loading state should be applied consistently
              expect(mockImageElement.classList.add).toHaveBeenCalledWith('loading');

              // 6. Error handlers should be set up consistently
              expect(mockImageElement.onerror).toBeTruthy();
              expect(mockImageElement.onload).toBeTruthy();

              // 7. Game completion details should not affect image display
              // (remainingGuesses, hintsUsed, gameStatus should not influence image behavior)
              
              // Reset and test again to ensure consistency
              mockImageElement.src = '';
              mockImageElement.alt = '';
              jest.clearAllMocks();

              // Test again with the same Pokemon data
              imageDisplay.displayPokemonImage(pokemonData);

              // Results should be identical on repeated calls
              expect(mockImageContainer.style.display).toBe('block');
              expect(mockImageElement.style.display).toBe('block');
              expect(mockImageElement.src).toBe(imageUrl);
              expect(mockImageElement.alt).toBe(`${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} artwork`);

              // 8. Multiple calls should be idempotent
              imageDisplay.displayPokemonImage(pokemonData);
              expect(mockImageElement.src).toBe(imageUrl);
              expect(mockImageContainer.style.display).toBe('block');
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 20: Official Artwork Priority', () => {
      test('should use official artwork URL when available', () => {
        /**
         * **Validates: Requirements 8.2**
         * 
         * Property 20: Official Artwork Priority
         * For any Pokemon data with available official artwork, the image display 
         * should use the official-artwork sprite URL
         */

        // Generator for Pokemon with official artwork available
        const pokemonWithOfficialArtworkArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,15}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy', 'fighting', 'poison', 'ground', 'flying', 'bug', 'rock', 'ghost', 'steel', 'normal'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,20}$/), { minLength: 1, maxLength: 3 }),
          id: fc.integer({ min: 1, max: 1000 }),
          officialArtworkUrl: fc.webUrl(),
          frontDefaultUrl: fc.oneof(
            fc.webUrl(),
            fc.constant(null)
          )
        });

        fc.assert(
          fc.property(
            pokemonWithOfficialArtworkArbitrary,
            (pokemon) => {
              // Given: Pokemon data with available official artwork
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemon.name,
                generation: pokemon.generation,
                types: pokemon.types as readonly string[],
                abilities: pokemon.abilities as readonly string[],
                id: pokemon.id,
                sprites: {
                  other: {
                    'official-artwork': {
                      front_default: pokemon.officialArtworkUrl
                    }
                  },
                  front_default: pokemon.frontDefaultUrl
                }
              });

              const imageDisplay = new ImageDisplayImpl();

              // When: Getting the image URL for display
              const imageUrl = imageDisplay.getImageUrl(pokemonData);

              // Then: Should use the official artwork URL
              expect(imageUrl).toBe(pokemon.officialArtworkUrl);

              // Additional verification: Official artwork should be prioritized over front_default
              // even when both are available
              if (pokemon.frontDefaultUrl) {
                expect(imageUrl).not.toBe(pokemon.frontDefaultUrl);
                expect(imageUrl).toBe(pokemon.officialArtworkUrl);
              }

              // When: Displaying the Pokemon image
              // Reset mocks
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';
              mockImageElement.alt = '';

              imageDisplay.displayPokemonImage(pokemonData);

              // Then: The image element should use the official artwork URL
              expect(mockImageElement.src).toBe(pokemon.officialArtworkUrl);
              expect(mockImageElement.style.display).toBe('block');
              expect(mockPlaceholderElement.style.display).toBe('none');

              // Verify that the official artwork URL is valid and properly formatted
              expect(pokemon.officialArtworkUrl).toMatch(/^https?:\/\/.+/);

              // Verify that the image display setup is correct for official artwork
              expect(mockImageElement.alt).toBe(`${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} artwork`);
              expect(mockImageElement.classList.add).toHaveBeenCalledWith('loading');
              expect(mockImageElement.onerror).toBeTruthy();
              expect(mockImageElement.onload).toBeTruthy();
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should prioritize official artwork over front_default in all scenarios', () => {
        /**
         * **Validates: Requirements 8.2**
         * 
         * Property 20: Official Artwork Priority (Priority verification)
         * Official artwork should always be prioritized over front_default sprite,
         * regardless of the quality or format of the front_default URL
         */

        // Generator for various URL combinations where official artwork is available
        const urlCombinationsArbitrary = fc.record({
          officialArtworkUrl: fc.webUrl(),
          frontDefaultUrl: fc.oneof(
            fc.webUrl(),
            fc.webUrl().map(url => url + '?high-quality=true'),
            fc.webUrl().map(url => url.replace('http://', 'https://')),
            fc.constant('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'),
            fc.constant('https://assets.pokemon.com/assets/cms2/img/pokedex/detail/001.png'),
            fc.constant(null)
          )
        });

        const pokemonDataArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,12}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass', 'electric'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,15}$/), { minLength: 1, maxLength: 2 }),
          id: fc.integer({ min: 1, max: 500 })
        });

        fc.assert(
          fc.property(
            pokemonDataArbitrary,
            urlCombinationsArbitrary,
            (pokemon, urls) => {
              // Given: Pokemon with both official artwork and front_default URLs
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemon.name,
                generation: pokemon.generation,
                types: pokemon.types as readonly string[],
                abilities: pokemon.abilities as readonly string[],
                id: pokemon.id,
                sprites: {
                  other: {
                    'official-artwork': {
                      front_default: urls.officialArtworkUrl
                    }
                  },
                  front_default: urls.frontDefaultUrl
                }
              });

              const imageDisplay = new ImageDisplayImpl();

              // When: Getting image URL
              const selectedUrl = imageDisplay.getImageUrl(pokemonData);

              // Then: Official artwork should ALWAYS be selected when available
              expect(selectedUrl).toBe(urls.officialArtworkUrl);

              // Verify priority is maintained regardless of front_default URL characteristics
              if (urls.frontDefaultUrl) {
                // Even if front_default has special parameters or is from official sources
                expect(selectedUrl).not.toBe(urls.frontDefaultUrl);
                
                // Even if front_default URL is "better" (https vs http, has parameters, etc.)
                if (urls.frontDefaultUrl.includes('high-quality') || 
                    urls.frontDefaultUrl.includes('pokemon.com') ||
                    urls.frontDefaultUrl.startsWith('https://')) {
                  expect(selectedUrl).toBe(urls.officialArtworkUrl);
                  expect(selectedUrl).not.toBe(urls.frontDefaultUrl);
                }
              }

              // When: Displaying the image
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';

              imageDisplay.displayPokemonImage(pokemonData);

              // Then: Display should use official artwork
              expect(mockImageElement.src).toBe(urls.officialArtworkUrl);
              expect(mockImageElement.style.display).toBe('block');

              // Verify the priority is consistent across multiple calls
              const secondCall = imageDisplay.getImageUrl(pokemonData);
              expect(secondCall).toBe(urls.officialArtworkUrl);
              expect(secondCall).toBe(selectedUrl);

              // Test with fresh instance to ensure consistency
              const newImageDisplay = new ImageDisplayImpl();
              const thirdCall = newImageDisplay.getImageUrl(pokemonData);
              expect(thirdCall).toBe(urls.officialArtworkUrl);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should handle official artwork URL validation correctly', () => {
        /**
         * **Validates: Requirements 8.2**
         * 
         * Property 20: Official Artwork Priority (URL validation)
         * Official artwork should only be used when it represents a valid URL,
         * otherwise fallback behavior should apply
         */

        // Generator for various official artwork URL scenarios
        const officialArtworkScenariosArbitrary = fc.oneof(
          // Valid URLs
          fc.webUrl(),
          // Invalid URLs that should trigger fallback
          fc.constant('not-a-url'),
          fc.constant(''),
          fc.constant('ftp://invalid-protocol.com/image.png'),
          fc.constant('javascript:alert("xss")'),
          fc.constant('data:image/png;base64,invalid'),
          fc.constant('//missing-protocol.com/image.png'),
          // Edge case URLs
          fc.constant('https://'),
          fc.constant('http://'),
          fc.constant('https://example.com/'),
          fc.constant('https://example.com/image with spaces.png')
        );

        const pokemonBaseArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,10}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,12}$/), { minLength: 1, maxLength: 2 }),
          id: fc.integer({ min: 1, max: 300 }),
          frontDefaultUrl: fc.oneof(fc.webUrl(), fc.constant(null))
        });

        fc.assert(
          fc.property(
            pokemonBaseArbitrary,
            officialArtworkScenariosArbitrary,
            (pokemon, officialArtworkUrl) => {
              // Given: Pokemon with various official artwork URL scenarios
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemon.name,
                generation: pokemon.generation,
                types: pokemon.types as readonly string[],
                abilities: pokemon.abilities as readonly string[],
                id: pokemon.id,
                sprites: {
                  other: {
                    'official-artwork': {
                      front_default: officialArtworkUrl
                    }
                  },
                  front_default: pokemon.frontDefaultUrl
                }
              });

              const imageDisplay = new ImageDisplayImpl();

              // When: Getting image URL
              const selectedUrl = imageDisplay.getImageUrl(pokemonData);

              // Then: URL selection should follow validation rules
              
              // Check if official artwork URL is valid
              let isOfficialArtworkValid = false;
              try {
                const parsedUrl = new URL(officialArtworkUrl);
                // Use same validation logic as the implementation
                isOfficialArtworkValid = (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && officialArtworkUrl !== '';
              } catch {
                isOfficialArtworkValid = false;
              }

              if (isOfficialArtworkValid && officialArtworkUrl !== '') {
                // Valid official artwork should be used
                expect(selectedUrl).toBe(officialArtworkUrl);
              } else {
                // Invalid official artwork should trigger fallback
                if (officialArtworkUrl !== '') {
                  expect(selectedUrl).not.toBe(officialArtworkUrl);
                }
                
                if (pokemon.frontDefaultUrl) {
                  // Should fallback to front_default if available
                  expect(selectedUrl).toBe(pokemon.frontDefaultUrl);
                } else {
                  // Should return empty string if no valid alternatives
                  expect(selectedUrl).toBe('');
                }
              }

              // When: Displaying the image
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';

              imageDisplay.displayPokemonImage(pokemonData);

              // Then: Display behavior should match URL validation
              if (isOfficialArtworkValid) {
                // Valid official artwork should be displayed
                expect(mockImageElement.src).toBe(officialArtworkUrl);
                expect(mockImageElement.style.display).toBe('block');
                expect(mockPlaceholderElement.style.display).toBe('none');
              } else if (pokemon.frontDefaultUrl) {
                // Should fallback to front_default
                expect(mockImageElement.src).toBe(pokemon.frontDefaultUrl);
                expect(mockImageElement.style.display).toBe('block');
                expect(mockPlaceholderElement.style.display).toBe('none');
              } else {
                // Should show placeholder when no valid images
                expect(mockImageElement.style.display).toBe('none');
                expect(mockPlaceholderElement.style.display).toBe('block');
              }

              // Verify container is always shown for completed games
              expect(mockImageContainer.style.display).toBe('block');

              // Verify error handling is set up for valid images
              if (selectedUrl && selectedUrl !== '') {
                expect(mockImageElement.onerror).toBeTruthy();
                expect(mockImageElement.onload).toBeTruthy();
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 21: Sprite Fallback Behavior', () => {
      test('should use front_default sprite when official artwork is not available', () => {
        /**
         * **Validates: Requirements 8.3**
         * 
         * Property 21: Sprite Fallback Behavior
         * For any Pokemon data without official artwork but with front_default sprite, 
         * the image display should use the front_default sprite URL
         */

        // Generator for Pokemon without official artwork but with front_default sprite
        const pokemonWithFrontDefaultOnlyArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,15}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy', 'fighting', 'poison', 'ground', 'flying', 'bug', 'rock', 'ghost', 'steel', 'normal'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,20}$/), { minLength: 1, maxLength: 3 }),
          id: fc.integer({ min: 1, max: 1000 }),
          frontDefaultUrl: fc.webUrl(),
          officialArtworkScenario: fc.constantFrom(
            null,                    // Official artwork is null
            '',                      // Official artwork is empty string
            'not-a-valid-url',      // Official artwork is invalid URL
            'ftp://invalid.com/img'  // Official artwork is invalid protocol
          )
        });

        fc.assert(
          fc.property(
            pokemonWithFrontDefaultOnlyArbitrary,
            (pokemon) => {
              // Given: Pokemon data without valid official artwork but with front_default sprite
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemon.name,
                generation: pokemon.generation,
                types: pokemon.types as readonly string[],
                abilities: pokemon.abilities as readonly string[],
                id: pokemon.id,
                sprites: {
                  other: {
                    'official-artwork': {
                      front_default: pokemon.officialArtworkScenario
                    }
                  },
                  front_default: pokemon.frontDefaultUrl
                }
              });

              const imageDisplay = new ImageDisplayImpl();

              // When: Getting the image URL for display
              const imageUrl = imageDisplay.getImageUrl(pokemonData);

              // Then: Should use the front_default sprite URL
              expect(imageUrl).toBe(pokemon.frontDefaultUrl);

              // Verify that official artwork is indeed not available or invalid
              const officialArtwork = pokemon.officialArtworkScenario;
              if (officialArtwork) {
                let isValidOfficialArtwork = false;
                try {
                  new URL(officialArtwork);
                  isValidOfficialArtwork = true;
                } catch {
                  isValidOfficialArtwork = false;
                }
                
                // If official artwork is invalid, should fallback to front_default
                if (!isValidOfficialArtwork) {
                  expect(imageUrl).toBe(pokemon.frontDefaultUrl);
                  expect(imageUrl).not.toBe(officialArtwork);
                }
              } else {
                // If official artwork is null/undefined, should use front_default
                expect(imageUrl).toBe(pokemon.frontDefaultUrl);
              }

              // When: Displaying the Pokemon image
              // Reset mocks
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';
              mockImageElement.alt = '';

              imageDisplay.displayPokemonImage(pokemonData);

              // Then: The image element should use the front_default sprite URL
              expect(mockImageElement.src).toBe(pokemon.frontDefaultUrl);
              expect(mockImageElement.style.display).toBe('block');
              expect(mockPlaceholderElement.style.display).toBe('none');

              // Verify that the front_default URL is valid and properly formatted
              expect(pokemon.frontDefaultUrl).toMatch(/^https?:\/\/.+/);

              // Verify that the image display setup is correct for front_default sprite
              expect(mockImageElement.alt).toBe(`${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} artwork`);
              expect(mockImageElement.classList.add).toHaveBeenCalledWith('loading');
              expect(mockImageElement.onerror).toBeTruthy();
              expect(mockImageElement.onload).toBeTruthy();

              // Verify container is visible for completed games
              expect(mockImageContainer.style.display).toBe('block');
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should handle various invalid official artwork scenarios with front_default fallback', () => {
        /**
         * **Validates: Requirements 8.3**
         * 
         * Property 21: Sprite Fallback Behavior (Invalid scenarios)
         * Fallback to front_default should work correctly for all types of 
         * invalid or missing official artwork scenarios
         */

        // Generator for various invalid official artwork scenarios
        const invalidOfficialArtworkArbitrary = fc.oneof(
          fc.constant(null),
          fc.constant(''),
          fc.constant('not-a-url'),
          fc.constant('javascript:alert("xss")'),
          fc.constant('ftp://invalid-protocol.com/image.png'),
          fc.constant('data:image/png;base64,invalid'),
          fc.constant('//missing-protocol.com/image.png'),
          fc.constant('https://'),
          fc.constant('http://'),
          fc.constant('file:///local/path/image.png'),
          fc.constant('relative/path/image.png'),
          fc.constant('   '), // Whitespace only
          fc.constant('\n\t') // Other whitespace characters
        );

        // Generator for valid front_default URLs
        const validFrontDefaultArbitrary = fc.oneof(
          fc.webUrl(),
          fc.constant('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png'),
          fc.constant('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'),
          fc.constant('https://assets.pokemon.com/assets/cms2/img/pokedex/detail/001.png'),
          fc.webUrl().map(url => url + '/sprite.png'),
          fc.webUrl().map(url => url + '?format=png&size=96')
        );

        const pokemonBaseArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,12}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass', 'electric'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,15}$/), { minLength: 1, maxLength: 2 }),
          id: fc.integer({ min: 1, max: 500 })
        });

        fc.assert(
          fc.property(
            pokemonBaseArbitrary,
            invalidOfficialArtworkArbitrary,
            validFrontDefaultArbitrary,
            (pokemon, invalidOfficialArtwork, validFrontDefault) => {
              // Given: Pokemon with invalid official artwork but valid front_default
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemon.name,
                generation: pokemon.generation,
                types: pokemon.types as readonly string[],
                abilities: pokemon.abilities as readonly string[],
                id: pokemon.id,
                sprites: {
                  other: {
                    'official-artwork': {
                      front_default: invalidOfficialArtwork
                    }
                  },
                  front_default: validFrontDefault
                }
              });

              const imageDisplay = new ImageDisplayImpl();

              // When: Getting image URL
              const selectedUrl = imageDisplay.getImageUrl(pokemonData);

              // Then: Should fallback to front_default sprite
              expect(selectedUrl).toBe(validFrontDefault);
              expect(selectedUrl).not.toBe(invalidOfficialArtwork);

              // Verify that official artwork is indeed invalid
              if (invalidOfficialArtwork && invalidOfficialArtwork.trim() !== '') {
                let isValidUrl = false;
                try {
                  new URL(invalidOfficialArtwork);
                  isValidUrl = true;
                } catch {
                  isValidUrl = false;
                }
                
                if (!isValidUrl) {
                  expect(selectedUrl).toBe(validFrontDefault);
                }
              } else {
                // Null, undefined, or empty should fallback to front_default
                expect(selectedUrl).toBe(validFrontDefault);
              }

              // When: Displaying the image
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';
              mockImageElement.alt = '';

              imageDisplay.displayPokemonImage(pokemonData);

              // Then: Should display the front_default sprite
              expect(mockImageElement.src).toBe(validFrontDefault);
              expect(mockImageElement.style.display).toBe('block');
              expect(mockPlaceholderElement.style.display).toBe('none');

              // Verify proper setup for front_default sprite display
              expect(mockImageElement.alt).toBe(`${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} artwork`);
              expect(mockImageElement.classList.add).toHaveBeenCalledWith('loading');
              expect(mockImageElement.onerror).toBeTruthy();
              expect(mockImageElement.onload).toBeTruthy();
              expect(mockImageContainer.style.display).toBe('block');

              // Verify consistency across multiple calls
              const secondCall = imageDisplay.getImageUrl(pokemonData);
              expect(secondCall).toBe(validFrontDefault);
              expect(secondCall).toBe(selectedUrl);

              // Test with fresh instance
              const newImageDisplay = new ImageDisplayImpl();
              const thirdCall = newImageDisplay.getImageUrl(pokemonData);
              expect(thirdCall).toBe(validFrontDefault);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should maintain fallback priority order consistently', () => {
        /**
         * **Validates: Requirements 8.3**
         * 
         * Property 21: Sprite Fallback Behavior (Priority consistency)
         * The fallback behavior should consistently follow the priority order:
         * official-artwork → front_default → placeholder, regardless of data structure variations
         */

        // Generator for sprite data structure variations
        const spriteStructureVariationsArbitrary = fc.oneof(
          // Standard structure with null official artwork
          fc.record({
            other: fc.constant({
              'official-artwork': {
                front_default: null
              }
            }),
            front_default: fc.webUrl(),
            expectedUrl: fc.webUrl()
          }).map(data => ({
            sprites: {
              other: data.other,
              front_default: data.front_default
            },
            expectedUrl: data.front_default
          })),
          
          // Structure with null official artwork in different position
          fc.record({
            front_default: fc.webUrl()
          }).map(data => ({
            sprites: {
              other: {
                'official-artwork': {
                  front_default: null
                }
              },
              front_default: data.front_default
            },
            expectedUrl: data.front_default
          })),
          
          // Structure with empty string official artwork
          fc.record({
            front_default: fc.webUrl()
          }).map(data => ({
            sprites: {
              other: {
                'official-artwork': {
                  front_default: ''
                }
              },
              front_default: data.front_default
            },
            expectedUrl: data.front_default
          })),
          
          // Structure with invalid official artwork URL
          fc.record({
            front_default: fc.webUrl(),
            invalidUrl: fc.constantFrom('not-a-url', 'ftp://invalid.com', 'javascript:void(0)')
          }).map(data => ({
            sprites: {
              other: {
                'official-artwork': {
                  front_default: data.invalidUrl
                }
              },
              front_default: data.front_default
            },
            expectedUrl: data.front_default
          }))
        );

        const pokemonBaseArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,10}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,12}$/), { minLength: 1, maxLength: 2 }),
          id: fc.integer({ min: 1, max: 300 })
        });

        fc.assert(
          fc.property(
            pokemonBaseArbitrary,
            spriteStructureVariationsArbitrary,
            (pokemon, spriteData) => {
              // Given: Pokemon with various sprite structure variations
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemon.name,
                generation: pokemon.generation,
                types: pokemon.types as readonly string[],
                abilities: pokemon.abilities as readonly string[],
                id: pokemon.id,
                sprites: spriteData.sprites
              });

              const imageDisplay = new ImageDisplayImpl();

              // When: Getting image URL multiple times
              const firstCall = imageDisplay.getImageUrl(pokemonData);
              const secondCall = imageDisplay.getImageUrl(pokemonData);

              // Then: Should consistently return the expected fallback URL
              expect(firstCall).toBe(spriteData.expectedUrl);
              expect(secondCall).toBe(spriteData.expectedUrl);
              expect(firstCall).toBe(secondCall);

              // Verify that the fallback logic is working correctly
              const officialArtwork = pokemonData.sprites?.other?.['official-artwork']?.front_default;
              const frontDefault = pokemonData.sprites?.front_default;

              // Official artwork should be invalid/missing for this test
              if (officialArtwork) {
                let isValidOfficialArtwork = false;
                try {
                  const parsedUrl = new URL(officialArtwork);
                  // Use same validation logic as the implementation
                  isValidOfficialArtwork = (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && officialArtwork.trim() !== '';
                } catch {
                  isValidOfficialArtwork = false;
                }
                expect(isValidOfficialArtwork).toBe(false);
              }

              // Front default should be valid and should be the selected URL
              expect(frontDefault).toBeTruthy();
              expect(firstCall).toBe(frontDefault);

              // When: Displaying the image
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';

              imageDisplay.displayPokemonImage(pokemonData);

              // Then: Should display the front_default sprite consistently
              expect(mockImageElement.src).toBe(spriteData.expectedUrl);
              expect(mockImageElement.style.display).toBe('block');
              expect(mockPlaceholderElement.style.display).toBe('none');

              // Test with multiple instances to ensure consistency
              const newImageDisplay = new ImageDisplayImpl();
              const thirdCall = newImageDisplay.getImageUrl(pokemonData);
              expect(thirdCall).toBe(spriteData.expectedUrl);

              // Reset and test display again
              mockImageElement.src = '';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';

              newImageDisplay.displayPokemonImage(pokemonData);
              expect(mockImageElement.src).toBe(spriteData.expectedUrl);

              // Verify that priority order is maintained
              // (official artwork invalid/missing → front_default used)
              expect(mockImageElement.src).not.toBe(officialArtwork);
              expect(mockImageElement.src).toBe(frontDefault);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 22: Image Placeholder Handling', () => {
      test('should show placeholder when no valid images are available', () => {
        /**
         * **Validates: Requirements 8.4**
         * 
         * Property 22: Image Placeholder Handling
         * For any Pokemon data without both official artwork and front_default sprites, 
         * the image display should show a placeholder or no-image message
         */

        // Generator for Pokemon without any valid images
        const pokemonWithoutImagesArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,15}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy', 'fighting', 'poison', 'ground', 'flying', 'bug', 'rock', 'ghost', 'steel', 'normal'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,20}$/), { minLength: 1, maxLength: 3 }),
          id: fc.integer({ min: 1, max: 1000 }),
          spriteScenario: fc.oneof(
            // Both official artwork and front_default are null
            fc.constant({
              other: {
                'official-artwork': {
                  front_default: null
                }
              },
              front_default: null
            }),
            // Both official artwork and front_default are empty strings
            fc.constant({
              other: {
                'official-artwork': {
                  front_default: ''
                }
              },
              front_default: ''
            }),
            // Both are invalid URLs
            fc.constant({
              other: {
                'official-artwork': {
                  front_default: 'not-a-valid-url'
                }
              },
              front_default: 'also-not-valid'
            }),
            // Mixed invalid scenarios
            fc.constant({
              other: {
                'official-artwork': {
                  front_default: 'ftp://invalid-protocol.com/image.png'
                }
              },
              front_default: 'javascript:alert("xss")'
            }),
            // Official artwork null, front_default invalid
            fc.constant({
              other: {
                'official-artwork': {
                  front_default: null
                }
              },
              front_default: 'not-a-url'
            }),
            // Official artwork invalid, front_default null
            fc.constant({
              other: {
                'official-artwork': {
                  front_default: 'invalid-url'
                }
              },
              front_default: null
            }),
            // Malformed sprite structure
            fc.constant({
              other: null,
              front_default: null
            } as any),
            // Missing official-artwork structure
            fc.constant({
              other: {},
              front_default: null
            } as any),
            // Completely empty sprites
            fc.constant({} as any)
          )
        });

        fc.assert(
          fc.property(
            pokemonWithoutImagesArbitrary,
            (pokemon) => {
              // Given: Pokemon data without any valid images
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemon.name,
                generation: pokemon.generation,
                types: pokemon.types as readonly string[],
                abilities: pokemon.abilities as readonly string[],
                id: pokemon.id,
                sprites: pokemon.spriteScenario
              });

              const imageDisplay = new ImageDisplayImpl();

              // When: Getting the image URL
              const imageUrl = imageDisplay.getImageUrl(pokemonData);

              // Then: Should return empty string when no valid images are available
              expect(imageUrl).toBe('');

              // Verify that neither official artwork nor front_default are valid
              const officialArtwork = pokemonData.sprites?.other?.['official-artwork']?.front_default;
              const frontDefault = pokemonData.sprites?.front_default;

              // Check official artwork validity
              let isValidOfficialArtwork = false;
              if (officialArtwork && officialArtwork.trim() !== '') {
                try {
                  const parsedUrl = new URL(officialArtwork);
                  isValidOfficialArtwork = (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:');
                } catch {
                  isValidOfficialArtwork = false;
                }
              }

              // Check front_default validity
              let isValidFrontDefault = false;
              if (frontDefault && frontDefault.trim() !== '') {
                try {
                  const parsedUrl = new URL(frontDefault);
                  isValidFrontDefault = (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:');
                } catch {
                  isValidFrontDefault = false;
                }
              }

              // Both should be invalid for this test
              expect(isValidOfficialArtwork).toBe(false);
              expect(isValidFrontDefault).toBe(false);

              // When: Displaying the Pokemon image
              // Reset mocks
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';
              mockImageElement.alt = '';

              imageDisplay.displayPokemonImage(pokemonData);

              // Then: Should show placeholder instead of image

              // 1. Container should be visible for completed games
              expect(mockImageContainer.style.display).toBe('block');

              // 2. Image element should be hidden
              expect(mockImageElement.style.display).toBe('none');

              // 3. Placeholder should be visible
              expect(mockPlaceholderElement.style.display).toBe('block');

              // 4. Image source should remain empty
              expect(mockImageElement.src).toBe('');

              // 5. Placeholder text should be updated with Pokemon name
              expect(mockPlaceholderElement.querySelector).toHaveBeenCalledWith('.placeholder-text');

              // 6. No loading class should be added to image element
              expect(mockImageElement.classList.add).not.toHaveBeenCalledWith('loading');

              // 7. No error handlers should be set up for empty image
              expect(mockImageElement.onerror).toBeNull();
              expect(mockImageElement.onload).toBeNull();

              // 8. Verify placeholder behavior is consistent across multiple calls
              // Reset and test again
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageContainer.style.display = 'none';
              jest.clearAllMocks();

              imageDisplay.displayPokemonImage(pokemonData);

              // Results should be identical
              expect(mockImageContainer.style.display).toBe('block');
              expect(mockImageElement.style.display).toBe('none');
              expect(mockPlaceholderElement.style.display).toBe('block');
              expect(mockImageElement.src).toBe('');

              // 9. Test with fresh instance to ensure consistency
              const newImageDisplay = new ImageDisplayImpl();
              const secondImageUrl = newImageDisplay.getImageUrl(pokemonData);
              expect(secondImageUrl).toBe('');
              expect(secondImageUrl).toBe(imageUrl);

              // 10. Verify that getImageUrl is deterministic for same input
              const thirdImageUrl = imageDisplay.getImageUrl(pokemonData);
              expect(thirdImageUrl).toBe('');
              expect(thirdImageUrl).toBe(imageUrl);
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should handle edge cases in placeholder display', () => {
        /**
         * **Validates: Requirements 8.4**
         * 
         * Property 22: Image Placeholder Handling (Edge cases)
         * Placeholder handling should work correctly for edge cases like
         * malformed sprite data, unusual Pokemon names, and various invalid URL formats
         */

        // Generator for edge case scenarios without valid images
        const edgeCaseWithoutImagesArbitrary = fc.record({
          name: fc.oneof(
            fc.stringMatching(/^[a-z]{1,2}$/),      // Very short names
            fc.stringMatching(/^[a-z]{15,20}$/),    // Long names
            fc.constant('a'),                        // Single character
            fc.constant('nidoranf'),                // Names with special meaning
            fc.constant('mrrime'),                  // Names with abbreviations
            fc.constant('hooh')                     // Names with repeated letters
          ),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,12}$/), { minLength: 1, maxLength: 2 }),
          id: fc.integer({ min: 1, max: 1000 }),
          spriteEdgeCase: fc.oneof(
            // Completely undefined sprites
            fc.constant(undefined as any),
            // Null sprites
            fc.constant(null as any),
            // Empty object
            fc.constant({} as any),
            // Malformed nested structure
            fc.constant({
              other: undefined,
              front_default: undefined
            } as any),
            // Invalid nested structure
            fc.constant({
              other: {
                'official-artwork': undefined
              },
              front_default: undefined
            } as any),
            // URLs with truly invalid formats
            fc.constant({
              other: {
                'official-artwork': {
                  front_default: 'not-a-url-at-all'
                }
              },
              front_default: 'also-completely-invalid'
            }),
            // Very long invalid URLs
            fc.constant({
              other: {
                'official-artwork': {
                  front_default: 'not-a-url-' + 'x'.repeat(100)
                }
              },
              front_default: 'also-invalid-' + 'y'.repeat(100)
            }),
            // URLs with dangerous content
            fc.constant({
              other: {
                'official-artwork': {
                  front_default: 'javascript:alert("xss-attempt")'
                }
              },
              front_default: 'data:text/html,<script>alert("xss")</script>'
            }),
            // Mixed null and invalid
            fc.constant({
              other: {
                'official-artwork': {
                  front_default: null
                }
              },
              front_default: 'file:///etc/passwd'
            })
          )
        });

        fc.assert(
          fc.property(
            edgeCaseWithoutImagesArbitrary,
            (pokemon) => {
              // Given: Pokemon with edge case data and no valid images
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemon.name,
                generation: pokemon.generation,
                types: pokemon.types as readonly string[],
                abilities: pokemon.abilities as readonly string[],
                id: pokemon.id,
                sprites: pokemon.spriteEdgeCase || {
                  other: {
                    'official-artwork': {
                      front_default: null
                    }
                  },
                  front_default: null
                }
              });

              const imageDisplay = new ImageDisplayImpl();

              // When: Getting image URL with edge case data
              const imageUrl = imageDisplay.getImageUrl(pokemonData);

              // Then: Should handle edge cases gracefully

              // 1. Should return empty string for all edge cases without valid images
              expect(imageUrl).toBe('');

              // 2. Should not throw errors with malformed data
              expect(() => {
                imageDisplay.getImageUrl(pokemonData);
              }).not.toThrow();

              // When: Displaying image with edge case data
              // Reset mocks
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';
              mockImageElement.alt = '';

              // Should not throw errors during display
              expect(() => {
                imageDisplay.displayPokemonImage(pokemonData);
              }).not.toThrow();

              // Then: Should show placeholder gracefully

              // 3. Container should be visible regardless of edge cases
              expect(mockImageContainer.style.display).toBe('block');

              // 4. Should show placeholder for all edge cases
              expect(mockImageElement.style.display).toBe('none');
              expect(mockPlaceholderElement.style.display).toBe('block');

              // 5. Image source should remain empty
              expect(mockImageElement.src).toBe('');

              // 6. Placeholder text should be updated even with unusual names
              expect(mockPlaceholderElement.querySelector).toHaveBeenCalledWith('.placeholder-text');

              // 7. Should handle very short and very long names
              if (pokemon.name.length >= 1) {
                // Name should be processed without errors
                const expectedFirstChar = pokemon.name.charAt(0).toUpperCase();
                expect(expectedFirstChar).toMatch(/[A-Z]/);
              }

              // 8. No image-related setup should occur
              expect(mockImageElement.classList.add).not.toHaveBeenCalledWith('loading');
              expect(mockImageElement.onerror).toBeNull();
              expect(mockImageElement.onload).toBeNull();

              // 9. Multiple calls should be consistent
              const secondCall = imageDisplay.getImageUrl(pokemonData);
              expect(secondCall).toBe('');
              expect(secondCall).toBe(imageUrl);

              // 10. Fresh instance should behave identically
              const newImageDisplay = new ImageDisplayImpl();
              const thirdCall = newImageDisplay.getImageUrl(pokemonData);
              expect(thirdCall).toBe('');

              // 11. Display should be idempotent
              imageDisplay.displayPokemonImage(pokemonData);
              expect(mockImageContainer.style.display).toBe('block');
              expect(mockImageElement.style.display).toBe('none');
              expect(mockPlaceholderElement.style.display).toBe('block');

              // 12. Error handling should be robust for all edge cases
              // Verify that no exceptions are thrown during any operation
              expect(() => {
                for (let i = 0; i < 3; i++) {
                  imageDisplay.getImageUrl(pokemonData);
                  imageDisplay.displayPokemonImage(pokemonData);
                }
              }).not.toThrow();
            }
          ),
          { numRuns: 100 }
        );
      });

      test('should maintain placeholder consistency across different invalid image combinations', () => {
        /**
         * **Validates: Requirements 8.4**
         * 
         * Property 22: Image Placeholder Handling (Combination consistency)
         * Placeholder should be shown consistently regardless of the specific
         * combination of invalid/missing official artwork and front_default sprites
         */

        // Generator for all possible combinations of invalid images
        const invalidImageCombinationsArbitrary = fc.record({
          officialArtworkCase: fc.oneof(
            fc.constant(null),
            fc.constant(''),
            fc.constant('not-a-url'),
            fc.constant('ftp://invalid.com/img.png'),
            fc.constant('javascript:void(0)'),
            fc.constant('data:invalid'),
            fc.constant('//missing-protocol.com/img.png'),
            fc.constant('file:///local/path.png'),
            fc.constant('relative/path.png'),
            fc.constant('https://'),
            fc.constant('http://'),
            fc.constant('   '), // Whitespace
            fc.constant('\n\t') // Other whitespace
          ),
          frontDefaultCase: fc.oneof(
            fc.constant(null),
            fc.constant(''),
            fc.constant('not-a-url'),
            fc.constant('ftp://invalid.com/sprite.png'),
            fc.constant('javascript:alert("test")'),
            fc.constant('data:text/html,<h1>test</h1>'),
            fc.constant('//missing-protocol.com/sprite.png'),
            fc.constant('file:///local/sprite.png'),
            fc.constant('relative/sprite.png'),
            fc.constant('https://'),
            fc.constant('http://'),
            fc.constant('   '), // Whitespace
            fc.constant('\n\t') // Other whitespace
          )
        });

        const pokemonBaseArbitrary = fc.record({
          name: fc.stringMatching(/^[a-z]{3,12}$/),
          generation: fc.integer({ min: 1, max: 9 }),
          types: fc.array(fc.constantFrom('fire', 'water', 'grass', 'electric'), { minLength: 1, maxLength: 2 }),
          abilities: fc.array(fc.stringMatching(/^[a-z-]{3,15}$/), { minLength: 1, maxLength: 2 }),
          id: fc.integer({ min: 1, max: 500 })
        });

        fc.assert(
          fc.property(
            pokemonBaseArbitrary,
            invalidImageCombinationsArbitrary,
            (pokemon, invalidCombination) => {
              // Given: Pokemon with specific combination of invalid images
              const pokemonData: PokemonData = createMockPokemonData({
                name: pokemon.name,
                generation: pokemon.generation,
                types: pokemon.types as readonly string[],
                abilities: pokemon.abilities as readonly string[],
                id: pokemon.id,
                sprites: {
                  other: {
                    'official-artwork': {
                      front_default: invalidCombination.officialArtworkCase
                    }
                  },
                  front_default: invalidCombination.frontDefaultCase
                }
              });

              const imageDisplay = new ImageDisplayImpl();

              // When: Getting image URL for any invalid combination
              const imageUrl = imageDisplay.getImageUrl(pokemonData);

              // Then: Should consistently return empty string for all invalid combinations
              expect(imageUrl).toBe('');

              // Verify both images are indeed invalid
              const officialArtwork = invalidCombination.officialArtworkCase;
              const frontDefault = invalidCombination.frontDefaultCase;

              // Check official artwork validity
              let isValidOfficialArtwork = false;
              if (officialArtwork && officialArtwork.trim() !== '') {
                try {
                  const parsedUrl = new URL(officialArtwork);
                  isValidOfficialArtwork = (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:');
                } catch {
                  isValidOfficialArtwork = false;
                }
              }

              // Check front_default validity
              let isValidFrontDefault = false;
              if (frontDefault && frontDefault.trim() !== '') {
                try {
                  const parsedUrl = new URL(frontDefault);
                  isValidFrontDefault = (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:');
                } catch {
                  isValidFrontDefault = false;
                }
              }

              // Both should be invalid
              expect(isValidOfficialArtwork).toBe(false);
              expect(isValidFrontDefault).toBe(false);

              // When: Displaying the image
              mockImageContainer.style.display = 'none';
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageElement.src = '';
              mockImageElement.alt = '';

              imageDisplay.displayPokemonImage(pokemonData);

              // Then: Should show placeholder consistently for all invalid combinations

              // 1. Container should always be visible
              expect(mockImageContainer.style.display).toBe('block');

              // 2. Image should always be hidden for invalid combinations
              expect(mockImageElement.style.display).toBe('none');

              // 3. Placeholder should always be visible for invalid combinations
              expect(mockPlaceholderElement.style.display).toBe('block');

              // 4. Image source should always be empty for invalid combinations
              expect(mockImageElement.src).toBe('');

              // 5. Placeholder text should always be updated
              expect(mockPlaceholderElement.querySelector).toHaveBeenCalledWith('.placeholder-text');

              // 6. No image-related setup should occur for any invalid combination
              expect(mockImageElement.classList.add).not.toHaveBeenCalledWith('loading');
              expect(mockImageElement.onerror).toBeNull();
              expect(mockImageElement.onload).toBeNull();

              // 7. Behavior should be identical across different invalid combinations
              // Test multiple instances with same data
              const newImageDisplay = new ImageDisplayImpl();
              const secondUrl = newImageDisplay.getImageUrl(pokemonData);
              expect(secondUrl).toBe('');
              expect(secondUrl).toBe(imageUrl);

              // Reset and test display again
              mockImageElement.style.display = 'none';
              mockPlaceholderElement.style.display = 'none';
              mockImageContainer.style.display = 'none';
              jest.clearAllMocks();

              newImageDisplay.displayPokemonImage(pokemonData);

              // Results should be identical
              expect(mockImageContainer.style.display).toBe('block');
              expect(mockImageElement.style.display).toBe('none');
              expect(mockPlaceholderElement.style.display).toBe('block');
              expect(mockImageElement.src).toBe('');

              // 8. Verify that the specific invalid values don't affect the outcome
              // All invalid combinations should result in the same placeholder behavior
              expect(mockPlaceholderElement.querySelector).toHaveBeenCalledWith('.placeholder-text');

              // 9. Test consistency across multiple calls with same invalid data
              for (let i = 0; i < 3; i++) {
                const urlCall = imageDisplay.getImageUrl(pokemonData);
                expect(urlCall).toBe('');
              }

              // 10. Verify no side effects from invalid URLs
              expect(() => {
                imageDisplay.getImageUrl(pokemonData);
                imageDisplay.displayPokemonImage(pokemonData);
              }).not.toThrow();
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});