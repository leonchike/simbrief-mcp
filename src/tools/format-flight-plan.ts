/**
 * Format SimBrief flight plan data into readable markdown
 * Excludes large unnecessary data like full NOTAMs and text sections
 */

import type { SimBriefFlightPlan } from "../types/index.js";

export function formatFlightPlanMarkdown(data: SimBriefFlightPlan): string {
  const general = data.general || {};
  const params = data.params || {};
  const origin = data.origin || {};
  const destination = data.destination || {};
  const alternate = data.alternate || {};
  const fuel = data.fuel || {};
  const weights = data.weights || {};
  const times = data.times || {};
  const aircraft = data.aircraft || {};
  const atc = data.atc || {};
  const navlog = data.navlog?.fix || [];
  const etops = data.etops || {};
  const tlr = data.tlr || {};
  const sigmets = data.sigmets?.sigmet || [];
  const tracks = data.tracks || {};
  const impacts = data.impacts || {};

  // Collect NOTAMs from all airports
  const originNotams = origin.notam || [];
  const destNotams = destination.notam || [];
  const altNotams = alternate.notam || [];

  // Filter for critical NOTAMs (runway closures, lighting issues, navigation changes)
  const criticalCategories = ['Runway', 'Lighting', 'Navigation', 'Obstacle', 'Aerodrome'];
  const criticalStatuses = ['Closed', 'Limited', 'Irregular', 'Unserviceable'];

  const filterCriticalNotams = (notams: any[]) =>
    notams.filter((n: any) =>
      criticalCategories.includes(n.notam_qcode_category) ||
      criticalStatuses.includes(n.notam_qcode_status)
    ).slice(0, 5); // Limit to 5 per airport

  const criticalOriginNotams = filterCriticalNotams(originNotams);
  const criticalDestNotams = filterCriticalNotams(destNotams);
  const criticalAltNotams = filterCriticalNotams(altNotams);

  // Extract key waypoints (every 5th waypoint to keep it manageable)
  const keyWaypoints = Array.isArray(navlog)
    ? navlog.filter((_, index) => index % 5 === 0 || index === navlog.length - 1)
    : [];

  return `# Flight Plan: ${general.icao_airline || 'N/A'}${general.flight_number || 'N/A'}

## Flight Information
- **Aircraft**: ${general.icao_aircraft || 'N/A'} (${aircraft.name || 'N/A'})
- **Registration**: ${aircraft.reg || 'N/A'}
- **Flight Number**: ${general.icao_airline || ''}${general.flight_number || 'N/A'}
- **Date**: ${params.date || 'N/A'} ${params.time_generated ? new Date(parseInt(params.time_generated) * 1000).toUTCString() : ''}
- **AIRAC**: ${params.airac || 'N/A'}
- **Units**: ${params.units || 'N/A'}

## Route Overview
**${origin.icao_code || 'N/A'} → ${destination.icao_code || 'N/A'}**

### Departure
- **Airport**: ${origin.name || 'N/A'} (${origin.icao_code || 'N/A'})
- **Runway**: ${origin.plan_rwy || 'N/A'}
- **SID**: ${general.sid_ident || 'DCT'}
- **Transition Altitude**: ${origin.trans_alt || 'N/A'} ft

### Arrival
- **Airport**: ${destination.name || 'N/A'} (${destination.icao_code || 'N/A'})
- **Runway**: ${destination.plan_rwy || 'N/A'}
- **STAR**: ${general.star_ident || 'DCT'}
- **Transition Level**: ${destination.trans_level || 'N/A'} ft

### Alternate
- **Airport**: ${alternate.name || 'N/A'} (${alternate.icao_code || 'N/A'})
- **Runway**: ${alternate.plan_rwy || 'N/A'}

## Distance & Time
- **Great Circle Distance**: ${general.gc_distance || 'N/A'} NM
- **Route Distance**: ${general.route_distance || 'N/A'} NM
- **Air Distance**: ${general.air_distance || 'N/A'} NM
- **Estimated Flight Time**: ${times.est_time_enroute || 'N/A'}
- **Block Time**: ${times.est_block || 'N/A'}

## Cruise Profile
- **Initial Cruise**: FL${general.initial_altitude ? (parseInt(general.initial_altitude) / 100).toString().padStart(3, '0') : 'N/A'}
- **Step Climbs**: ${general.stepclimb_string || 'None'}
- **Cruise TAS**: ${general.cruise_tas || 'N/A'} kts
- **Cruise Mach**: ${general.cruise_mach || 'N/A'}
- **Cost Index**: ${general.costindex || 'N/A'}
- **Climb Profile**: ${general.climb_profile || 'N/A'}
- **Descent Profile**: ${general.descent_profile || 'N/A'}

## Route
\`\`\`
${general.route || 'N/A'}
\`\`\`

**ICAO Route**:
\`\`\`
${atc.flightplan_text || general.route_ifps || 'N/A'}
\`\`\`

## Fuel Planning
- **Trip Fuel**: ${fuel.plan_ramp || 'N/A'} ${params.units || 'kg'}
- **Taxi Fuel**: ${fuel.taxi || 'N/A'} ${params.units || 'kg'}
- **Enroute Burn**: ${fuel.enroute_burn || 'N/A'} ${params.units || 'kg'}
- **Contingency**: ${fuel.contingency || 'N/A'} ${params.units || 'kg'} (${general.cont_rule || 'N/A'})
- **Alternate Burn**: ${fuel.alternate_burn || 'N/A'} ${params.units || 'kg'}
- **Reserve**: ${fuel.reserve || 'N/A'} ${params.units || 'kg'}
- **Extra Fuel**: ${fuel.extra || 'N/A'} ${params.units || 'kg'}
- **Min Takeoff Fuel**: ${fuel.min_takeoff || 'N/A'} ${params.units || 'kg'}
- **Plan Landing**: ${fuel.plan_landing || 'N/A'} ${params.units || 'kg'}

## Weight & Balance
- **Passengers**: ${general.passengers || 'N/A'}
- **Payload**: ${weights.payload || 'N/A'} ${params.units || 'kg'}
- **Zero Fuel Weight**: ${weights.est_zfw || 'N/A'} ${params.units || 'kg'}
- **Takeoff Weight**: ${weights.est_tow || 'N/A'} ${params.units || 'kg'}
- **Landing Weight**: ${weights.est_ldw || 'N/A'} ${params.units || 'kg'}
- **Max Takeoff Weight**: ${weights.max_tow || 'N/A'} ${params.units || 'kg'}
- **Max Landing Weight**: ${weights.max_ldw || 'N/A'} ${params.units || 'kg'}

## Weather Conditions
### Average Conditions
- **Wind Component**: ${general.avg_wind_comp || 'N/A'} kts (${general.avg_wind_dir || 'N/A'}° @ ${general.avg_wind_spd || 'N/A'} kts)
- **Temperature Deviation**: ${general.avg_temp_dev || 'N/A'}°C
- **Tropopause**: ${general.avg_tropopause || 'N/A'} ft

### Departure Weather (${origin.icao_code || 'N/A'})
**METAR** (${origin.metar_time || 'N/A'}):
\`\`\`
${origin.metar || 'N/A'}
\`\`\`
**Category**: ${origin.metar_category?.toUpperCase() || 'N/A'}

**TAF** (${origin.taf_time || 'N/A'}):
\`\`\`
${origin.taf || 'N/A'}
\`\`\`

### Arrival Weather (${destination.icao_code || 'N/A'})
**METAR** (${destination.metar_time || 'N/A'}):
\`\`\`
${destination.metar || 'N/A'}
\`\`\`
**Category**: ${destination.metar_category?.toUpperCase() || 'N/A'}

**TAF** (${destination.taf_time || 'N/A'}):
\`\`\`
${destination.taf || 'N/A'}
\`\`\`

### Alternate Weather (${alternate.icao_code || 'N/A'})
**METAR**:
\`\`\`
${alternate.metar || 'N/A'}
\`\`\`

## ETOPS Information
${general.is_etops === '1' ? `
- **ETOPS Capable**: Yes
- **Critical Fuel**: ${etops.critical_fuel || 'N/A'} ${params.units || 'kg'}
- **ETOPS Planning**: ${etops.planning_rule || 'N/A'}
` : '- **ETOPS**: Not Applicable'}

## Key Waypoints
| Waypoint | Latitude | Longitude | Altitude | Wind | Shear |
|----------|----------|-----------|----------|------|-------|
${keyWaypoints.map((fix: any) =>
  `| ${fix.ident || 'N/A'} | ${fix.pos_lat || 'N/A'} | ${fix.pos_long || 'N/A'} | FL${fix.altitude_feet ? (parseInt(fix.altitude_feet) / 100).toString().padStart(3, '0') : 'N/A'} | ${fix.wind_dir || 'N/A'}/${fix.wind_spd || 'N/A'} | ${fix.shear || '0'} |`
).join('\n') || '| No waypoints available | | | | | |'}

## Aircraft Performance
- **Max Altitude**: ${aircraft.max_altitude || 'N/A'} ft
- **Fuel Capacity**: ${aircraft.max_fuel || 'N/A'} ${params.units || 'kg'}
- **ICAO Code**: ${aircraft.icaocode || 'N/A'}
- **IATA Code**: ${aircraft.iatacode || 'N/A'}

## Times
- **Scheduled Departure**: ${times.sched_out || times.est_out || 'N/A'}
- **Scheduled Arrival**: ${times.sched_in || times.est_in || 'N/A'}
- **Estimated Time Enroute**: ${times.est_time_enroute || 'N/A'}
- **Reserve Time**: ${times.reserve_time || 'N/A'}
- **Endurance**: ${times.endurance || 'N/A'}

## Takeoff Performance (${origin.icao_code || 'N/A'})
${tlr.takeoff?.conditions ? `
**Conditions**: ${tlr.takeoff.conditions.temperature || 'N/A'}°C | QNH ${tlr.takeoff.conditions.altimeter || 'N/A'}" | Wind ${tlr.takeoff.conditions.wind_direction || 'N/A'}/${tlr.takeoff.conditions.wind_speed || 'N/A'} | ${(tlr.takeoff.conditions.surface_condition || 'N/A').toUpperCase()}

**Planned**: RWY ${tlr.takeoff.conditions.planned_runway || 'N/A'} | TOW ${tlr.takeoff.conditions.planned_weight || 'N/A'} ${params.units || 'kg'}

### Runway Analysis
| RWY | Length | Wind | V1 | VR | V2 | VREF | Flex | Max Wt | Limit |
|-----|--------|------|----|----|----|----|------|--------|-------|
${tlr.takeoff.runway?.map((rwy: any) =>
  `| ${rwy.identifier || 'N/A'} | ${rwy.length || 'N/A'}ft | ${rwy.headwind_component > 0 ? '+' : ''}${rwy.headwind_component || 'N/A'}/${Math.abs(rwy.crosswind_component || 0)} | ${rwy.speeds_v1 || 'N/A'} | ${rwy.speeds_vr || 'N/A'} | ${rwy.speeds_v2 || 'N/A'} | ${rwy.speeds_other || 'N/A'} | ${rwy.flex_temperature || 'N/A'}°C | ${rwy.max_weight || 'N/A'} | ${rwy.limit_code || 'N/A'} |`
).join('\n') || '| No data | | | | | | | | | |'}

**Distances** (Planned RWY ${tlr.takeoff.conditions.planned_runway || 'N/A'}):
${tlr.takeoff.runway?.find((r: any) => r.identifier === tlr.takeoff.conditions.planned_runway) ?
  `- Decision: ${tlr.takeoff.runway.find((r: any) => r.identifier === tlr.takeoff.conditions.planned_runway).distance_decide || 'N/A'}ft
- Reject: ${tlr.takeoff.runway.find((r: any) => r.identifier === tlr.takeoff.conditions.planned_runway).distance_reject || 'N/A'}ft
- Continue: ${tlr.takeoff.runway.find((r: any) => r.identifier === tlr.takeoff.conditions.planned_runway).distance_continue || 'N/A'}ft
- Margin: ${tlr.takeoff.runway.find((r: any) => r.identifier === tlr.takeoff.conditions.planned_runway).distance_margin || 'N/A'}ft` : 'Data not available'}
` : '*Takeoff performance data not available*'}

## Landing Performance (${destination.icao_code || 'N/A'})
${tlr.landing?.conditions ? `
**Conditions**: ${tlr.landing.conditions.temperature || 'N/A'}°C | QNH ${tlr.landing.conditions.altimeter || 'N/A'}" | Wind ${tlr.landing.conditions.wind_direction || 'N/A'}/${tlr.landing.conditions.wind_speed || 'N/A'} | ${(tlr.landing.conditions.surface_condition || 'N/A').toUpperCase()}

**Planned**: RWY ${tlr.landing.conditions.planned_runway || 'N/A'} | LDW ${tlr.landing.conditions.planned_weight || 'N/A'} ${params.units || 'kg'} | Flaps ${tlr.landing.conditions.flap_setting || 'N/A'}

**Landing Distances**:
- **Dry**: Actual ${tlr.landing.distance_dry?.actual_distance || 'N/A'}ft | Factored ${tlr.landing.distance_dry?.factored_distance || 'N/A'}ft | VREF ${tlr.landing.distance_dry?.speeds_vref || 'N/A'}kts
- **Wet**: Actual ${tlr.landing.distance_wet?.actual_distance || 'N/A'}ft | Factored ${tlr.landing.distance_wet?.factored_distance || 'N/A'}ft

### Runway Analysis
| RWY | Length | Wind | Max Wt Dry | Max Wt Wet | ILS |
|-----|--------|------|------------|------------|-----|
${tlr.landing.runway?.map((rwy: any) =>
  `| ${rwy.identifier || 'N/A'} | ${rwy.length || 'N/A'}ft | ${rwy.headwind_component > 0 ? '+' : ''}${rwy.headwind_component || 'N/A'}/${Math.abs(rwy.crosswind_component || 0)} | ${rwy.max_weight_dry || 'N/A'} | ${rwy.max_weight_wet || 'N/A'} | ${rwy.ils_frequency || 'N/A'} |`
).join('\n') || '| No data | | | | | |'}
` : '*Landing performance data not available*'}

## Critical NOTAMs
${criticalOriginNotams.length > 0 || criticalDestNotams.length > 0 || criticalAltNotams.length > 0 ? `
${criticalOriginNotams.length > 0 ? `
### ${origin.icao_code || 'Origin'} (${originNotams.length} total, ${criticalOriginNotams.length} critical)
${criticalOriginNotams.map((notam: any) =>
  `**${notam.notam_qcode_category || 'N/A'}** - ${notam.notam_qcode_status || 'N/A'} (${notam.notam_id || 'N/A'})
- **Effective**: ${notam.date_effective || 'N/A'} to ${notam.date_expire || 'N/A'}
- ${notam.notam_text || 'N/A'}
`
).join('\n')}` : ''}

${criticalDestNotams.length > 0 ? `
### ${destination.icao_code || 'Destination'} (${destNotams.length} total, ${criticalDestNotams.length} critical)
${criticalDestNotams.map((notam: any) =>
  `**${notam.notam_qcode_category || 'N/A'}** - ${notam.notam_qcode_status || 'N/A'} (${notam.notam_id || 'N/A'})
- **Effective**: ${notam.date_effective || 'N/A'} to ${notam.date_expire || 'N/A'}
- ${notam.notam_text || 'N/A'}
`
).join('\n')}` : ''}

${criticalAltNotams.length > 0 ? `
### ${alternate.icao_code || 'Alternate'} (${altNotams.length} total, ${criticalAltNotams.length} critical)
${criticalAltNotams.map((notam: any) =>
  `**${notam.notam_qcode_category || 'N/A'}** - ${notam.notam_qcode_status || 'N/A'} (${notam.notam_id || 'N/A'})
- **Effective**: ${notam.date_effective || 'N/A'} to ${notam.date_expire || 'N/A'}
- ${notam.notam_text || 'N/A'}
`
).join('\n')}` : ''}

*For complete NOTAMs, use the \`getNotams\` tool*
` : '*No critical NOTAMs*'}

