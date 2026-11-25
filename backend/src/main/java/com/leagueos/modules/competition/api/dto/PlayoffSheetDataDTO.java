package com.leagueos.modules.competition.api.dto;

import com.leagueos.modules.registration.api.dto.PlayerResponse;

import java.util.List;
import java.util.UUID;

public record PlayoffSheetDataDTO(
        List<PlayerResponse> homeRoster,
        List<PlayerResponse> awayRoster,
        int minimumMatches,
        UUID seasonId
) {
}
