/**
 * Hint System implementation
 * Provides Pokemon information as gameplay hints with cost management
 */

import {
  HintSystem,
  PokemonData,
  ValidationError
} from '../types';

/**
 * Implementation of hint system that provides Pokemon clues
 */
export class HintSystemImpl implements HintSystem {
  private pokemon: PokemonData | null = null;
  private hintsProvided: number = 0;

  /**
   * Initialize the hint system with Pokemon data
   * @param pokemon Pokemon data to generate hints from
   */
  public initializePokemon(pokemon: PokemonData): void {
    this.validatePokemonData(pokemon);
    this.pokemon = pokemon;
    this.hintsProvided = 0;
  }

  /**
   * Generate a hint about the current Pokemon
   * @returns Formatted hint string containing Pokemon information
   */
  public generateHint(): string {
    if (!this.pokemon) {
      throw new ValidationError('No Pokemon initialized for hint generation');
    }

    this.hintsProvided++;

    // Generate comprehensive hint with generation, types, and abilities
    const hintParts: string[] = [];

    // Add generation information
    hintParts.push(`Generation: ${this.pokemon.generation}`);

    // Add type information
    if (this.pokemon.types.length > 0) {
      const typeText = this.pokemon.types.length === 1 
        ? `Type: ${this.formatTypeNames(this.pokemon.types)}`
        : `Types: ${this.formatTypeNames(this.pokemon.types)}`;
      hintParts.push(typeText);
    }

    // Add ability information
    if (this.pokemon.abilities.length > 0) {
      const abilityText = this.pokemon.abilities.length === 1
        ? `Ability: ${this.formatAbilityNames(this.pokemon.abilities)}`
        : `Abilities: ${this.formatAbilityNames(this.pokemon.abilities)}`;
      hintParts.push(abilityText);
    }

    return hintParts.join(' | ');
  }

  /**
   * Check if more hints are available (always true in this implementation)
   * @returns True if more hints can be provided
   */
  public hasMoreHints(): boolean {
    // In this implementation, hints can always be requested (limited by guess counter)
    return this.pokemon !== null;
  }

  /**
   * Get the number of hints provided so far
   * @returns Number of hints provided
   */
  public getHintsProvided(): number {
    return this.hintsProvided;
  }

  /**
   * Reset the hint system (for new games)
   */
  public reset(): void {
    this.pokemon = null;
    this.hintsProvided = 0;
  }

  /**
   * Format type names for display
   * @param types Array of type names
   * @returns Formatted type string
   */
  private formatTypeNames(types: readonly string[]): string {
    return types
      .map(type => this.capitalizeFirstLetter(type))
      .join(', ');
  }

  /**
   * Format ability names for display
   * @param abilities Array of ability names
   * @returns Formatted ability string
   */
  private formatAbilityNames(abilities: readonly string[]): string {
    return abilities
      .map(ability => this.formatAbilityName(ability))
      .join(', ');
  }

  /**
   * Format a single ability name (handle hyphens and capitalization)
   * @param ability Raw ability name from API
   * @returns Formatted ability name
   */
  private formatAbilityName(ability: string): string {
    return ability
      .split('-')
      .map(word => this.capitalizeFirstLetter(word))
      .join(' ');
  }

  /**
   * Capitalize the first letter of a string
   * @param str String to capitalize
   * @returns String with first letter capitalized
   */
  private capitalizeFirstLetter(str: string): string {
    if (str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Validate Pokemon data for hint generation
   * @param pokemon Pokemon data to validate
   */
  private validatePokemonData(pokemon: PokemonData): void {
    if (!pokemon) {
      throw new ValidationError('Pokemon data is required for hint generation');
    }

    if (typeof pokemon.generation !== 'number' || pokemon.generation < 1 || pokemon.generation > 9) {
      throw new ValidationError('Pokemon must have a valid generation (1-9)');
    }

    if (!Array.isArray(pokemon.types)) {
      throw new ValidationError('Pokemon must have a types array');
    }

    if (!Array.isArray(pokemon.abilities)) {
      throw new ValidationError('Pokemon must have an abilities array');
    }
  }
}