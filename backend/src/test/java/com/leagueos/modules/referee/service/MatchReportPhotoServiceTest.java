package com.leagueos.modules.referee.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.SoccerField;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.media.service.StorageService;
import com.leagueos.modules.referee.api.dto.RefereeMatchDTO;
import com.leagueos.modules.referee.domain.Referee;
import com.leagueos.modules.referee.persistence.RefereeRepository;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MatchReportPhotoService — Match Report Photo Upload & Tenant Isolation")
class MatchReportPhotoServiceTest {

    @Mock private MatchRepository matchRepository;
    @Mock private RefereeRepository refereeRepository;
    @Mock private StorageService storageService;

    @InjectMocks
    private MatchReportPhotoService matchReportPhotoService;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID TENANT_B = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private UUID refereeUserId;
    private Referee referee;
    private UUID matchId;
    private Match match;
    private Team homeTeam;
    private Team awayTeam;

    @BeforeEach
    void setUp() {
        refereeUserId = UUID.randomUUID();
        referee = new Referee();
        referee.setId(UUID.randomUUID());
        referee.setUserId(refereeUserId);
        referee.setName("Armando Archundia");
        referee.setTenantId(TENANT_A);

        homeTeam = new Team();
        homeTeam.setId(UUID.randomUUID());
        homeTeam.setName("Tigres");
        homeTeam.setLogoUrl("logos/tigres.png");

        awayTeam = new Team();
        awayTeam.setId(UUID.randomUUID());
        awayTeam.setName("Rayados");
        awayTeam.setLogoUrl("logos/rayados.png");

        matchId = UUID.randomUUID();
        match = new Match();
        match.setId(matchId);
        match.setTenantId(TENANT_A);
        match.setReferee(referee);
        match.setHomeTeam(homeTeam);
        match.setAwayTeam(awayTeam);
        match.setMatchday(5);
        match.setMatchDate(LocalDateTime.now());
        match.setStatus(Match.MatchStatus.SCHEDULED);
    }

    // =========================================================================
    // getMyMatches
    // =========================================================================

    @Nested
    @DisplayName("getMyMatches")
    class GetMyMatches {

        @Test
        @DisplayName("should return matches assigned to current referee and tenant")
        void returnsMyMatches() {
            SoccerField field = new SoccerField();
            field.setName("Estadio Universitario");
            match.setField(field);
            match.setReportPhotoUrl("tenant/referees/matchReport/J5_tigres_vs_rayados.jpg");

            when(refereeRepository.findByUserId(refereeUserId)).thenReturn(Optional.of(referee));
            when(matchRepository.findAll()).thenReturn(List.of(match));
            when(storageService.getSignedUrl(eq("logos/tigres.png"), anyInt())).thenReturn("https://signed/tigres.png");
            when(storageService.getSignedUrl(eq("logos/rayados.png"), anyInt())).thenReturn("https://signed/rayados.png");
            when(storageService.getSignedUrl(eq("tenant/referees/matchReport/J5_tigres_vs_rayados.jpg"), anyInt())).thenReturn("https://signed/report.jpg");

            List<RefereeMatchDTO> matches = matchReportPhotoService.getMyMatches(refereeUserId, TENANT_A);

            assertThat(matches).hasSize(1);
            assertThat(matches.get(0).getHomeTeamName()).isEqualTo("Tigres");
            assertThat(matches.get(0).getAwayTeamName()).isEqualTo("Rayados");
            assertThat(matches.get(0).getFieldName()).isEqualTo("Estadio Universitario");
            assertThat(matches.get(0).getReportPhotoSignedUrl()).isEqualTo("https://signed/report.jpg");
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when tenant does not match referee tenant")
        void throwsWhenTenantMismatch() {
            when(refereeRepository.findByUserId(refereeUserId)).thenReturn(Optional.of(referee));

            assertThatThrownBy(() -> matchReportPhotoService.getMyMatches(refereeUserId, TENANT_B))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Unauthorized tenant access");
        }
    }

    // =========================================================================
    // uploadMatchReportPhoto
    // =========================================================================

    @Nested
    @DisplayName("uploadMatchReportPhoto")
    class UploadMatchReportPhoto {

        @Test
        @DisplayName("should upload match report photo and delete old report photo if present")
        void uploadsPhotoAndDeleteOld() {
            match.setReportPhotoUrl("tenant/referees/matchReport/old_report.jpg");

            when(refereeRepository.findByUserId(refereeUserId)).thenReturn(Optional.of(referee));
            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(storageService.buildTenantKey(eq(TENANT_A), eq("referees/matchReport"), anyString()))
                    .thenReturn("tenant/referees/matchReport/new_key.jpg");
            when(matchRepository.save(any(Match.class))).thenAnswer(inv -> inv.getArgument(0));

            byte[] imageBytes = new byte[]{1, 2, 3};
            RefereeMatchDTO dto = matchReportPhotoService.uploadMatchReportPhoto(matchId, refereeUserId, imageBytes, "image/png", TENANT_A);

            verify(storageService).deleteFile("tenant/referees/matchReport/old_report.jpg");
            verify(storageService).uploadFile(eq("tenant/referees/matchReport/new_key.jpg"), eq(imageBytes), eq("image/png"));
            assertThat(dto).isNotNull();
            assertThat(match.getReportPhotoUrl()).isEqualTo("tenant/referees/matchReport/new_key.jpg");
        }

        @Test
        @DisplayName("should throw IllegalArgumentException when referee is not assigned to the match")
        void throwsWhenNotAssignedReferee() {
            Referee otherRef = new Referee();
            otherRef.setId(UUID.randomUUID());
            match.setReferee(otherRef);

            when(refereeRepository.findByUserId(refereeUserId)).thenReturn(Optional.of(referee));
            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));

            byte[] imageBytes = new byte[]{1, 2, 3};
            assertThatThrownBy(() -> matchReportPhotoService.uploadMatchReportPhoto(matchId, refereeUserId, imageBytes, "image/jpeg", TENANT_A))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("You are not assigned as the referee");
        }
    }

    // =========================================================================
    // getMatchReportSignedUrl
    // =========================================================================

    @Nested
    @DisplayName("getMatchReportSignedUrl")
    class GetMatchReportSignedUrl {

        @Test
        @DisplayName("should return signed URL for match report photo")
        void returnsSignedUrl() {
            match.setReportPhotoUrl("tenant/referees/matchReport/report.jpg");

            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));
            when(storageService.getSignedUrl("tenant/referees/matchReport/report.jpg", 60))
                    .thenReturn("https://signed/report.jpg");

            String url = matchReportPhotoService.getMatchReportSignedUrl(matchId, TENANT_A);

            assertThat(url).isEqualTo("https://signed/report.jpg");
        }

        @Test
        @DisplayName("should throw ResourceNotFoundException when no report photo uploaded")
        void throwsWhenNoReportPhoto() {
            match.setReportPhotoUrl(null);
            when(matchRepository.findById(matchId)).thenReturn(Optional.of(match));

            assertThatThrownBy(() -> matchReportPhotoService.getMatchReportSignedUrl(matchId, TENANT_A))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("No report photo uploaded");
        }
    }
}
