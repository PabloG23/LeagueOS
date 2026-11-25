package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.api.dto.PlayoffSheetDataDTO;
import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchStage;
import com.leagueos.modules.competition.persistence.MatchEventRepository;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.registration.api.dto.PlayerResponse;
import com.leagueos.modules.registration.service.PlayerRegistrationService;
import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.service.TenantSettingsService;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlayoffSheetService {
    private final MatchRepository matchRepository;
    private final MatchEventRepository matchEventRepository;
    private final PlayerRegistrationService playerRegistrationService;
    private final TenantSettingsService tenantSettingsService;

    @Transactional(readOnly = true)
    public PlayoffSheetDataDTO getEligibleRosters(UUID matchId, UUID tenantId) {
        Match match = matchRepository.findById(matchId)
                .filter(m -> tenantId.equals(m.getTenantId()))
                .orElseThrow(() -> new ResourceNotFoundException("Playoff match not found: " + matchId));
        if (match.getStage() != MatchStage.PLAYOFFS) {
            throw new IllegalArgumentException("Match is not part of the playoffs");
        }

        TenantSettings settings = tenantSettingsService.getCurrentSettings();
        int minimum = Math.max(0, settings.getMinMatchesForPlayoffs() == null ? 0 : settings.getMinMatchesForPlayoffs());
        UUID seasonId = match.getSeason().getId();
        List<PlayerResponse> homeRoster = eligiblePlayers(seasonId, match.getHomeTeam().getId(), minimum);
        List<PlayerResponse> awayRoster = eligiblePlayers(seasonId, match.getAwayTeam().getId(), minimum);
        return new PlayoffSheetDataDTO(homeRoster, awayRoster, minimum, seasonId);
    }

    private List<PlayerResponse> eligiblePlayers(UUID seasonId, UUID teamId, int minimum) {
        Map<UUID, Long> appearances = matchEventRepository.countRegularSeasonAppearancesByTeam(seasonId, teamId).stream()
                .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
        return playerRegistrationService.getPlayersByTeamAndSeason(teamId, seasonId).stream()
                .filter(player -> appearances.getOrDefault(player.getId(), 0L) >= minimum)
                .toList();
    }
}
