package com.leagueos.modules.competition.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Lightweight DTO for a fixture preview entry.
 * Contains no JPA entity references — safe for direct JSON serialization.
 * matchDate is intentionally null so the frontend shows "Por definir".
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class MatchPreviewDTO {
    private int matchday;
    private UUID homeTeamId;
    private String homeTeamName;
    private UUID awayTeamId;
    private String awayTeamName;
    /** Always null in preview — dates are assigned manually by the admin after generation. */
    private String matchDate;
}
