# VATSIM ATIS Tool Specification

## Overview

Build an MCP tool that retrieves ATIS (Automatic Terminal Information Service) data from VATSIM for one or more airports.

---

## Tool Definition

| Field           | Value                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**        | `getVatsimAtis`                                                                                                                                     |
| **Description** | Retrieve active ATIS information from the VATSIM network for specified airports. Returns combined, arrival, and departure ATIS data when available. |

---

## Input Parameters

| Parameter   | Type       | Required | Description                                                    |
| ----------- | ---------- | -------- | -------------------------------------------------------------- |
| `icaoCodes` | `string[]` | Yes      | Array of ICAO airport codes (e.g., `["KJFK", "EKCH", "EGLL"]`) |

### Input Validation

- Each ICAO code must be 4 characters, alphabetic only
- Convert to uppercase before processing
- Minimum 1 ICAO code required
- Maximum 20 ICAO codes per request (to prevent abuse)

### Example Input

```json
{
  "icaoCodes": ["EKCH", "KJFK", "EGLL"]
}
```

---

## Data Source

| Field                | Value                                         |
| -------------------- | --------------------------------------------- |
| **Endpoint**         | `https://data.vatsim.net/v3/vatsim-data.json` |
| **Method**           | GET                                           |
| **Auth**             | None required                                 |
| **Update Frequency** | ~15 seconds                                   |

---

## ATIS Callsign Patterns

VATSIM ATIS callsigns follow these patterns:

| Pattern         | Type           | Example       |
| --------------- | -------------- | ------------- |
| `{ICAO}_ATIS`   | Combined ATIS  | `KJFK_ATIS`   |
| `{ICAO}_A_ATIS` | Arrival ATIS   | `EKCH_A_ATIS` |
| `{ICAO}_D_ATIS` | Departure ATIS | `EKCH_D_ATIS` |

When filtering, match any callsign where:

```
callsign === "{ICAO}_ATIS" OR
callsign === "{ICAO}_A_ATIS" OR
callsign === "{ICAO}_D_ATIS"
```

---

## Output Schema

```typescript
interface VatsimAtisResponse {
  /** Timestamp when data was fetched from VATSIM */
  fetchedAt: string; // ISO 8601 datetime

  /** Number of airports with active ATIS */
  activeCount: number;

  /** Results for each requested airport */
  airports: AirportAtis[];
}

interface AirportAtis {
  /** ICAO code of the airport */
  icao: string;

  /** Whether any ATIS is active for this airport */
  hasActiveAtis: boolean;

  /** Combined ATIS (if available) */
  combined: AtisData | null;

  /** Arrival ATIS (if available) */
  arrival: AtisData | null;

  /** Departure ATIS (if available) */
  departure: AtisData | null;
}

interface AtisData {
  /** Full callsign (e.g., "EKCH_A_ATIS") */
  callsign: string;

  /** ATIS information letter (e.g., "A", "B", "D") */
  atisCode: string | null;

  /** Radio frequency */
  frequency: string;

  /** ATIS text as a single joined string */
  textAtis: string | null;

  /** ATIS text as original array of lines */
  textAtisLines: string[] | null;

  /** Controller name */
  controllerName: string;

  /** Controller CID */
  controllerCid: number;

  /** When ATIS was last updated */
  lastUpdated: string; // ISO 8601 datetime

  /** When controller logged on */
  logonTime: string; // ISO 8601 datetime
}
```

---

## Example Output

```json
{
  "fetchedAt": "2025-12-23T22:45:00.000Z",
  "activeCount": 1,
  "airports": [
    {
      "icao": "EKCH",
      "hasActiveAtis": true,
      "combined": null,
      "arrival": {
        "callsign": "EKCH_A_ATIS",
        "atisCode": "D",
        "frequency": "122.755",
        "textAtis": "THIS IS COPENHAGEN ARRIVAL INFORMATION D. AT 2150Z. EXPECT ILS APPROACH. RUNWAY IN USE FOR LANDING 04 RIGHT. TAXIWAY BRAVO FIVE, NOT AVAILABLE FOR TAXI. TRANSITION LEVEL 55. 06010KT 9999 NCD 00/M05 Q1037 (ONE ZERO THREE SEVEN) NOSIG. . NOTAMS... RUNWAY 04L CLOSED . AT FIRST CONTACT WITH APPROACH, STATE AIRCRAFT TYPE. THIS WAS COPENHAGEN ARRIVAL INFO D....ADVS YOU HAVE INFO D",
        "textAtisLines": [
          "THIS IS COPENHAGEN ARRIVAL INFORMATION D. AT 2150Z. EXPECT ILS",
          "APPROACH. RUNWAY IN USE FOR LANDING 04 RIGHT. TAXIWAY BRAVO",
          "FIVE, NOT AVAILABLE FOR TAXI. TRANSITION LEVEL 55. 06010KT 9999",
          "NCD 00/M05 Q1037 (ONE ZERO THREE SEVEN) NOSIG. . NOTAMS...",
          "RUNWAY 04L CLOSED . AT FIRST CONTACT WITH APPROACH, STATE",
          "AIRCRAFT TYPE. THIS WAS COPENHAGEN ARRIVAL INFO D....ADVS YOU",
          "HAVE INFO D"
        ],
        "controllerName": "Frederik Johnsen",
        "controllerCid": 1567663,
        "lastUpdated": "2025-12-23T22:38:50.151Z",
        "logonTime": "2025-12-23T21:12:50.321Z"
      },
      "departure": {
        "callsign": "EKCH_D_ATIS",
        "atisCode": "D",
        "frequency": "122.855",
        "textAtis": "THIS IS COPENHAGEN DEPARTURE INFO D. AT 2150Z. RUNWAY IN USE FOR TAKEOFF 04 RIGHT. 06010KT 9999 NCD 00/M05 Q1037 (ONE ZERO THREE SEVEN) NOSIG. . AT FIRST CONTACT WITH APRON CONTROL ADVISE IF UNABLE TO PERFORM CUSTOMIZED PUSHBACK. . THIS WAS COPENHAGEN DEPARTURE INFO D....ADVS YOU HAVE INFO D",
        "textAtisLines": [
          "THIS IS COPENHAGEN DEPARTURE INFO D. AT 2150Z. RUNWAY IN USE FOR",
          "TAKEOFF 04 RIGHT. 06010KT 9999 NCD 00/M05 Q1037 (ONE ZERO THREE",
          "SEVEN) NOSIG. . AT FIRST CONTACT WITH APRON CONTROL ADVISE IF",
          "UNABLE TO PERFORM CUSTOMIZED PUSHBACK. . THIS WAS COPENHAGEN",
          "DEPARTURE INFO D....ADVS YOU HAVE INFO D"
        ],
        "controllerName": "Frederik Johnsen",
        "controllerCid": 1567663,
        "lastUpdated": "2025-12-23T22:38:52.778Z",
        "logonTime": "2025-12-23T21:12:52.959Z"
      }
    },
    {
      "icao": "KJFK",
      "hasActiveAtis": false,
      "combined": null,
      "arrival": null,
      "departure": null
    },
    {
      "icao": "EGLL",
      "hasActiveAtis": false,
      "combined": null,
      "arrival": null,
      "departure": null
    }
  ]
}
```

