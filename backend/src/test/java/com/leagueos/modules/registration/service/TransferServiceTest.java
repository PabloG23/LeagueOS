package com.leagueos.modules.registration.service;

import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.SeasonStatus;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.registration.domain.Player;
import com.leagueos.modules.registration.domain.PlayerStatus;
import com.leagueos.modules.registration.domain.SeasonRoster;
import com.leagueos.modules.registration.persistence.PlayerRepository;
import com.leagueos.modules.registration.persistence.SeasonRosterRepository;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TransferService — Player Team Transfers & Status Management")
class TransferServiceTest {

    @Mock private PlayerRepository playerRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private SeasonRosterRepository seasonRosterRepository;
    @Mock private SeasonRepository seasonRepository;

    @InjectMocks
    private TransferService transferService;

    private UUID playerId;
    private UUID oldTeamId;
    private UUID newTeamId;
    private Player player;
    private Team oldTeam;
    private Team newTeam;
    private Season activeSeason;
    private SeasonRoster roster;

    @BeforeEach
    void setUp() {
        playerId = UUID.randomUUID();
        oldTeamId = UUID.randomUUID();
        newTeamId = UUID.randomUUID();

        player = new Player();
        player.setId(playerId);

        oldTeam = new Team();
        oldTeam.setId(oldTeamId);
        oldTeam.setName("Santos");

        newTeam = new Team();
        newTeam.setId(newTeamId);
        newTeam.setName("Monterrey");

        activeSeason = new Season();
        activeSeason.setId(UUID.randomUUID());
        activeSeason.setStatus(SeasonStatus.ACTIVE);

        roster = new SeasonRoster();
        roster.setId(UUID.randomUUID());
        roster.setPlayer(player);
        roster.setTeam(oldTeam);
        roster.setSeason(activeSeason);
        roster.setStatus(PlayerStatus.ACTIVE);
    }

    // =========================================================================
    // transferPlayer
    // =========================================================================

    @Nested
    @DisplayName("transferPlayer")
    class TransferPlayer {

        @Test
        @DisplayName("should transfer player to new team and set roster status to INACTIVE pending approval")
        void transfersPlayerSuccessfully() {
            when(playerRepository.findById(playerId)).thenReturn(Optional.of(player));
            when(teamRepository.findById(newTeamId)).thenReturn(Optional.of(newTeam));
            when(seasonRepository.findFirstByStatus(SeasonStatus.ACTIVE)).thenReturn(Optional.of(activeSeason));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId()))
                    .thenReturn(Optional.of(roster));

            transferService.transferPlayer(playerId, newTeamId);

            assertThat(roster.getTeam()).isEqualTo(newTeam);
            assertThat(roster.getStatus()).isEqualTo(PlayerStatus.INACTIVE);
            verify(seasonRosterRepository).save(roster);
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when player does not exist")
        void throwsWhenPlayerNotFound() {
            when(playerRepository.findById(playerId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> transferService.transferPlayer(playerId, newTeamId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Player not found");

            verify(seasonRosterRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when target team does not exist")
        void throwsWhenTeamNotFound() {
            when(playerRepository.findById(playerId)).thenReturn(Optional.of(player));
            when(teamRepository.findById(newTeamId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> transferService.transferPlayer(playerId, newTeamId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Team not found");

            verify(seasonRosterRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when no active season is found")
        void throwsWhenNoActiveSeason() {
            when(playerRepository.findById(playerId)).thenReturn(Optional.of(player));
            when(teamRepository.findById(newTeamId)).thenReturn(Optional.of(newTeam));
            when(seasonRepository.findFirstByStatus(SeasonStatus.ACTIVE)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> transferService.transferPlayer(playerId, newTeamId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("No active season found");

            verify(seasonRosterRepository, never()).save(any());
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when player has no roster in the active season")
        void throwsWhenNoRosterInSeason() {
            when(playerRepository.findById(playerId)).thenReturn(Optional.of(player));
            when(teamRepository.findById(newTeamId)).thenReturn(Optional.of(newTeam));
            when(seasonRepository.findFirstByStatus(SeasonStatus.ACTIVE)).thenReturn(Optional.of(activeSeason));
            when(seasonRosterRepository.findByPlayerIdAndSeasonId(playerId, activeSeason.getId()))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> transferService.transferPlayer(playerId, newTeamId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("Player does not have an active roster");

            verify(seasonRosterRepository, never()).save(any());
        }
    }
}
