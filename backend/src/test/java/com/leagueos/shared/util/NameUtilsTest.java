package com.leagueos.shared.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class NameUtilsTest {

    @Test
    @DisplayName("Should match identical names with accents/case differences")
    void testExactMatchWithAccents() {
        assertTrue(NameUtils.isNameCompatible("Santiago", "Giménez", "SANTIAGO", "GIMENEZ"));
    }

    @Test
    @DisplayName("Should match names with minor typos (Gimenez vs Jimenez)")
    void testMinorTypoMatch() {
        assertTrue(NameUtils.isNameCompatible("Santiago", "Jimenez", "Santiago", "Giménez"));
    }

    @Test
    @DisplayName("Should match when INE has full compound names and second surname")
    void testCompoundNameAndSecondSurname() {
        assertTrue(NameUtils.isNameCompatible("Edson", "Alvarez", "Edson Omar", "Álvarez Velázquez"));
        assertTrue(NameUtils.isNameCompatible("Guillermo", "Ochoa", "Francisco Guillermo", "Ochoa Magaña"));
    }

    @Test
    @DisplayName("Should reject completely different persons")
    void testCompletelyDifferentPerson() {
        assertFalse(NameUtils.isNameCompatible("Santiago", "Giménez", "Juan Carlos", "Pérez López"));
        assertFalse(NameUtils.isNameCompatible("Alexis", "Vega", "Carlos", "Rodríguez"));
        assertFalse(NameUtils.isNameCompatible("Guillermo", "Ochoa", "Guillermo", "Martínez"));
    }
}
