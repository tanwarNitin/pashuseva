import "@testing-library/jest-dom";
import { vi } from "vitest";

process.env.APP_ORIGIN = "http://localhost:3000";
process.env.DATABASE_URL = "postgres://postgres:postgres@localhost:5432/pashuseva";
process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars-long";
process.env.PIN_PEPPER = "test-pepper-at-least-32-chars-long-here";
process.env.VAPID_PRIVATE_KEY = "test-private-key-mock";
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key-mock";
process.env.VAPID_SUBJECT = "mailto:test@example.com";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: null,
    status: "unauthenticated",
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const icons = [
    "Loader2", "FileText", "Droplet", "Shield", "Heart", "Printer", "QrCode",
    "Plus", "Edit", "Trash2", "Calendar", "AlertTriangle", "Download",
    "Phone", "MessageCircle", "MapPin", "Star", "Clock", "Currency", "Filter",
    "ArrowLeft", "ArrowRight", "Check", "X", "XIcon", "Menu", "Sun", "Moon", "User",
    "LogOut", "Settings", "Bell", "Search", "ChevronDown", "ChevronUp",
    "Eye", "EyeOff", "Copy", "CheckCircle", "AlertCircle", "Info",
    "TrendingUp", "Users", "MapPin", "Stethoscope", "Pill", "Syringe",
    "Cow", "Truck", "Package", "Receipt", "CreditCard", "Banknote",
    "Activity", "Home", "Mail", "Lock", "Unlock", "ShieldCheck",
    "Award", "Target", "Flag", "Zap", "Sparkles", "Brain", "Bot",
    "Cpu", "Database", "Server", "Cloud", "Globe", "Wifi", "WifiOff",
    "Battery", "Signal", "Volume2", "VolumeX", "Mic", "MicOff",
    "Camera", "CameraOff", "Video", "VideoOff", "Image", "File",
    "Folder", "Archive", "Download", "Upload", "Share2", "Link",
    "ExternalLink", "Anchor", "Tag", "Bookmark", "Heart", "Star",
    "ThumbsUp", "ThumbsDown", "Flag", "Bookmark", "UserPlus", "UserMinus",
    "Users", "UserCheck", "UserX", "UserCog", "UserCircle", "UserSquare",
    "Mail", "Phone", "MessageSquare", "Send", "Inbox", "Archive",
    "Trash", "Edit", "Save", "Copy", "Paste", "Cut", "Redo", "Undo",
    "RotateCcw", "RotateCw", "RefreshCw", "RefreshCcw", "Maximize",
    "Minimize", "Fullscreen", "Minimize2", "CornerUpLeft", "CornerUpRight",
    "CornerDownLeft", "CornerDownRight", "Move", "Grip", "GripVertical",
    "GripHorizontal", "Pan", "ZoomIn", "ZoomOut", "Search", "Filter",
    "Funnel", "Sliders", "ToggleLeft", "ToggleRight", "CheckSquare",
    "Square", "Circle", "Triangle", "Hexagon", "Octagon", "Pentagon",
    "Diamond", "Star", "Award", "Medal", "Trophy", "Crown", "Gem",
    "Coins", "DollarSign", "PoundSign", "EuroSign", "YenSign", "RupeeSign",
    "Bitcoin", "Ethereum", "Litecoin", "Dogecoin", "Monero", "Dash",
    "Ripple", "Cardano", "Polkadot", "Solana", "Chainlink", "Uniswap",
    "Aave", "Compound", "Maker", "Synthetix", "Yearn", "Curve",
    "Balancer", "SushiSwap", "PancakeSwap", "QuickSwap", "TraderJoe",
    "SpookySwap", "SpiritSwap", "BeethovenX", "Equalizer", "Velodrome",
    "Aerodrome", "Thena", "Camelot", "Maverick", "Ramses", "Chronos",
    "Solidly", "Velocimeter", "Aerodrome", "Velodrome", "Equalizer",
    "Thena", "Camelot", "Maverick", "Ramses", "Chronos", "Solidly",
  ];

  const mockIcons: Record<string, React.ComponentType> = {};
  icons.forEach((name) => {
    mockIcons[name] = ({ ...props }: React.SVGProps<SVGSVGElement>) => (
      <svg data-testid={name} {...props} />
    );
  });

  return mockIcons;
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is no longer supported")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
