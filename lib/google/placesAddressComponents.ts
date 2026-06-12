/** Minimal Google Places address_component shape (Maps JavaScript API). */
export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export type ParsedPlacesAddress = {
  postalCode: string | null;
  province: string | null;
  district: string | null;
  subdistrict: string | null;
};

function pickComponent(
  components: GoogleAddressComponent[],
  type: string,
  useShort = false
): string | null {
  const c = components.find((x) => x.types.includes(type));
  if (!c) return null;
  const v = (useShort ? c.short_name : c.long_name)?.trim();
  return v || null;
}

/** Best-effort Thai admin levels from Google `address_components`. */
export function parsePlacesAddressComponents(
  components: GoogleAddressComponent[] | undefined | null
): ParsedPlacesAddress {
  if (!components?.length) {
    return { postalCode: null, province: null, district: null, subdistrict: null };
  }
  return {
    postalCode: pickComponent(components, 'postal_code'),
    province:
      pickComponent(components, 'administrative_area_level_1') ??
      pickComponent(components, 'administrative_area_level_2'),
    district:
      pickComponent(components, 'administrative_area_level_2') ??
      pickComponent(components, 'locality'),
    subdistrict:
      pickComponent(components, 'sublocality_level_1') ??
      pickComponent(components, 'sublocality') ??
      pickComponent(components, 'neighborhood'),
  };
}
