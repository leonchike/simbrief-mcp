# SimBrief MCP Server - Implementation Guide

This guide provides implementation details for the SimBrief MCP Server running on Cloudflare Workers with Google OAuth authentication.

## Overview

This is a Model Context Protocol (MCP) server that provides access to SimBrief flight planning data. The server is deployed on Cloudflare Workers with Google OAuth for secure authentication and supports both SSE and HTTP transports.

## Architecture

### Core Components

- **src/index.ts**: Main MCP server with SSE/HTTP endpoints and Durable Objects
- **src/auth/google-handler.ts**: Google OAuth 2.0 authentication flow
- **src/auth/oauth-utils.ts**: OAuth utilities for cookie management and approval dialogs
- **src/tools/simbrief-api.ts**: SimBrief API client with fetch and formatting functions
- **src/tools/register-simbrief-tools.ts**: MCP tools registration and implementation
- **src/types/index.ts**: TypeScript interfaces for SimBrief data and OAuth
- **src/config/allowed-users.ts**: User access control configuration

### Key Features

- **Google OAuth Authentication**: Secure access control with email-based permissions
- **Cloudflare Workers**: Edge deployment with Durable Objects for stateful sessions
- **SSE/HTTP Transports**: Dual protocol support for MCP clients
- **SimBrief API Integration**: Complete flight plan data access
- **Security**: HMAC-signed cookies, role-based access
- **Monitoring**: Optional Sentry integration for error tracking

## Development Commands

```bash
# Install dependencies
npm install

# Generate Cloudflare types
npm run cf-typegen

# Local development (port 8794)
npm run dev

# Type checking
npm run type-check

# Deploy to production
npm run deploy

# Run tests
npm test
```

## MCP Tools Available

### Flight Plan Tools (All Authenticated Users)

1. **getLatestFlightPlan** - Get complete flight plan data (preferred/default)
2. **getFlightPlanById** - Get complete flight plan data by ID
3. **getDispatchBriefing** - Get formatted dispatch briefing
4. **getLatestFlightPlanSummary** - Get flight plan summary
5. **getFlightPlanByIdSummary** - Get flight plan summary by ID

## Environment Configuration

### Required Secrets (use `wrangler secret put`)

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY
```

### Optional Secrets

```bash
wrangler secret put SIMBRIEF_API_KEY  # Improves rate limits
wrangler secret put SENTRY_DSN        # Error tracking
```

### Local Development (.dev.vars)

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
COOKIE_ENCRYPTION_KEY=32-char-random-string
SIMBRIEF_API_KEY=your-simbrief-api-key
SENTRY_DSN=https://dsn@sentry.io/project
```

## SimBrief API

### API Endpoint

```
https://www.simbrief.com/api/xml.fetcher.php
```

### Parameters

- **userid**: SimBrief User ID (required)
- **json**: "1" to get JSON response (required)
- **id**: Flight plan ID (optional, for specific plan)
- **apikey**: SimBrief API key (optional, improves rate limits)

### Response Format

The API returns a comprehensive JSON object with the following main sections:

- **general**: Flight information (flight number, aircraft, route, etc.)
- **origin**: Departure airport details
- **destination**: Arrival airport details
- **alternate**: Alternate airport details
- **fuel**: Fuel planning (trip fuel, reserve, contingency, etc.)
- **weights**: Weight information (passengers, cargo, ZFW, etc.)
- **weather**: METAR data for departure and arrival
- **params**: Plan metadata (plan ID, etc.)

## Authentication Flow

1. Client requests authorization at `/authorize`
2. User approves access (stored in signed cookie)
3. Redirect to Google OAuth with scopes
4. Callback exchanges code for access token
5. Fetch user info and validate permissions
6. Create MCP session with user props

## Security Features

- **OAuth 2.0**: Google authentication with email verification
- **HMAC Cookies**: Signed cookies for client approval persistence
- **Access Control**: Email-based user allowlist
- **Error Sanitization**: Sensitive information removed from errors
- **Edge Security**: Cloudflare Workers security features

## Claude Desktop Integration

### Local Development

```json
{
  "mcpServers": {
    "simbrief": {
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:8794/mcp"],
      "env": {}
    }
  }
}
```

### Production

```json
{
  "mcpServers": {
    "simbrief": {
      "command": "npx",
      "args": ["mcp-remote", "https://your-worker.workers.dev/mcp"],
      "env": {}
    }
  }
}
```

## Deployment

1. Create KV namespace: `wrangler kv:namespace create OAUTH_KV`
2. Update `wrangler.toml` with KV namespace ID
3. Set all required secrets via wrangler
4. Update allowed users in `src/config/allowed-users.ts`
5. Deploy: `npm run deploy`

## Monitoring

- **Console Logs**: Available in Cloudflare dashboard
- **Sentry Integration**: Optional error tracking and performance monitoring
- **Cloudflare Analytics**: Built-in request metrics

## Code Quality Improvements

### Over Python Version

1. **Type Safety**: Full TypeScript types for all data structures
2. **Error Handling**: Comprehensive try-catch with Sentry integration
3. **Code Organization**: Modular structure with clear separation
4. **Async/Await**: Modern async patterns instead of asyncio
5. **Documentation**: JSDoc comments for all functions
6. **Validation**: Zod schemas for input validation
7. **Security**: Built-in authentication and authorization

### Best Practices

- **Immutability**: Const by default
- **Error Messages**: User-friendly error messages
- **Logging**: Comprehensive logging for debugging
- **Testing**: Vitest setup for unit tests
- **Formatting**: Prettier for consistent code style

## Adding New Features

1. Add new tool in `src/tools/register-simbrief-tools.ts`
2. Define Zod schema for input validation
3. Implement tool handler with error handling
4. Add types to `src/types/index.ts` if needed
5. Update documentation

## Troubleshooting

### Auth Errors

- Check Google OAuth credentials
- Verify redirect URI matches
- Ensure user is in allowed users list

### SimBrief API Errors

- Verify User ID is correct
- Check if flight plans exist
- Validate API key if using one

### Deployment Issues

- Check KV namespace ID
- Verify all secrets are set
- Review Cloudflare Workers logs

## API Response Examples

### Flight Plan Structure

```typescript
{
  general: {
    flightnum: "AA100",
    airline: "AAL",
    type: "B77W",
    distance: "3459",
    flighttime: "06:24"
  },
  origin: {
    icao: "KJFK",
    name: "New York JFK"
  },
  destination: {
    icao: "EGLL",
    name: "London Heathrow"
  },
  fuel: {
    tripfuel: "145200",
    totalfuel: "165000"
  },
  // ... more data
}
```

## Performance Considerations

- **Edge Deployment**: Low latency worldwide via Cloudflare
- **Caching**: Consider implementing KV cache for frequent requests
- **Rate Limits**: Use API key for better SimBrief rate limits
- **Connection Pooling**: Handled automatically by Cloudflare Workers

## Future Enhancements

Potential improvements:

1. **Caching**: Cache flight plans in KV for faster retrieval
2. **Webhooks**: Support for SimBrief plan updates
3. **Batch Operations**: Fetch multiple plans at once
4. **Advanced Filtering**: Filter flight plans by criteria
5. **Export Formats**: Generate PDF briefings

## Resources

- [SimBrief API Documentation](https://www.simbrief.com/system/api.php)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [MCP SDK Documentation](https://github.com/anthropics/mcp)
- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
