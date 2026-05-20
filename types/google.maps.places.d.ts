/** Minimal Maps JavaScript API types for checkout Places autocomplete. */
declare namespace google.maps.places {
  class AutocompleteSessionToken {}

  interface AutocompleteOptions {
    bounds?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
    componentRestrictions?: { country: string | string[] };
    fields?: string[];
    strictBounds?: boolean;
    sessionToken?: AutocompleteSessionToken;
    types?: string[];
  }

  class Autocomplete {
    constructor(input: HTMLInputElement, opts?: AutocompleteOptions);
    addListener(eventName: string, handler: () => void): google.maps.MapsEventListener;
    getPlace(): PlaceResult;
  }

  interface AutocompletePrediction {
    place_id: string;
    description: string;
    structured_formatting: {
      main_text: string;
      secondary_text?: string;
    };
  }

  interface AutocompletionRequest {
    input: string;
    sessionToken?: AutocompleteSessionToken;
    componentRestrictions?: { country: string | string[] };
    locationBias?: google.maps.LatLngBoundsLiteral;
  }

  class AutocompleteService {
    getPlacePredictions(
      request: AutocompletionRequest,
      callback: (
        predictions: AutocompletePrediction[] | null,
        status: PlacesServiceStatus
      ) => void
    ): void;
  }

  interface PlaceResult {
    place_id?: string;
    name?: string;
    formatted_address?: string;
    geometry?: {
      location?: google.maps.LatLng;
    };
    address_components?: google.maps.GeocoderAddressComponent[];
  }

  class PlacesService {
    constructor(attrContainer: HTMLDivElement | google.maps.Map);
    getDetails(
      request: PlaceDetailsRequest,
      callback: (
        result: PlaceResult | null,
        status: PlacesServiceStatus
      ) => void
    ): void;
  }

  interface PlaceDetailsRequest {
    placeId: string;
    fields?: string[];
    sessionToken?: AutocompleteSessionToken;
  }

  enum PlacesServiceStatus {
    OK = 'OK',
  }
}

declare namespace google.maps {
  class LatLng {
    lat(): number;
    lng(): number;
  }

  interface LatLngBoundsLiteral {
    east: number;
    north: number;
    south: number;
    west: number;
  }

  interface GeocoderAddressComponent {
    long_name: string;
    short_name: string;
    types: string[];
  }

  interface MapsEventListener {
    remove(): void;
  }
}
