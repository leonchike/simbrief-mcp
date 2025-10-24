/**
 * SimBrief MCP Tools Registration
 *
 * Registers all SimBrief tools with the MCP server
 */

import * as Sentry from "@sentry/cloudflare";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Props } from "../types/index.js";
import {
  fetchSimBriefFlightPlan,
  extractFlightPlanMetadata,
  formatDispatchBriefing,
  formatFlightPlanSummary,
} from "./simbrief-api.js";

// Define Zod schemas for input validation
const GetLatestFlightPlanSchema = {
  userId: z.string().describe("SimBrief User ID (required) - found in SimBrief Account Settings"),
};

const GetFlightPlanByIdSchema = {
  userId: z.string().describe("SimBrief User ID (required) - found in SimBrief Account Settings"),
  planId: z.string().describe("The SimBrief flight plan ID (21-character identifier)"),
};

const GetDispatchBriefingSchema = {
  userId: z.string().describe("SimBrief User ID (required) - found in SimBrief Account Settings"),
};

/**
 * Helper function to wrap tool handlers with Sentry instrumentation
 */
function wrapWithSentry<T extends Record<string, any>>(
  toolName: string,
  handler: (args: T) => Promise<any>
): (args: T) => Promise<any> {
  return async (args: T) => {
    // Check if Sentry is initialized
    const sentryEnabled = typeof Sentry !== "undefined" && Sentry.getCurrentScope;

    if (!sentryEnabled) {
      return handler(args);
    }

    // Wrap with Sentry transaction and span
    return await Sentry.startNewTrace(async () => {
      return await Sentry.startSpan(
        {
          name: `mcp.tool/${toolName}`,
          op: "function",
          attributes: {
            "mcp.tool.name": toolName,
            ...Object.entries(args).reduce(
              (acc, [key, value]) => {
                acc[`mcp.tool.arg.${key}`] = typeof value === "object" ? JSON.stringify(value) : value;
                return acc;
              },
              {} as Record<string, any>
            ),
          },
        },
        async (span) => {
          try {
            const result = await handler(args);
            span.setStatus({ code: 1 }); // OK
            return result;
          } catch (error) {
            span.setStatus({ code: 2 }); // ERROR
            Sentry.captureException(error);

            // Get event ID for user-friendly error message
            const eventId = Sentry.lastEventId();
            const errorMessage = error instanceof Error ? error.message : String(error);

            return {
              content: [
                {
                  type: "text",
                  text: `**Error**\n\n${errorMessage}${eventId ? `\n\nError ID: ${eventId}` : ""}`,
                  isError: true,
                },
              ],
            };
          }
        }
      );
    });
  };
}

/**
 * Register all SimBrief tools with the MCP server
 */
export function registerSimBriefTools(server: McpServer, env: Env, props: Props): void {
  const apiKey = (env as any).SIMBRIEF_API_KEY;

  if (apiKey) {
    console.log("SimBrief API Key configured - improved rate limits enabled");
  } else {
    console.log("No SimBrief API Key - using default rate limits");
  }

  // Log user authentication
  console.log(`User authenticated: ${props.login} (${props.name})`);

  // Register get latest flight plan (full data - preferred)
  server.tool(
    "getLatestFlightPlan",
    "[PREFERRED/DEFAULT] Get the complete JSON data for the latest SimBrief flight plan including all details (NOTAMs, weather, crew alerts, MEL/CDL, etc.). Use this tool by default unless user specifically asks for a summary.",
    GetLatestFlightPlanSchema,
    wrapWithSentry("getLatestFlightPlan", async ({ userId }) => {
      const result = await fetchSimBriefFlightPlan({ userId, apiKey });

      if (result.isError) {
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\n${result.error}`,
              isError: true,
            },
          ],
        };
      }

      const metadata = extractFlightPlanMetadata(result.content);

      return {
        content: [
          {
            type: "text",
            text: `**Complete Flight Plan Data**\n\nFlight: ${metadata.flight_number}\nRoute: ${metadata.route}\nPlan ID: ${metadata.plan_id}\n\n\`\`\`json\n${JSON.stringify(result.content, null, 2)}\n\`\`\``,
          },
        ],
      };
    })
  );

  // Register get flight plan by ID (full data)
  server.tool(
    "getFlightPlanById",
    "Get the complete JSON data for a specific SimBrief flight plan by ID including all details (NOTAMs, weather, crew alerts, etc.)",
    GetFlightPlanByIdSchema,
    wrapWithSentry("getFlightPlanById", async ({ userId, planId }) => {
      const result = await fetchSimBriefFlightPlan({ userId, planId, apiKey });

      if (result.isError) {
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\n${result.error}`,
              isError: true,
            },
          ],
        };
      }

      const metadata = extractFlightPlanMetadata(result.content);

      return {
        content: [
          {
            type: "text",
            text: `**Complete Flight Plan Data for ${planId}**\n\nFlight: ${metadata.flight_number}\nRoute: ${metadata.route}\n\n\`\`\`json\n${JSON.stringify(result.content, null, 2)}\n\`\`\``,
          },
        ],
      };
    })
  );

  // Register get dispatch briefing
  server.tool(
    "getDispatchBriefing",
    "Get a formatted dispatch briefing from the latest flight plan with all relevant operational information including fuel, weather, route, and performance data.",
    GetDispatchBriefingSchema,
    wrapWithSentry("getDispatchBriefing", async ({ userId }) => {
      console.log("getDispatchBriefing called with userId:", userId);
      const result = await fetchSimBriefFlightPlan({ userId, apiKey });

      console.log("SimBrief fetch result isError:", result.isError);

      if (result.isError) {
        console.error("SimBrief API error:", result.error);
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\n${result.error}`,
              isError: true,
            },
          ],
        };
      }

      console.log("Formatting dispatch briefing with data keys:", Object.keys(result.content));
      const briefing = formatDispatchBriefing(result.content);

      return {
        content: [
          {
            type: "text",
            text: `**Dispatch Briefing**\n\nFlight: ${briefing.flight_information.flight_number}\n\n\`\`\`json\n${JSON.stringify(briefing, null, 2)}\n\`\`\``,
          },
        ],
      };
    })
  );

  // Register get latest flight plan summary
  server.tool(
    "getLatestFlightPlanSummary",
    "Get a summary of your latest flight plan. Only use if user specifically asks for a 'summary' or 'brief overview'.",
    GetLatestFlightPlanSchema,
    wrapWithSentry("getLatestFlightPlanSummary", async ({ userId }) => {
      const result = await fetchSimBriefFlightPlan({ userId, apiKey });

      if (result.isError) {
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\n${result.error}`,
              isError: true,
            },
          ],
        };
      }

      const summary = formatFlightPlanSummary(result.content);

      return {
        content: [
          {
            type: "text",
            text: `**Flight Plan Summary**\n\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``,
          },
        ],
      };
    })
  );

  // Register get flight plan by ID summary
  server.tool(
    "getFlightPlanByIdSummary",
    "Get a summary of a specific flight plan by ID.",
    GetFlightPlanByIdSchema,
    wrapWithSentry("getFlightPlanByIdSummary", async ({ userId, planId }) => {
      const result = await fetchSimBriefFlightPlan({ userId, planId, apiKey });

      if (result.isError) {
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\n${result.error}`,
              isError: true,
            },
          ],
        };
      }

      const summary = formatFlightPlanSummary(result.content, planId);

      return {
        content: [
          {
            type: "text",
            text: `**Flight Plan Summary for ${planId}**\n\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``,
          },
        ],
      };
    })
  );
}
