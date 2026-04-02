const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
];

const removeToken = (input, token) => {
  if (!token) return input;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return input.replace(new RegExp(`\\b${escaped}\\b`, 'ig'), '');
};

export const normalizeAddressFields = (payload = {}) => {
  const fullAddress = (payload.address || '').trim();
  if (!fullAddress) return payload;

  const pincode = (payload.pincode || fullAddress.match(/\b\d{6}\b/)?.[0] || '').trim();

  const state =
    (payload.state || '').trim() ||
    INDIAN_STATES.find((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(fullAddress)) ||
    '';

  let city = (payload.city || '').trim();
  if (!city) {
    const parts = fullAddress.split(',').map((p) => p.trim()).filter(Boolean);
    if (state) {
      const stateIdx = parts.findIndex((p) => p.toLowerCase().includes(state.toLowerCase()));
      if (stateIdx > 0) city = parts[stateIdx - 1];
    }
    if (!city && parts.length >= 2) city = parts[parts.length - 2].replace(/\b\d{6}\b/g, '').trim();
  }

  // Keep only the detailed street/locality part in address.
  let remaining = fullAddress;
  remaining = removeToken(remaining, city);
  remaining = removeToken(remaining, state);
  remaining = removeToken(remaining, pincode);
  remaining = remaining
    .replace(/\s*,\s*,/g, ',')
    .replace(/^,\s*|\s*,$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    ...payload,
    address: remaining || fullAddress,
    city,
    state,
    pincode,
  };
};
