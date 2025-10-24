# SimBrief Flight Planning MCP Server

A Model Context Protocol (MCP) server that provides access to SimBrief flight planning data for Claude Desktop and other MCP clients. Built with TypeScript, deployed on Cloudflare Workers with Google OAuth authentication.

## Features

- **Google OAuth Authentication**: Secure access control with email-based permissions
- **Cloudflare Workers**: Edge deployment with Durable Objects for stateful sessions
- **SSE/HTTP Transports**: Dual protocol support for MCP clients
- **SimBrief API Integration**: Complete access to flight planning data
- **TypeScript**: Full type safety and modern async/await patterns
- **Sentry Integration**: Optional error tracking and performance monitoring
- **Rate Limit Optimization**: Optional API key support for improved SimBrief rate limits

## Available MCP Tools

### Flight Plan Tools

1. **getLatestFlightPlan** (Preferred/Default)
   - Get complete JSON data for your latest flight plan
   - Includes all details: NOTAMs, weather, crew alerts, MEL/CDL, etc.
   - Use by default unless user specifically asks for a summary

2. **getFlightPlanById**
   - Get complete JSON data for a specific flight plan by ID
   - Requires 21-character SimBrief plan ID

3. **getDispatchBriefing**
   - Get formatted dispatch briefing with operational information
   - Includes: flight info, route, fuel planning, weights, weather

4. **getLatestFlightPlanSummary**
   - Get summary of latest flight plan
   - Use only if user specifically requests a summary

5. **getFlightPlanByIdSummary**
   - Get summary of specific flight plan by ID

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Cloudflare account
- SimBrief account and User ID
- Google OAuth credentials

### Setup

1. **Clone the repository:**
```bash
cd simbrief-mcp
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure Wrangler:**

Edit `wrangler.toml` to set your KV namespace ID:
```toml
[[kv_namespaces]]
binding = "OAUTH_KV"
id = "your-kv-namespace-id"  # Replace with your actual KV namespace ID
```

4. **Set up secrets:**

```bash
# Required secrets
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put COOKIE_ENCRYPTION_KEY

# Optional secrets
wrangler secret put SIMBRIEF_API_KEY  # Improves rate limits
wrangler secret put SENTRY_DSN        # Error tracking
```

To generate a COOKIE_ENCRYPTION_KEY:
```bash
openssl rand -base64 32
```

5. **Configure allowed users:**

Edit `src/config/allowed-users.ts` and add your email username (part before @):
```typescript
const ALLOWED_USERNAMES = new Set<string>([
  'your-username',  // For your-username@gmail.com
]);
```

6. **Get your SimBrief User ID:**
   - Log in to SimBrief (https://www.simbrief.com)
   - Go to Account Settings
   - Find your Pilot ID (this is your User ID)

## Development

### Local Development

```bash
# Start local development server (port 8794)
npm run dev

# Type checking
npm run type-check

# Generate Cloudflare types
npm run cf-typegen
```

### Building

```bash
npm run build
```

### Deployment

```bash
npm run deploy
```

## Claude Desktop Integration

### Local Development Configuration

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

### Production Configuration

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

Replace `your-worker.workers.dev` with your actual Cloudflare Workers domain.

## Usage Examples

### Get Latest Flight Plan

Ask Claude:
> "Get my latest SimBrief flight plan for user ID 123456"

### Get Dispatch Briefing

Ask Claude:
> "Get dispatch briefing for my latest flight plan (user ID 123456)"

### Get Specific Flight Plan

Ask Claude:
> "Get flight plan ABCDEF123456789012345 for user 123456"

## Project Structure

```
simbrief-mcp/
├── src/
│   ├── auth/
│   │   ├── google-handler.ts       # Google OAuth flow
│   │   └── oauth-utils.ts          # OAuth utilities
│   ├── config/
│   │   └── allowed-users.ts        # User access control
│   ├── tools/
│   │   ├── simbrief-api.ts         # SimBrief API client
│   │   └── register-simbrief-tools.ts  # MCP tools registration
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   └── index.ts                    # Main entry point
├── wrangler.toml                   # Cloudflare Workers config
├── tsconfig.json                   # TypeScript config
├── package.json                    # Dependencies
└── README.md                       # This file
```

## Environment Variables

### Required Secrets

- **GOOGLE_CLIENT_ID**: Google OAuth client ID
- **GOOGLE_CLIENT_SECRET**: Google OAuth client secret
- **COOKIE_ENCRYPTION_KEY**: 32-character random string for cookie signing

### Optional Secrets

- **SIMBRIEF_API_KEY**: SimBrief API key for improved rate limits
- **SENTRY_DSN**: Sentry DSN for error tracking
- **ENVIRONMENT**: Environment name (defaults to "production")

## Security Features

- **OAuth 2.0**: Google authentication with email verification
- **HMAC Cookies**: Signed cookies for client approval persistence
- **Access Control**: Email-based user allowlist
- **Error Sanitization**: Sensitive information removed from errors
- **Edge Security**: Cloudflare Workers security features

## Monitoring

- **Console Logs**: Available in Cloudflare dashboard
- **Sentry Integration**: Optional error tracking and performance monitoring
- **Cloudflare Analytics**: Built-in request metrics

## Troubleshooting

### Configuration Issues

**Problem:** Cannot find SimBrief User ID

**Solution:**
1. Log in to SimBrief
2. Go to Account Settings
3. Your Pilot ID is your User ID

### Authentication Issues

**Problem:** "Access Denied" error

**Solution:**
- Check that your email username is in `src/config/allowed-users.ts`
- Verify Google OAuth credentials are set correctly

### API Errors

**Problem:** "SimBrief API error" messages

**Solution:**
1. Verify User ID is correct
2. Check if you have recent flight plans on SimBrief
3. If using API key, ensure it's valid

## Differences from Original Python Version

### Improvements

1. **TypeScript**: Full type safety and better IDE support
2. **Cloudflare Workers**: Edge deployment for global low latency
3. **Google OAuth**: Secure authentication instead of public access
4. **Better Error Handling**: Comprehensive error messages with Sentry integration
5. **Code Organization**: Modular structure with clear separation of concerns
6. **Production Ready**: Built-in monitoring, logging, and security features

### Migration Notes

If you're migrating from the Python version:

1. User ID is still passed as a parameter (not environment variable)
2. All tool names follow camelCase convention (getLatestFlightPlan vs get_latest_flight_plan)
3. Requires Google authentication - set up allowed users
4. Deployed on Cloudflare Workers instead of running locally

## Contributing

Contributions are welcome! Please ensure:

1. Code follows TypeScript and Prettier formatting
2. All tools include proper error handling
3. Documentation is updated for new features
4. Tests pass (if applicable)

## License

MIT

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Cloudflare Workers logs
- Check Sentry for error details (if configured)

## Credits

Built with:
- [Model Context Protocol SDK](https://github.com/anthropics/mcp)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [SimBrief API](https://www.simbrief.com/system/api.php)
