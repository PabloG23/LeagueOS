package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.shared.context.TenantContext;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MatchImportService — Excel Match Import Unit Tests")
class MatchImportServiceTest {

    @Mock private MatchRepository matchRepository;
    @Mock private TeamRegistrationRepository teamRegistrationRepository;
    @Mock private SeasonRepository seasonRepository;

    @InjectMocks
    private MatchImportService matchImportService;

    private static final UUID TENANT_A = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private UUID seasonId;
    private Season season;
    private Team teamHome;
    private Team teamAway;
    private TeamRegistration regHome;
    private TeamRegistration regAway;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(TENANT_A);

        seasonId = UUID.randomUUID();
        season = new Season();
        season.setId(seasonId);
        season.setTenantId(TENANT_A);

        teamHome = new Team();
        teamHome.setId(UUID.randomUUID());
        teamHome.setName("Tigres");

        teamAway = new Team();
        teamAway.setId(UUID.randomUUID());
        teamAway.setName("Rayados");

        regHome = new TeamRegistration();
        regHome.setTeam(teamHome);
        regHome.setStatus(TeamRegistration.RegistrationStatus.APPROVED);

        regAway = new TeamRegistration();
        regAway.setTeam(teamAway);
        regAway.setStatus(TeamRegistration.RegistrationStatus.APPROVED);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private byte[] createExcelBytes(List<List<String>> rows) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Partidos");
            int rIdx = 0;
            for (List<String> rowData : rows) {
                Row row = sheet.createRow(rIdx++);
                for (int cIdx = 0; cIdx < rowData.size(); cIdx++) {
                    row.createCell(cIdx).setCellValue(rowData.get(cIdx));
                }
            }
            workbook.write(baos);
            return baos.toByteArray();
        }
    }

    @Test
    @DisplayName("should import matches successfully from Excel file")
    void importsMatchesSuccessfully() throws Exception {
        when(seasonRepository.findByIdAndTenantId(seasonId, TENANT_A)).thenReturn(Optional.of(season));
        when(matchRepository.existsBySeasonIdAndTenantId(seasonId, TENANT_A)).thenReturn(false);
        when(teamRegistrationRepository.findBySeasonIdAndStatus(seasonId, TeamRegistration.RegistrationStatus.APPROVED))
                .thenReturn(List.of(regHome, regAway));
        when(matchRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        List<List<String>> rows = List.of(
                List.of("Jornada", "Local", "Visitante", "Fecha"), // Header
                List.of("1", "FC Ejemplo Local", "FC Ejemplo Visitante", "15/03/2026"), // Template example (skipped)
                List.of("1", "Tigres", "Rayados", "20/03/2026")
        );

        byte[] excelBytes = createExcelBytes(rows);
        MockMultipartFile file = new MockMultipartFile("file", "partidos.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelBytes);

        List<Match> imported = matchImportService.importMatchesFromExcel(seasonId.toString(), file);

        assertThat(imported).hasSize(1);
        assertThat(imported.get(0).getHomeTeam().getName()).isEqualTo("Tigres");
        assertThat(imported.get(0).getAwayTeam().getName()).isEqualTo("Rayados");
        assertThat(imported.get(0).getMatchday()).isEqualTo(1);
    }

    @Test
    @DisplayName("should throw IllegalStateException when season already has matches loaded")
    void throwsWhenMatchesAlreadyExist() {
        when(seasonRepository.findByIdAndTenantId(seasonId, TENANT_A)).thenReturn(Optional.of(season));
        when(matchRepository.existsBySeasonIdAndTenantId(seasonId, TENANT_A)).thenReturn(true);

        MockMultipartFile file = new MockMultipartFile("file", "partidos.xlsx", "text/plain", new byte[0]);

        assertThatThrownBy(() -> matchImportService.importMatchesFromExcel(seasonId.toString(), file))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Este torneo ya tiene un calendario cargado");
    }

    @Test
    @DisplayName("should throw IllegalArgumentException when home team is not registered in season")
    void throwsWhenHomeTeamNotRegistered() throws Exception {
        when(seasonRepository.findByIdAndTenantId(seasonId, TENANT_A)).thenReturn(Optional.of(season));
        when(matchRepository.existsBySeasonIdAndTenantId(seasonId, TENANT_A)).thenReturn(false);
        when(teamRegistrationRepository.findBySeasonIdAndStatus(seasonId, TeamRegistration.RegistrationStatus.APPROVED))
                .thenReturn(List.of(regAway)); // Only away team registered

        List<List<String>> rows = List.of(
                List.of("Jornada", "Local", "Visitante", "Fecha"),
                List.of("1", "Tigres", "Rayados", "20/03/2026")
        );

        byte[] excelBytes = createExcelBytes(rows);
        MockMultipartFile file = new MockMultipartFile("file", "partidos.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelBytes);

        assertThatThrownBy(() -> matchImportService.importMatchesFromExcel(seasonId.toString(), file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("El equipo local 'Tigres' no está inscrito");
    }

    @Test
    @DisplayName("should throw IllegalArgumentException when away team is not registered in season")
    void throwsWhenAwayTeamNotRegistered() throws Exception {
        when(seasonRepository.findByIdAndTenantId(seasonId, TENANT_A)).thenReturn(Optional.of(season));
        when(matchRepository.existsBySeasonIdAndTenantId(seasonId, TENANT_A)).thenReturn(false);
        when(teamRegistrationRepository.findBySeasonIdAndStatus(seasonId, TeamRegistration.RegistrationStatus.APPROVED))
                .thenReturn(List.of(regHome)); // Only home team registered

        List<List<String>> rows = List.of(
                List.of("Jornada", "Local", "Visitante", "Fecha"),
                List.of("1", "Tigres", "Rayados", "20/03/2026")
        );

        byte[] excelBytes = createExcelBytes(rows);
        MockMultipartFile file = new MockMultipartFile("file", "partidos.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelBytes);

        assertThatThrownBy(() -> matchImportService.importMatchesFromExcel(seasonId.toString(), file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("El equipo visitante 'Rayados' no está inscrito");
    }

    @Test
    @DisplayName("should handle numeric matchdays, empty rows, invalid date cells and unparseable rows gracefully")
    void handlesVariousCellTypesGracefully() throws Exception {
        when(seasonRepository.findByIdAndTenantId(seasonId, TENANT_A)).thenReturn(Optional.of(season));
        when(matchRepository.existsBySeasonIdAndTenantId(seasonId, TENANT_A)).thenReturn(false);
        when(teamRegistrationRepository.findBySeasonIdAndStatus(seasonId, TeamRegistration.RegistrationStatus.APPROVED))
                .thenReturn(List.of(regHome, regAway));
        when(matchRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Partidos");

            // Row 0: Header
            Row r0 = sheet.createRow(0);
            r0.createCell(0).setCellValue("Jornada");

            // Row 1: Empty / partial row (should skip)
            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue(1);

            // Row 2: Blank team names (should skip)
            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue(2);
            r2.createCell(1).setCellValue("   ");
            r2.createCell(2).setCellValue("");

            // Row 3: Valid row with numeric matchday and text date
            Row r3 = sheet.createRow(3);
            r3.createCell(0).setCellValue(1); // Numeric cell type
            r3.createCell(1).setCellValue("Tigres");
            r3.createCell(2).setCellValue("Rayados");
            r3.createCell(3).setCellValue("20/03/2026");

            // Row 4: Valid row with string matchday and invalid date string (falls back to empty date)
            Row r4 = sheet.createRow(4);
            r4.createCell(0).setCellValue("2"); // String cell type
            r4.createCell(1).setCellValue("Rayados");
            r4.createCell(2).setCellValue("Tigres");
            r4.createCell(3).setCellValue("FECHA_INVALIDA");

            workbook.write(baos);

            MockMultipartFile file = new MockMultipartFile("file", "partidos.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", baos.toByteArray());

            List<Match> imported = matchImportService.importMatchesFromExcel(seasonId.toString(), file);

            assertThat(imported).hasSize(2);
            assertThat(imported.get(0).getMatchday()).isEqualTo(1);
            assertThat(imported.get(0).getMatchDate()).isNotNull();
            assertThat(imported.get(1).getMatchday()).isEqualTo(2);
            assertThat(imported.get(1).getMatchDate()).isNull();
        }
    }
}
