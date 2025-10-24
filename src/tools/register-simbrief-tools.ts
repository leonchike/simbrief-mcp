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
  formatDispatchBriefing,
  formatFlightPlanSummary,
} from "./simbrief-api.js";
import { formatFlightPlanMarkdown } from "./format-flight-plan.js";

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

const GetNotamsSchema = {
  userId: z.string().describe("SimBrief User ID (required) - found in SimBrief Account Settings"),
  airport: z.enum(["origin", "destination", "alternate", "all"]).default("all").describe("Which airport's NOTAMs to retrieve: origin, destination, alternate, or all"),
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
    "[PREFERRED/DEFAULT] Get comprehensive flight plan for the latest SimBrief flight plan in professional markdown format. Includes: complete route with SID/STAR, fuel planning with breakdown, takeoff/landing performance with V-speeds for all runways, weather (METAR/TAF/SIGMETs), critical NOTAMs (runway/lighting/navigation), weight & balance, navigation waypoints, ETOPS data, NAT tracks, performance impact analysis, and complete ATC flight plan text. Optimized for readability (~50-80KB vs 1.3MB raw). Use this tool by default for all flight plan requests.",
    GetLatestFlightPlanSchema,
    wrapWithSentry("getLatestFlightPlan", async ({ userId }) => {
      const result = await fetchSimBriefFlightPlan({ userId, apiKey });

      if (result.isError) {
        return {
          content: [
            {
              type: "text",
              text: `**Error**\n\n${result.error}\n\nPlease verify:\n1. User ID ${userId} is correct\n2. You have an active flight plan on SimBrief\n3. The SimBrief API is accessible`,
              isError: true,
            },
          ],
        };
      }

      // Format as comprehensive markdown instead of raw JSON
      const markdown = formatFlightPlanMarkdown(result.content);

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
        ],
      };
    })
  );

  // Register get flight plan by ID (full data)
  server.tool(
    "getFlightPlanById",
    "Get comprehensive flight plan for a specific SimBrief flight plan by ID (21-character identifier) in professional markdown format. Returns same comprehensive data as getLatestFlightPlan including: route, fuel planning, takeoff/landing performance with V-speeds, weather, critical NOTAMs, weights, navigation, ETOPS, NAT tracks, and performance analysis. Use when user provides a specific plan ID.",
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

      // Format as comprehensive markdown instead of raw JSON
      const markdown = formatFlightPlanMarkdown(result.content);

      return {
        content: [
          {
            type: "text",
            text: markdown,
          },
        ],
      };
    })
  );

  // Register get dispatch briefing
  server.tool(
    "getDispatchBriefing",
    "Get a concise operational dispatch briefing from the latest flight plan. Returns quick-reference format with: flight info, route summary (departure/arrival with runways), fuel breakdown, weights (ZFW/TOW/LDW), departure/arrival METAR, and ETOPS status. Use only when user specifically requests a 'dispatch briefing' or quick summary. For complete details, use getLatestFlightPlan instead.",
    GetDispatchBriefingSchema,
    wrapWithSentry("getDispatchBriefing", async ({ userId }) => {
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

      const briefing = formatDispatchBriefing(result.content);

      // Format as readable markdown
      const text = `# Dispatch Briefing

## Flight ${briefing.flight_information.flight_number}
**${briefing.flight_information.airline}** | ${briefing.flight_information.aircraft_type} (${briefing.flight_information.aircraft_reg}) | ${briefing.flight_information.date}

## Route
**${briefing.route.departure.icao} → ${briefing.route.arrival.icao}** | ${briefing.route.distance} | ${briefing.route.flight_time}

**Departure**: ${briefing.route.departure.name} - RWY ${briefing.route.departure.runway} - ${briefing.route.departure.scheduled_time}
**Arrival**: ${briefing.route.arrival.name} - RWY ${briefing.route.arrival.runway} - ${briefing.route.arrival.scheduled_time}
**Cruise**: ${briefing.route.cruise_altitude}
**Alternate**: ${briefing.operational.alternate_name} (${briefing.operational.alternate_airport})

## Fuel (lbs)
- **Trip**: ${briefing.fuel_planning.trip_fuel}
- **Contingency**: ${briefing.fuel_planning.contingency_fuel}
- **Alternate**: ${briefing.fuel_planning.alternate_fuel}
- **Reserve**: ${briefing.fuel_planning.reserve_fuel}
- **Taxi**: ${briefing.fuel_planning.taxi_fuel}
- **Total**: ${briefing.fuel_planning.total_fuel}

## Weights (lbs)
- **ZFW**: ${briefing.weights.zero_fuel_weight} | **TOW**: ${briefing.weights.takeoff_weight} | **LDW**: ${briefing.weights.landing_weight}
- **PAX**: ${briefing.weights.passengers} | **Cargo**: ${briefing.weights.cargo}

## Weather
**${briefing.route.departure.icao}**: ${briefing.weather.departure_metar}

**${briefing.route.arrival.icao}**: ${briefing.weather.arrival_metar}

**Wind**: ${briefing.weather.avg_wind_component}

## Special
${briefing.operational.etops !== 'NO' ? `⚠️ ETOPS Flight - ${briefing.operational.etops}` : ''}

---
*For complete details, use getLatestFlightPlan*`;

      return {
        content: [
          {
            type: "text",
            text: text,
          },
        ],
      };
    })
  );

  // Register get latest flight plan summary
  server.tool(
    "getLatestFlightPlanSummary",
    "Get basic summary of latest flight plan with minimal detail (plan ID, flight number, aircraft, route, distance, flight time, date only). Much less comprehensive than getLatestFlightPlan. Use ONLY if user explicitly requests a 'summary' or 'brief overview'. For normal requests, use getLatestFlightPlan instead.",
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
    "Get basic summary of a specific flight plan by ID (plan ID, flight number, aircraft, route, distance, flight time only). Minimal detail compared to getFlightPlanById. Use only for brief summaries when user provides a plan ID and explicitly wants limited information.",
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

  // Register get NOTAMs tool
  server.tool(
    "getNotams",
    "Get ALL NOTAMs (Notices to Airmen) for airports in the flight plan. Returns complete, unfiltered NOTAM details for origin, destination, and/or alternate airports including: NOTAM ID, category (runway/lighting/navigation/etc.), status, effective dates, location, and full text. Use when you need comprehensive NOTAM information beyond the critical NOTAMs automatically included in getLatestFlightPlan, or when user specifically asks about NOTAMs. Optional 'airport' parameter: 'origin', 'destination', 'alternate', or 'all' (default).",
    GetNotamsSchema,
    wrapWithSentry("getNotams", async ({ userId, airport = "all" }) => {
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

      const origin = result.content.origin || {};
      const destination = result.content.destination || {};
      const alternate = result.content.alternate || {};

      const formatNotamSection = (icao: string, notams: any[]) => {
        if (!notams || notams.length === 0) return `### ${icao}\n*No NOTAMs*\n`;

        return `### ${icao} (${notams.length} NOTAMs)

${notams.map((notam: any, index: number) =>
  `**${index + 1}. ${notam.notam_id || 'N/A'}** - ${notam.notam_qcode_category || 'N/A'}: ${notam.notam_qcode_subject || 'N/A'} - ${notam.notam_qcode_status || 'N/A'}
- **Effective**: ${notam.date_effective || 'N/A'} to ${notam.date_expire || 'N/A'}
- **Location**: ${notam.location_name || 'N/A'}
- **Text**: ${notam.notam_text || 'N/A'}
${notam.notam_schedule ? `- **Schedule**: ${notam.notam_schedule}` : ''}
`
).join('\n')}
`;
      };

      let text = `# NOTAMs - ${airport === "all" ? "All Airports" : airport.toUpperCase()}\n\n`;

      if (airport === "all" || airport === "origin") {
        text += formatNotamSection(origin.icao_code || "Origin", origin.notam || []);
      }

      if (airport === "all" || airport === "destination") {
        text += formatNotamSection(destination.icao_code || "Destination", destination.notam || []);
      }

      if (airport === "all" || airport === "alternate") {
        text += formatNotamSection(alternate.icao_code || "Alternate", alternate.notam || []);
      }

      const totalNotams = (origin.notam?.length || 0) + (destination.notam?.length || 0) + (alternate.notam?.length || 0);

      text += `\n---\n*Total NOTAMs: ${totalNotams}*\n*Generated from SimBrief flight plan*`;

      return {
        content: [
          {
            type: "text",
            text: text,
          },
        ],
      };
    })
  );
}
