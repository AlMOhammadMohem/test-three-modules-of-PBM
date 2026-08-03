export function uniqueSuffix(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Formats a Date as DD/MM/YYYY, matching the app's date-picker input format. */
function toDisplayDate(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

// Computed relative to "today" rather than hardcoded - a fixed past date fails the live
// form's "Effective date cannot be earlier than today" validation once the calendar moves on.
function todayDisplay(): string {
    return toDisplayDate(new Date());
}
function nextYearDisplay(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return toDisplayDate(d);
}

export const CREDENTIALS = {
    username: process.env.PBM_USERNAME || 'careconnect',
    password: process.env.PBM_PASSWORD || 'Admin@123',
};

export interface PayerData {
    payerName: string;
    payerNameAr: string;
    payerType: string;
    email: string;
    phone: string;
    licenseNumber: string;
    country: string;
    city: string;
    preferredLanguage: string;
    preferredContactMethod: string;
    effectiveDate: string;
    expiryDate: string;
}

// Arabic letters only (no digits/Latin) - the live form's Arabic name field validates for
// this, so a Latin+digit suffix like "PAYER-AR-xyz" gets rejected at submit time.
const arabicLetters = 'أبتثجحخدرزسشصضطظعغفقكلمنهوي'.split('');
function randomArabicSuffix(length: number): string {
    let out = '';
    for (let i = 0; i < length; i++) {
        out += arabicLetters[Math.floor(Math.random() * arabicLetters.length)];
    }
    return out;
}

export function buildPayerData(suffix: string = uniqueSuffix()): PayerData {
    return {
          payerName: `Automation Payer ${suffix}`,
          payerNameAr: `ضامن ${randomArabicSuffix(6)}`,
          payerType: 'Private',
          email: `automation.payer.${suffix}@example.com`,
          phone: '512345678',
          licenseNumber: `LIC-AUTO-${suffix}`,
          country: 'Saudi Arabia',
          city: 'Jeddah',
          preferredLanguage: 'English',
          preferredContactMethod: 'Email',
          effectiveDate: todayDisplay(),
          expiryDate: nextYearDisplay(),
    };
}

export interface NetworkData {
    networkName: string;
    networkNameAr: string;
    networkType: string;
    description: string;
    effectiveDate: string;
    expiryDate: string;
}

export function buildNetworkData(suffix: string = uniqueSuffix()): NetworkData {
    return {
          networkName: `Automation Network ${suffix}`,
          networkNameAr: `شبكة ${randomArabicSuffix(6)}`,
          networkType: 'POS',
          description: `Automation-created network ${suffix}`,
          effectiveDate: todayDisplay(),
          expiryDate: nextYearDisplay(),
    };
}
      
