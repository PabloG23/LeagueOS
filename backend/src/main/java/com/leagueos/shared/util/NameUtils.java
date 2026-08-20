package com.leagueos.shared.util;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;

public final class NameUtils {

    private NameUtils() {}

    public static String normalize(String str) {
        if (str == null) return "";
        String normalized = Normalizer.normalize(str.trim().toLowerCase(), Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "").replaceAll("[^a-z0-9 ]", " ").replaceAll("\\s+", " ").trim();
    }

    public static int levenshteinDistance(String a, String b) {
        if (a == null || b == null) return 0;
        int[] costs = new int[b.length() + 1];
        for (int j = 0; j < costs.length; j++) costs[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            costs[0] = i;
            int nw = i - 1;
            for (int j = 1; j <= b.length(); j++) {
                int cj = Math.min(1 + Math.min(costs[j], costs[j - 1]),
                        a.charAt(i - 1) == b.charAt(j - 1) ? nw : nw + 1);
                nw = costs[j];
                costs[j] = cj;
            }
        }
        return costs[b.length()];
    }

    public static boolean tokenMatches(String tokenA, String tokenB) {
        if (tokenA.isEmpty() || tokenB.isEmpty()) return false;
        if (tokenA.equals(tokenB)) return true;
        int maxLen = Math.max(tokenA.length(), tokenB.length());
        int allowedDistance = maxLen > 4 ? 2 : (maxLen > 2 ? 1 : 0);
        return levenshteinDistance(tokenA, tokenB) <= allowedDistance;
    }

    public static boolean isNameCompatible(String existingFirst, String existingLast, String newFirst, String newLast) {
        String normExistFirst = normalize(existingFirst);
        String normExistLast = normalize(existingLast);
        String normNewFirst = normalize(newFirst);
        String normNewLast = normalize(newLast);

        List<String> existFirstTokens = Arrays.stream(normExistFirst.split(" ")).filter(s -> !s.isEmpty()).toList();
        List<String> existLastTokens = Arrays.stream(normExistLast.split(" ")).filter(s -> !s.isEmpty()).toList();
        List<String> newFirstTokens = Arrays.stream(normNewFirst.split(" ")).filter(s -> !s.isEmpty()).toList();
        List<String> newLastTokens = Arrays.stream(normNewLast.split(" ")).filter(s -> !s.isEmpty()).toList();

        // 1. First name match: at least one token from existing first name must match one token from new first name
        boolean firstMatch = false;
        if (existFirstTokens.isEmpty() || newFirstTokens.isEmpty()) {
            firstMatch = true;
        } else {
            for (String ef : existFirstTokens) {
                for (String nf : newFirstTokens) {
                    if (tokenMatches(ef, nf)) {
                        firstMatch = true;
                        break;
                    }
                }
                if (firstMatch) break;
            }
        }

        // 2. Last name match: if existing last name is provided, at least one token must match
        boolean lastMatch = false;
        if (existLastTokens.isEmpty()) {
            lastMatch = true;
        } else {
            for (String el : existLastTokens) {
                for (String nl : newLastTokens) {
                    if (tokenMatches(el, nl)) {
                        lastMatch = true;
                        break;
                    }
                }
                if (lastMatch) break;
            }
        }

        return firstMatch && lastMatch;
    }
}
