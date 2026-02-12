import type { RegionId } from '@/types';

/** Lat/lng center for each STRATIS region (used for marker placement) */
export const REGION_CENTERS: Record<RegionId, [number, number]> = {
  'north-america': [-95, 40],
  'europe':        [15, 50],
  'uk':            [-2, 54],
  'middle-east':   [45, 25],
  'apac':          [105, 20],
  'latam':         [-60, -15],
};

/**
 * ISO 3166-1 numeric country code → RegionId.
 * ~40 key markets so the choropleth has meaningful coverage.
 */
export const COUNTRY_TO_REGION: Record<string, RegionId> = {
  // North America
  '840': 'north-america', // USA
  '124': 'north-america', // Canada
  '484': 'north-america', // Mexico

  // Europe
  '276': 'europe', // Germany
  '250': 'europe', // France
  '380': 'europe', // Italy
  '724': 'europe', // Spain
  '528': 'europe', // Netherlands
  '056': 'europe', // Belgium
  '756': 'europe', // Switzerland
  '040': 'europe', // Austria
  '616': 'europe', // Poland
  '752': 'europe', // Sweden
  '578': 'europe', // Norway
  '208': 'europe', // Denmark
  '246': 'europe', // Finland
  '620': 'europe', // Portugal
  '300': 'europe', // Greece
  '642': 'europe', // Romania
  '203': 'europe', // Czech Republic

  // UK
  '826': 'uk', // United Kingdom
  '372': 'uk', // Ireland

  // Middle East
  '682': 'middle-east', // Saudi Arabia
  '784': 'middle-east', // UAE
  '634': 'middle-east', // Qatar
  '414': 'middle-east', // Kuwait
  '512': 'middle-east', // Oman
  '048': 'middle-east', // Bahrain
  '400': 'middle-east', // Jordan
  '422': 'middle-east', // Lebanon
  '376': 'middle-east', // Israel
  '818': 'middle-east', // Egypt
  '792': 'middle-east', // Turkey

  // APAC
  '156': 'apac', // China
  '392': 'apac', // Japan
  '410': 'apac', // South Korea
  '356': 'apac', // India
  '036': 'apac', // Australia
  '554': 'apac', // New Zealand
  '360': 'apac', // Indonesia
  '764': 'apac', // Thailand
  '704': 'apac', // Vietnam
  '608': 'apac', // Philippines
  '458': 'apac', // Malaysia
  '702': 'apac', // Singapore

  // LATAM
  '076': 'latam', // Brazil
  '032': 'latam', // Argentina
  '152': 'latam', // Chile
  '170': 'latam', // Colombia
  '604': 'latam', // Peru
};

/**
 * Returns a teal rgba fill for mapped countries.
 * @param intensity 0..1 — maps to 8–60% opacity
 */
export function regionFillColor(intensity: number): string {
  const clamped = Math.max(0, Math.min(1, intensity));
  const opacity = 0.08 + clamped * 0.52; // 0.08 → 0.60
  return `rgba(80,184,154,${opacity.toFixed(2)})`;
}
