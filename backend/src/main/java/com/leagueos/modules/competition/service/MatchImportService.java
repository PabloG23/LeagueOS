package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.shared.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchImportService {

    private final MatchRepository matchRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;
    private final SeasonRepository seasonRepository;

    @Transactional
    public List<Match> importMatchesFromExcel(String seasonId, MultipartFile file) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID parsedSeasonId = UUID.fromString(seasonId);
        Season season = seasonRepository.findByIdAndTenantId(parsedSeasonId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Season not found"));

        if (matchRepository.existsBySeasonIdAndTenantId(parsedSeasonId, tenantId)) {
            throw new IllegalStateException("Este torneo ya tiene un calendario cargado. Si deseas subir uno nuevo, por favor elimina este torneo y crea uno nuevo.");
        }

        List<Match> importedMatches = new ArrayList<>();
        List<TeamRegistration> enrolledTeams = teamRegistrationRepository.findBySeasonIdAndStatus(
                parsedSeasonId, TeamRegistration.RegistrationStatus.APPROVED);

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

            for (Row row : sheet) {
                if (row.getRowNum() == 0) continue; // Skip header

                if (row.getCell(0) == null || row.getCell(1) == null || row.getCell(2) == null) continue;

                int matchday = getCellValueAsInt(row.getCell(0));
                String homeTeamName = getCellValueAsString(row.getCell(1));
                String awayTeamName = getCellValueAsString(row.getCell(2));

                if (homeTeamName.isBlank() || awayTeamName.isBlank()) continue;

                // Skip the template example row
                if (homeTeamName.equalsIgnoreCase("FC Ejemplo Local") && awayTeamName.equalsIgnoreCase("FC Ejemplo Visitante")) {
                    continue;
                }

                TeamRegistration homeReg = findTeamRegistrationByName(enrolledTeams, homeTeamName)
                        .orElseThrow(() -> new IllegalArgumentException(
                                String.format("Fila %d: El equipo local '%s' no está inscrito y aprobado en este torneo.",
                                        row.getRowNum() + 1, homeTeamName)));

                TeamRegistration awayReg = findTeamRegistrationByName(enrolledTeams, awayTeamName)
                        .orElseThrow(() -> new IllegalArgumentException(
                                String.format("Fila %d: El equipo visitante '%s' no está inscrito y aprobado en este torneo.",
                                        row.getRowNum() + 1, awayTeamName)));

                Match match = new Match();
                match.setTenantId(tenantId);
                match.setSeason(season);
                match.setMatchday(matchday);
                match.setHomeTeam(homeReg.getTeam());
                match.setAwayTeam(awayReg.getTeam());
                match.setStatus(Match.MatchStatus.SCHEDULED);

                parseDateCell(row, 3, formatter).ifPresent(match::setMatchDate);

                importedMatches.add(match);
            }

            return matchRepository.saveAll(importedMatches);

        } catch (IllegalArgumentException | IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error al procesar el archivo Excel: " + e.getMessage(), e);
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Optional<TeamRegistration> findTeamRegistrationByName(List<TeamRegistration> registrations, String name) {
        return registrations.stream()
                .filter(reg -> reg.getTeam().getName().equalsIgnoreCase(name))
                .findFirst();
    }

    private Optional<LocalDateTime> parseDateCell(Row row, int cellIndex, DateTimeFormatter formatter) {
        Cell cell = row.getCell(cellIndex);
        if (cell == null) return Optional.empty();
        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                return Optional.of(cell.getLocalDateTimeCellValue());
            }
            String dateStr = getCellValueAsString(cell);
            if (!dateStr.isBlank()) {
                return Optional.of(LocalDate.parse(dateStr, formatter).atStartOfDay());
            }
        } catch (Exception e) {
            log.warn("Could not parse date cell at row {}, column {}: {}", row.getRowNum(), cellIndex, e.getMessage());
        }
        return Optional.empty();
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue().trim();
        if (cell.getCellType() == CellType.NUMERIC) return String.valueOf((int) cell.getNumericCellValue());
        return "";
    }

    private int getCellValueAsInt(Cell cell) {
        if (cell == null) return 0;
        if (cell.getCellType() == CellType.NUMERIC) return (int) cell.getNumericCellValue();
        if (cell.getCellType() == CellType.STRING) {
            try {
                return Integer.parseInt(cell.getStringCellValue().trim());
            } catch (NumberFormatException e) {
                log.warn("Could not parse numeric cell value: '{}'", cell.getStringCellValue());
                return 0;
            }
        }
        return 0;
    }
}
