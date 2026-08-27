/**
 * Bilingual Translation Matrix — Hindi (हिंदी) and English.
 *
 * Usage:
 *   import { t } from "@/lib/i18n";
 *   t("emergency_sos", "hi") → "आपातकालीन SOS"
 *   t("emergency_sos", "en") → "Emergency SOS"
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type Language = "hi" | "en";

export type TranslationKey = keyof typeof translations.en;

// ─── Translation Dictionaries ───────────────────────────────────────────────

export const translations = {
  en: {
    // ── App ──────────────────────────────────────────────────────────────
    app_name: "PashuSeva",
    app_tagline: "On-Demand Veterinary Care for Your Livestock",

    // ── Roles ────────────────────────────────────────────────────────────
    role_farmer: "Farmer",
    role_vet_doctor: "Veterinary Doctor",
    role_paravet_worker: "Paravet Worker",

    // ── Auth ─────────────────────────────────────────────────────────────
    login: "Login",
    register: "Register",
    logout: "Logout",
    phone_number: "Phone Number",
    enter_phone: "Enter 10-digit phone number",
    pin: "PIN",
    enter_pin: "Enter 4-digit PIN",
    name: "Full Name",
    enter_name: "Enter your full name",
    select_role: "Select Role",
    already_registered: "Already registered?",
    not_registered: "Not registered yet?",
    login_now: "Login Now",
    register_now: "Register Now",

    // ── Duty Status ──────────────────────────────────────────────────────
    on_duty: "On Duty",
    off_duty: "Off Duty",
    toggle_duty: "Toggle Duty Status",

    // ── Emergency & Urgency ──────────────────────────────────────────────
    emergency_sos: "Emergency SOS",
    routine_request: "Routine Request",
    raise_sos: "Raise SOS",
    raise_routine: "Book Routine Visit",
    emergency_type: "Emergency Type",
    urgency_level: "Urgency Level",

    // ── Emergency Types ──────────────────────────────────────────────────
    dystocia: "Calving Emergency (Dystocia)",
    bloat: "Bloat",
    high_fever: "High Fever",
    prolapse: "Prolapse",
    fracture_injury: "Fracture / Injury",
    general_checkup: "General Checkup",

    // ── Request Status ───────────────────────────────────────────────────
    status_pending: "Pending",
    status_accepted: "Accepted",
    status_completed: "Completed",
    status_cancelled: "Cancelled",

    // ── Nearby Doctors ───────────────────────────────────────────────────
    nearby_doctors: "Nearby Doctors",
    search_radius: "Search Radius",
    distance: "Distance",
    km_away: "km away",
    estimated_fee: "Estimated Fee",
    base_fee: "Base Visit Fee",
    per_km: "Per KM Fee",
    no_vets_found: "No veterinary doctors found nearby",
    try_larger_radius: "Try increasing the search radius",

    // ── Vet Profile ──────────────────────────────────────────────────────
    qualification: "Qualification",
    registration_no: "Registration No.",
    clinic_name: "Clinic Name",
    experience: "Experience",
    years: "years",
    verified: "Verified",
    not_verified: "Not Verified",
    service_radius: "Service Radius",
    visit_fee: "Visit Fee",

    // ── Cattle / Pashu ───────────────────────────────────────────────────
    cattle_type: "Cattle Type",
    cow: "Cow",
    buffalo: "Buffalo",
    goat: "Goat",
    sheep: "Sheep",
    other: "Other",
    breed: "Breed",
    age: "Age",
    months: "months",
    tag_number: "Tag Number",

    // ── Pashu Swasthya Patra (Digital Health Card) ───────────────────────
    pashu_swasthya_patra: "Animal Health Card",
    health_card: "Health Card",
    add_cattle: "Add Cattle",
    edit_cattle: "Edit Cattle",
    my_cattle: "My Cattle",
    cattle_details: "Cattle Details",

    // ── Milk Yield ───────────────────────────────────────────────────────
    milking: "Milking",
    not_milking: "Not Milking",
    milk_yield: "Milk Yield",
    daily_milk_yield: "Daily Milk Yield",
    liters_per_day: "liters/day",

    // ── Vaccination ──────────────────────────────────────────────────────
    vaccination: "Vaccination",
    vaccination_history: "Vaccination History",
    vaccine_name: "Vaccine Name",
    date_given: "Date Given",
    next_due: "Next Due",
    add_vaccination: "Add Vaccination",

    // ── Medical Records ──────────────────────────────────────────────────
    medical_notes: "Medical Notes",
    diagnosis: "Diagnosis",
    prescription: "Prescription",
    vet_name: "Vet Name",
    date: "Date",
    add_medical_note: "Add Medical Note",

    // ── Actions ──────────────────────────────────────────────────────────
    call: "Call",
    whatsapp: "WhatsApp",
    call_now: "Call Now",
    send_whatsapp: "Send WhatsApp",
    view_on_map: "View on Map",
    get_directions: "Get Directions",
    submit: "Submit",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    back: "Back",
    close: "Close",
    confirm: "Confirm",
    loading: "Loading...",

    // ── Location ─────────────────────────────────────────────────────────
    your_location: "Your Location",
    detecting_location: "Detecting location...",
    location_error: "Unable to detect location",
    allow_location: "Please allow location access",
    address: "Address",

    // ── Dashboard ────────────────────────────────────────────────────────
    dashboard: "Dashboard",
    welcome: "Welcome",
    farmer_dashboard: "Farmer Dashboard",
    vet_dashboard: "Vet Dashboard",
    active_requests: "Active Requests",
    request_history: "Request History",
    no_active_requests: "No active requests",

    // ── Misc ─────────────────────────────────────────────────────────────
    language: "Language",
    hindi: "Hindi",
    english: "English",
    description: "Description",
    optional: "Optional",
    required: "Required",
    select: "Select",
    no_data: "No data available",
    error_occurred: "An error occurred",
    try_again: "Try Again",
  },

  hi: {
    // ── App ──────────────────────────────────────────────────────────────
    app_name: "पशुसेवा",
    app_tagline: "आपके पशुओं के लिए ऑन-डिमांड पशु चिकित्सा सेवा",

    // ── Roles ────────────────────────────────────────────────────────────
    role_farmer: "किसान",
    role_vet_doctor: "पशु चिकित्सक",
    role_paravet_worker: "पैरावेट कार्यकर्ता",

    // ── Auth ─────────────────────────────────────────────────────────────
    login: "लॉगिन",
    register: "रजिस्टर",
    logout: "लॉगआउट",
    phone_number: "फ़ोन नंबर",
    enter_phone: "10 अंकों का फ़ोन नंबर दर्ज करें",
    pin: "पिन",
    enter_pin: "4 अंकों का पिन दर्ज करें",
    name: "पूरा नाम",
    enter_name: "अपना पूरा नाम दर्ज करें",
    select_role: "भूमिका चुनें",
    already_registered: "पहले से पंजीकृत हैं?",
    not_registered: "अभी तक पंजीकृत नहीं?",
    login_now: "अभी लॉगिन करें",
    register_now: "अभी रजिस्टर करें",

    // ── Duty Status ──────────────────────────────────────────────────────
    on_duty: "ड्यूटी पर",
    off_duty: "ड्यूटी से बाहर",
    toggle_duty: "ड्यूटी स्थिति बदलें",

    // ── Emergency & Urgency ──────────────────────────────────────────────
    emergency_sos: "आपातकालीन SOS",
    routine_request: "नियमित अनुरोध",
    raise_sos: "SOS भेजें",
    raise_routine: "नियमित विज़िट बुक करें",
    emergency_type: "आपातकाल का प्रकार",
    urgency_level: "तात्कालिकता स्तर",

    // ── Emergency Types ──────────────────────────────────────────────────
    dystocia: "प्रसव आपातकाल (डिस्टोसिया)",
    bloat: "अफारा / पेट फूलना",
    high_fever: "तेज़ बुखार",
    prolapse: "प्रोलैप्स (गर्भाशय/योनि बाहर आना)",
    fracture_injury: "हड्डी टूटना / चोट",
    general_checkup: "सामान्य जाँच",

    // ── Request Status ───────────────────────────────────────────────────
    status_pending: "लंबित",
    status_accepted: "स्वीकृत",
    status_completed: "पूर्ण",
    status_cancelled: "रद्द",

    // ── Nearby Doctors ───────────────────────────────────────────────────
    nearby_doctors: "आस-पास के डॉक्टर",
    search_radius: "खोज दायरा",
    distance: "दूरी",
    km_away: "किमी दूर",
    estimated_fee: "अनुमानित शुल्क",
    base_fee: "बेस विज़िट शुल्क",
    per_km: "प्रति किमी शुल्क",
    no_vets_found: "आस-पास कोई पशु चिकित्सक नहीं मिला",
    try_larger_radius: "खोज दायरा बढ़ाकर देखें",

    // ── Vet Profile ──────────────────────────────────────────────────────
    qualification: "योग्यता",
    registration_no: "पंजीकरण संख्या",
    clinic_name: "क्लिनिक का नाम",
    experience: "अनुभव",
    years: "वर्ष",
    verified: "सत्यापित",
    not_verified: "असत्यापित",
    service_radius: "सेवा दायरा",
    visit_fee: "विज़िट शुल्क",

    // ── Cattle / Pashu ───────────────────────────────────────────────────
    cattle_type: "पशु का प्रकार",
    cow: "गाय",
    buffalo: "भैंस",
    goat: "बकरी",
    sheep: "भेड़",
    other: "अन्य",
    breed: "नस्ल",
    age: "आयु",
    months: "महीने",
    tag_number: "टैग नंबर",

    // ── Pashu Swasthya Patra (Digital Health Card) ───────────────────────
    pashu_swasthya_patra: "पशु स्वास्थ्य पत्र",
    health_card: "स्वास्थ्य कार्ड",
    add_cattle: "पशु जोड़ें",
    edit_cattle: "पशु विवरण बदलें",
    my_cattle: "मेरे पशु",
    cattle_details: "पशु का विवरण",

    // ── Milk Yield ───────────────────────────────────────────────────────
    milking: "दूध देने वाला",
    not_milking: "दूध नहीं देता",
    milk_yield: "दूध उपज",
    daily_milk_yield: "दैनिक दूध उत्पादन",
    liters_per_day: "लीटर/दिन",

    // ── Vaccination ──────────────────────────────────────────────────────
    vaccination: "टीकाकरण",
    vaccination_history: "टीकाकरण इतिहास",
    vaccine_name: "टीके का नाम",
    date_given: "दिनांक",
    next_due: "अगली तारीख",
    add_vaccination: "टीकाकरण जोड़ें",

    // ── Medical Records ──────────────────────────────────────────────────
    medical_notes: "चिकित्सा नोट्स",
    diagnosis: "निदान",
    prescription: "नुस्खा",
    vet_name: "डॉक्टर का नाम",
    date: "तारीख",
    add_medical_note: "चिकित्सा नोट जोड़ें",

    // ── Actions ──────────────────────────────────────────────────────────
    call: "कॉल",
    whatsapp: "व्हाट्सएप",
    call_now: "अभी कॉल करें",
    send_whatsapp: "व्हाट्सएप भेजें",
    view_on_map: "मानचित्र पर देखें",
    get_directions: "रास्ता देखें",
    submit: "जमा करें",
    cancel: "रद्द करें",
    save: "सेव करें",
    delete: "हटाएँ",
    back: "वापस",
    close: "बंद करें",
    confirm: "पुष्टि करें",
    loading: "लोड हो रहा है...",

    // ── Location ─────────────────────────────────────────────────────────
    your_location: "आपका स्थान",
    detecting_location: "स्थान पता लगा रहे हैं...",
    location_error: "स्थान पता नहीं लगा सका",
    allow_location: "कृपया स्थान अनुमति दें",
    address: "पता",

    // ── Dashboard ────────────────────────────────────────────────────────
    dashboard: "डैशबोर्ड",
    welcome: "स्वागत है",
    farmer_dashboard: "किसान डैशबोर्ड",
    vet_dashboard: "डॉक्टर डैशबोर्ड",
    active_requests: "सक्रिय अनुरोध",
    request_history: "अनुरोध इतिहास",
    no_active_requests: "कोई सक्रिय अनुरोध नहीं",

    // ── Misc ─────────────────────────────────────────────────────────────
    language: "भाषा",
    hindi: "हिंदी",
    english: "अंग्रेज़ी",
    description: "विवरण",
    optional: "वैकल्पिक",
    required: "आवश्यक",
    select: "चुनें",
    no_data: "कोई डेटा उपलब्ध नहीं",
    error_occurred: "कोई त्रुटि हुई",
    try_again: "पुनः प्रयास करें",
  },
} as const;

// ─── Lookup Helper ──────────────────────────────────────────────────────────

/**
 * Type-safe translation lookup.
 *
 * @param key   - The translation key
 * @param lang  - "hi" or "en" (defaults to "hi")
 * @returns     - The translated string
 *
 * @example
 * t("emergency_sos", "hi") // "आपातकालीन SOS"
 * t("emergency_sos", "en") // "Emergency SOS"
 */
export function t(key: TranslationKey, lang: Language = "hi"): string {
  return translations[lang][key];
}

/**
 * Returns the full dictionary for a given language.
 * Useful for passing all translations to a client component.
 */
export function getDictionary(lang: Language) {
  return translations[lang];
}
