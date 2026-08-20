// Official 32 Mexican states + NE (Nacido en el Extranjero)
const VALID_STATES = new Set([
    'AS', 'BC', 'BS', 'CC', 'CL', 'CM', 'CS', 'CH', 'DF', 'DG',
    'GT', 'GR', 'HG', 'JC', 'MC', 'MN', 'MS', 'NT', 'NL', 'OC',
    'PL', 'QT', 'QR', 'SP', 'SL', 'SR', 'TC', 'TS', 'TL', 'VZ',
    'YN', 'ZS', 'NE'
]);

const CURP_REGEX = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9][0-9]$/;

// Fast RENAPO character lookup table (0-9 -> 0..9, A-N -> 10..23, Ñ -> 24, O-Z -> 25..36)
function getRenapoCharValue(char: string): number {
    const code = char.charCodeAt(0);
    if (code >= 48 && code <= 57) { // '0'-'9'
        return code - 48;
    }
    if (code >= 65 && code <= 78) { // 'A'-'N'
        return 10 + (code - 65);
    }
    if (char === 'Ñ' || char === 'ñ') {
        return 24;
    }
    if (code >= 79 && code <= 90) { // 'O'-'Z'
        return 25 + (code - 79);
    }
    return -1;
}

/**
 * Calculates official RENAPO verification check digit (18th character, index 17).
 * Complexity: O(1) time, O(1) space.
 */
export function calculateRenapoCheckDigit(curp17: string): string | null {
    if (!curp17 || curp17.length < 17) return null;

    let sum = 0;
    for (let i = 0; i < 17; i++) {
        const val = getRenapoCharValue(curp17.charAt(i).toUpperCase());
        if (val < 0) return null;
        sum += val * (18 - i);
    }

    const remainder = sum % 10;
    const checkDigit = (10 - remainder) % 10;
    return checkDigit.toString();
}

/**
 * Sanitizes common OCR confusions based on the strict positional anatomy of a CURP.
 * Complexity: O(1) time and memory.
 */
export function sanitizeCurpOcr(rawCurp: string): string {
    if (!rawCurp) return '';
    const trimmed = rawCurp.trim().toUpperCase();
    if (trimmed.length !== 18) return trimmed;

    const chars = trimmed.split('');

    const correctDigitToLetter = (c: string) => {
        if (c === '0') return 'O';
        if (c === '1') return 'I';
        if (c === '2') return 'Z';
        if (c === '5') return 'S';
        if (c === '8') return 'B';
        return c;
    };

    const correctLetterToDigit = (c: string) => {
        if (c === 'O' || c === 'o' || c === 'Q' || c === 'D') return '0';
        if (c === 'I' || c === 'i' || c === 'l' || c === 'L' || c === '|') return '1';
        if (c === 'Z' || c === 'z') return '2';
        if (c === 'S' || c === 's') return '5';
        if (c === 'B' || c === 'b') return '8';
        if (c === 'G') return '6';
        return c;
    };

    // Pos 0-3: Initials (Letters)
    for (let i = 0; i < 4; i++) chars[i] = correctDigitToLetter(chars[i]);

    // Pos 4-9: Date (Digits)
    for (let i = 4; i <= 9; i++) chars[i] = correctLetterToDigit(chars[i]);

    // Pos 10: Gender (H/M)
    if (chars[10] === '4' || chars[10] === 'A') chars[10] = 'H';
    else if (chars[10] === 'N' || chars[10] === 'W') chars[10] = 'M';

    // Pos 11-12: State code (Letters)
    chars[11] = correctDigitToLetter(chars[11]);
    chars[12] = correctDigitToLetter(chars[12]);

    // Pos 13-15: Internal consonants (Letters)
    for (let i = 13; i <= 15; i++) chars[i] = correctDigitToLetter(chars[i]);

    // Pos 16: Century differentiator (0-9 for 1900s, A-Z for 2000s)
    const yearShort = (chars[4].charCodeAt(0) - 48) * 10 + (chars[5].charCodeAt(0) - 48);
    if (yearShort > 26) {
        chars[16] = correctLetterToDigit(chars[16]);
    }

    // Pos 17: Check digit (Digit)
    chars[17] = correctLetterToDigit(chars[17]);

    return chars.join('');
}

export function parseBirthDateFromCurp(curp: string): string | null {
    const clean = sanitizeCurpOcr(curp);
    if (!validateCurpFormat(clean)) return null;

    const yearStr = clean.substring(4, 6);
    const monthStr = clean.substring(6, 8);
    const dayStr = clean.substring(8, 10);
    
    let year = parseInt(yearStr, 10);
    const pos16 = clean.charAt(16);
    if (pos16 >= '0' && pos16 <= '9') {
        year += 1900;
    } else {
        year += 2000;
    }

    return `${year}-${monthStr}-${dayStr}`;
}

export function validateCurpFormat(curp: string, checkDigitStrict = false): boolean {
    if (!curp || curp.length !== 18) return false;
    const upper = curp.toUpperCase();
    
    if (!CURP_REGEX.test(upper)) return false;

    const stateCode = upper.substring(11, 13);
    if (!VALID_STATES.has(stateCode)) return false;

    if (checkDigitStrict) {
        const expected = calculateRenapoCheckDigit(upper.substring(0, 17));
        return expected !== null && upper.charAt(17) === expected;
    }

    return true;
}

export function calculateAgeFromCurp(curp: string): number | null {
    const birthDateStr = parseBirthDateFromCurp(curp);
    if (!birthDateStr) return null;

    const birthDate = new Date(birthDateStr);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}
