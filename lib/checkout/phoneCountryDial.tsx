import type { ReactNode } from 'react';
import type { Locale } from '@/lib/i18n';

export type CountryCodeEntry = { id: string; code: string; label: string };

/** First token of label is the flag emoji (e.g. "🇹🇭 Thailand (+66)" → "🇹🇭"). */
export function countryDialFlag(label: string): string {
  const space = label.indexOf(' ');
  return space > 0 ? label.slice(0, space) : label;
}

/** Compact trigger label: flag emoji + calling code (e.g. "🇹🇭 +66"). */
export function countryDialTriggerText(
  entry: CountryCodeEntry | undefined,
  dialCode: string
): string {
  const code = dialCode.replace(/\D/g, '') || dialCode;
  if (!entry) return `+${code}`;
  return `${countryDialFlag(entry.label)} +${entry.code}`;
}

export function countryDialGroupLabels(lang: Locale): { popular: string; all: string } {
  return {
    popular:
      lang === 'th' ? 'ประเทศยอดนิยม' : lang === 'ru' ? 'Популярные' : 'Popular',
    all:
      lang === 'th'
        ? 'ประเทศอื่น ๆ (เรียงตามตัวอักษร)'
        : lang === 'ru'
          ? 'Все страны (A-Z)'
          : 'All countries (A-Z)',
  };
}

export function findCountryByDialCode(
  code: string,
  popular: CountryCodeEntry[],
  all: CountryCodeEntry[]
): CountryCodeEntry | undefined {
  return popular.find((c) => c.code === code) ?? all.find((c) => c.code === code);
}

/**
 * Country dial codes. `id` is the ISO alpha-2 (unique React key); `code` is the
 * E.164 dial code actually submitted with the phone (multiple countries can share
 * a code, e.g. US/CA both use "1", which is fine for the server).
 */
export const POPULAR_COUNTRY_CODES: CountryCodeEntry[] = [
  { id: 'TH', code: '66', label: '🇹🇭 Thailand (+66)' },
  { id: 'MM', code: '95', label: '🇲🇲 Myanmar (+95)' },
  { id: 'LA', code: '856', label: '🇱🇦 Laos (+856)' },
  { id: 'KH', code: '855', label: '🇰🇭 Cambodia (+855)' },
  { id: 'VN', code: '84', label: '🇻🇳 Vietnam (+84)' },
  { id: 'MY', code: '60', label: '🇲🇾 Malaysia (+60)' },
  { id: 'SG', code: '65', label: '🇸🇬 Singapore (+65)' },
  { id: 'ID', code: '62', label: '🇮🇩 Indonesia (+62)' },
  { id: 'PH', code: '63', label: '🇵🇭 Philippines (+63)' },
  { id: 'US', code: '1', label: '🇺🇸 United States (+1)' },
  { id: 'GB', code: '44', label: '🇬🇧 United Kingdom (+44)' },
  { id: 'JP', code: '81', label: '🇯🇵 Japan (+81)' },
];

