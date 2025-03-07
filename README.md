# OpenWriter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OpenWriter is an open-source AI-powered writing assistant that helps you create better content faster. It leverages multiple AI models through OpenRouter integration.

## About

OpenWriter aims to democratize access to AI writing tools by providing a free, open-source alternative to commercial offerings. By being open-source, it allows for community contributions, transparency, and customization to meet specific needs.

## Project Structure

The project is divided into two main components:

- **Frontend**: Next.js application with TypeScript and TailwindCSS
- **Backend**: Node.js with Express, SQLite, and OpenRouter API integration

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenRouter API key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Add your OpenRouter API key to the `.env` file.

5. Start the development server:
   ```bash
   npm run dev
   ```

The server will run on http://localhost:3001 by default.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on http://localhost:3000 by default.

## Features

- Multiple AI model support through OpenRouter
- Document creation and editing
- Model parameter customization (temperature, etc.)
- Local SQLite storage for user data and documents

## Tech Stack

- **Frontend**:
  - Next.js
  - TypeScript
  - TailwindCSS
  - React

- **Backend**:
  - Node.js
  - Express
  - TypeScript
  - SQLite (better-sqlite3)
  - OpenRouter API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Community

- [GitHub Issues](https://github.com/yourhandle/openwriter/issues) - Bug reports, feature requests
- [GitHub Discussions](https://github.com/yourhandle/openwriter/discussions) - General questions and discussions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenRouter](https://openrouter.ai/) for providing access to various AI models
- All open-source libraries and frameworks used in this project