package com.leagueos.shared.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("NameUtils — Name Normalization, Levenshtein Distance & OCR Compatibility")
class NameUtilsTest {

    @Test
    @DisplayName("Should normalize strings removing accents, whitespace, and special characters")
    void testNormalize() {
        assertThat(NameUtils.normalize("José María González-Pérez")).isEqualTo("jose maria gonzalez perez");
        assertThat(NameUtils.normalize("  MARÍA   DEL   CARMEN  ")).isEqualTo("maria del carmen");
        assertThat(NameUtils.normalize(null)).isEqualTo("");
    }

    @Test
    @DisplayName("Should compute edit distance accurately with Levenshtein")
    void testLevenshteinDistance() {
        assertThat(NameUtils.levenshteinDistance("carlos", "carlos")).isEqualTo(0);
        assertThat(NameUtils.levenshteinDistance("carlos", "karlos")).isEqualTo(1);
        assertThat(NameUtils.levenshteinDistance("gonzales", "gonzalez")).isEqualTo(1);
        assertThat(NameUtils.levenshteinDistance(null, "test")).isEqualTo(0);
        assertThat(NameUtils.levenshteinDistance("test", null)).isEqualTo(0);
    }

    @Test
    @DisplayName("Should match fuzzy tokens within distance threshold")
    void testTokenMatches() {
        assertThat(NameUtils.tokenMatches("gonzalez", "gonzales")).isTrue();
        assertThat(NameUtils.tokenMatches("carlos", "karlos")).isTrue();
        assertThat(NameUtils.tokenMatches("ana", "ana")).isTrue();
        assertThat(NameUtils.tokenMatches("", "carlos")).isFalse();
        assertThat(NameUtils.tokenMatches("carlos", "")).isFalse();
        assertThat(NameUtils.tokenMatches("roberto", "fernando")).isFalse();
    }

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
