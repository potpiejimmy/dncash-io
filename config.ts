export const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
export const JWT_VALID_HOURS = parseInt(process.env.JWT_VALID_HOURS) || 168; // JWT validity in hours until requiring user to log in again (UI), default 7 days
export const API_SCOPES = ["token-api", "cash-api", "clearing-api"];
export const USE_PLAIN_CODES = false; // lower security if using short plain codes
export const DEFAULT_PLAIN_CODE_LEN = 6; // no. of decimal digits for the unique plain code (used for EAN retail codes)
export const DEFAULT_SECURE_CODE_LEN = 6; // no. of random bytes, not digits (encoded with public key)
export const TRIGGER_CODE_VALIDITY_SECONDS = 60; // default validity of trigger codes in seconds
export const ALLOW_INTER_CUSTOMER_CLEARING = true; // allow foreign tokens
export const USE_REDIS = process.env.USE_REDIS; // allows clustering of dncash-io by sending all token change and trigger notifications through redis
export const REDIS_URL = process.env.REDIS_URL; // note: uses standard redis port on localhost if not specified
export const USE_MQTT = process.env.USE_MQTT; // if set, triggered tokens will be sent to MQTT
export const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883'; // MQTT URL
export const MAX_HISTORY_DAYS = parseInt(process.env.MAX_HISTORY_DAYS) || 90; // maximum history to be kept in database tables
export const USE_FIXED_TRIGGER_CODES = process.env.USE_FIXED_TRIGGER_CODES; // if set, always generate the same trigger code per ATM (uses the ATM device UUID). intended for demo setups only.
