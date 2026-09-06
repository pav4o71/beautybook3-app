import { parsePhoneNumberFromString } from "libphonenumber-js/min";

export interface PhoneValidationResult {
  valid: boolean;
  e164?: string;
  error?: string;
}

/**
 * Validates and normalizes phone numbers.
 * Default country is 'PH'. Accepts local formats (09171234567, 9171234567, 0917 123 4567)
 * and international formats (+14155552671, +63 917 123 4567).
 *
 * Stored canonical E.164 format: '+' + max 15 digits (e.g. +639171234567).
 */
export function normalizePhone(input: string): PhoneValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: "Phone number is required." };
  }

  // Reject pathological raw inputs exceeding 40 characters
  if (trimmed.length > 40) {
    return { valid: false, error: "Phone number is too long." };
  }

  // Handle common Philippine shorthand: '9171234567' -> '09171234567'
  let parseable = trimmed;
  if (/^9\d{9}$/.test(trimmed)) {
    parseable = `0${trimmed}`;
  }

  try {
    const parsed = parsePhoneNumberFromString(parseable, "PH");
    if (!parsed || !parsed.isValid()) {
      return {
        valid: false,
        error: "Enter a valid Philippine mobile number (e.g. 0917 123 4567) or international number.",
      };
    }

    return {
      valid: true,
      e164: parsed.number,
    };
  } catch {
    return { valid: false, error: "Invalid phone number format." };
  }
}

/**
 * Formats an E.164 phone number for human-friendly display.
 * Philippine numbers format as national: "0917 123 4567".
 * International numbers format as international: "+1 415 555 2671".
 */
export function formatPhoneDisplay(e164: string): string {
  try {
    const parsed = parsePhoneNumberFromString(e164);
    if (!parsed) return e164;
    if (parsed.country === "PH") {
      return parsed.formatNational();
    }
    return parsed.formatInternational();
  } catch {
    return e164;
  }
}
