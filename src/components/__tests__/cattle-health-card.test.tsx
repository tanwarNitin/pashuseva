import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CattleHealthCardClient from "@/app/[locale]/cattle/[id]/health-card-client";
import { en as dict } from "@/i18n/dictionaries/en";

vi.mock("@/i18n/client", () => ({ useTranslation: () => dict }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

global.fetch = vi.fn();

const mockAnimal = { id: "animal-1", farmerId: "farmer-1", tagId: "TAG001", name: "Bessie", species: "CATTLE", breed: "Holstein", sex: "FEMALE", dateOfBirth: "2020-01-15", approximateAgeMonths: null, colorOrIdentifyingMarks: "White with black spots", notes: "Friendly cow", archivedAt: null, createdAt: new Date("2023-01-01"), updatedAt: new Date("2023-01-01") } as any;

const mockMilkYields = [{ id: "milk-1", animalId: "animal-1", farmerId: "farmer-1", recordedOn: "2024-01-15", litersPerDay: "25.5", notes: "Good yield", source: "FARMER_REPORTED", createdAt: "2024-01-15T08:00:00Z" }];
const mockVaccinations = [{ id: "vacc-1", animalId: "animal-1", farmerId: "farmer-1", vaccineName: "FMD Vaccine", diseaseTarget: "Foot and Mouth Disease", administeredOn: "2024-01-01", nextDueOn: "2025-01-01", batchNumber: "BATCH001", administeredByText: "Dr. Smith", source: "PROVIDER_ENTERED", notes: "", createdAt: "2024-01-01T10:00:00Z" }];
const mockMedicalRecords = [{ id: "med-1", animalId: "animal-1", farmerId: "farmer-1", recordedOn: "2024-01-10", recordType: "PROVIDER_VISIT", symptoms: "Lameness in front left leg", diagnosis: "Hoof abscess", treatment: "Antibiotics", followUpDate: "2024-01-20", source: "PROVIDER_ENTERED", notes: "Monitor", createdAt: "2024-01-10T14:00:00Z" }];

function setupFetch() {
  (global.fetch as any).mockReset();
  (global.fetch as any).mockImplementation((url: string) => {
    if (url.includes("/milk-yields")) return Promise.resolve({ ok: true, json: async () => mockMilkYields });
    if (url.includes("/vaccinations")) return Promise.resolve({ ok: true, json: async () => mockVaccinations });
    if (url.includes("/medical-records")) return Promise.resolve({ ok: true, json: async () => mockMedicalRecords });
    return Promise.resolve({ ok: true, json: async () => [] });
  });
}

describe("CattleHealthCardClient", () => {
  beforeEach(() => { vi.clearAllMocks(); setupFetch(); });

  it("renders animal header", async () => {
    render(<CattleHealthCardClient animal={mockAnimal} />);
    await waitFor(() => {
      expect(screen.getByText("Bessie")).toBeTruthy();
      expect(screen.getByText("TAG001", { selector: "span" })).toBeTruthy();
    });
  });

  it("shows age label", async () => {
    render(<CattleHealthCardClient animal={mockAnimal} />);
    await waitFor(() => expect(screen.getByText(dict.cattle.age)).toBeTruthy());
  });

  it("renders all four tabs", async () => {
    render(<CattleHealthCardClient animal={mockAnimal} />);
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: dict.cattle.overview })).toBeTruthy();
      expect(screen.getByRole("tab", { name: dict.cattle.milkYield })).toBeTruthy();
      expect(screen.getByRole("tab", { name: dict.cattle.vaccinations })).toBeTruthy();
      expect(screen.getByRole("tab", { name: dict.cattle.medicalRecords })).toBeTruthy();
    });
  });

  it("shows milk yield records", async () => {
    render(<CattleHealthCardClient animal={mockAnimal} />);
    fireEvent.click(await screen.findByRole("tab", { name: dict.cattle.milkYield }));
    await waitFor(() => expect(screen.getByText("25.5 L")).toBeTruthy());
  });

  it("shows vaccination records", async () => {
    render(<CattleHealthCardClient animal={mockAnimal} />);
    fireEvent.click(await screen.findByRole("tab", { name: dict.cattle.vaccinations }));
    await waitFor(() => {
      expect(screen.getByText("FMD Vaccine")).toBeTruthy();
      expect(screen.getByText("Foot and Mouth Disease")).toBeTruthy();
    });
  });

  it("shows medical records", async () => {
    render(<CattleHealthCardClient animal={mockAnimal} />);
    fireEvent.click(await screen.findByRole("tab", { name: dict.cattle.medicalRecords }));
    await waitFor(() => {
      expect(screen.getByText("Lameness in front left leg")).toBeTruthy();
      expect(screen.getByText("Hoof abscess")).toBeTruthy();
    });
  });

  it("shows source badge", async () => {
    render(<CattleHealthCardClient animal={mockAnimal} />);
    fireEvent.click(await screen.findByRole("tab", { name: dict.cattle.vaccinations }));
    await waitFor(() => expect(screen.getByText(dict.cattle.providerEntered)).toBeTruthy());
  });

  it("shows record type badge", async () => {
    render(<CattleHealthCardClient animal={mockAnimal} />);
    fireEvent.click(await screen.findByRole("tab", { name: dict.cattle.medicalRecords }));
    await waitFor(() => expect(screen.getByText(dict.cattle.providerVisit)).toBeTruthy());
  });
});
