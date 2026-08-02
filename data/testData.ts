export function uniqueSuffix(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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
    effectiveDate: string;
    expiryDate: string;
}

export function buildPayerData(suffix: string = uniqueSuffix()): PayerData {
    return {
          payerName: `Automation Payer ${suffix}`,
          payerNameAr: `PAYER-AR-${suffix}`,
          payerType: 'Private',
          email: `automation.payer.${suffix}@example.com`,
          phone: '512345678',
          licenseNumber: `LIC-AUTO-${suffix}`,
          country: 'Saudi Arabia',
          city: 'Jeddah',
          effectiveDate: '02/08/2026',
          expiryDate: '02/08/2027',
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
          networkNameAr: `NETWORK-AR-${suffix}`,
          networkType: 'POS',
          description: `Automation-created network ${suffix}`,
          effectiveDate: '02/08/2026',
          expiryDate: '02/08/2027',
    };
}
      