/** Alphabetical by country name. IDs of countries already in "Popular" are omitted. */
export const ALL_COUNTRY_CODES: CountryCodeEntry[] = [
  { id: 'AF', code: '93', label: '🇦🇫 Afghanistan (+93)' },
  { id: 'AL', code: '355', label: '🇦🇱 Albania (+355)' },
  { id: 'DZ', code: '213', label: '🇩🇿 Algeria (+213)' },
  { id: 'AD', code: '376', label: '🇦🇩 Andorra (+376)' },
  { id: 'AO', code: '244', label: '🇦🇴 Angola (+244)' },
  { id: 'AG', code: '1', label: '🇦🇬 Antigua and Barbuda (+1)' },
  { id: 'AR', code: '54', label: '🇦🇷 Argentina (+54)' },
  { id: 'AM', code: '374', label: '🇦🇲 Armenia (+374)' },
  { id: 'AU', code: '61', label: '🇦🇺 Australia (+61)' },
  { id: 'AT', code: '43', label: '🇦🇹 Austria (+43)' },
  { id: 'AZ', code: '994', label: '🇦🇿 Azerbaijan (+994)' },
  { id: 'BS', code: '1', label: '🇧🇸 Bahamas (+1)' },
  { id: 'BH', code: '973', label: '🇧🇭 Bahrain (+973)' },
  { id: 'BD', code: '880', label: '🇧🇩 Bangladesh (+880)' },
  { id: 'BB', code: '1', label: '🇧🇧 Barbados (+1)' },
  { id: 'BY', code: '375', label: '🇧🇾 Belarus (+375)' },
  { id: 'BE', code: '32', label: '🇧🇪 Belgium (+32)' },
  { id: 'BZ', code: '501', label: '🇧🇿 Belize (+501)' },
  { id: 'BJ', code: '229', label: '🇧🇯 Benin (+229)' },
  { id: 'BT', code: '975', label: '🇧🇹 Bhutan (+975)' },
  { id: 'BO', code: '591', label: '🇧🇴 Bolivia (+591)' },
  { id: 'BA', code: '387', label: '🇧🇦 Bosnia and Herzegovina (+387)' },
  { id: 'BW', code: '267', label: '🇧🇼 Botswana (+267)' },
  { id: 'BR', code: '55', label: '🇧🇷 Brazil (+55)' },
  { id: 'BN', code: '673', label: '🇧🇳 Brunei (+673)' },
  { id: 'BG', code: '359', label: '🇧🇬 Bulgaria (+359)' },
  { id: 'BF', code: '226', label: '🇧🇫 Burkina Faso (+226)' },
  { id: 'BI', code: '257', label: '🇧🇮 Burundi (+257)' },
  { id: 'CV', code: '238', label: '🇨🇻 Cabo Verde (+238)' },
  { id: 'CM', code: '237', label: '🇨🇲 Cameroon (+237)' },
  { id: 'CA', code: '1', label: '🇨🇦 Canada (+1)' },
  { id: 'CF', code: '236', label: '🇨🇫 Central African Republic (+236)' },
  { id: 'TD', code: '235', label: '🇹🇩 Chad (+235)' },
  { id: 'CL', code: '56', label: '🇨🇱 Chile (+56)' },
  { id: 'CN', code: '86', label: '🇨🇳 China (+86)' },
  { id: 'CO', code: '57', label: '🇨🇴 Colombia (+57)' },
  { id: 'KM', code: '269', label: '🇰🇲 Comoros (+269)' },
  { id: 'CG', code: '242', label: '🇨🇬 Congo (+242)' },
  { id: 'CD', code: '243', label: '🇨🇩 Congo (DRC) (+243)' },
  { id: 'CR', code: '506', label: '🇨🇷 Costa Rica (+506)' },
  { id: 'CI', code: '225', label: '🇨🇮 Côte d’Ivoire (+225)' },
  { id: 'HR', code: '385', label: '🇭🇷 Croatia (+385)' },
  { id: 'CU', code: '53', label: '🇨🇺 Cuba (+53)' },
  { id: 'CY', code: '357', label: '🇨🇾 Cyprus (+357)' },
  { id: 'CZ', code: '420', label: '🇨🇿 Czechia (+420)' },
  { id: 'DK', code: '45', label: '🇩🇰 Denmark (+45)' },
  { id: 'DJ', code: '253', label: '🇩🇯 Djibouti (+253)' },
  { id: 'DM', code: '1', label: '🇩🇲 Dominica (+1)' },
  { id: 'DO', code: '1', label: '🇩🇴 Dominican Republic (+1)' },
  { id: 'EC', code: '593', label: '🇪🇨 Ecuador (+593)' },
  { id: 'EG', code: '20', label: '🇪🇬 Egypt (+20)' },
  { id: 'SV', code: '503', label: '🇸🇻 El Salvador (+503)' },
  { id: 'GQ', code: '240', label: '🇬🇶 Equatorial Guinea (+240)' },
  { id: 'ER', code: '291', label: '🇪🇷 Eritrea (+291)' },
  { id: 'EE', code: '372', label: '🇪🇪 Estonia (+372)' },
  { id: 'SZ', code: '268', label: '🇸🇿 Eswatini (+268)' },
  { id: 'ET', code: '251', label: '🇪🇹 Ethiopia (+251)' },
  { id: 'FJ', code: '679', label: '🇫🇯 Fiji (+679)' },
  { id: 'FI', code: '358', label: '🇫🇮 Finland (+358)' },
  { id: 'FR', code: '33', label: '🇫🇷 France (+33)' },
  { id: 'GA', code: '241', label: '🇬🇦 Gabon (+241)' },
  { id: 'GM', code: '220', label: '🇬🇲 Gambia (+220)' },
  { id: 'GE', code: '995', label: '🇬🇪 Georgia (+995)' },
  { id: 'DE', code: '49', label: '🇩🇪 Germany (+49)' },
  { id: 'GH', code: '233', label: '🇬🇭 Ghana (+233)' },
  { id: 'GR', code: '30', label: '🇬🇷 Greece (+30)' },
  { id: 'GD', code: '1', label: '🇬🇩 Grenada (+1)' },
  { id: 'GT', code: '502', label: '🇬🇹 Guatemala (+502)' },
  { id: 'GN', code: '224', label: '🇬🇳 Guinea (+224)' },
  { id: 'GW', code: '245', label: '🇬🇼 Guinea-Bissau (+245)' },
  { id: 'GY', code: '592', label: '🇬🇾 Guyana (+592)' },
  { id: 'HT', code: '509', label: '🇭🇹 Haiti (+509)' },
  { id: 'HN', code: '504', label: '🇭🇳 Honduras (+504)' },
  { id: 'HK', code: '852', label: '🇭🇰 Hong Kong (+852)' },
  { id: 'HU', code: '36', label: '🇭🇺 Hungary (+36)' },
  { id: 'IS', code: '354', label: '🇮🇸 Iceland (+354)' },
  { id: 'IN', code: '91', label: '🇮🇳 India (+91)' },
  { id: 'IR', code: '98', label: '🇮🇷 Iran (+98)' },
  { id: 'IQ', code: '964', label: '🇮🇶 Iraq (+964)' },
  { id: 'IE', code: '353', label: '🇮🇪 Ireland (+353)' },
  { id: 'IL', code: '972', label: '🇮🇱 Israel (+972)' },
  { id: 'IT', code: '39', label: '🇮🇹 Italy (+39)' },
  { id: 'JM', code: '1', label: '🇯🇲 Jamaica (+1)' },
  { id: 'JO', code: '962', label: '🇯🇴 Jordan (+962)' },
  { id: 'KZ', code: '7', label: '🇰🇿 Kazakhstan (+7)' },
  { id: 'KE', code: '254', label: '🇰🇪 Kenya (+254)' },
  { id: 'KI', code: '686', label: '🇰🇮 Kiribati (+686)' },
  { id: 'KR', code: '82', label: '🇰🇷 Korea, South (+82)' },
  { id: 'KP', code: '850', label: '🇰🇵 Korea, North (+850)' },
  { id: 'KW', code: '965', label: '🇰🇼 Kuwait (+965)' },
  { id: 'KG', code: '996', label: '🇰🇬 Kyrgyzstan (+996)' },
  { id: 'LV', code: '371', label: '🇱🇻 Latvia (+371)' },
  { id: 'LB', code: '961', label: '🇱🇧 Lebanon (+961)' },
  { id: 'LS', code: '266', label: '🇱🇸 Lesotho (+266)' },
  { id: 'LR', code: '231', label: '🇱🇷 Liberia (+231)' },
  { id: 'LY', code: '218', label: '🇱🇾 Libya (+218)' },
  { id: 'LI', code: '423', label: '🇱🇮 Liechtenstein (+423)' },
  { id: 'LT', code: '370', label: '🇱🇹 Lithuania (+370)' },
  { id: 'LU', code: '352', label: '🇱🇺 Luxembourg (+352)' },
  { id: 'MO', code: '853', label: '🇲🇴 Macau (+853)' },
  { id: 'MG', code: '261', label: '🇲🇬 Madagascar (+261)' },
  { id: 'MW', code: '265', label: '🇲🇼 Malawi (+265)' },
  { id: 'MV', code: '960', label: '🇲🇻 Maldives (+960)' },
  { id: 'ML', code: '223', label: '🇲🇱 Mali (+223)' },
  { id: 'MT', code: '356', label: '🇲🇹 Malta (+356)' },
  { id: 'MH', code: '692', label: '🇲🇭 Marshall Islands (+692)' },
  { id: 'MR', code: '222', label: '🇲🇷 Mauritania (+222)' },
  { id: 'MU', code: '230', label: '🇲🇺 Mauritius (+230)' },
  { id: 'MX', code: '52', label: '🇲🇽 Mexico (+52)' },
  { id: 'FM', code: '691', label: '🇫🇲 Micronesia (+691)' },
  { id: 'MD', code: '373', label: '🇲🇩 Moldova (+373)' },
  { id: 'MC', code: '377', label: '🇲🇨 Monaco (+377)' },
  { id: 'MN', code: '976', label: '🇲🇳 Mongolia (+976)' },
  { id: 'ME', code: '382', label: '🇲🇪 Montenegro (+382)' },
  { id: 'MA', code: '212', label: '🇲🇦 Morocco (+212)' },
  { id: 'MZ', code: '258', label: '🇲🇿 Mozambique (+258)' },
  { id: 'NA', code: '264', label: '🇳🇦 Namibia (+264)' },
  { id: 'NR', code: '674', label: '🇳🇷 Nauru (+674)' },
  { id: 'NP', code: '977', label: '🇳🇵 Nepal (+977)' },
  { id: 'NL', code: '31', label: '🇳🇱 Netherlands (+31)' },
  { id: 'NZ', code: '64', label: '🇳🇿 New Zealand (+64)' },
  { id: 'NI', code: '505', label: '🇳🇮 Nicaragua (+505)' },
  { id: 'NE', code: '227', label: '🇳🇪 Niger (+227)' },
  { id: 'NG', code: '234', label: '🇳🇬 Nigeria (+234)' },
  { id: 'MK', code: '389', label: '🇲🇰 North Macedonia (+389)' },
  { id: 'NO', code: '47', label: '🇳🇴 Norway (+47)' },
  { id: 'OM', code: '968', label: '🇴🇲 Oman (+968)' },
  { id: 'PK', code: '92', label: '🇵🇰 Pakistan (+92)' },
  { id: 'PW', code: '680', label: '🇵🇼 Palau (+680)' },
  { id: 'PS', code: '970', label: '🇵🇸 Palestine (+970)' },
  { id: 'PA', code: '507', label: '🇵🇦 Panama (+507)' },
  { id: 'PG', code: '675', label: '🇵🇬 Papua New Guinea (+675)' },
  { id: 'PY', code: '595', label: '🇵🇾 Paraguay (+595)' },
  { id: 'PE', code: '51', label: '🇵🇪 Peru (+51)' },
  { id: 'PL', code: '48', label: '🇵🇱 Poland (+48)' },
  { id: 'PT', code: '351', label: '🇵🇹 Portugal (+351)' },
  { id: 'PR', code: '1', label: '🇵🇷 Puerto Rico (+1)' },
  { id: 'QA', code: '974', label: '🇶🇦 Qatar (+974)' },
  { id: 'RO', code: '40', label: '🇷🇴 Romania (+40)' },
  { id: 'RU', code: '7', label: '🇷🇺 Russia (+7)' },
  { id: 'RW', code: '250', label: '🇷🇼 Rwanda (+250)' },
  { id: 'KN', code: '1', label: '🇰🇳 Saint Kitts and Nevis (+1)' },
  { id: 'LC', code: '1', label: '🇱🇨 Saint Lucia (+1)' },
  { id: 'VC', code: '1', label: '🇻🇨 Saint Vincent and the Grenadines (+1)' },
  { id: 'WS', code: '685', label: '🇼🇸 Samoa (+685)' },
  { id: 'SM', code: '378', label: '🇸🇲 San Marino (+378)' },
  { id: 'ST', code: '239', label: '🇸🇹 São Tomé and Príncipe (+239)' },
  { id: 'SA', code: '966', label: '🇸🇦 Saudi Arabia (+966)' },
  { id: 'SN', code: '221', label: '🇸🇳 Senegal (+221)' },
  { id: 'RS', code: '381', label: '🇷🇸 Serbia (+381)' },
  { id: 'SC', code: '248', label: '🇸🇨 Seychelles (+248)' },
  { id: 'SL', code: '232', label: '🇸🇱 Sierra Leone (+232)' },
  { id: 'SK', code: '421', label: '🇸🇰 Slovakia (+421)' },
  { id: 'SI', code: '386', label: '🇸🇮 Slovenia (+386)' },
  { id: 'SB', code: '677', label: '🇸🇧 Solomon Islands (+677)' },
  { id: 'SO', code: '252', label: '🇸🇴 Somalia (+252)' },
  { id: 'ZA', code: '27', label: '🇿🇦 South Africa (+27)' },
  { id: 'SS', code: '211', label: '🇸🇸 South Sudan (+211)' },
  { id: 'ES', code: '34', label: '🇪🇸 Spain (+34)' },
  { id: 'LK', code: '94', label: '🇱🇰 Sri Lanka (+94)' },
  { id: 'SD', code: '249', label: '🇸🇩 Sudan (+249)' },
  { id: 'SR', code: '597', label: '🇸🇷 Suriname (+597)' },
  { id: 'SE', code: '46', label: '🇸🇪 Sweden (+46)' },
  { id: 'CH', code: '41', label: '🇨🇭 Switzerland (+41)' },
  { id: 'SY', code: '963', label: '🇸🇾 Syria (+963)' },
  { id: 'TW', code: '886', label: '🇹🇼 Taiwan (+886)' },
  { id: 'TJ', code: '992', label: '🇹🇯 Tajikistan (+992)' },
  { id: 'TZ', code: '255', label: '🇹🇿 Tanzania (+255)' },
  { id: 'TL', code: '670', label: '🇹🇱 Timor-Leste (+670)' },
  { id: 'TG', code: '228', label: '🇹🇬 Togo (+228)' },
  { id: 'TO', code: '676', label: '🇹🇴 Tonga (+676)' },
  { id: 'TT', code: '1', label: '🇹🇹 Trinidad and Tobago (+1)' },
  { id: 'TN', code: '216', label: '🇹🇳 Tunisia (+216)' },
  { id: 'TR', code: '90', label: '🇹🇷 Turkey (+90)' },
  { id: 'TM', code: '993', label: '🇹🇲 Turkmenistan (+993)' },
  { id: 'TV', code: '688', label: '🇹🇻 Tuvalu (+688)' },
  { id: 'UG', code: '256', label: '🇺🇬 Uganda (+256)' },
  { id: 'UA', code: '380', label: '🇺🇦 Ukraine (+380)' },
  { id: 'AE', code: '971', label: '🇦🇪 United Arab Emirates (+971)' },
  { id: 'UY', code: '598', label: '🇺🇾 Uruguay (+598)' },
  { id: 'UZ', code: '998', label: '🇺🇿 Uzbekistan (+998)' },
  { id: 'VU', code: '678', label: '🇻🇺 Vanuatu (+678)' },
  { id: 'VA', code: '39', label: '🇻🇦 Vatican City (+39)' },
  { id: 'VE', code: '58', label: '🇻🇪 Venezuela (+58)' },
  { id: 'YE', code: '967', label: '🇾🇪 Yemen (+967)' },
  { id: 'ZM', code: '260', label: '🇿🇲 Zambia (+260)' },
  { id: 'ZW', code: '263', label: '🇿🇼 Zimbabwe (+263)' },
];

/** @deprecated Use PhoneCountrySelect with popular/all props instead. */
export function renderFlagCountryCodeOptions(
  popular: CountryCodeEntry[],
  all: CountryCodeEntry[],
  lang: Locale
): ReactNode {
  const { popular: popularLabel, all: allLabel } = countryDialGroupLabels(lang);
  return (
    <>
      <optgroup label={popularLabel}>
        {popular.map((c) => (
          <option key={c.id} value={c.code} title={c.label} aria-label={c.label}>
            {countryDialFlag(c.label)}
          </option>
        ))}
      </optgroup>
      <optgroup label={allLabel}>
        {all.map((c) => (
          <option key={c.id} value={c.code} title={c.label} aria-label={c.label}>
            {countryDialFlag(c.label)}
          </option>
        ))}
      </optgroup>
    </>
  );
}
