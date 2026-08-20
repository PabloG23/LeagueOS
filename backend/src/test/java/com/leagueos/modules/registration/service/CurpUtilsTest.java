package com.leagueos.modules.registration.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class CurpUtilsTest {

    @Test
    @DisplayName("Should validate correct CURP and check digit")
    void testValidCurp() {
        // Compute check digit for base CURP
        String base = "GOMG890914HDFRRN0";
        Character checkDigit = CurpUtils.calculateCheckDigit(base);
        assertNotNull(checkDigit);

        String fullCurp = base + checkDigit;
        assertTrue(CurpUtils.isValid(fullCurp));
    }

    @Test
    @DisplayName("Should reject CURP with invalid check digit or format")
    void testInvalidCurp() {
        // Wrong check digit
        assertFalse(CurpUtils.isValid("GOMG890914HDFRRN09")); // If check digit is not 9
        // Wrong state
        assertFalse(CurpUtils.isValid("GOMG890914HXXRRN03"));
        // Wrong length
        assertFalse(CurpUtils.isValid("GOMG890914HDFRRN0"));
        assertFalse(CurpUtils.isValid(""));
        assertFalse(CurpUtils.isValid(null));
    }

    @Test
    @DisplayName("Should sanitize common OCR letter/digit confusions")
    void testSanitizeOcr() {
        // In date position: letter 'O' should be converted to '0', 'I' to '1'
        String ocrGlitched = "GOMG89O9I4HDFRRNO3";
        String sanitized = CurpUtils.sanitizeOcr(ocrGlitched);
        assertEquals("GOMG890914HDFRRN03", sanitized);

        // In initials position: number '0' should be converted to 'O'
        String ocrGlitchedInitials = "G0MG890914HDFRRN03";
        String sanitizedInitials = CurpUtils.sanitizeOcr(ocrGlitchedInitials);
        assertEquals("GOMG890914HDFRRN03", sanitizedInitials);
    }

    @Test
    @DisplayName("Should cross-validate birth date and gender")
    void testCrossValidation() {
        String curp = "GOMG890914HDFRRN03";
        LocalDate matchingDate = LocalDate.of(1989, 9, 14);
        LocalDate mismatchDate = LocalDate.of(1990, 5, 20);

        assertTrue(CurpUtils.matchesBirthDate(curp, matchingDate));
        assertFalse(CurpUtils.matchesBirthDate(curp, mismatchDate));

        assertTrue(CurpUtils.matchesSex(curp, "H"));
        assertTrue(CurpUtils.matchesSex(curp, "Hombre"));
        assertFalse(CurpUtils.matchesSex(curp, "M"));
    }

    @Test
    @DisplayName("Should clean and repair CURP using birth date and sex context")
    void testCleanAndRepair() {
        String rawBadCurp = "GOMG8909I4MDFRRNO9";
        LocalDate birthDate = LocalDate.of(1989, 9, 14);
        String sex = "H";

        String repaired = CurpUtils.cleanAndRepair(rawBadCurp, birthDate, sex);
        assertNotNull(repaired);
        assertEquals(18, repaired.length());
        assertEquals("890914", repaired.substring(4, 10));
        assertEquals('H', repaired.charAt(10));
        assertTrue(CurpUtils.isValid(repaired));
    }
}
