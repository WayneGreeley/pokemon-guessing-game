/**
 * Image Display component implementation
 * Handles Pokemon artwork and sprite display at game completion
 */

import {
  ImageDisplay,
  PokemonData,
  ValidationError
} from '../types';

/**
 * Implementation of Image Display that manages Pokemon artwork and sprite display
 */
export class ImageDisplayImpl implements ImageDisplay {
  private readonly imageElement: HTMLImageElement;
  private readonly imageContainer: HTMLElement;
  private readonly placeholderElement: HTMLElement;

  constructor() {
    // Get DOM element references
    this.imageContainer = this.getRequiredElement('pokemon-image-container');
    this.imageElement = this.getRequiredElement('pokemon-image') as HTMLImageElement;
    this.placeholderElement = this.getRequiredElement('pokemon-image-placeholder');
  }

  /**
   * Display Pokemon image at game end
   * @param pokemon Pokemon data containing sprite information
   */
  public displayPokemonImage(pokemon: PokemonData): void {
    try {
      // Show the image container
      this.imageContainer.style.display = 'block';
      
      // Get the best available image URL
      const imageUrl = this.getImageUrl(pokemon);
      
      if (imageUrl) {
        // Hide placeholder and show image
        this.placeholderElement.style.display = 'none';
        this.imageElement.style.display = 'block';
        
        // Set up error handling before setting src
        this.imageElement.onerror = () => this.handleImageError();
        this.imageElement.onload = () => this.handleImageLoad();
        
        // Set image source and alt text
        this.imageElement.src = imageUrl;
        this.imageElement.alt = `${pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)} artwork`;
        
        // Add loading class for smooth transition
        this.imageElement.classList.add('loading');
        
      } else {
        // No image available, show placeholder
        this.showPlaceholder(pokemon.name);
      }
      
    } catch (error) {
      console.error('Error displaying Pokemon image:', error);
      this.showPlaceholder(pokemon.name);
    }
  }

  /**
   * Get the best available image URL for a Pokemon
   * Priority: official-artwork → front_default → null
   * @param pokemon Pokemon data
   * @returns Image URL or null if no image available
   */
  public getImageUrl(pokemon: PokemonData): string {
    // First priority: official artwork
    const officialArtwork = pokemon.sprites?.other?.['official-artwork']?.front_default;
    if (officialArtwork && this.isValidUrl(officialArtwork)) {
      return officialArtwork;
    }

    // Second priority: front default sprite
    const frontDefault = pokemon.sprites?.front_default;
    if (frontDefault && this.isValidUrl(frontDefault)) {
      return frontDefault;
    }

    // No valid image URL found
    return '';
  }

  /**
   * Handle image loading error
   */
  public handleImageError(): void {
    console.warn('Failed to load Pokemon image, showing placeholder');
    
    // Hide the image and show placeholder
    this.imageElement.style.display = 'none';
    this.showPlaceholder('Unknown Pokemon');
    
    // Remove loading class
    this.imageElement.classList.remove('loading');
  }

  /**
   * Handle successful image load
   */
  private handleImageLoad(): void {
    // Remove loading class for smooth transition
    this.imageElement.classList.remove('loading');
  }

  /**
   * Show placeholder when no image is available
   * @param pokemonName Name of the Pokemon for placeholder text
   */
  private showPlaceholder(pokemonName: string): void {
    this.imageElement.style.display = 'none';
    this.placeholderElement.style.display = 'block';
    
    // Update placeholder text
    const placeholderText = this.placeholderElement.querySelector('.placeholder-text');
    if (placeholderText) {
      placeholderText.textContent = `${pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1)}`;
    }
  }

  /**
   * Hide the image display
   */
  public hideImage(): void {
    this.imageContainer.style.display = 'none';
    this.imageElement.classList.remove('loading');
    
    // Clear image source to prevent memory leaks
    this.imageElement.src = '';
    this.imageElement.onerror = null;
    this.imageElement.onload = null;
  }

  /**
   * Validate if a string is a valid URL suitable for image display
   * @param url URL string to validate
   * @returns True if valid HTTP/HTTPS URL, false otherwise
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      // Only allow HTTP and HTTPS protocols for image URLs
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Get a required DOM element by ID
   * @param id Element ID
   * @returns The DOM element
   * @throws ValidationError if element is not found
   */
  private getRequiredElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new ValidationError(`Required DOM element not found: ${id}`);
    }
    return element;
  }
}