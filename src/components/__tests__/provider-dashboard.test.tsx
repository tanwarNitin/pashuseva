import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ProviderDashboardClient from "@/app/[locale]/(provider)/dashboard/dashboard-client";
import { en as dict } from "@/i18n/dictionaries/en";
import { acceptRequestAction, declineRequestAction } from "@/actions/request.actions";
import { toggleDutyStatusAction } from "@/actions/provider.actions";

// Mock the server actions
vi.mock("@/actions/request.actions", () => ({
  acceptRequestAction: vi.fn(),
  declineRequestAction: vi.fn(),
}));

vi.mock("@/actions/provider.actions", () => ({
  toggleDutyStatusAction: vi.fn(),
}));

// Mock @/i18n/client
vi.mock("@/i18n/client", () => ({
  useTranslation: () => dict,
}));

// Use useRouter mock for next/navigation if needed
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const mockProvider = {
  id: "prov-1",
  userId: "user-1",
  name: "Dr. Vet",
  role: "VET_DOCTOR",
  phone: "+919876693597",
  qualifications: "BVSc",
  verificationStatus: "VERIFIED",
  registrationNumber: "VCI-123",
  registrationAuthority: "VCI",
  dutyStatus: "ON_DUTY",
  dutyExpiresAt: new Date(Date.now() + 3600000 * 4).toISOString(), // 4 hours from now
};

const mockRequests = [
  {
    id: "req-1",
    animalId: "animal-1",
    farmerId: "farmer-1",
    requestType: "SOS",
    kind: "SOS",
    serviceCode: "CONSULTATION",
    latitude: "28.6139",
    longitude: "77.2090",
    preferredContactMethod: "WHATSAPP",
    urgencyLevel: 8,
    estimatedTotalPaise: 15000,
    conditionSummary: "Emergency case",
    status: "OPEN",
    offerStatus: "PENDING",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    farmerName: "John Farmer",
    farmerPhone: "+919876543210",
  },
  {
    id: "req-2",
    animalId: "animal-2",
    farmerId: "farmer-2",
    requestType: "ROUTINE",
    kind: "ROUTINE",
    serviceCode: "VACCINATION",
    latitude: "28.6200",
    longitude: "77.2100",
    preferredContactMethod: "PHONE",
    urgencyLevel: 3,
    estimatedTotalPaise: 10000,
    conditionSummary: "Routine checkup",
    status: "OPEN",
    offerStatus: "PENDING",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    farmerName: "Jane Farmer",
    farmerPhone: "+919876543211",
  },
];

global.fetch = vi.fn();

describe("ProviderDashboardClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes("/api/provider/profile")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProvider),
        });
      }
      if (url.includes("/api/provider/requests")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRequests),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it("renders provider profile and duty status", async () => {
    render(<ProviderDashboardClient dict={dict} />);

    await waitFor(() => {
      expect(screen.getByText("Dr. Vet")).toBeTruthy();
      expect(screen.getByText("VCI-123")).toBeTruthy();
    });
  });

  it("renders incoming requests", async () => {
    render(<ProviderDashboardClient dict={dict} />);

    await waitFor(() => {
      expect(screen.getByText("Emergency case")).toBeTruthy();
      expect(screen.getByText("Routine checkup")).toBeTruthy();
      expect(screen.getByText("John Farmer")).toBeTruthy();
      expect(screen.getByText("Jane Farmer")).toBeTruthy();
    });
  });

  it("calls accept action when accept button clicked", async () => {
    (acceptRequestAction as any).mockResolvedValue({ success: true });

    render(<ProviderDashboardClient dict={dict} />);

    const acceptButtons = await screen.findAllByText(dict.provider.requestsFeed.accept);
    fireEvent.click(acceptButtons[0]);

    await waitFor(() => {
      expect(acceptRequestAction).toHaveBeenCalledWith(expect.any(FormData));
    });
  });

  it("calls decline action when decline button clicked", async () => {
    (declineRequestAction as any).mockResolvedValue({ success: true });

    render(<ProviderDashboardClient dict={dict} />);

    const declineButtons = await screen.findAllByText(dict.provider.requestsFeed.decline);
    fireEvent.click(declineButtons[0]);

    await waitFor(() => {
      expect(declineRequestAction).toHaveBeenCalledWith(expect.any(FormData));
    });
  });
});
