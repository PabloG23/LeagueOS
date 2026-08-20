package com.leagueos.modules.registration.service;

import java.time.LocalDate;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * High-performance, O(1) time and space complexity utility for CURP sanitization,
 * validation, and verification based on official RENAPO standards and Mexican INE specifications.
 */
public final class CurpUtils {

    private CurpUtils() {}

    // Pre-compiled regex for fast structure matching
    private static final Pattern CURP_PATTERN =
            Pattern.compile("^[A-Z]{4}[0-9]{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z0-9][0-9]$");

    // 32 Mexican states + NE (Nacido en el Extranjero)
    private static final Set<String> VALID_STATES = Set.of(
            "AS", "BC", "BS", "CC", "CL", "CM", "CS", "CH", "DF", "DG",
            "GT", "GR", "HG", "JC", "MC", "MN", "MS", "NT", "NL", "OC",
            "PL", "QT", "QR", "SP", "SL", "SR", "TC", "TS", "TL", "VZ",
            "YN", "ZS", "NE"
    );

    // ASCII lookup table for RENAPO dictionary mapping: '0'-'9' (0-9), 'A'-'Z' (10-36, Ñ=24)
    // Direct indexing in O(1) time with 0 heap allocation.
    private static final int[] RENAPO_DICT = new int[128];

    static {
        for (int i = 0; i < 128; i++) {
            RENAPO_DICT[i] = -1;
        }
        for (char c = '0'; c <= '9'; c++) {
            RENAPO_DICT[c] = c - '0';
        }
        // 'A' to 'N' -> 10 to 23
        for (char c = 'A'; c <= 'N'; c++) {
            RENAPO_DICT[c] = 10 + (c - 'A');
        }
        // 'O' to 'Z' -> 25 to 36 (RENAPO reserves 24 for 'Ñ')
        for (char c = 'O'; c <= 'Z'; c++) {
            RENAPO_DICT[c] = 25 + (c - 'O');
        }
    }

    /**
     * Sanitizes common OCR confusions based on the strict positional anatomy of a CURP.
     * Complexity: O(1) time (exactly 18 characters), O(1) memory.
     */
    public static String sanitizeOcr(String rawCurp) {
        if (rawCurp == null) return null;
        String trimmed = rawCurp.trim().toUpperCase();
        if (trimmed.length() != 18) return trimmed;

        char[] chars = trimmed.toCharArray();

        // Pos 0-3: First 4 must be letters (Initials)
        for (int i = 0; i < 4; i++) {
            chars[i] = correctDigitToLetter(chars[i]);
        }

        // Pos 4-9: 6 digits (Birth date: YYMMDD)
        for (int i = 4; i <= 9; i++) {
            chars[i] = correctLetterToDigit(chars[i]);
        }

        // Pos 10: Gender (H or M)
        if (chars[10] == '4' || chars[10] == 'A') chars[10] = 'H';
        else if (chars[10] == 'N' || chars[10] == 'W') chars[10] = 'M';

        // Pos 11-12: State code (2 letters)
        chars[11] = correctDigitToLetter(chars[11]);
        chars[12] = correctDigitToLetter(chars[12]);

        // Pos 13-15: Internal consonants (3 letters)
        for (int i = 13; i <= 15; i++) {
            chars[i] = correctDigitToLetter(chars[i]);
        }

        // Pos 16: Century differentiator (0-9 for 1900s, A-Z for 2000s)
        // If the birth year (pos 4-5) is likely 19xx (> current short year 26), pos 16 must be a digit.
        int yearShort = (chars[4] - '0') * 10 + (chars[5] - '0');
        if (yearShort > 26) {
            chars[16] = correctLetterToDigit(chars[16]);
        }

        // Pos 17: Check digit (Must be digit 0-9)
        chars[17] = correctLetterToDigit(chars[17]);

        return new String(chars);
    }

