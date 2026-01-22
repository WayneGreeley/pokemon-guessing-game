# Pokemon Guessing Game

A web-based Pokemon guessing game that challenges players to identify Pokemon species names through a hangman-style gameplay mechanic. The game leverages the PokeAPI to dynamically fetch Pokemon data and provides an engaging guessing experience with hints and feedback.

## Features

- **Random Pokemon Selection**: Randomly selects Pokemon from generations 1-9 using the PokeAPI
- **Hangman-Style Gameplay**: Guess letters to reveal the Pokemon name
- **Hint System**: Get hints about the Pokemon's generation, types, and abilities (costs 1 guess)
- **Progressive Difficulty**: 7 incorrect guesses allowed per game
- **Responsive Design**: Works on desktop and mobile devices
- **GitHub Pages Ready**: Fully client-side application

## Technology Stack

- **TypeScript**: Type-safe JavaScript for robust development
- **Webpack**: Module bundling and build process
- **Jest**: Unit testing framework
- **fast-check**: Property-based testing library
- **PokeAPI**: External API for Pokemon data
- **Vanilla HTML/CSS/JS**: No framework dependencies for simplicity

## Getting Started

### Live Demo
🎮 **Play the game now**: [https://waynegreeley.github.io/pokemon-guessing-game/](https://waynegreeley.github.io/pokemon-guessing-game/)

### Prerequisites

- Node.js (version 16 or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pokemon-guessing-game
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Serve the application:
```bash
npm run serve
```

5. Open your browser and navigate to `http://localhost:8080`

### Development

For development with automatic rebuilding:
```bash
npm run dev
```

### Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Generate test coverage report:
```bash
npm run test:coverage
```

## Game Rules

1. **Objective**: Guess the Pokemon name letter by letter
2. **Guesses**: You have 7 incorrect guesses before losing
3. **Letters**: Correct letter guesses reveal all instances of that letter
4. **Hints**: Request hints for generation, types, and abilities (costs 1 guess each)
5. **Winning**: Reveal all letters in the Pokemon name
6. **Losing**: Run out of incorrect guesses

## Project Structure

```
pokemon-guessing-game/
├── src/
│   ├── types/           # TypeScript interfaces and types
│   ├── game/            # Core game logic components
│   ├── api/             # PokeAPI client and data handling
│   ├── ui/              # User interface controllers
│   └── main.ts          # Application entry point
├── dist/                # Built application files
├── coverage/            # Test coverage reports
├── index.html           # Main HTML file
├── styles.css           # Application styles
└── package.json         # Project configuration
```

## API Integration

This game uses the [PokeAPI](https://pokeapi.co/) to fetch Pokemon data:
- Generation endpoints for Pokemon lists
- Pokemon detail endpoints for complete information
- No API key required
- Rate limiting handled gracefully

## Browser Compatibility

- Modern browsers supporting ES2020
- Chrome 80+
- Firefox 72+
- Safari 13.1+
- Edge 80+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [PokeAPI](https://pokeapi.co/) for providing comprehensive Pokemon data
- The Pokemon Company for creating the Pokemon universe
- The TypeScript and Jest communities for excellent tooling