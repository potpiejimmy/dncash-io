export const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
export const API_SCOPES = ["token-api", "cash-api"];
export const DEFAULT_PLAIN_CODE_LEN = 6; // no. of decimal digits for the unique plain code (used for EAN retail codes)
export const DEFAULT_SECURE_CODE_LEN = 6; // no. of random bytes, not digits (encoded with public key)
export const TRIGGER_CODE_VALIDITY_SECONDS = 30; // validity of trigger codes in seconds
