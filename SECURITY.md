# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability within Centurio, please send an email to security@centurio.app. All security vulnerabilities will be promptly addressed.

Please include the following information:

* Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
* Full paths of source file(s) related to the manifestation of the issue
* The location of the affected source code (tag/branch/commit or direct URL)
* Any special configuration required to reproduce the issue
* Step-by-step instructions to reproduce the issue
* Proof-of-concept or exploit code (if possible)
* Impact of the issue, including how an attacker might exploit it

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

## Preferred Languages

We prefer all communications to be in English.

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions
2. Audit code to find any potential similar problems
3. Prepare fixes for all supported versions
4. Release new security fix versions

## Security Best Practices for Centurio Users

### API Keys and Secrets
- Never commit API keys or secrets to version control
- Use environment variables for all sensitive configuration
- Rotate keys regularly
- Use separate keys for development and production

### IPFS Integration
- Always verify IPFS hashes before trusting content
- Be aware that IPFS content is public and permanent
- Never store private keys or sensitive data on IPFS

### Wallet Security
- The platform generates wallets for users but private keys should be exported and secured offline
- Never share private keys
- Use hardware wallets when possible for high-value assets

### Smart Contract Interactions (Future)
- All contract interactions will be audited
- Users should verify transaction details before signing
- Be cautious of phishing attempts mimicking Centurio

### Database Security
- All user data is encrypted at rest
- Session data is encrypted
- Private keys are encrypted with AES-256-GCM using unique salts

## Security Features

Centurio implements the following security measures:

- **Authentication**: OpenID Connect via Replit Auth
- **Session Management**: Secure HTTP-only cookies with CSRF protection
- **Encryption**: AES-256-GCM for private key storage
- **Input Validation**: Zod schemas for all user inputs
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Prevention**: React's built-in escaping
- **Rate Limiting**: API endpoint protection (planned)
- **File Upload Security**: Type validation and virus scanning (planned)

## Bug Bounty Program

We're planning to launch a bug bounty program. Details will be announced on our website and GitHub repository.

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request.