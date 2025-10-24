/**
 * Types for SimBrief MCP Server
 */

// OAuth Props - User information from Google Auth
export interface Props extends Record<string, unknown> {
  login: string;      // Email username (before @)
  name: string;       // Display name
  email: string;      // Full email address
  accessToken: string; // Google access token
}

// Import global Env type from worker-configuration
/// <reference types="../../worker-configuration.d.ts" />

// Cloudflare Worker Environment with OAuth provider
export interface ExtendedEnv extends Env {
  OAUTH_PROVIDER: {
    parseAuthRequest: (request: Request) => Promise<any>;
    lookupClient: (clientId: string) => Promise<any>;
    completeAuthorization: (args: any) => Promise<{ redirectTo: string }>;
  };
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;
  SIMBRIEF_API_KEY?: string; // Optional - improves rate limits
  SENTRY_DSN?: string;
}

// SimBrief API response types
export interface SimBriefFlightPlan {
  general?: SimBriefGeneral;
  origin?: SimBriefAirport;
  destination?: SimBriefAirport;
  alternate?: SimBriefAirport;
  fuel?: SimBriefFuel;
  weights?: SimBriefWeights;
  weather?: SimBriefWeather;
  params?: SimBriefParams;
  [key: string]: any; // Allow for additional properties
}

export interface SimBriefGeneral {
  flightnum?: string;
  airline?: string;
  type?: string;
  reg?: string;
  date?: string;
  distance?: string;
  flighttime?: string;
  route?: string;
  cruisealt?: string;
  etops?: string;
  [key: string]: any;
}

export interface SimBriefAirport {
  icao?: string;
  name?: string;
  std?: string;
  sta?: string;
  runway?: string;
  [key: string]: any;
}

export interface SimBriefFuel {
  tripfuel?: string;
  alternatefuel?: string;
  reservefuel?: string;
  contingencyfuel?: string;
  taxifuel?: string;
  totalfuel?: string;
  [key: string]: any;
}

export interface SimBriefWeights {
  pax?: string;
  cargo?: string;
  zfw?: string;
  takeoff?: string;
  landing?: string;
  [key: string]: any;
}

export interface SimBriefWeather {
  departure_metar?: string;
  arrival_metar?: string;
  avgwind_comp?: string;
  [key: string]: any;
}

export interface SimBriefParams {
  planid?: string;
  [key: string]: any;
}

// Tool response types
export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
    isError?: boolean;
  }>;
}

export interface SimBriefApiResponse {
  content: any;
  metadata?: Record<string, any>;
  message?: string;
  error?: string;
  isError: boolean;
}
