import { haversineDistance, isValidCoordinates, isValidLatitude, isValidLongitude } from "@/lib/geo";

describe("Geo Utilities", () => {
  describe("isValidLatitude", () => {
    it("should return true for valid latitudes", () => {
      expect(isValidLatitude(0)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
      expect(isValidLatitude(45)).toBe(true);
    });

    it("should return false for invalid latitudes", () => {
      expect(isValidLatitude(91)).toBe(false);
      expect(isValidLatitude(-91)).toBe(false);
      expect(isValidLatitude(180)).toBe(false);
      expect(isValidLatitude(NaN)).toBe(false);
      expect(isValidLatitude(Infinity)).toBe(false);
    });
  });

  describe("isValidLongitude", () => {
    it("should return true for valid longitudes", () => {
      expect(isValidLongitude(0)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
      expect(isValidLongitude(90)).toBe(true);
    });

    it("should return false for invalid longitudes", () => {
      expect(isValidLongitude(181)).toBe(false);
      expect(isValidLongitude(-181)).toBe(false);
      expect(isValidLongitude(360)).toBe(false);
      expect(isValidLongitude(NaN)).toBe(false);
      expect(isValidLongitude(Infinity)).toBe(false);
    });
  });

  describe("isValidCoordinates", () => {
    it("should return true for valid coordinates", () => {
      expect(isValidCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
      expect(isValidCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
      expect(isValidCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
    });

    it("should return false for invalid coordinates", () => {
      expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
      expect(isValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
    });
  });

  describe("haversineDistance", () => {
    it("should return 0 for identical coordinates", () => {
      const coord1 = { latitude: 28.6139, longitude: 77.2090 }; // Delhi
      const coord2 = { latitude: 28.6139, longitude: 77.2090 };

      const distance = haversineDistance(coord1, coord2);
      expect(distance).toBe(0);
    });

    it("should calculate distance between Delhi and Mumbai correctly", () => {
      const delhi = { latitude: 28.6139, longitude: 77.2090 };
      const mumbai = { latitude: 19.0760, longitude: 72.8777 };

      const distance = haversineDistance(delhi, mumbai);

      // Distance should be approximately 1150 km
      expect(distance).toBeGreaterThan(1100000);
      expect(distance).toBeLessThan(1200000);
    });

    it("should calculate distance between two nearby points", () => {
      const point1 = { latitude: 28.6139, longitude: 77.2090 };
      const point2 = { latitude: 28.6200, longitude: 77.2200 }; // ~1-2km away

      const distance = haversineDistance(point1, point2);

      expect(distance).toBeGreaterThan(500);
      expect(distance).toBeLessThan(3000);
    });

    it("should be symmetric (distance A->B === B->A)", () => {
      const coord1 = { latitude: 28.6139, longitude: 77.2090 };
      const coord2 = { latitude: 19.0760, longitude: 72.8777 };

      const dist1 = haversineDistance(coord1, coord2);
      const dist2 = haversineDistance(coord2, coord1);

      expect(dist1).toBe(dist2);
    });

    it("should handle coordinates at the equator", () => {
      const coord1 = { latitude: 0, longitude: 0 };
      const coord2 = { latitude: 0, longitude: 1 }; // 1 degree at equator ~111km

      const distance = haversineDistance(coord1, coord2);

      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });

    it("should handle coordinates at poles", () => {
      const coord1 = { latitude: 90, longitude: 0 };
      const coord2 = { latitude: -90, longitude: 0 }; // North pole to South pole

      const distance = haversineDistance(coord1, coord2);

      // Half circumference of earth ~20,000 km
      expect(distance).toBeGreaterThan(19000000);
      expect(distance).toBeLessThan(21000000);
    });
  });
});
