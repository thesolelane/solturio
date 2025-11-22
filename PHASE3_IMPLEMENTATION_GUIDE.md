# Phase 3: Input Validation & Error Mapping - Implementation Guide

## Overview
Phase 3 implements comprehensive input validation and standardized error handling across all Solturio API endpoints.

## New Infrastructure Files

### 1. **validation.ts**
- Zod schemas for all API operations
- `validateRequest()` utility function
- Schemas included:
  - `nonceTimestampSchema` - Nonce (64-char hex) + timestamp validation
  - `licenseSchema` - License creation parameters
  - `paymentSchema` - Payment processing
  - `treasuryTransferSchema` - Treasury operations
  - `multiSigSchema` - Multi-sig setup

### 2. **error-handler.ts**
- `APIError` class for structured errors
- `StandardError` interface (all error responses)
- `StandardSuccess<T>` interface (all success responses)
- `ERROR_CODES` mapping (400, 401, 403, 404, 402, 409, 500)
- Functions: `formatError()`, `formatSuccess()`

### 3. **audit-logger.ts**
- In-memory audit log storage
- Methods: `log()`, `getLog()`, `getAllLogs()`, `getLogsByUser()`, `getLogsByEndpoint()`
- Includes timestamp, status code, user ID, request ID, details
- Future: Database persistence via `persistLogs()`

### 4. **request-validator.ts**
- `ValidatedRequest` interface extending Express Request
- `applyValidationToRoutes()` - Global validation middleware
- `withErrorHandler()` - Wrap endpoint handlers with error catching

### 5. **validation-middleware.ts**
- Global request ID generation
- Nonce validation for payment endpoints
- Automatic audit logging on all requests
- Error handling middleware

## Error Response Format

**All errors now follow this format:**
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "code": "ERROR_CODE",
  "details": { /* optional validation errors */ },
  "timestamp": "2025-11-22T22:30:00.000Z",
  "requestId": "req_1234567890_abc123"
}
```

**Common Error Codes:**
- `INVALID_INPUT` (400) - Validation failed
- `EXPIRED_REQUEST` (400) - Timestamp outside 5-minute window
- `UNAUTHORIZED` (401) - Not authenticated
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `PAYMENT_FAILED` (402) - Payment verification failed
- `NONCE_ALREADY_USED` (409) - Replay attack detected
- `INTERNAL_ERROR` (500) - Server error

## Success Response Format

**All success responses now follow this format:**
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "timestamp": "2025-11-22T22:30:00.000Z",
  "requestId": "req_1234567890_abc123"
}
```

## Updated Endpoints

### Phase 3 Applied To:
- ✅ License Management (5 endpoints)
- ✅ Treasury Operations (6 endpoints)
- ✅ Wallet Creation
- ✅ Logo Registration
- ✅ NFT Minting

## Audit Logging

All API calls are now logged with:
- **action**: Operation type (e.g., LICENSE_CREATED, PAYMENT_FAILED)
- **endpoint**: API path
- **method**: HTTP method
- **statusCode**: Response code
- **userId**: Authenticated user ID
- **requestId**: Unique request identifier
- **details**: Additional context
- **timestamp**: ISO 8601 timestamp
- **ipAddress**: Client IP (optional)
- **userAgent**: Browser/client info (optional)

## Phase 3 Validation Flow

1. **Request arrives** → Generate request ID
2. **Validate timestamp** → Check 5-minute window
3. **Validate nonce** → Verify not replayed
4. **Validate input** → Check against Zod schema
5. **Log validation** → Track all requests
6. **Process request** → Execute business logic
7. **Format response** → Use formatSuccess/formatError
8. **Audit log** → Record final state
9. **Return response** → Send to client

## Database Schema (Phase 3 Audit Tables)

**Future enhancement** - Create audit_logs table:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(255),
  action VARCHAR(100),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INT,
  user_id VARCHAR(255),
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

## Testing Phase 3

**Valid License Creation:**
```bash
curl -X POST http://localhost:5000/api/licenses/create \
  -H "Content-Type: application/json" \
  -d '{
    "logoId": "550e8400-e29b-41d4-a716-446655440000",
    "licenseType": "CreativeCommons",
    "paymentStructure": "lumpSum",
    "totalAmount": 1000,
    "nonce": "abc123def456...",
    "timestamp": 1700000000
  }'
```

**Invalid Input (should return INVALID_INPUT error):**
```bash
curl -X POST http://localhost:5000/api/licenses/create \
  -H "Content-Type: application/json" \
  -d '{
    "licenseType": "InvalidType"
  }'
```

## Phase 3 Status

- ✅ Validation layer created
- ✅ Error handler created
- ✅ Audit logger created
- ✅ Request validator middleware created
- ✅ Applied to license endpoints
- ✅ Applied to treasury endpoints
- ⏳ Database persistence of audit logs (future)

## Migration to Full Compliance

All endpoints have been updated with:
1. Input validation via Zod schemas
2. Standardized error responses
3. Audit logging on every request
4. Request ID tracking
5. Status code consistency

## Next: Phase 4

- Smart contract endpoint integration
- Frontend pages for leaderboards
- DEX copycat report UI
- Premium wallet naming UI
