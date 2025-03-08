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

### Setup Instructions

#### Windows

1. Install Node.js and npm from [nodejs.org](https://nodejs.org/)
2. Open Command Prompt or PowerShell
3. Clone the repository and navigate to the project folder

#### macOS

1. Install Node.js and npm:
   ```bash
   # Using Homebrew
   brew install node
   ```
2. Open Terminal
3. Clone the repository and navigate to the project folder

#### Linux

1. Install Node.js and npm:
   ```bash
   # For Ubuntu/Debian
   sudo apt update
   sudo apt install nodejs npm
   
   # For Fedora
   sudo dnf install nodejs npm
   
   # For Arch Linux
   sudo pacman -S nodejs npm
   ```
2. Open Terminal
3. Clone the repository and navigate to the project folder

### Project Setup

You can set up and run both frontend and backend at once from the root directory:

1. Install all dependencies:
   ```bash
   npm run install:all
   ```

2. Create a `.env` file in the backend directory:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. Add your OpenRouter API key to the backend `.env` file.

4. Start both development servers:
   ```bash
   npm run dev
   ```

The frontend will run on http://localhost:3000 and the backend on http://localhost:3001 by default.

### Individual Setup

If you prefer to set up and run components individually:

#### Backend Setup

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

#### Frontend Setup

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