import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from '@/lib/env';

// Curated London & UK Airports / Major Transport Hubs for instantaneous top matching
const CURATED_UK_HUBS = [
  { name: 'London Heathrow Airport (LHR) - Terminal 2 & 3', keywords: ['heathrow', 'lhr', 'terminal 2', 'terminal 3'] },
  { name: 'London Heathrow Airport (LHR) - Terminal 4', keywords: ['heathrow', 'lhr', 'terminal 4'] },
  { name: 'London Heathrow Airport (LHR) - Terminal 5', keywords: ['heathrow', 'lhr', 'terminal 5'] },
  { name: 'London Gatwick Airport (LGW) - North Terminal', keywords: ['gatwick', 'lgw', 'north terminal'] },
  { name: 'London Gatwick Airport (LGW) - South Terminal', keywords: ['gatwick', 'lgw', 'south terminal'] },
  { name: 'London Stansted Airport (STN)', keywords: ['stansted', 'stn'] },
  { name: 'London Luton Airport (LTN)', keywords: ['luton', 'ltn'] },
  { name: 'London City Airport (LCY)', keywords: ['london city', 'lcy'] },
  { name: 'Central London (Westminster / Mayfair)', keywords: ['central london', 'westminster', 'mayfair', 'w1'] },
  { name: 'City of London (Bank / Liverpool Street)', keywords: ['city of london', 'bank', 'liverpool street', 'ec1', 'ec2'] },
  { name: 'Canary Wharf, London, E14', keywords: ['canary wharf', 'docklands', 'e14'] },
  { name: 'King\'s Cross & St Pancras International Station, London, N1C', keywords: ['kings cross', 'st pancras', 'n1c', 'eurostar'] },
  { name: 'London Paddington Station, Praed Street, W2', keywords: ['paddington', 'heathrow express', 'w2'] },
  { name: 'London Waterloo Station, SE1', keywords: ['waterloo', 'se1'] },
  { name: 'London Victoria Station, SW1', keywords: ['victoria', 'gatwick express', 'sw1'] },
  { name: 'Birmingham New Street Station, B2 4QA', keywords: ['birmingham', 'new street', 'b2'] },
  { name: 'Manchester Piccadilly Station, M1 2PB', keywords: ['manchester', 'piccadilly', 'm1'] },
  { name: 'Southampton Cruise Port Terminals, SO14', keywords: ['southampton', 'cruise', 'so14'] },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (q.length < 2) {
    return NextResponse.json({ success: true, suggestions: [] });
  }

  const queryLower = q.toLowerCase();
  const suggestions: string[] = [];
  const seen = new Set<string>();

  // 1. Check curated hubs first for instant instant matches
  for (const hub of CURATED_UK_HUBS) {
    if (hub.keywords.some((k) => queryLower.includes(k) || k.includes(queryLower))) {
      suggestions.push(hub.name);
      seen.add(hub.name.toLowerCase());
      if (suggestions.length >= 2) break;
    }
  }

  // 2. If Google Maps API Key is available, use Google Places Autocomplete restricted to UK
  const googleKey = getEnv('GOOGLE_MAPS_API_KEY') || getEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');
  if (googleKey && !googleKey.startsWith('your_') && googleKey.length > 15) {
    try {
      const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        q
      )}&components=country:gb&language=en&key=${googleKey}`;

      const res = await fetch(googleUrl);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.predictions)) {
          for (const p of data.predictions) {
            const desc = p.description;
            if (desc && !seen.has(desc.toLowerCase())) {
              suggestions.push(desc);
              seen.add(desc.toLowerCase());
              if (suggestions.length >= 7) break;
            }
          }
          return NextResponse.json({ success: true, suggestions, source: 'google' });
        }
      }
    } catch (googleErr) {
      console.warn('[AUTOCOMPLETE] Google API request failed, falling back to UK geocoder:', googleErr);
    }
  }

  // 3. Photon OpenStreetMap Geocoding Engine (Restricted strictly to UK: countrycode=gb)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&countrycode=gb&limit=7`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(photonUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FlameCars-AddressAutocomplete/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.features)) {
        for (const f of data.features) {
          const props = f.properties || {};
          const parts: string[] = [];

          if (props.name) parts.push(props.name);
          if (props.housenumber && props.street) {
            parts.push(`${props.housenumber} ${props.street}`);
          } else if (props.street && (!props.name || !props.name.toLowerCase().includes(props.street.toLowerCase()))) {
            parts.push(props.street);
          }

          if (props.district && props.district !== props.city) parts.push(props.district);
          if (props.city && (!props.name || !props.name.toLowerCase().includes(props.city.toLowerCase()))) {
            parts.push(props.city);
          }
          if (props.postcode) parts.push(props.postcode);

          parts.push('United Kingdom');

          const formatted = parts.filter(Boolean).join(', ');
          const formattedLower = formatted.toLowerCase();

          if (!seen.has(formattedLower)) {
            suggestions.push(formatted);
            seen.add(formattedLower);
          }

          if (suggestions.length >= 7) break;
        }
      }
    }
  } catch (err) {
    console.warn('[AUTOCOMPLETE] Photon UK fetch error:', err);
  }

  return NextResponse.json({
    success: true,
    suggestions: suggestions.slice(0, 7),
    source: googleKey ? 'google-fallback' : 'photon-uk',
  });
}