## Weather Hazards
${Array.isArray(sigmets) && sigmets.length > 0 ? `
### SIGMETs
${sigmets.slice(0, 5).map((sigmet: any) =>
  `**${sigmet.fir_name || 'N/A'}** - ${sigmet.hazard || 'N/A'} ${sigmet.qualifier || ''} (${sigmet.id || 'N/A'})
- Valid: ${sigmet.start ? new Date(parseInt(sigmet.start) * 1000).toUTCString() : 'N/A'} to ${sigmet.end ? new Date(parseInt(sigmet.end) * 1000).toUTCString() : 'N/A'}
- ${sigmet.text || 'N/A'}
`
).join('\n')}
${sigmets.length > 5 ? `*... and ${sigmets.length - 5} more SIGMETs*` : ''}
` : '*No active SIGMETs*'}

${tracks.nat && tracks.nat.length > 0 ? `
## NAT Tracks
${tracks.nat.map((track: any) =>
  `**Track ${track.ident || 'N/A'}**: ${track.route || 'N/A'}
- Valid: ${track.validfrom || 'N/A'} to ${track.validto || 'N/A'}
- FL Range: ${track.flightlevels || 'N/A'}
`
).join('\n')}
` : ''}

## Performance Impact Analysis
${impacts ? `
**Cost Index Variations**:
- Higher CI (+10): ${impacts.higher_ci?.total_burn || 'N/A'} ${params.units || 'kg'} | Time: ${impacts.higher_ci?.time_enroute || 'N/A'}
- Lower CI (-10): ${impacts.lower_ci?.total_burn || 'N/A'} ${params.units || 'kg'} | Time: ${impacts.lower_ci?.time_enroute || 'N/A'}

**Altitude Variations**:
- FL +20: ${impacts.plus_2000ft?.total_burn || 'N/A'} ${params.units || 'kg'}
- FL -20: ${impacts.minus_2000ft?.total_burn || 'N/A'} ${params.units || 'kg'}

**ZFW Variations**:
- ZFW +1000${params.units || 'kg'}: ${impacts.zfw_plus_1000?.total_burn || 'N/A'} ${params.units || 'kg'}
- ZFW -1000${params.units || 'kg'}: ${impacts.zfw_minus_1000?.total_burn || 'N/A'} ${params.units || 'kg'}
` : '*Performance impact data not available*'}

## Additional Information
- **Release**: ${general.release || 'N/A'}
- **Plan ID**: ${params.request_id || 'N/A'}
- **Detailed Profile**: ${general.is_detailed_profile === '1' ? 'Yes' : 'No'}
- **Route Validation**: ${params.route_ifps ? 'IFPS Validated' : 'Standard'}
- **Flight Rules**: ${atc.flight_rules || 'N/A'}
- **Flight Type**: ${atc.flight_type || 'N/A'}

---
*Generated by SimBrief MCP Server*
*Plan generated: ${params.time_generated ? new Date(parseInt(params.time_generated) * 1000).toUTCString() : 'N/A'}*
`;
}
