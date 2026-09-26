import { toE164, isValidIndianPhone, formatPhoneDisplay, extractDigits, normalizePhoneInput, isValidPIN, maskPhone } from "@/lib/phone";

describe("Phone Utilities", () => {
  describe("toE164", () => {
    it("should convert Indian phone number with +91 prefix", () => {
      expect(toE164("+919876543210")).toBe("+919876543210");
      expect(toE164("919876543210")).toBe("+919876543210");
    });

    it("should convert 10-digit Indian number", () => {
      expect(toE164("9876543210")).toBe("+919876543210");
    });

    it("should handle numbers with spaces and dashes", () => {
      expect(toE164("98765 43210")).toBe("+919876543210");
      expect(toE164("98765-43210")).toBe("+919876543210");
      expect(toE164("+91 98765 43210")).toBe("+919876543210");
    });

    it("should handle numbers with parentheses", () => {
      expect(toE164("(987) 654-3210")).toBe("+919876543210");
    });

    it("should return as-is for unclear formats", () => {
      expect(toE164("")).toBe("");
      expect(toE164("123")).toBe("123");
      expect(toE164("abcdefghij")).toBe("abcdefghij");
    });
  });

  describe("isValidIndianPhone", () => {
    it("should return true for valid Indian numbers", () => {
      expect(isValidIndianPhone("9876543210")).toBe(true);
      expect(isValidIndianPhone("+919876543210")).toBe(true);
      expect(isValidIndianPhone("919876543210")).toBe(true);
      expect(isValidIndianPhone("98765 43210")).toBe(true);
      expect(isValidIndianPhone("8888888888")).toBe(true);
      expect(isValidIndianPhone("7777777777")).toBe(true);
      expect(isValidIndianPhone("6666666666")).toBe(true);
    });

    it("should return false for invalid numbers", () => {
      expect(isValidIndianPhone("1234567890")).toBe(false); // Doesn't start with 6-9
      expect(isValidIndianPhone("987654321")).toBe(false); // Too short
      expect(isValidIndianPhone("98765432101")).toBe(false); // Too long
      expect(isValidIndianPhone("abcdefghij")).toBe(false);
      expect(isValidIndianPhone("")).toBe(false);
      expect(isValidIndianPhone("5555555555")).toBe(false); // Starts with 5
    });
  });

  describe("formatPhoneDisplay", () => {
    it("should format E.164 to display format", () => {
      expect(formatPhoneDisplay("+919876543210")).toBe("+91 98765 43210");
      expect(formatPhoneDisplay("9876543210")).toBe("+91 98765 43210");
    });

    it("should return original for non-Indian numbers", () => {
      expect(formatPhoneDisplay("+15551234567")).toBe("+15551234567");
    });
  });

  describe("extractDigits", () => {
    it("should extract 10-digit number from E.164", () => {
      expect(extractDigits("+919876543210")).toBe("9876543210");
      expect(extractDigits("919876543210")).toBe("9876543210");
    });

    it("should return digits as-is if no country code", () => {
      expect(extractDigits("9876543210")).toBe("9876543210");
    });
  });

  describe("normalizePhoneInput", () => {
    it("should remove spaces, dashes, and parentheses", () => {
      expect(normalizePhoneInput("98765 43210")).toBe("9876543210");
      expect(normalizePhoneInput("98765-43210")).toBe("9876543210");
      expect(normalizePhoneInput("(987) 654-3210")).toBe("9876543210");
    });
  });

  describe("isValidPIN", () => {
    it("should return true for valid 4-digit PINs", () => {
      expect(isValidPIN("1234")).toBe(true);
      expect(isValidPIN("0000")).toBe(true);
      expect(isValidPIN("9999")).toBe(true);
    });

    it("should return false for invalid PINs", () => {
      expect(isValidPIN("123")).toBe(false);
      expect(isValidPIN("12345")).toBe(false);
      expect(isValidPIN("abcd")).toBe(false);
      expect(isValidPIN("12a4")).toBe(false);
      expect(isValidPIN("")).toBe(false);
    });
  });

  describe("maskPhone", () => {
    it("should mask phone showing last 4 digits", () => {
      expect(maskPhone("+919876543210")).toBe("+91 XXXXX 3210");
      expect(maskPhone("9876543210")).toBe("+91 XXXXX 3210");
    });

    it("should handle non-Indian numbers", () => {
      expect(maskPhone("+15551234567")).toBe("******4567");
    });
  });
});
