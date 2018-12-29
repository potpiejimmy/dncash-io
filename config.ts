// the MySQL database host name (using default port 3306)
export const DB_HOST = process.env.DB_HOST || 'localhost';

// the database connection pool size
export const DB_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE) || 10;

// the database password (user and database name is fixed to 'dncashio')
export const DB_PASSWORD = process.env.DB_PASSWORD || 'dncashio';

// the secret to sign the JWT tokens with (used for the Web UI)
export const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// JWT validity in hours until requiring user to log in again (UI), default 7 days
export const JWT_VALID_HOURS = parseInt(process.env.JWT_VALID_HOURS) || 168;

// valid API scopes
export const API_SCOPES = ["token-api", "cash-api", "clearing-api"];

// lower security if using short plain codes
export const USE_PLAIN_CODES = false;

// no. of decimal digits for the unique plain code (used for EAN retail codes)
export const DEFAULT_PLAIN_CODE_LEN = 6;

// no. of random bytes, not digits (encoded with public key)
export const DEFAULT_SECURE_CODE_LEN = 6;

// default validity of trigger codes in seconds
export const TRIGGER_CODE_VALIDITY_SECONDS = 60;

// allow foreign tokens
export const ALLOW_INTER_CUSTOMER_CLEARING = true;

// allows clustering of dncash-io by sending all token change and trigger notifications through redis
export const USE_REDIS = process.env.USE_REDIS;

// note: uses standard redis port on localhost if not specified
export const REDIS_URL = process.env.REDIS_URL;

// if set, triggered tokens will be sent to MQTT
export const USE_MQTT = process.env.USE_MQTT;

// MQTT URL
export const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';

// MQTT user name
export const MQTT_USER = process.env.MQTT_USER || 'dncashio-pub';

// MQTT password
export const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'default';

// MQTT signature private key to sign triggered tokens with
// Corresponding default pubkey is: "-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAJ5W3+QfNgZaMoW2QiVpxtBg556IgD4y\nzWDFyurMsT5qBPkJulPxtTd8Kf81mkA79BOKbZiRT3U0QGowJYUaxTsCAwEAAQ==\n-----END PUBLIC KEY-----"
export const MQTT_SIGNATURE_KEY = process.env.MQTT_SIGNATURE_KEY || "-----BEGIN RSA PRIVATE KEY-----\\nMIIBPAIBAAJBAJ5W3+QfNgZaMoW2QiVpxtBg556IgD4yzWDFyurMsT5qBPkJulPx\\ntTd8Kf81mkA79BOKbZiRT3U0QGowJYUaxTsCAwEAAQJBAIsWBNV+FRa/ZGHQF4qF\\nv/6LIOpBPWVlesLm+7gE1izb0GMkjCmUmz1ZA6BxDiB3gqMWePQxPREqM2T6fd+M\\nOwECIQDg3hAxJKn1ycCrDWXfMLkxs+q76tUt08cnTTiXHltH9wIhALRC3knMPDMu\\nmlXZPmBWNZ5AxmroUVQjB8JiWSmJSEPdAiEApMt5OFqzSBLUZUdLWjcd8cP2CkO+\\neXhT4oSgLXes098CIFeGREJW3UAIt71JT0UddslRMEZGaP7OR301nY9SbfktAiEA\\nonLii06o5qwdVd4JVjt3ZREk1efeKgVmY3cUkjMJd3M=\\n-----END RSA PRIVATE KEY-----";

// maximum history to be kept in database tables (journal, token, clearing)
export const MAX_HISTORY_DAYS = parseInt(process.env.MAX_HISTORY_DAYS) || 90;

// if set, always generate the same trigger code per ATM (uses the ATM device UUID). intended for demo setups only.
export const USE_FIXED_TRIGGER_CODES = process.env.USE_FIXED_TRIGGER_CODES;
