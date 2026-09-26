/**
 * Contact link generation for native tel: and WhatsApp composer links
 *
 * IMPORTANT: These links open dialers/composers. They do NOT:
 * - Automatically send messages
 * - Prove that a call was made
 * - Prove that a message was sent or delivered
 * - Provide delivery confirmation
 */

/**
 * Generate a tel: link for phone dialing
 */
export function createTelLink(phone: string): string {
  // Phone should already be in E.164 format (+91XXXXXXXXXX)
  // tel: URIs work with most formats, but E.164 is most reliable
  return `tel:${phone}`;
}

/**
 * Generate a WhatsApp deep link
 * Opens WhatsApp with pre-filled message to the given phone number
 */
export function createWhatsAppLink(
  phone: string,
  message?: string
): string {
  // WhatsApp API uses phone number WITHOUT + prefix
  const cleanPhone = phone.replace(/\D/g, "");

  const baseUrl = "https://wa.me";

  if (message) {
    const encodedMessage = encodeURIComponent(message);
    return `${baseUrl}/${cleanPhone}?text=${encodedMessage}`;
  }

  return `${baseUrl}/${cleanPhone}`;
}

/**
 * Generate WhatsApp link for service request
 */
export function createServiceRequestWhatsAppLink(params: {
  providerPhone: string;
  providerName: string;
  farmerName: string;
  requestType: "SOS" | "ROUTINE";
  animalType?: string;
  issue?: string;
}): string {
  const { providerPhone, providerName, farmerName, requestType, animalType, issue } = params;

  // Build message in both English and Hindi
  const messageLines = [
    `Namaste ${providerName} ji / नमस्ते ${providerName} जी`,
    "",
    `I need ${requestType === "SOS" ? "emergency" : "veterinary"} help.`,
    `मुझे ${requestType === "SOS" ? "आपातकालीन" : "पशु चिकित्सा"} सहायता चाहिए।`,
  ];

  if (animalType) {
    messageLines.push("", `Animal: ${animalType}`, `पशु: ${animalType}`);
  }

  if (issue) {
    messageLines.push("", `Issue: ${issue}`, `समस्या: ${issue}`);
  }

  messageLines.push("", `- ${farmerName}`);

  const message = messageLines.join("\n");

  return createWhatsAppLink(providerPhone, message);
}

/**
 * Check if the browser supports tel: links
 */
export function supportsTelLinks(): boolean {
  if (typeof window === "undefined") return false;

  // Most modern browsers support tel: links
  // Mobile browsers universally support them
  return true;
}

/**
 * Check if WhatsApp is likely available
 */
export function supportsWhatsApp(): boolean {
  if (typeof window === "undefined") return false;

  // WhatsApp web links work on all platforms
  // Mobile devices will open the app if installed
  // Desktop will open WhatsApp Web
  return true;
}

/**
 * Track contact link tap (for analytics, not for delivery confirmation)
 */
export type ContactLinkTapEvent = {
  type: "tel" | "whatsapp";
  requestId: string;
  providerId: string;
  timestamp: Date;
};

/**
 * Generate a trackable contact link with analytics callback
 */
export function createTrackableLink(
  link: string,
  event: ContactLinkTapEvent,
  onTap?: (event: ContactLinkTapEvent) => void
): { href: string; onClick: () => void } {
  return {
    href: link,
    onClick: () => {
      if (onTap) {
        onTap(event);
      }
    },
  };
}
