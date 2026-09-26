/**
 * Phone number utilities
 *
 * PashuSeva uses E.164 format for canonical storage: +[country code][number]
 * India country code: +91
 */

/**
 * Validate Indian phone number (10 digits starting with 6-9)
 */
export function isValidIndianPhone(phone: string): boolean {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, "");

  // Strip leading 91 if 12 digits
  if (digits.startsWith("91") && digits.length === 12) {
    digits = digits.slice(2);
  }

  // Check for 10 digits starting with 6, 7, 8, or 9
  return /^[6-9]\d{9}$/.test(digits);
}

/**
 * Format phone number to E.164 format (+91XXXXXXXXXX)
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // If already has country code, return with +
  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }

  // Add India country code
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // Return as-is if format is unclear
  return phone;
}

/**
 * Format E.164 phone to display format (+91 XXXXX XXXXX)
 */
export function formatPhoneDisplay(phone: string): string {
  // Handle E.164 format
  if (phone.startsWith("+91")) {
    const number = phone.slice(3); // Remove +91
    if (number.length === 10) {
      return `+91 ${number.slice(0, 5)} ${number.slice(5)}`;
    }
  }

  // Handle 10-digit format
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  return phone;
}

/**
 * Extract 10-digit number from E.164 format (for display/comparison)
 */
export function extractDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  // If has +91 prefix, remove it
  if (digits.startsWith("91") && digits.length === 12) {
    return digits.slice(2);
  }

  return digits;
}

/**
 * Normalize phone input (remove spaces, dashes, parentheses)
 */
export function normalizePhoneInput(input: string): string {
  return input.replace(/[\s\-\(\)]/g, "");
}

/**
 * Validate PIN format (exactly 4 digits, preserved as string to keep leading zeros)
 */
export function isValidPIN(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/**
 * Mask phone number for display (show last 4 digits only)
 */
export function maskPhone(phone: string): string {
  const digits = extractDigits(phone);
  if (digits.length === 10) {
    return `+91 XXXXX ${digits.slice(6)}`;
  }
  return "******" + phone.slice(-4);
}
