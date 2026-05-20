/** Minimal Maps JavaScript API types for checkout Places (New) autocomplete. */
declare namespace google.maps.places {
  interface PlaceAutocompleteElementOptions {
    includedRegionCodes?: string[];
    locationBias?: google.maps.LatLngBoundsLiteral;
    locationRestriction?: google.maps.LatLngBoundsLiteral;
    placeholder?: string;
    requestedLanguage?: string;
  }

  class PlaceAutocompleteElement extends HTMLElement {
    constructor(opts?: PlaceAutocompleteElementOptions);
    placeholder: string;
    addEventListener(
      type: 'gmp-select',
      listener: (ev: PlacePredictionSelectEvent) => void
    ): void;
    addEventListener(type: 'gmp-error', listener: (ev: Event) => void): void;
  }

  interface PlacePredictionSelectEvent extends Event {
    placePrediction: PlacePrediction;
  }

  interface PlacePrediction {
    toPlace(): Place;
  }

  interface Place {
    id?: string;
    displayName?: string | { text?: string };
    formattedAddress?: string;
    location?: google.maps.LatLng | google.maps.LatLngLiteral;
    addressComponents?: Array<{
      longText?: string;
      shortText?: string;
      types?: string[];
    }>;
    fetchFields(request: { fields: string[] }): Promise<void>;
  }
}

declare namespace google.maps {
  class LatLng {
    lat(): number;
    lng(): number;
  }

  interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  interface LatLngBoundsLiteral {
    east: number;
    north: number;
    south: number;
    west: number;
  }

  interface ImportLibraryOptions {
    key?: string;
  }

  function importLibrary(
    library: 'places',
    options?: ImportLibraryOptions
  ): Promise<{
    PlaceAutocompleteElement: typeof google.maps.places.PlaceAutocompleteElement;
  }>;
}
