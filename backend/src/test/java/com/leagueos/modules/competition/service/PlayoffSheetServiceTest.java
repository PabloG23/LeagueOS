package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.MatchStage;
import com.leagueos.modules.competition.persistence.MatchEventRepository;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.registration.api.dto.PlayerResponse;
import com.leagueos.modules.registration.service.PlayerRegistrationService;
import com.leagueos.modules.tenant.domain.TenantSettings;
import com.leagueos.modules.tenant.service.TenantSettingsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlayoffSheetServiceTest {
    @Mock private MatchRepository matchRepository;
    @Mock private MatchEventRepository matchEventRepository;
    @Mock private PlayerRegistrationService playerRegistrationService;
    @Mock private TenantSettingsService tenantSettingsService;
    @InjectMocks private PlayoffSheetService service;

    @Test
    void includesOnlyPlayersMeetingRegularSeasonMinimum() {
        UUID tenantId = UUID.randomUUID();
        UUID seasonId = UUID.randomUUID();
        UUID matchId = UUID.randomUUID();
        UUID homeId = UUID.randomUUID();
        UUID awayId = UUID.randomUUID();
        UUID eligibleId = UUID.randomUUID();
        UUID ineligibleId = UUID.randomUUID();

        Season season = new Season();
        season.setId(seasonId);
        Team home = new Team();
        home.setId(homeId);
        Team away = new Team();
        away.setId(awayId);
        Match match = new Match();
        match.setTenantId(tenantId);
        match.setSeason(season);
        match.setHomeTeam(home);
        match.setAwayTeam(away);
        match.setStage(MatchStage.PLAYOFFS);
        TenantSettings settings = new TenantSettings();
        settings.setMinMatchesForPlayoffs(5);
        PlayerResponse eligible = new PlayerResponse();
        eligible.setId(eligibleId);
        PlayerResponse ineligible = new PlayerResponse();
        ineligible.setId(ineligibleId);

        when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
        when(tenantSettingsService.getCurrentSettings()).thenReturn(settings);
        when(playerRegistrationService.getPlayersByTeamAndSeason(homeId, seasonId)).thenReturn(List.of(eligible, ineligible));
        when(playerRegistrationService.getPlayersByTeamAndSeason(awayId, seasonId)).thenReturn(List.of());
        when(matchEventRepository.countRegularSeasonAppearancesByTeam(seasonId, homeId))
                .thenReturn(List.of(new Object[]{eligibleId, 5L}, new Object[]{ineligibleId, 4L}));
        when(matchEventRepository.countRegularSeasonAppearancesByTeam(seasonId, awayId)).thenReturn(List.of());

        var result = service.getEligibleRosters(matchId, tenantId);

        assertThat(result.minimumMatches()).isEqualTo(5);
        assertThat(result.homeRoster()).extracting(PlayerResponse::getId).containsExactly(eligibleId);
        assertThat(result.awayRoster()).isEmpty();
    }
}
