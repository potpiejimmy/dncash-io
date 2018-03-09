export const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
export const API_SCOPES = ["token-api", "cash-api"];
export const DEFAULT_CODE_LEN = 6; // no. of random bytes, not digits
export const TRIGGER_CODE_VALIDITY_SECONDS = 30; // validity of trigger codes in seconds