    /**
     * Calculates the official RENAPO verification check digit (position 18, 0-indexed pos 17).
     * Returns a digit char '0'-'9', or null if characters are invalid.
     */
    public static Character calculateCheckDigit(CharSequence curp17) {
        if (curp17 == null || curp17.length() < 17) return null;

        int sum = 0;
        for (int i = 0; i < 17; i++) {
            char c = curp17.charAt(i);
            if (c >= 128) return null;
            int val = (c == 'Ñ' || c == 'ñ') ? 24 : RENAPO_DICT[c];
            if (val < 0) return null;
            sum += val * (18 - i);
        }

        int remainder = sum % 10;
        int checkDigit = (10 - remainder) % 10;
        return (char) ('0' + checkDigit);
    }

    /**
     * Validates if a CURP is strictly valid:
     * 1. 18 characters
     * 2. Matches official format regex
     * 3. Valid Mexican state code
     * 4. Correct RENAPO verification digit
     */
    public static boolean isValid(String curp) {
        if (curp == null || curp.length() != 18) return false;

        String upper = curp.toUpperCase();
        if (!CURP_PATTERN.matcher(upper).matches()) {
            return false;
        }

        String stateCode = upper.substring(11, 13);
        if (!VALID_STATES.contains(stateCode)) {
            return false;
        }

        Character expectedCheck = calculateCheckDigit(upper.substring(0, 17));
        return expectedCheck != null && upper.charAt(17) == expectedCheck;
    }

    /**
     * Checks if the CURP birth date (characters 4-9: YYMMDD) matches the provided LocalDate.
     */
    public static boolean matchesBirthDate(String curp, LocalDate birthDate) {
        if (curp == null || curp.length() < 10 || birthDate == null) return false;

        int year = birthDate.getYear() % 100;
        int month = birthDate.getMonthValue();
        int day = birthDate.getDayOfMonth();

        String expectedDateStr = String.format("%02d%02d%02d", year, month, day);
        return curp.substring(4, 10).equalsIgnoreCase(expectedDateStr);
    }

    /**
     * Checks if the CURP gender char (character 10) matches the given sex.
     */
    public static boolean matchesSex(String curp, String sex) {
        if (curp == null || curp.length() < 11 || sex == null || sex.isEmpty()) return true;
        char sexChar = Character.toUpperCase(sex.trim().charAt(0));
        char curpSexChar = Character.toUpperCase(curp.charAt(10));
        return curpSexChar == sexChar;
    }

    /**
     * Repairs and sanitizes CURP using extracted context (birthDate, sex) and OCR fixes.
     */
    public static String cleanAndRepair(String rawCurp, LocalDate birthDate, String sex) {
        if (rawCurp == null) return null;

        String sanitized = sanitizeOcr(rawCurp);
        if (sanitized.length() != 18) return sanitized;

        char[] chars = sanitized.toCharArray();

        // If birthDate is known, enforce exact YYMMDD in positions 4-9
        if (birthDate != null) {
            int year = birthDate.getYear() % 100;
            int month = birthDate.getMonthValue();
            int day = birthDate.getDayOfMonth();
            String dateDigits = String.format("%02d%02d%02d", year, month, day);
            for (int i = 0; i < 6; i++) {
                chars[4 + i] = dateDigits.charAt(i);
            }
        }

        // If sex is known (H/M), enforce in position 10
        if (sex != null && !sex.isEmpty()) {
            char s = Character.toUpperCase(sex.trim().charAt(0));
            if (s == 'H' || s == 'M') {
                chars[10] = s;
            }
        }

        // Recompute check digit to fix any OCR confusion on the final digit
        Character checkDigit = calculateCheckDigit(new String(chars, 0, 17));
        if (checkDigit != null) {
            chars[17] = checkDigit;
        }

        return new String(chars);
    }

    private static char correctDigitToLetter(char c) {
        return switch (c) {
            case '0' -> 'O';
            case '1' -> 'I';
            case '2' -> 'Z';
            case '5' -> 'S';
            case '8' -> 'B';
            default -> c;
        };
    }

    private static char correctLetterToDigit(char c) {
        return switch (c) {
            case 'O', 'o', 'Q', 'D' -> '0';
            case 'I', 'i', 'l', 'L', '|' -> '1';
            case 'Z', 'z' -> '2';
            case 'S', 's' -> '5';
            case 'B', 'b' -> '8';
            case 'G' -> '6';
            default -> c;
        };
    }
}
