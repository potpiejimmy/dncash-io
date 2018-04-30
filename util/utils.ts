import * as crypto from 'crypto';

export function asyncLoop(array: any[], iter: (element: any) => Promise<void>, index: number = 0): Promise<void> {
    if (index >= array.length) return Promise.resolve();
    return iter(array[index]).then(() => asyncLoop(array, iter, ++index));
}

export function asyncWhile(condition: () => boolean, iter: () => Promise<void>): Promise<void> {
    if (!condition()) return Promise.resolve();
    return iter().then(() => asyncWhile(condition, iter));
}

/**
 * Creates a random int padded with 0 to the given len.
 * Only use this for len < 10 (short integer codes)
 * @param len a length
 */
export function getSecureRandomFixedLengthDecimalString(len: number): string {
    if (len >= 10) throw "Illegal argument: len must be < 10";
    let padder = Math.pow(10,len); // a 1 with 'len' zeros
    let rndInt = parseInt(crypto.randomBytes(4).toString('hex'), 16) % padder;
    return (""+(padder+rndInt)).substr(1); // fills with zeros from the left
}

/**
 * Helper class that carries string data with a base-64 encoded signature
 * and a helper method to verify the signature with a given key
 */
export class SignedStringData {

    constructor(
        /* Treated as UTF-8 for signature calculation */
        private data: string,
        /* Base-64 encoded signature */
        private signature: string
    ) {}

    /**
     * Verifies the signature of this signed data object using the given
     * public key.
     * @param pubkey a public key, PEM-encoded
     */
    verify(pubkey: string): boolean {
        let verify: crypto.Verify = crypto.createVerify("SHA256");
        verify.write(this.data);
        verify.end();
        return verify.verify(pubkey, this.signature, "base64");
    }
}