---

## Processing Logic

```
1. VALIDATE input
   - Ensure icaoCodes is a non-empty array
   - Validate each code is 4 alphabetic characters
   - Uppercase all codes
   - Reject if > 20 codes

2. FETCH data from VATSIM endpoint
   - GET https://data.vatsim.net/v3/vatsim-data.json
   - Handle network errors gracefully
   - Set reasonable timeout (10 seconds)

3. FOR EACH requested ICAO code:
   a. Search the "atis" array for matching callsigns:
      - {ICAO}_ATIS    → combined
      - {ICAO}_A_ATIS  → arrival
      - {ICAO}_D_ATIS  → departure

   b. For each match found:
      - Extract relevant fields
      - Join text_atis array into single string (space-separated)
      - Preserve original array as textAtisLines
      - Handle null/empty text_atis gracefully

   c. Build AirportAtis object with findings

4. RETURN structured response with all results
```

---

## Edge Cases

| Case                             | Handling                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `text_atis` is `null`            | Set both `textAtis` and `textAtisLines` to `null`                               |
| `text_atis` is empty array `[]`  | Set `textAtis` to `""` and `textAtisLines` to `[]`                              |
| `atis_code` is empty string `""` | Set `atisCode` to `null`                                                        |
| No ATIS active for airport       | Return airport object with `hasActiveAtis: false` and all ATIS fields as `null` |
| Invalid ICAO code format         | Return 400 error with descriptive message                                       |
| VATSIM API unreachable           | Return 503 error with retry suggestion                                          |
| VATSIM API returns invalid JSON  | Return 502 error                                                                |

---

## Error Responses

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
```

| HTTP Status | Code                   | Message                                                            |
| ----------- | ---------------------- | ------------------------------------------------------------------ |
| 400         | `INVALID_INPUT`        | "icaoCodes must be a non-empty array of valid 4-letter ICAO codes" |
| 400         | `TOO_MANY_CODES`       | "Maximum 20 ICAO codes per request"                                |
| 502         | `UPSTREAM_ERROR`       | "Failed to parse VATSIM data response"                             |
| 503         | `UPSTREAM_UNAVAILABLE` | "VATSIM data service is currently unavailable"                     |

---

## Performance Considerations

1. **Caching (Optional but Recommended)**
   - Cache VATSIM response for 15 seconds (matches their update frequency)
   - Use cache key: `vatsim:data:v3`
   - Reduces load on VATSIM servers and improves response time

2. **Timeout**
   - Set HTTP client timeout to 10 seconds
   - VATSIM endpoint is generally fast but can occasionally be slow

3. **Response Size**
   - VATSIM full feed is typically 500KB-1MB
   - Consider streaming/chunked parsing for memory efficiency if needed

---

## Testing Checklist

- [ ] Single ICAO code with active combined ATIS
- [ ] Single ICAO code with active arrival + departure ATIS (e.g., EKCH when staffed)
- [ ] Single ICAO code with no active ATIS
- [ ] Multiple ICAO codes, mixed results
- [ ] Invalid ICAO code format (numbers, wrong length)
- [ ] Empty array input
- [ ] Array with > 20 codes
- [ ] ATIS with null text_atis field
- [ ] ATIS with empty atis_code field
- [ ] Network timeout handling
- [ ] Malformed upstream response handling

---

## Future Enhancements (Out of Scope)

- Add METAR data alongside ATIS (from `https://metar.vatsim.net/{ICAO}`)
- Add controller ratings/facility type information
- WebSocket subscription for real-time updates
- Historical ATIS tracking
