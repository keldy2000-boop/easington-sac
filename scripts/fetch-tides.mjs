// Fetches the next 7 days of high and low waters at Bridlington from the
// Admiralty and writes them to data/tides.json.
// Runs daily from .github/workflows/tides.yml. Needs a free UK Tidal API
// (Discovery) key from https://developer.admiralty.co.uk in ADMIRALTY_API_KEY.
// The free Discovery subscription lasts a year, so renew it each autumn.
import { writeFileSync } from "node:fs";

const STATION = { id: "0181", name: "Bridlington" };
const key = process.env.ADMIRALTY_API_KEY;
if (!key) { console.error("ADMIRALTY_API_KEY is not set"); process.exit(1); }

const url = `https://admiraltyapi.azure-api.net/uktidalapi/api/V1/Stations/${STATION.id}/TidalEvents?duration=7`;
const res = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": key } });
if (!res.ok) { console.error(`Admiralty API returned ${res.status}: ${await res.text()}`); process.exit(1); }

// Times come back in UTC without a zone marker, so add the Z.
const events = (await res.json()).map(e => ({
  type: e.EventType === "HighWater" ? "HW" : "LW",
  time: e.DateTime.replace(/(\.\d+)?Z?$/, "Z"),
  height: Math.round(e.Height * 10) / 10
}));

writeFileSync("data/tides.json", JSON.stringify({
  station: STATION.name,
  stationId: STATION.id,
  source: "UK Hydrographic Office (Admiralty)",
  fetched: new Date().toISOString(),
  events
}, null, 1) + "\n");
console.log(`Wrote ${events.length} tides for ${STATION.name}`);
