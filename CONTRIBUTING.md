# Contributing to Centurio

First off, thank you for considering contributing to Centurio! It's people like you that help make Centurio a great tool for protecting intellectual property in the blockchain space.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to support@centurio.app.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title** for the issue to identify the problem
* **Describe the exact steps** which reproduce the problem
* **Provide specific examples** to demonstrate the steps
* **Describe the behavior** you observed after following the steps
* **Explain which behavior** you expected to see instead and why
* **Include screenshots** if possible
* **Include your environment details** (OS, Node version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title** for the issue
* **Provide a step-by-step description** of the suggested enhancement
* **Provide specific examples** to demonstrate the steps
* **Describe the current behavior** and explain which behavior you expected to see instead
* **Explain why this enhancement would be useful** to most Centurio users

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the existing code style
6. Issue that pull request!

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/centurio.git
   cd centurio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Coding Standards

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow the existing code style (2 spaces, no semicolons in React components)
- Use meaningful variable and function names
- Comment complex logic
- Keep functions small and focused

### React Components
- Use functional components with hooks
- Keep components small and reusable
- Use TypeScript interfaces for props
- Follow the existing file structure

### Git Commit Messages
- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

Examples:
```
Add logo verification endpoint for DEX platforms

- Implement file hash comparison
- Add rate limiting for API calls
- Return verification status in <100ms

Fixes #123
```

### Testing
- Write tests for new features
- Ensure all tests pass before submitting PR
- Include both unit and integration tests where appropriate

## Project Structure

```
centurio/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utility functions
├── server/           # Express backend
│   ├── routes.ts     # API routes
│   ├── storage.ts    # Database operations
│   └── services/     # Business logic
├── shared/           # Shared types and schemas
│   └── schema.ts     # Database schema
└── docs/            # Documentation
```

## API Documentation

When adding new API endpoints, please document them following this format:

```typescript
/**
 * Verify logo ownership
 * @route POST /api/dex/verify
 * @param {string} tokenAddress - Contract address
 * @param {number} chainId - Blockchain chain ID
 * @param {string} logoUrl - URL of the logo to verify
 * @returns {VerificationResponse} Verification status
 */
```

## Questions?

Feel free to open an issue with your question or reach out on our Discord server.

## Recognition

Contributors will be recognized in our README and on our website. Thank you for your contributions!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.