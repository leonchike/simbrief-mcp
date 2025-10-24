/// <reference types="../worker-configuration.d.ts" />

import * as Sentry from "@sentry/cloudflare";
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import type { Props } from "./types/index.js";
import { GoogleHandler } from "./auth/google-handler.js";
import { registerSimBriefTools } from "./tools/register-simbrief-tools.js";

// Sentry configuration helper
function getSentryConfig(env: Env) {
  return {
    dsn: (env as any).SENTRY_DSN,
    tracesSampleRate: 1.0, // 100% trace sampling
    environment: (env as any).ENVIRONMENT || "production",
  };
}

export class SimBriefMCP extends McpAgent<
  Env,
  Record<string, never>,
  Props
> {
  server = new McpServer({
    name: "SimBrief Flight Planning MCP Server",
    version: "1.0.0",
  });

  /**
   * Cleanup when Durable Object is shutting down
   */
  async cleanup(): Promise<void> {
    try {
      console.log("SimBrief MCP cleanup completed successfully");
    } catch (error) {
      console.error("Error during cleanup:", error);
    }
  }

  /**
   * Durable Objects alarm handler - used for cleanup
   */
  async alarm(): Promise<void> {
    await this.cleanup();
  }

  async init() {
    // Log Sentry configuration status
    const sentryConfig = getSentryConfig(this.env);
    if (sentryConfig.dsn) {
      console.log("✅ Sentry configured via withSentry wrapper");
      console.log("Sentry environment:", sentryConfig.environment);
      console.log("Sentry tracing enabled at", sentryConfig.tracesSampleRate * 100 + "%");

      // Set user context if available
      if (this.props) {
        try {
          Sentry.setUser({
            username: this.props.login,
            email: this.props.email,
          });
          console.log("Sentry user context set:", this.props.email);
        } catch (e) {
          console.log("Sentry user context will be set in request handlers");
        }
      }
    } else {
      console.log("⚠️ Sentry DSN not configured - error tracking disabled");
    }

    // Register all SimBrief tools
    try {
      registerSimBriefTools(this.server, this.env, this.props);
      console.log("✅ SimBrief tools registered successfully");
    } catch (error) {
      console.error("❌ Failed to register SimBrief tools:", error);
      // Sentry will capture this automatically with the withSentry wrapper
      Sentry.captureException(error);
    }
  }
}

const oauthProvider = new OAuthProvider({
  apiHandlers: {
    "/sse": SimBriefMCP.serveSSE("/sse") as any,
    "/mcp": SimBriefMCP.serve("/mcp") as any,
  },
  authorizeEndpoint: "/authorize",
  clientRegistrationEndpoint: "/register",
  defaultHandler: GoogleHandler as any,
  tokenEndpoint: "/token",
});

export default Sentry.withSentry(
  (env: Env) => {
    const sentryConfig = getSentryConfig(env);
    return {
      dsn: sentryConfig.dsn,
      tracesSampleRate: sentryConfig.tracesSampleRate,
      environment: sentryConfig.environment,
      // Adds request headers and IP for users
      sendDefaultPii: true,
      // Enable logs to be sent to Sentry
      enableLogs: true,
    };
  },
  oauthProvider
);
