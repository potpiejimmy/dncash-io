export const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
export const API_SCOPES = ["token-api", "cash-api", "clearing-api"];
export const DEFAULT_PLAIN_CODE_LEN = 6; // no. of decimal digits for the unique plain code (used for EAN retail codes)
export const DEFAULT_SECURE_CODE_LEN = 6; // no. of random bytes, not digits (encoded with public key)
export const TRIGGER_CODE_VALIDITY_SECONDS = 30; // validity of trigger codes in seconds
export const ALLOW_INTER_CUSTOMER_CLEARING = true; // allow foreign tokens
export const USE_REDIS = process.env.USE_REDIS; // allows clustering of dncash-io by sending all token change and trigger notifications through redis
export const REDIS_URL = process.env.REDIS_URL; // note: uses standard redis port on localhost if not specified
