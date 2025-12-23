/**
 * VATSIM API Client
 *
 * Fetches and processes ATIS data from the VATSIM network
 */

import type {
  VatsimDataResponse,
  VatsimAtisEntry,
  VatsimAtisResponse,
  AirportAtis,
  AtisData,
} from "../types/index.js";

const VATSIM_DATA_URL = "https://data.vatsim.net/v3/vatsim-data.json";
const FETCH_TIMEOUT = 10000; // 10 seconds

/**
 * Validates ICAO codes
 * @throws Error if validation fails
 */
export function validateIcaoCodes(icaoCodes: string[]): string[] {
  if (!Array.isArray(icaoCodes) || icaoCodes.length === 0) {
    throw new Error("icaoCodes must be a non-empty array of valid 4-letter ICAO codes");
  }

  if (icaoCodes.length > 20) {
    throw new Error("Maximum 20 ICAO codes per request");
  }

  const validatedCodes: string[] = [];

  for (const code of icaoCodes) {
    if (typeof code !== "string") {
      throw new Error(`Invalid ICAO code: ${code} (must be a string)`);
    }

    const upperCode = code.toUpperCase().trim();

    // Validate: must be exactly 4 alphabetic characters
    if (!/^[A-Z]{4}$/.test(upperCode)) {
      throw new Error(`Invalid ICAO code format: ${code} (must be 4 alphabetic characters)`);
    }

    validatedCodes.push(upperCode);
  }

  return validatedCodes;
}

/**
 * Fetches VATSIM data with timeout
 */
async function fetchVatsimData(): Promise<VatsimDataResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(VATSIM_DATA_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SimBrief-MCP-Server/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`VATSIM API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as any;

    // Validate response structure
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response from VATSIM API");
    }

    if (!data.general || !data.general.update_timestamp) {
      throw new Error("Missing required fields in VATSIM API response");
    }

    if (!Array.isArray(data.atis)) {
      throw new Error("ATIS data is not an array");
    }

    return data as VatsimDataResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("VATSIM data service request timed out (10s)");
      }
      throw error;
    }

    throw new Error("Failed to fetch VATSIM data");
  }
}

/**
 * Processes a raw VATSIM ATIS entry into our AtisData format
 */
function processAtisEntry(entry: VatsimAtisEntry): AtisData {
  // Handle text_atis null or empty
  let textAtis: string | null = null;
  let textAtisLines: string[] | null = null;

  if (entry.text_atis !== null && Array.isArray(entry.text_atis)) {
    if (entry.text_atis.length === 0) {
      textAtis = "";
      textAtisLines = [];
    } else {
      textAtisLines = entry.text_atis;
      textAtis = entry.text_atis.join(" ");
    }
  }

  // Handle atis_code empty string
  const atisCode = entry.atis_code && entry.atis_code.trim() !== "" ? entry.atis_code : null;

  return {
    callsign: entry.callsign,
    atisCode,
    frequency: entry.frequency,
    textAtis,
    textAtisLines,
    controllerName: entry.name,
    controllerCid: entry.cid,
    lastUpdated: entry.last_updated,
    logonTime: entry.logon_time,
  };
}

/**
 * Finds ATIS entries for a specific ICAO code
 */
function findAtisForAirport(icao: string, atisEntries: VatsimAtisEntry[]): AirportAtis {
  const combined = atisEntries.find((entry) => entry.callsign === `${icao}_ATIS`);
  const arrival = atisEntries.find((entry) => entry.callsign === `${icao}_A_ATIS`);
  const departure = atisEntries.find((entry) => entry.callsign === `${icao}_D_ATIS`);

  const hasActiveAtis = !!(combined || arrival || departure);

  return {
    icao,
    hasActiveAtis,
    combined: combined ? processAtisEntry(combined) : null,
    arrival: arrival ? processAtisEntry(arrival) : null,
    departure: departure ? processAtisEntry(departure) : null,
  };
}

/**
 * Main function: Get VATSIM ATIS for specified airports
 */
export async function getVatsimAtis(icaoCodes: string[]): Promise<VatsimAtisResponse> {
  // Validate input
  const validatedCodes = validateIcaoCodes(icaoCodes);

  // Fetch VATSIM data
  const vatsimData = await fetchVatsimData();

  // Process each airport
  const airports: AirportAtis[] = validatedCodes.map((icao) =>
    findAtisForAirport(icao, vatsimData.atis)
  );

  // Count airports with active ATIS
  const activeCount = airports.filter((airport) => airport.hasActiveAtis).length;

  return {
    fetchedAt: new Date().toISOString(),
    activeCount,
    airports,
  };
}

/**
 * Error response helper
 */
export interface VatsimErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export function createErrorResponse(code: string, message: string): VatsimErrorResponse {
  return {
    error: {
      code,
      message,
    },
  };
}
