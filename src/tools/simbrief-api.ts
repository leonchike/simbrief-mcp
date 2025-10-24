/**
 * SimBrief API Client
 *
 * Handles all communication with the SimBrief API
 */

import type { SimBriefFlightPlan, SimBriefApiResponse } from "../types/index.js";

const SIMBRIEF_API_URL = "https://www.simbrief.com/api/xml.fetcher.php";

export interface SimBriefApiParams {
  userId: string;
  planId?: string;
  apiKey?: string;
}

/**
 * Fetch flight plan from SimBrief API
 */
export async function fetchSimBriefFlightPlan(
  params: SimBriefApiParams
): Promise<SimBriefApiResponse> {
  try {
    const queryParams: Record<string, string> = {
      userid: params.userId,
      json: "1",
    };

    if (params.planId) {
      queryParams.id = params.planId;
    }

    if (params.apiKey) {
      queryParams.apikey = params.apiKey;
    }

    const url = new URL(SIMBRIEF_API_URL);
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return {
        content: {},
        error: `HTTP error occurred: ${response.status} - ${response.statusText}`,
        isError: true,
      };
    }

    const data = (await response.json()) as SimBriefFlightPlan;

    // Log the response for debugging
    console.log("SimBrief API Response:", JSON.stringify(data).substring(0, 500));

    // Check for API errors
    if ("fetch" in data && (data.fetch as any)?.status === "Error") {
      const errorMsg = (data.fetch as any)?.message || "Unknown error";
      console.error("SimBrief API Error:", errorMsg);
      return {
        content: {},
        error: `SimBrief API error: ${errorMsg}`,
        isError: true,
      };
    }

    // Check if we have actual data
    if (!data || typeof data !== 'object') {
      console.error("Invalid SimBrief response:", data);
      return {
        content: {},
        error: "Invalid response from SimBrief API",
        isError: true,
      };
    }

    return {
      content: data,
      isError: false,
    };
  } catch (error) {
    return {
      content: {},
      error: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
      isError: true,
    };
  }
}

/**
 * Extract metadata from flight plan
 */
export function extractFlightPlanMetadata(data: SimBriefFlightPlan): Record<string, any> {
  const general = data.general || {};
  const origin = data.origin || {};
  const destination = data.destination || {};
  const params = data.params || {};

  return {
    flight_number: general.flightnum || "N/A",
    route: `${origin.icao || "N/A"} - ${destination.icao || "N/A"}`,
    plan_id: params.planid || "N/A",
    aircraft: general.type || "N/A",
    distance: general.distance ? `${general.distance} NM` : "N/A",
    flight_time: general.flighttime || "N/A",
  };
}

/**
 * Format dispatch briefing from flight plan data
 */
export function formatDispatchBriefing(data: SimBriefFlightPlan): Record<string, any> {
  const general = data.general || {};
  const origin = data.origin || {};
  const destination = data.destination || {};
  const fuel = data.fuel || {};
  const weights = data.weights || {};
  const weather = data.weather || {};
  const alternate = data.alternate || {};

  return {
    flight_information: {
      flight_number: general.flightnum || "N/A",
      airline: general.airline || "N/A",
      aircraft_type: general.type || "N/A",
      aircraft_reg: general.reg || "N/A",
      date: general.date || "N/A",
    },
    route: {
      departure: {
        icao: origin.icao || "N/A",
        name: origin.name || "N/A",
        scheduled_time: origin.std || "N/A",
        runway: origin.runway || "N/A",
      },
      arrival: {
        icao: destination.icao || "N/A",
        name: destination.name || "N/A",
        scheduled_time: destination.sta || "N/A",
        runway: destination.runway || "N/A",
      },
      distance: general.distance ? `${general.distance} NM` : "N/A",
      flight_time: general.flighttime || "N/A",
      route_string: general.route || "N/A",
      cruise_altitude: general.cruisealt ? `${general.cruisealt} ft` : "N/A",
    },
    fuel_planning: {
      trip_fuel: fuel.tripfuel ? `${fuel.tripfuel} lbs` : "N/A",
      alternate_fuel: fuel.alternatefuel ? `${fuel.alternatefuel} lbs` : "N/A",
      reserve_fuel: fuel.reservefuel ? `${fuel.reservefuel} lbs` : "N/A",
      contingency_fuel: fuel.contingencyfuel ? `${fuel.contingencyfuel} lbs` : "N/A",
      taxi_fuel: fuel.taxifuel ? `${fuel.taxifuel} lbs` : "N/A",
      total_fuel: fuel.totalfuel ? `${fuel.totalfuel} lbs` : "N/A",
    },
    weights: {
      passengers: weights.pax || "N/A",
      cargo: weights.cargo ? `${weights.cargo} lbs` : "N/A",
      zero_fuel_weight: weights.zfw ? `${weights.zfw} lbs` : "N/A",
      takeoff_weight: weights.takeoff ? `${weights.takeoff} lbs` : "N/A",
      landing_weight: weights.landing ? `${weights.landing} lbs` : "N/A",
    },
    weather: {
      departure_metar: weather.departure_metar || "N/A",
      arrival_metar: weather.arrival_metar || "N/A",
      avg_wind_component: weather.avgwind_comp ? `${weather.avgwind_comp} kts` : "N/A",
    },
    operational: {
      alternate_airport: alternate.icao || "N/A",
      alternate_name: alternate.name || "N/A",
      etops: general.etops || "NO",
    },
  };
}

/**
 * Format flight plan summary
 */
export function formatFlightPlanSummary(data: SimBriefFlightPlan, planId?: string): Record<string, any> {
  const general = data.general || {};
  const origin = data.origin || {};
  const destination = data.destination || {};

  return {
    plan_id: planId || data.params?.planid || "N/A",
    flight_number: general.flightnum || "N/A",
    aircraft: general.type || "N/A",
    route: `${origin.icao || "N/A"} - ${destination.icao || "N/A"}`,
    distance: general.distance ? `${general.distance} NM` : "N/A",
    flight_time: general.flighttime || "N/A",
    date: general.date || "N/A",
  };
}
