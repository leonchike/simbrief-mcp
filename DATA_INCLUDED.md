# SimBrief Flight Plan Data - What's Included

This document outlines what data from the SimBrief API response is included in the MCP tool responses and what is excluded to manage response size for Claude.

## ✅ Included Data (Comprehensive Flight Planning)

### Flight Information
- Flight number, airline, aircraft type & registration
- Date, AIRAC cycle, units (kg/lbs)
- Release number, plan ID

### Route Details
- **Departure**: Airport name, ICAO, runway, SID, transition altitude
- **Arrival**: Airport name, ICAO, runway, STAR, transition level
- **Alternate**: Airport name, ICAO, runway
- **Distances**: Great circle, route, air distance
- **Complete Route String**: Full navigation route
- **ICAO Flight Plan**: Complete ATC flight plan text

### Performance & Cruise
- Initial cruise altitude with step climbs
- Cruise TAS, Mach number, cost index
- Climb/descent profiles
- Estimated flight time, block time

### Fuel Planning (Complete)
- Trip fuel, taxi fuel, enroute burn
- Contingency fuel with rule (5%, 10%, etc.)
- Alternate burn, reserve fuel, extra fuel
- Min takeoff fuel, plan landing fuel
- Total burn

### Weight & Balance
- Passengers count, payload, cargo
- Zero Fuel Weight (ZFW)
- Takeoff Weight (TOW), Landing Weight (LDW)
- Max TOW, Max LDW

### Weather (Comprehensive)
- **Average Conditions**: Wind component, direction, speed, temp deviation, tropopause
- **Departure METAR & TAF**: Full weather reports with category
- **Arrival METAR & TAF**: Full weather reports with category
- **Alternate METAR**: Weather at alternate airport
- **SIGMETs**: Up to 5 significant meteorological warnings with hazard type, valid times, and text

### Takeoff Performance (NEW!)
- **Conditions**: Temperature, QNH, wind, surface condition
- **Runway Analysis**: All available runways with:
  - V-speeds: V1, VR, V2, VREF
  - Flex temperature and max temperature
  - Maximum weight limits
  - Wind components (headwind/crosswind)
  - ILS frequency
  - Performance limit code
- **Distances**: Decision, reject, continue, margin
- **Configuration**: Flap setting, thrust setting, bleed, anti-ice

### Landing Performance (NEW!)
- **Conditions**: Temperature, QNH, wind, surface condition, flap setting
- **Landing Distances**:
  - Dry: Actual and factored distances
  - Wet: Actual and factored distances
  - VREF speeds
- **Runway Analysis**: Max landing weights (dry/wet), wind, ILS

### Navigation
- **Key Waypoints** (every 5th waypoint to keep manageable):
  - Waypoint identifier, lat/lon
  - Altitude, wind, shear
  - Track and heading
  - Groundspeed, fuel flow
  - FIR information

### ETOPS Information
- ETOPS capable flag
- Critical fuel requirement
- ETOPS planning rule

### NAT Tracks (when applicable)
- Track identifier and route
- Valid times
- Available flight levels

### Performance Impact Analysis (NEW!)
- **Cost Index Variations**:
  - Higher CI (+10): Fuel burn and time impact
  - Lower CI (-10): Fuel burn and time impact
- **Altitude Variations**:
  - FL+20, FL+40, FL+60
  - FL-20, FL-40, FL-60
- **Weight Variations**:
  - ZFW ±1000 kg/lbs

### Aircraft Information
- Max altitude, fuel capacity
- ICAO and IATA codes
- Aircraft name

### Times
- Scheduled departure/arrival
- Estimated time enroute
- Reserve time
- Endurance

### ATC Information
- Flight rules (IFR/VFR)
- Flight type
- Callsign
- FIR information (origin, destination, enroute, alternates)
- Section 18 remarks

## ❌ Excluded Data (Too Large or Unnecessary)

### NOTAMs (~718KB)
**Why excluded**: Massive text data (70%+ of response size)
**Alternative**: Available in full JSON if needed, but excluded from markdown for readability
**Impact**: None - briefing still comprehensive without raw NOTAM text

### Text Sections (~227KB)
**Why excluded**: Formatted text versions of other data
**Contains**: OFP (Operational Flight Plan) text, various formatted outputs
**Alternative**: All data presented in structured markdown instead
**Impact**: None - same data in more readable format

### ATIS Messages
**Why excluded**: Very long verbatim airport information
**Alternative**: METAR/TAF provides essential weather info
**Impact**: Minimal - critical weather info still available

### Images & Links
**Why excluded**: URLs to charts, maps, and graphics
**Contains**: Map images, charts, PDF links
**Reason**: Not useful in text-based MCP interaction
**Impact**: None for text-based planning

### Pre-file Data
**Why excluded**: Specific to network pre-filing (VATSIM, IVAO, PilotEdge, POSCON)
**Reason**: Network-specific data not needed for general planning
**Impact**: None for SimBrief flight planning

### FMS Downloads
**Why excluded**: Links to download FMS-specific route files
**Reason**: Not usable in MCP context
**Impact**: None for planning discussion

### Detailed Navlog (~58KB of all waypoints)
**Why included partially**: Every 5th waypoint shown for overview
**Reason**: Full waypoint-by-waypoint data too verbose for Claude
**Impact**: Minimal - key points still visible, full route string provided

### Database Updates
**Why excluded**: AIRAC update information
**Reason**: Not relevant to individual flight plan
**Impact**: None

## Response Size Comparison

| Version | Size | Claude Compatible |
|---------|------|-------------------|
| Raw JSON (all data) | ~1.3MB | ❌ No - Truncated |
| With NOTAMs removed | ~600KB | ❌ No - Too large |
| With NOTAMs + Text removed | ~350KB | ⚠️ Maybe - Borderline |
| **Current Markdown** | **~50-80KB** | **✅ Yes - Perfect** |

## Summary

The current implementation provides **all essential flight planning data** in a readable markdown format while excluding only:
1. Massive text dumps (NOTAMs, formatted text)
2. External links (images, downloads)
3. Network-specific pre-file data
4. Excessive waypoint-by-waypoint detail

**Result**: Complete, professional flight briefing in ~5-10% of original size, optimized for Claude's capabilities.
