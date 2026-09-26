import { calculateFee, formatINR, formatDistance, parseINRToPaise, isValidFee, testFeeCalculation } from "@/lib/fees";

describe("Fee Calculation", () => {
  describe("calculateFee", () => {
    it("should calculate fee correctly for short distance", () => {
      const baseVisitFeePaise = 10000; // ₹100
      const perKmFeePaise = 500; // ₹5/km
      const distanceMeters = 1000; // 1 km

      const result = calculateFee(baseVisitFeePaise, perKmFeePaise, distanceMeters);

      expect(result.baseVisitFeePaise).toBe(10000);
      expect(result.travelFeePaise).toBe(500);
      expect(result.totalFeePaise).toBe(10500);
    });

    it("should calculate fee correctly for longer distance", () => {
      const baseVisitFeePaise = 10000; // ₹100
      const perKmFeePaise = 500; // ₹5/km
      const distanceMeters = 10000; // 10 km

      const result = calculateFee(baseVisitFeePaise, perKmFeePaise, distanceMeters);

      expect(result.baseVisitFeePaise).toBe(10000);
      expect(result.travelFeePaise).toBe(5000);
      expect(result.totalFeePaise).toBe(15000);
    });

    it("should round distance fee correctly", () => {
      const baseVisitFeePaise = 10000;
      const perKmFeePaise = 500;
      const distanceMeters = 1500; // 1.5 km -> rounds to 2 km

      const result = calculateFee(baseVisitFeePaise, perKmFeePaise, distanceMeters);
      expect(result.travelFeePaise).toBe(750); // 1.5 km * 500
    });

    it("should handle zero distance", () => {
      const baseVisitFeePaise = 10000;
      const perKmFeePaise = 500;
      const distanceMeters = 0;

      const result = calculateFee(baseVisitFeePaise, perKmFeePaise, distanceMeters);

      expect(result.travelFeePaise).toBe(0);
      expect(result.totalFeePaise).toBe(10000);
    });

    it("should return correct fee breakdown structure", () => {
      const result = calculateFee(10000, 500, 5000);

      expect(result).toHaveProperty("baseVisitFeePaise");
      expect(result).toHaveProperty("travelFeePaise");
      expect(result).toHaveProperty("totalFeePaise");
      expect(typeof result.baseVisitFeePaise).toBe("number");
      expect(typeof result.travelFeePaise).toBe("number");
      expect(typeof result.totalFeePaise).toBe("number");
    });

    it("should handle large distances", () => {
      const baseVisitFeePaise = 50000; // ₹500
      const perKmFeePaise = 1000; // ₹10/km
      const distanceMeters = 50000; // 50 km

      const result = calculateFee(baseVisitFeePaise, perKmFeePaise, distanceMeters);

      expect(result.baseVisitFeePaise).toBe(50000);
      expect(result.travelFeePaise).toBe(50000);
      expect(result.totalFeePaise).toBe(100000);
    });
  });

  describe("formatINR", () => {
    it("should format paise to INR string", () => {
      expect(formatINR(10000)).toContain("100");
      expect(formatINR(10500)).toContain("105");
      expect(formatINR(0)).toContain("0");
    });

    it("should handle negative values", () => {
      expect(formatINR(-100)).toContain("-");
    });
  });

  describe("formatDistance", () => {
    it("should format meters for short distances", () => {
      expect(formatDistance(500)).toBe("500 m");
      expect(formatDistance(999)).toBe("999 m");
    });

    it("should format kilometers for long distances", () => {
      expect(formatDistance(1000)).toBe("1.00 km");
      expect(formatDistance(1500)).toBe("1.50 km");
      expect(formatDistance(10000)).toBe("10.00 km");
    });
  });

  describe("parseINRToPaise", () => {
    it("should parse plain numbers", () => {
      expect(parseINRToPaise("100")).toBe(10000);
      expect(parseINRToPaise("100.50")).toBe(10050);
    });

    it("should parse with currency symbol", () => {
      expect(parseINRToPaise("₹100")).toBe(10000);
      expect(parseINRToPaise("₹ 100.50")).toBe(10050);
    });

    it("should handle whitespace and commas", () => {
      expect(parseINRToPaise(" 100 ")).toBe(10000);
      expect(parseINRToPaise("1,000")).toBe(100000);
    });

    it("should return null for invalid input", () => {
      expect(parseINRToPaise("abc")).toBeNull();
      expect(parseINRToPaise("-100")).toBeNull();
      expect(parseINRToPaise("")).toBeNull();
    });
  });

  describe("isValidFee", () => {
    it("should return true for valid fees", () => {
      expect(isValidFee(0)).toBe(true);
      expect(isValidFee(100)).toBe(true);
      expect(isValidFee(10000)).toBe(true);
    });

    it("should return false for invalid fees", () => {
      expect(isValidFee(-1)).toBe(false);
      expect(isValidFee(1.5)).toBe(false);
      expect(isValidFee(NaN)).toBe(false);
    });
  });

  describe("testFeeCalculation", () => {
    it("should pass the test case from requirements", () => {
      expect(testFeeCalculation()).toBe(true);
    });
  });
});
