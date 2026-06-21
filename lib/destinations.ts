export type Destination = {
  city: string;
  sub: string;
  code: string;
};

export const DESTINATIONS: Destination[] = [
  { city: "Raleigh", sub: "North Carolina, USA", code: "RDU" },
  { city: "Gatlinburg", sub: "Tennessee, USA", code: "TYS" },
  { city: "Asheville", sub: "North Carolina, USA", code: "AVL" },
  { city: "Charleston", sub: "South Carolina, USA", code: "CHS" },
  { city: "Savannah", sub: "Georgia, USA", code: "SAV" },
  { city: "Nashville", sub: "Tennessee, USA", code: "BNA" },
  { city: "New Orleans", sub: "Louisiana, USA", code: "MSY" },
  { city: "Miami", sub: "Florida, USA", code: "MIA" },
  { city: "Orlando", sub: "Florida, USA", code: "MCO" },
  { city: "New York", sub: "New York, USA", code: "JFK" },
  { city: "Austin", sub: "Texas, USA", code: "AUS" },
  { city: "Las Vegas", sub: "Nevada, USA", code: "LAS" },
  { city: "Denver", sub: "Colorado, USA", code: "DEN" },
  { city: "Aspen", sub: "Colorado, USA", code: "ASE" },
  { city: "Chicago", sub: "Illinois, USA", code: "ORD" },
  { city: "Los Angeles", sub: "California, USA", code: "LAX" },
  { city: "San Diego", sub: "California, USA", code: "SAN" },
  { city: "Seattle", sub: "Washington, USA", code: "SEA" },
  { city: "Honolulu", sub: "Hawaii, USA", code: "HNL" },
  { city: "Cancún", sub: "Mexico", code: "CUN" },
  { city: "Cabo San Lucas", sub: "Mexico", code: "SJD" },
  { city: "Punta Cana", sub: "Dominican Republic", code: "PUJ" },
  { city: "Paris", sub: "France", code: "CDG" },
  { city: "London", sub: "United Kingdom", code: "LHR" },
  { city: "Barcelona", sub: "Spain", code: "BCN" },
  { city: "Rome", sub: "Italy", code: "FCO" },
  { city: "Reykjavík", sub: "Iceland", code: "KEF" },
  { city: "Tokyo", sub: "Japan", code: "NRT" },
];

export function searchDestinations(query: string): Destination[] {
  const q = query.trim().toLowerCase();
  if (!q) return DESTINATIONS.slice(0, 6);
  return DESTINATIONS.filter(d =>
    (d.city + " " + d.sub + " " + d.code).toLowerCase().includes(q)
  ).slice(0, 6);
}
