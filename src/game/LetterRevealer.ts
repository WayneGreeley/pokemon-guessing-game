/**
 * Letter Revealer implementation
 * Manages letter guessing mechanics and name revelation logic
 */

import {
  LetterRevealer,
  LetterGuessResult,
  GuessedLetters,
  ValidationError
} from '../types';

/**
 * Implementation of letter revelation and guessing mechanics
 */
export class LetterRevealerImpl implements LetterRevealer {
  private pokemonName: string = '';
  private revealedName: string = '';
  private guessedLetters: GuessedLetters = {
    correct: [],
    incorrect: []
  };

  /**
   * Initialize the revealer with a Pokemon name
   * @param pokemonName The Pokemon name to use for the game
   */
  public initializeName(pokemonName: string): void {
    this.validatePokemonName(pokemonName);
    
    this.pokemonName = pokemonName.toLowerCase();
    this.revealedName = this.createBlankName(this.pokemonName);
    this.guessedLetters = {
      correct: [],
      incorrect: []
    };
  }

  /**
   * Process a letter guess and return the result
   * @param letter The letter being guessed
   * @returns Result of the letter guess
   */
  public guessLetter(letter: string): LetterGuessResult {
    this.validateLetter(letter);
    
    const lowerLetter = letter.toLowerCase();
    
    // Check if letter has already been guessed
    if (this.hasLetterBeenGuessed(lowerLetter)) {
      return {
        isCorrect: this.guessedLetters.correct.includes(lowerLetter),
        positions: this.findLetterPositions(lowerLetter),
        alreadyGuessed: true
      };
    }

    // Check if letter exists in Pokemon name
    const positions = this.findLetterPositions(lowerLetter);
    const isCorrect = positions.length > 0;

    if (isCorrect) {
      // Add to correct guesses and reveal letter positions
      this.guessedLetters = {
        ...this.guessedLetters,
        correct: [...this.guessedLetters.correct, lowerLetter]
      };
      this.revealLetterAtPositions(lowerLetter, positions);
    } else {
      // Add to incorrect guesses
      this.guessedLetters = {
        ...this.guessedLetters,
        incorrect: [...this.guessedLetters.incorrect, lowerLetter]
      };
    }

    return {
      isCorrect,
      positions,
      alreadyGuessed: false
    };
  }

  /**
   * Get the current revealed name with blanks and revealed letters
   * @returns The revealed name string
   */
  public getRevealedName(): string {
    return this.revealedName;
  }

  /**
   * Get the display-formatted name with proper spacing for UI
   * @returns The formatted display name with spaces between characters
   */
  public getDisplayName(): string {
    return this.revealedName
      .split('')
      .map(char => char === '_' ? '_' : char.toUpperCase())
      .join(' ');
  }

  /**
   * Check if the entire name has been revealed
   * @returns True if all letters are revealed
   */
  public isNameComplete(): boolean {
    return !this.revealedName.includes('_');
  }

  /**
   * Get all guessed letters categorized by correct/incorrect
   * @returns Object containing correct and incorrect letter arrays
   */
  public getGuessedLetters(): GuessedLetters {
    return {
      correct: [...this.guessedLetters.correct],
      incorrect: [...this.guessedLetters.incorrect]
    };
  }

  /**
   * Get the original Pokemon name (for testing/debugging)
   * @returns The original Pokemon name
   */
  public getPokemonName(): string {
    return this.pokemonName;
  }

  /**
   * Check if a letter has already been guessed
   * @param letter Letter to check (should be lowercase)
   * @returns True if letter has been guessed
   */
  private hasLetterBeenGuessed(letter: string): boolean {
    return this.guessedLetters.correct.includes(letter) ||
           this.guessedLetters.incorrect.includes(letter);
  }

  /**
   * Find all positions of a letter in the Pokemon name
   * @param letter Letter to find (should be lowercase)
   * @returns Array of positions where the letter appears
   */
  private findLetterPositions(letter: string): number[] {
    const positions: number[] = [];
    
    for (let i = 0; i < this.pokemonName.length; i++) {
      if (this.pokemonName[i] === letter) {
        positions.push(i);
      }
    }
    
    return positions;
  }

  /**
   * Reveal a letter at all specified positions
   * @param letter Letter to reveal
   * @param positions Positions where the letter should be revealed
   */
  private revealLetterAtPositions(letter: string, positions: number[]): void {
    const revealedArray = this.revealedName.split('');
    
    for (const position of positions) {
      if (position >= 0 && position < revealedArray.length) {
        revealedArray[position] = letter;
      }
    }
    
    this.revealedName = revealedArray.join('');
  }

  /**
   * Create a blank name string with underscores for letters
   * @param pokemonName The Pokemon name to create blanks for
   * @returns String with underscores for letters and other characters preserved
   */
  private createBlankName(pokemonName: string): string {
    return pokemonName
      .split('')
      .map(char => /[a-z]/.test(char) ? '_' : char)
      .join('');
  }

  /**
   * Validate Pokemon name input
   * @param pokemonName Pokemon name to validate
   */
  private validatePokemonName(pokemonName: string): void {
    if (typeof pokemonName !== 'string') {
      throw new ValidationError('Pokemon name must be a string');
    }
    
    if (pokemonName.trim().length === 0) {
      throw new ValidationError('Pokemon name cannot be empty');
    }
    
    // Check that name contains at least one alphabetic character
    if (!/[a-zA-Z]/.test(pokemonName)) {
      throw new ValidationError('Pokemon name must contain at least one alphabetic character');
    }
  }

  /**
   * Validate letter input
   * @param letter Letter to validate
   */
  private validateLetter(letter: string): void {
    if (typeof letter !== 'string' || letter.length !== 1) {
      throw new ValidationError('Letter must be a single character string');
    }
    
    if (!/[a-zA-Z]/.test(letter)) {
      throw new ValidationError('Letter must be alphabetic');
    }
  }
}