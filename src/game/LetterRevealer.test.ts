/**
 * Unit tests for LetterRevealer implementation
 * Tests letter guessing mechanics and name revelation logic
 */

import { LetterRevealerImpl } from './LetterRevealer';
import { ValidationError } from '../types';
import * as fc from 'fast-check';

describe('LetterRevealer', () => {
  let letterRevealer: LetterRevealerImpl;

  beforeEach(() => {
    letterRevealer = new LetterRevealerImpl();
  });

  describe('initializeName', () => {
    it('should initialize with a valid Pokemon name', () => {
      // Given
      const pokemonName = 'pikachu';

      // When
      letterRevealer.initializeName(pokemonName);

      // Then
      expect(letterRevealer.getRevealedName()).toBe('_______');
      expect(letterRevealer.getPokemonName()).toBe('pikachu');
      expect(letterRevealer.isNameComplete()).toBe(false);
    });

    it('should handle names with mixed case', () => {
      // Given
      const pokemonName = 'Pikachu';

      // When
      letterRevealer.initializeName(pokemonName);

      // Then
      expect(letterRevealer.getPokemonName()).toBe('pikachu');
      expect(letterRevealer.getRevealedName()).toBe('_______');
    });

    it('should throw error for empty name', () => {
      // Given
      const pokemonName = '';

      // When & Then
      expect(() => letterRevealer.initializeName(pokemonName)).toThrow(ValidationError);
    });

    it('should throw error for non-string name', () => {
      // Given
      const pokemonName = 123 as any;

      // When & Then
      expect(() => letterRevealer.initializeName(pokemonName)).toThrow(ValidationError);
    });

    it('should throw error for name with no alphabetic characters', () => {
      // Given
      const pokemonName = '123';

      // When & Then
      expect(() => letterRevealer.initializeName(pokemonName)).toThrow(ValidationError);
    });
  });

  describe('guessLetter', () => {
    beforeEach(() => {
      letterRevealer.initializeName('pikachu');
    });

    it('should correctly guess a letter that exists in the name', () => {
      // Given
      const letter = 'p';

      // When
      const result = letterRevealer.guessLetter(letter);

      // Then
      expect(result.isCorrect).toBe(true);
      expect(result.positions).toEqual([0]);
      expect(result.alreadyGuessed).toBe(false);
      expect(letterRevealer.getRevealedName()).toBe('p______');
    });

    it('should correctly guess a letter that appears multiple times', () => {
      // Given
      letterRevealer.initializeName('pokemon'); // 'o' appears at positions 1 and 5
      const letter = 'o';

      // When
      const result = letterRevealer.guessLetter(letter);

      // Then
      expect(result.isCorrect).toBe(true);
      expect(result.positions).toEqual([1, 5]);
      expect(result.alreadyGuessed).toBe(false);
      expect(letterRevealer.getRevealedName()).toBe('_o___o_');
    });

    it('should handle incorrect letter guess', () => {
      // Given
      const letter = 'z';

      // When
      const result = letterRevealer.guessLetter(letter);

      // Then
      expect(result.isCorrect).toBe(false);
      expect(result.positions).toEqual([]);
      expect(result.alreadyGuessed).toBe(false);
      expect(letterRevealer.getRevealedName()).toBe('_______');
    });

    it('should handle duplicate correct guess', () => {
      // Given
      letterRevealer.guessLetter('p'); // First guess

      // When
      const result = letterRevealer.guessLetter('p'); // Duplicate guess

      // Then
      expect(result.isCorrect).toBe(true);
      expect(result.positions).toEqual([0]);
      expect(result.alreadyGuessed).toBe(true);
      expect(letterRevealer.getRevealedName()).toBe('p______');
    });

    it('should handle duplicate incorrect guess', () => {
      // Given
      letterRevealer.guessLetter('z'); // First guess

      // When
      const result = letterRevealer.guessLetter('z'); // Duplicate guess

      // Then
      expect(result.isCorrect).toBe(false);
      expect(result.positions).toEqual([]);
      expect(result.alreadyGuessed).toBe(true);
      expect(letterRevealer.getRevealedName()).toBe('_______');
    });

    it('should handle case-insensitive guessing', () => {
      // Given
      const letter = 'P';

      // When
      const result = letterRevealer.guessLetter(letter);

      // Then
      expect(result.isCorrect).toBe(true);
      expect(result.positions).toEqual([0]);
      expect(letterRevealer.getRevealedName()).toBe('p______');
    });

    it('should throw error for invalid letter input', () => {
      // Given
      const invalidInputs = ['', 'ab', '1', '!', null as any, undefined as any];

      // When & Then
      invalidInputs.forEach(input => {
        expect(() => letterRevealer.guessLetter(input)).toThrow(ValidationError);
      });
    });
  });

  describe('isNameComplete', () => {
    beforeEach(() => {
      letterRevealer.initializeName('cat');
    });

    it('should return false when name is not complete', () => {
      // Given
      letterRevealer.guessLetter('c');

      // When
      const isComplete = letterRevealer.isNameComplete();

      // Then
      expect(isComplete).toBe(false);
      expect(letterRevealer.getRevealedName()).toBe('c__');
    });

    it('should return true when all letters are revealed', () => {
      // Given
      letterRevealer.guessLetter('c');
      letterRevealer.guessLetter('a');
      letterRevealer.guessLetter('t');

      // When
      const isComplete = letterRevealer.isNameComplete();

      // Then
      expect(isComplete).toBe(true);
      expect(letterRevealer.getRevealedName()).toBe('cat');
    });
  });

  describe('getGuessedLetters', () => {
    beforeEach(() => {
      letterRevealer.initializeName('pikachu');
    });

    it('should track correct and incorrect guesses separately', () => {
      // Given
      letterRevealer.guessLetter('p'); // correct
      letterRevealer.guessLetter('z'); // incorrect
      letterRevealer.guessLetter('i'); // correct
      letterRevealer.guessLetter('x'); // incorrect

      // When
      const guessedLetters = letterRevealer.getGuessedLetters();

      // Then
      expect(guessedLetters.correct).toEqual(['p', 'i']);
      expect(guessedLetters.incorrect).toEqual(['z', 'x']);
    });

    it('should return empty arrays initially', () => {
      // When
      const guessedLetters = letterRevealer.getGuessedLetters();

      // Then
      expect(guessedLetters.correct).toEqual([]);
      expect(guessedLetters.incorrect).toEqual([]);
    });

    it('should not include duplicate guesses', () => {
      // Given
      letterRevealer.guessLetter('p'); // correct
      letterRevealer.guessLetter('p'); // duplicate
      letterRevealer.guessLetter('z'); // incorrect
      letterRevealer.guessLetter('z'); // duplicate

      // When
      const guessedLetters = letterRevealer.getGuessedLetters();

      // Then
      expect(guessedLetters.correct).toEqual(['p']);
      expect(guessedLetters.incorrect).toEqual(['z']);
    });
  });

  describe('getDisplayName', () => {
    beforeEach(() => {
      letterRevealer.initializeName('pikachu');
    });

    it('should return properly formatted display name with spaces', () => {
      // Given - no letters guessed yet

      // When
      const displayName = letterRevealer.getDisplayName();

      // Then
      expect(displayName).toBe('_ _ _ _ _ _ _');
    });

    it('should show revealed letters in uppercase with spaces', () => {
      // Given
      letterRevealer.guessLetter('p');
      letterRevealer.guessLetter('i');

      // When
      const displayName = letterRevealer.getDisplayName();

      // Then
      expect(displayName).toBe('P I _ _ _ _ _');
    });

    it('should handle completely revealed name', () => {
      // Given
      letterRevealer.guessLetter('p');
      letterRevealer.guessLetter('i');
      letterRevealer.guessLetter('k');
      letterRevealer.guessLetter('a');
      letterRevealer.guessLetter('c');
      letterRevealer.guessLetter('h');
      letterRevealer.guessLetter('u');

      // When
      const displayName = letterRevealer.getDisplayName();

      // Then
      expect(displayName).toBe('P I K A C H U');
    });

    it('should handle names with repeated letters', () => {
      // Given
      letterRevealer.initializeName('pokemon');
      letterRevealer.guessLetter('o');

      // When
      const displayName = letterRevealer.getDisplayName();

      // Then
      expect(displayName).toBe('_ O _ _ _ O _');
    });

    it('should handle single character names', () => {
      // Given
      letterRevealer.initializeName('a');

      // When
      const displayName = letterRevealer.getDisplayName();

      // Then
      expect(displayName).toBe('_');
    });

    it('should handle single character names when revealed', () => {
      // Given
      letterRevealer.initializeName('a');
      letterRevealer.guessLetter('a');

      // When
      const displayName = letterRevealer.getDisplayName();

      // Then
      expect(displayName).toBe('A');
    });
  });

  describe('Property-Based Tests', () => {
    describe('Property 7: Letter Revelation Completeness', () => {
      it('should reveal all instances of a guessed letter in their correct positions', async () => {
        /**
         * **Validates: Requirements 3.1, 3.2**
         * 
         * Property 7: Letter Revelation Completeness
         * For any Pokemon name and guessed letter, if the letter exists in the name (case-insensitive), 
         * then all instances of that letter should be revealed in their correct positions
         */
        
        // Generator for valid Pokemon names (alphabetic characters only)
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);
        
        // Generator for letters (both uppercase and lowercase)
        const letterArbitrary = fc.char().filter(c => /[a-zA-Z]/.test(c));

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            letterArbitrary,
            async (pokemonName, letter) => {
              // Given - a fresh letter revealer with a specific Pokemon name
              const freshLetterRevealer = new LetterRevealerImpl();
              freshLetterRevealer.initializeName(pokemonName);

              // When - guessing a letter
              const result = freshLetterRevealer.guessLetter(letter);
              const revealedName = freshLetterRevealer.getRevealedName();

              // Then - verify letter revelation completeness
              const letterExistsInName = pokemonName.toLowerCase().includes(letter.toLowerCase());
              
              if (letterExistsInName) {
                // Letter exists: should be correct and all instances should be revealed
                expect(result.isCorrect).toBe(true);
                
                // Find all expected positions of the letter (case-insensitive)
                const expectedPositions: number[] = [];
                const lowerPokemonName = pokemonName.toLowerCase();
                const lowerLetter = letter.toLowerCase();
                
                for (let i = 0; i < lowerPokemonName.length; i++) {
                  if (lowerPokemonName[i] === lowerLetter) {
                    expectedPositions.push(i);
                  }
                }
                
                // Verify that the result contains all expected positions
                expect(result.positions).toEqual(expectedPositions);
                expect(result.positions.length).toBeGreaterThan(0);
                
                // Verify that all instances are revealed in the revealed name
                for (const position of expectedPositions) {
                  expect(revealedName[position]).toBe(lowerLetter);
                }
                
                // Verify that no other positions contain this letter
                for (let i = 0; i < revealedName.length; i++) {
                  if (revealedName[i] === lowerLetter) {
                    expect(expectedPositions).toContain(i);
                  }
                }
                
                // Verify the letter is tracked as a correct guess
                const guessedLetters = freshLetterRevealer.getGuessedLetters();
                expect(guessedLetters.correct).toContain(lowerLetter);
                expect(guessedLetters.incorrect).not.toContain(lowerLetter);
                
              } else {
                // Letter doesn't exist: should be incorrect and no positions revealed
                expect(result.isCorrect).toBe(false);
                expect(result.positions).toEqual([]);
                
                // Verify that the revealed name doesn't contain this letter
                expect(revealedName.toLowerCase()).not.toContain(letter.toLowerCase());
                
                // Verify the letter is tracked as an incorrect guess
                const guessedLetters = freshLetterRevealer.getGuessedLetters();
                expect(guessedLetters.incorrect).toContain(letter.toLowerCase());
                expect(guessedLetters.correct).not.toContain(letter.toLowerCase());
              }

              // Additional invariants that should always hold
              expect(result.alreadyGuessed).toBe(false); // First time guessing this letter
              expect(revealedName.length).toBe(pokemonName.length); // Length should match
              
              // Revealed name should only contain lowercase letters, underscores, or original non-alphabetic chars
              for (let i = 0; i < revealedName.length; i++) {
                const char = revealedName[i];
                const originalChar = pokemonName[i];
                
                if (/[a-zA-Z]/.test(originalChar!)) {
                  // Original was alphabetic: should be lowercase letter or underscore
                  expect(/[a-z_]/.test(char!)).toBe(true);
                } else {
                  // Original was non-alphabetic: should be preserved
                  expect(char).toBe(originalChar);
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle case-insensitive letter matching consistently', async () => {
        /**
         * **Validates: Requirements 3.1, 3.2**
         * 
         * Property 7: Letter Revelation Completeness (Case insensitive)
         * Letter revelation should be case-insensitive - uppercase and lowercase 
         * versions of the same letter should reveal the same positions
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);
        const letterArbitrary = fc.char().filter(c => /[a-zA-Z]/.test(c));

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            letterArbitrary,
            async (pokemonName, letter) => {
              // Given - two fresh letter revealers with the same Pokemon name
              const letterRevealer1 = new LetterRevealerImpl();
              const letterRevealer2 = new LetterRevealerImpl();
              
              letterRevealer1.initializeName(pokemonName);
              letterRevealer2.initializeName(pokemonName);

              // When - guessing the same letter in different cases
              const lowerResult = letterRevealer1.guessLetter(letter.toLowerCase());
              const upperResult = letterRevealer2.guessLetter(letter.toUpperCase());

              // Then - both should have identical effects
              expect(lowerResult.isCorrect).toBe(upperResult.isCorrect);
              expect(lowerResult.positions).toEqual(upperResult.positions);
              expect(lowerResult.alreadyGuessed).toBe(upperResult.alreadyGuessed);
              
              // Revealed names should be identical
              expect(letterRevealer1.getRevealedName()).toBe(letterRevealer2.getRevealedName());
              
              // Guessed letters should contain the lowercase version in both cases
              const guessedLetters1 = letterRevealer1.getGuessedLetters();
              const guessedLetters2 = letterRevealer2.getGuessedLetters();
              
              expect(guessedLetters1.correct).toEqual(guessedLetters2.correct);
              expect(guessedLetters1.incorrect).toEqual(guessedLetters2.incorrect);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle multiple occurrences of the same letter correctly', async () => {
        /**
         * **Validates: Requirements 3.1, 3.2**
         * 
         * Property 7: Letter Revelation Completeness (Multiple occurrences)
         * When a letter appears multiple times in a Pokemon name, all instances 
         * should be revealed simultaneously
         */
        
        // Generator for Pokemon names that are likely to have repeated letters
        const pokemonNameWithRepeatsArbitrary = fc.oneof(
          fc.stringMatching(/^[a-z]{3,15}$/),
          fc.constant('pokemon'), // Known name with repeated 'o'
          fc.constant('eevee'),   // Known name with repeated 'e'
          fc.constant('seel'),    // Known name with repeated 'e'
          fc.constant('doduo'),   // Known name with repeated 'd' and 'o'
          fc.constant('alakazam'), // Known name with repeated 'a'
          fc.constant('butterfree'), // Known name with repeated 'e' and 't'
          // Generate names with intentional repeats
          fc.tuple(
            fc.stringMatching(/^[a-z]{1,5}$/),
            fc.char().filter(c => /[a-z]/.test(c)),
            fc.stringMatching(/^[a-z]{1,5}$/)
          ).map(([prefix, repeatedChar, suffix]) => 
            `${prefix}${repeatedChar}${repeatedChar}${suffix}`.substring(0, 15)
          ).filter(name => name.length >= 3)
        );
        
        const letterArbitrary = fc.char().filter(c => /[a-zA-Z]/.test(c));

        await fc.assert(
          fc.asyncProperty(
            pokemonNameWithRepeatsArbitrary,
            letterArbitrary,
            async (pokemonName, letter) => {
              // Given - a fresh letter revealer
              const letterRevealer = new LetterRevealerImpl();
              letterRevealer.initializeName(pokemonName);

              // Count expected occurrences of the letter
              const lowerPokemonName = pokemonName.toLowerCase();
              const lowerLetter = letter.toLowerCase();
              const expectedOccurrences = lowerPokemonName.split('').filter(c => c === lowerLetter).length;

              // When - guessing the letter
              const result = letterRevealer.guessLetter(letter);
              const revealedName = letterRevealer.getRevealedName();

              if (expectedOccurrences > 0) {
                // Then - all occurrences should be revealed
                expect(result.isCorrect).toBe(true);
                expect(result.positions.length).toBe(expectedOccurrences);
                
                // Count actual revealed occurrences
                const actualOccurrences = revealedName.split('').filter(c => c === lowerLetter).length;
                expect(actualOccurrences).toBe(expectedOccurrences);
                
                // Verify each position is correct
                for (const position of result.positions) {
                  expect(lowerPokemonName[position]).toBe(lowerLetter);
                  expect(revealedName[position]).toBe(lowerLetter);
                }
                
                // Verify positions are unique and sorted
                const uniquePositions = [...new Set(result.positions)];
                expect(uniquePositions.length).toBe(result.positions.length);
                expect(result.positions).toEqual([...result.positions].sort((a, b) => a - b));
                
              } else {
                // No occurrences: should be incorrect
                expect(result.isCorrect).toBe(false);
                expect(result.positions).toEqual([]);
                expect(revealedName).not.toContain(lowerLetter);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should maintain revelation state consistency across multiple guesses', async () => {
        /**
         * **Validates: Requirements 3.1, 3.2**
         * 
         * Property 7: Letter Revelation Completeness (State consistency)
         * The revelation state should remain consistent as multiple letters are guessed,
         * with each correct letter revealing all its instances
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{4,10}$/);
        const letterSequenceArbitrary = fc.array(
          fc.char().filter(c => /[a-zA-Z]/.test(c)),
          { minLength: 2, maxLength: 5 }
        );

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            letterSequenceArbitrary,
            async (pokemonName, letterSequence) => {
              // Given - a fresh letter revealer
              const letterRevealer = new LetterRevealerImpl();
              letterRevealer.initializeName(pokemonName);

              const lowerPokemonName = pokemonName.toLowerCase();
              let expectedRevealedName = pokemonName.toLowerCase().replace(/[a-z]/g, '_');

              // When - guessing multiple letters in sequence
              for (const letter of letterSequence) {
                const lowerLetter = letter.toLowerCase();
                const result = letterRevealer.guessLetter(lowerLetter);
                
                if (result.isCorrect && !result.alreadyGuessed) {
                  // Update expected revealed name
                  for (let i = 0; i < lowerPokemonName.length; i++) {
                    if (lowerPokemonName[i] === lowerLetter) {
                      expectedRevealedName = expectedRevealedName.substring(0, i) + 
                                           lowerLetter + 
                                           expectedRevealedName.substring(i + 1);
                    }
                  }
                }
                
                // Then - verify current state matches expected state
                const currentRevealedName = letterRevealer.getRevealedName();
                expect(currentRevealedName).toBe(expectedRevealedName);
                
                // Verify that all revealed letters correspond to correct positions
                for (let i = 0; i < currentRevealedName.length; i++) {
                  const revealedChar = currentRevealedName[i];
                  const originalChar = lowerPokemonName[i];
                  
                  if (revealedChar !== '_') {
                    // If revealed, it should match the original character
                    expect(revealedChar).toBe(originalChar);
                  }
                }
              }

              // Final consistency check: no letter should be revealed unless it was guessed correctly
              const guessedLetters = letterRevealer.getGuessedLetters();
              const finalRevealedName = letterRevealer.getRevealedName();
              
              for (let i = 0; i < finalRevealedName.length; i++) {
                const revealedChar = finalRevealedName[i];
                if (revealedChar !== '_') {
                  expect(guessedLetters.correct).toContain(revealedChar);
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Property 9: Display State Consistency', () => {
      it('should show revealed letters in correct positions and blank spaces for unguessed letters', async () => {
        /**
         * **Validates: Requirements 3.5, 5.1**
         * 
         * Property 9: Display State Consistency
         * For any game state, the displayed name should show revealed letters in correct positions 
         * and blank spaces for unguessed letters, matching the actual guess progress
         */
        
        // Generator for valid Pokemon names (alphabetic characters only)
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{3,15}$/);
        
        // Generator for a sequence of letter guesses (mix of correct and incorrect)
        const letterSequenceArbitrary = fc.array(
          fc.char().filter(c => /[a-zA-Z]/.test(c)),
          { minLength: 0, maxLength: 8 }
        );

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            letterSequenceArbitrary,
            async (pokemonName, letterSequence) => {
              // Given - a fresh letter revealer with a specific Pokemon name
              const letterRevealer = new LetterRevealerImpl();
              letterRevealer.initializeName(pokemonName);

              const lowerPokemonName = pokemonName.toLowerCase();
              const guessedCorrectLetters = new Set<string>();

              // When - making a sequence of letter guesses
              for (const letter of letterSequence) {
                const lowerLetter = letter.toLowerCase();
                const result = letterRevealer.guessLetter(lowerLetter);
                
                if (result.isCorrect && !result.alreadyGuessed) {
                  guessedCorrectLetters.add(lowerLetter);
                }
              }

              // Then - verify display state consistency
              const revealedName = letterRevealer.getRevealedName();
              const displayName = letterRevealer.getDisplayName();
              const guessedLetters = letterRevealer.getGuessedLetters();

              // Property 1: Revealed name length should match original name length
              expect(revealedName.length).toBe(lowerPokemonName.length);

              // Property 2: Each position should be consistent between revealed name and original name
              for (let i = 0; i < lowerPokemonName.length; i++) {
                const originalChar = lowerPokemonName[i]!;
                const revealedChar = revealedName[i]!;

                if (/[a-z]/.test(originalChar)) {
                  // Original character is alphabetic
                  if (guessedCorrectLetters.has(originalChar)) {
                    // Letter has been correctly guessed: should be revealed
                    expect(revealedChar).toBe(originalChar);
                  } else {
                    // Letter has not been correctly guessed: should be blank
                    expect(revealedChar).toBe('_');
                  }
                } else {
                  // Original character is non-alphabetic: should be preserved
                  expect(revealedChar).toBe(originalChar);
                }
              }

              // Property 3: Display name should be properly formatted version of revealed name
              const expectedDisplayName = revealedName
                .split('')
                .map(char => char === '_' ? '_' : char.toUpperCase())
                .join(' ');
              expect(displayName).toBe(expectedDisplayName);

              // Property 4: All correctly guessed letters should be present in revealed name
              for (const correctLetter of guessedCorrectLetters) {
                if (lowerPokemonName.includes(correctLetter)) {
                  expect(revealedName).toContain(correctLetter);
                }
              }

              // Property 5: No unguessed letters should be revealed
              for (let i = 0; i < revealedName.length; i++) {
                const revealedChar = revealedName[i]!;
                if (revealedChar !== '_' && /[a-z]/.test(revealedChar)) {
                  expect(guessedCorrectLetters.has(revealedChar)).toBe(true);
                }
              }

              // Property 6: Guessed letters tracking should be consistent with revealed state
              for (const correctLetter of guessedLetters.correct) {
                if (lowerPokemonName.includes(correctLetter)) {
                  expect(revealedName).toContain(correctLetter);
                }
              }

              // Property 7: Display name should only contain uppercase letters, underscores, and spaces
              const displayChars = displayName.replace(/ /g, ''); // Remove spaces for character checking
              for (const char of displayChars) {
                expect(/[A-Z_]/.test(char)).toBe(true);
              }

              // Property 8: Number of revealed letters should match number of unique correct letters in name
              const revealedLetterCount = revealedName.split('').filter(c => c !== '_' && /[a-z]/.test(c)).length;
              let expectedRevealedCount = 0;
              for (const correctLetter of guessedCorrectLetters) {
                for (const char of lowerPokemonName) {
                  if (char === correctLetter) {
                    expectedRevealedCount++;
                  }
                }
              }
              expect(revealedLetterCount).toBe(expectedRevealedCount);

              // Property 9: Display name character count should be correct (letters + spaces)
              const expectedDisplayLength = revealedName.length > 0 ? (revealedName.length * 2 - 1) : 0;
              expect(displayName.length).toBe(expectedDisplayLength);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should maintain display consistency across different guess sequences', async () => {
        /**
         * **Validates: Requirements 3.5, 5.1**
         * 
         * Property 9: Display State Consistency (Sequence independence)
         * The final display state should be the same regardless of the order in which 
         * correct letters are guessed (as long as the same set of letters is guessed)
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{4,10}$/);
        
        // Generator for a set of letters that exist in the Pokemon name
        const correctLetterSetArbitrary = pokemonNameArbitrary.chain(pokemonName => {
          const uniqueLetters = [...new Set(pokemonName.toLowerCase().split(''))];
          return fc.subarray(uniqueLetters, { minLength: 1, maxLength: Math.min(uniqueLetters.length, 4) });
        });

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            correctLetterSetArbitrary,
            async (pokemonName, correctLetters) => {
              // Skip if no correct letters to test
              if (correctLetters.length === 0) return;

              // Given - two letter revealers with the same Pokemon
              const letterRevealer1 = new LetterRevealerImpl();
              const letterRevealer2 = new LetterRevealerImpl();
              
              letterRevealer1.initializeName(pokemonName);
              letterRevealer2.initializeName(pokemonName);

              // When - guessing the same letters in different orders
              const shuffledLetters = [...correctLetters].sort(() => Math.random() - 0.5);
              
              // First revealer: original order
              for (const letter of correctLetters) {
                letterRevealer1.guessLetter(letter);
              }
              
              // Second revealer: shuffled order
              for (const letter of shuffledLetters) {
                letterRevealer2.guessLetter(letter);
              }

              // Then - both should have identical display states
              expect(letterRevealer1.getRevealedName()).toBe(letterRevealer2.getRevealedName());
              expect(letterRevealer1.getDisplayName()).toBe(letterRevealer2.getDisplayName());
              expect(letterRevealer1.isNameComplete()).toBe(letterRevealer2.isNameComplete());
              
              // Guessed letters should be the same (order doesn't matter for sets)
              const guessed1 = letterRevealer1.getGuessedLetters();
              const guessed2 = letterRevealer2.getGuessedLetters();
              
              expect(new Set(guessed1.correct)).toEqual(new Set(guessed2.correct));
              expect(new Set(guessed1.incorrect)).toEqual(new Set(guessed2.incorrect));
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle edge cases in display formatting correctly', async () => {
        /**
         * **Validates: Requirements 3.5, 5.1**
         * 
         * Property 9: Display State Consistency (Edge cases)
         * Display formatting should handle edge cases like single characters, 
         * all letters revealed, and no letters revealed correctly
         */
        
        // Generator for various edge case Pokemon names
        const edgeCaseNameArbitrary = fc.oneof(
          fc.constant('a'),           // Single character
          fc.constant('ab'),          // Two characters
          fc.stringMatching(/^[a]{2,5}$/), // Repeated single letter
          fc.stringMatching(/^[a-z]{3,15}$/), // Normal names
          fc.constant('xyz'),         // All different letters
          fc.constant('aaa'),         // All same letter
          fc.constant('abcdefghij')   // Long name
        );

        await fc.assert(
          fc.asyncProperty(
            edgeCaseNameArbitrary,
            async (pokemonName) => {
              // Given - a letter revealer with an edge case Pokemon name
              const letterRevealer = new LetterRevealerImpl();
              letterRevealer.initializeName(pokemonName);

              const lowerPokemonName = pokemonName.toLowerCase();
              const uniqueLetters = [...new Set(lowerPokemonName.split(''))];

              // Test Case 1: No letters guessed (all blanks)
              let revealedName = letterRevealer.getRevealedName();
              let displayName = letterRevealer.getDisplayName();
              
              // Should be all underscores in revealed name
              expect(revealedName).toBe('_'.repeat(pokemonName.length));
              
              // Display name should be underscores separated by spaces
              const expectedBlankDisplay = '_'.repeat(pokemonName.length).split('').join(' ');
              expect(displayName).toBe(expectedBlankDisplay);

              // Test Case 2: All letters guessed (fully revealed)
              for (const letter of uniqueLetters) {
                letterRevealer.guessLetter(letter);
              }
              
              revealedName = letterRevealer.getRevealedName();
              displayName = letterRevealer.getDisplayName();
              
              // Should match the original name in lowercase
              expect(revealedName).toBe(lowerPokemonName);
              
              // Display name should be uppercase with spaces
              const expectedFullDisplay = lowerPokemonName.toUpperCase().split('').join(' ');
              expect(displayName).toBe(expectedFullDisplay);
              
              // Should be marked as complete
              expect(letterRevealer.isNameComplete()).toBe(true);

              // Test Case 3: Verify consistency properties for edge cases
              
              // Length consistency
              expect(revealedName.length).toBe(pokemonName.length);
              
              // Display formatting consistency
              const manualDisplayFormat = revealedName
                .split('')
                .map(char => char === '_' ? '_' : char.toUpperCase())
                .join(' ');
              expect(displayName).toBe(manualDisplayFormat);
              
              // Character validity
              for (const char of displayName.replace(/ /g, '')) {
                expect(/[A-Z_]/.test(char)).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should maintain display consistency with mixed correct and incorrect guesses', async () => {
        /**
         * **Validates: Requirements 3.5, 5.1**
         * 
         * Property 9: Display State Consistency (Mixed guesses)
         * Display state should only reflect correct guesses, regardless of how many 
         * incorrect guesses have been made
         */
        
        const pokemonNameArbitrary = fc.stringMatching(/^[a-z]{4,10}$/);
        const mixedGuessArbitrary = fc.tuple(
          fc.array(fc.char().filter(c => /[a-z]/.test(c)), { minLength: 1, maxLength: 3 }), // correct letters
          fc.array(fc.char().filter(c => /[a-z]/.test(c)), { minLength: 1, maxLength: 5 })  // potentially incorrect letters
        );

        await fc.assert(
          fc.asyncProperty(
            pokemonNameArbitrary,
            mixedGuessArbitrary,
            async (pokemonName, [correctLetters, mixedLetters]) => {
              // Filter to ensure we have actual correct and incorrect letters
              const lowerPokemonName = pokemonName.toLowerCase();
              const actualCorrectLetters = correctLetters.filter(letter => 
                lowerPokemonName.includes(letter)
              );
              const actualIncorrectLetters = mixedLetters.filter(letter => 
                !lowerPokemonName.includes(letter)
              );

              // Skip if we don't have both correct and incorrect letters to test
              if (actualCorrectLetters.length === 0 || actualIncorrectLetters.length === 0) {
                return;
              }

              // Given - a letter revealer
              const letterRevealer = new LetterRevealerImpl();
              letterRevealer.initializeName(pokemonName);

              // When - making mixed correct and incorrect guesses
              const allGuesses = [...actualCorrectLetters, ...actualIncorrectLetters];
              const shuffledGuesses = allGuesses.sort(() => Math.random() - 0.5);

              for (const letter of shuffledGuesses) {
                letterRevealer.guessLetter(letter);
              }

              // Then - display should only reflect correct guesses
              const revealedName = letterRevealer.getRevealedName();
              const displayName = letterRevealer.getDisplayName();
              const guessedLetters = letterRevealer.getGuessedLetters();

              // Verify that only correct letters are revealed
              for (let i = 0; i < revealedName.length; i++) {
                const revealedChar = revealedName[i]!;
                const originalChar = lowerPokemonName[i]!;

                if (revealedChar !== '_') {
                  // If revealed, it should be a correctly guessed letter
                  expect(actualCorrectLetters).toContain(revealedChar);
                  expect(revealedChar).toBe(originalChar);
                }
              }

              // Verify that incorrect guesses don't affect display
              for (const incorrectLetter of actualIncorrectLetters) {
                expect(revealedName).not.toContain(incorrectLetter);
                expect(displayName.toLowerCase().replace(/ /g, '')).not.toContain(incorrectLetter);
              }

              // Verify guessed letters tracking is accurate
              expect(guessedLetters.correct.length).toBe(new Set(actualCorrectLetters).size);
              expect(guessedLetters.incorrect.length).toBe(new Set(actualIncorrectLetters).size);

              // Verify display formatting consistency
              const expectedDisplayName = revealedName
                .split('')
                .map(char => char === '_' ? '_' : char.toUpperCase())
                .join(' ');
              expect(displayName).toBe(expectedDisplayName);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});