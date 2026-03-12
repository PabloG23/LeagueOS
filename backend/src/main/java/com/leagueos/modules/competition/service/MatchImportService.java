package com.leagueos.modules.competition.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.shared.context.TenantContext;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
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

@Service
public class MatchImportService {

    private final MatchRepository matchRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;
    private final SeasonRepository seasonRepository;

    public MatchImportService(MatchRepository matchRepository, TeamRegistrationRepository teamRegistrationRepository, SeasonRepository seasonRepository) {
        this.matchRepository = matchRepository;
        this.teamRegistrationRepository = teamRegistrationRepository;
        this.seasonRepository = seasonRepository;
    }

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
        List<TeamRegistration> enrolledTeams = teamRegistrationRepository.findBySeasonIdAndStatus(parsedSeasonId, TeamRegistration.RegistrationStatus.APPROVED);

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");

            for (Row row : sheet) {
                if (row.getRowNum() == 0) {
                    continue; // Skip header row
                }

                // Matchday | Home Team | Away Team | Date Proposal (Optional)
                if (row.getCell(0) == null || row.getCell(1) == null || row.getCell(2) == null) {
                    continue; // Skip incomplete relative rows
                }

                int matchday = getCellValueAsInt(row.getCell(0));
                String homeTeamName = getCellValueAsString(row.getCell(1));
                String awayTeamName = getCellValueAsString(row.getCell(2));

                if (homeTeamName.isBlank() || awayTeamName.isBlank()) {
                    continue;
                }

                // Skip the template example row silently if the user left it in
                if (homeTeamName.equalsIgnoreCase("FC Ejemplo Local") && awayTeamName.equalsIgnoreCase("FC Ejemplo Visitante")) {
                    continue;
                }

                TeamRegistration homeReg = findTeamRegistrationByName(enrolledTeams, homeTeamName);
                TeamRegistration awayReg = findTeamRegistrationByName(enrolledTeams, awayTeamName);

                if (homeReg == null) {
                    throw new IllegalArgumentException(String.format("Fila %d: El equipo local '%s' no está inscrito y aprobado en este torneo.", row.getRowNum() + 1, homeTeamName));
                }
                if (awayReg == null) {
                    throw new IllegalArgumentException(String.format("Fila %d: El equipo visitante '%s' no está inscrito y aprobado en este torneo.", row.getRowNum() + 1, awayTeamName));
                }

                Match match = new Match();
                match.setTenantId(tenantId);
                match.setSeason(season);
                match.setMatchday(matchday);
                match.setHomeTeam(homeReg.getTeam());
                match.setAwayTeam(awayReg.getTeam());
                match.setStatus(Match.MatchStatus.SCHEDULED);

                // Date is optional
                if (row.getCell(3) != null) {
                    try {
                        if (row.getCell(3).getCellType() == CellType.NUMERIC && org.apache.poi.ss.usermodel.DateUtil.isCellDateFormatted(row.getCell(3))) {
                            match.setMatchDate(row.getCell(3).getLocalDateTimeCellValue());
                        } else {
                            String dateStr = getCellValueAsString(row.getCell(3));
                            if (!dateStr.isBlank()) {
                                LocalDate date = LocalDate.parse(dateStr, formatter);
                                match.setMatchDate(date.atStartOfDay());
                            }
                        }
                    } catch (Exception e) {
                        // Ignore if not parseable
                    }
                }

                importedMatches.add(match);
            }

            return matchRepository.saveAll(importedMatches);

        } catch (IllegalArgumentException | IllegalStateException e) {
             throw e; // Rethrow business validation errors as is
        } catch (Exception e) {
            throw new RuntimeException("Error al procesar el archivo Excel: " + e.getMessage(), e);
        }
    }

    private TeamRegistration findTeamRegistrationByName(List<TeamRegistration> registrations, String name) {
        return registrations.stream()
                .filter(reg -> reg.getTeam().getName().equalsIgnoreCase(name))
                .findFirst()
                .orElse(null);
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
            try { return Integer.parseInt(cell.getStringCellValue().trim()); } catch (Exception e) { return 0; }
        }
        return 0;
    }
}
