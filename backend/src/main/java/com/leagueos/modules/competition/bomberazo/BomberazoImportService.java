package com.leagueos.modules.competition.bomberazo;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.league.domain.Division;
import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.SeasonStatus;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.persistence.DivisionRepository;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.shared.context.TenantContext;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BomberazoImportService {

    private final EntityManager entityManager;
    private final SeasonRepository seasonRepository;
    private final DivisionRepository divisionRepository;
    private final TeamRepository teamRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;

    @Transactional
    public void resetTenantData() {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            throw new IllegalStateException("Se requiere el X-Tenant-ID para ejecutar la purga.");
        }

        log.warn("INICIANDO PURGA DE DATOS PARA TENANT: {}", tenantId);

        // Delete order: match_events, matches, team_registrations, teams
        entityManager.createNativeQuery("DELETE FROM match_events WHERE tenant_id = :tenantId")
                .setParameter("tenantId", tenantId)
                .executeUpdate();

        entityManager.createNativeQuery("DELETE FROM matches WHERE tenant_id = :tenantId")
                .setParameter("tenantId", tenantId)
                .executeUpdate();

        entityManager.createNativeQuery("DELETE FROM team_registrations WHERE tenant_id = :tenantId")
                .setParameter("tenantId", tenantId)
                .executeUpdate();

        entityManager.createNativeQuery("DELETE FROM teams WHERE tenant_id = :tenantId")
                .setParameter("tenantId", tenantId)
                .executeUpdate();

        log.warn("PURGA COMPLETADA PARA TENANT: {}", tenantId);
    }

    @Transactional
    public void importCsv(InputStream inputStream) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            throw new IllegalStateException("Se requiere el X-Tenant-ID para importar.");
        }

        List<Season> activeSeasons = seasonRepository.findByTenantIdAndStatus(tenantId, SeasonStatus.ACTIVE);
        if (activeSeasons.isEmpty()) {
            throw new IllegalStateException("No hay temporadas activas para este tenant.");
        }

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            boolean isFirstLine = true;
            while ((line = reader.readLine()) != null) {
                if (isFirstLine) {
                    isFirstLine = false;
                    continue; // Skip header
                }

                String[] parts = line.split(",");
                if (parts.length < 6) continue;

                String divisionName = parts[0].trim();
                int matchday = Integer.parseInt(parts[1].trim());
                String homeTeamName = parts[2].trim();
                String awayTeamName = parts[3].trim();
                String homeScoreStr = parts[4].trim();
                String awayScoreStr = parts[5].trim();
                
                int homeScore = 0;
                int awayScore = 0;
                boolean isDoubleForfeit = false;
                
                if (homeScoreStr.equalsIgnoreCase("P") && awayScoreStr.equalsIgnoreCase("P")) {
                    isDoubleForfeit = true;
                } else {
                    homeScore = Integer.parseInt(homeScoreStr);
                    awayScore = Integer.parseInt(awayScoreStr);
                }

                // Find the correct season for this division
                Season activeSeason = activeSeasons.stream()
                        .filter(s -> {
                            String cleanSeasonName = s.getName().replaceAll("\\s+", "").toLowerCase();
                            String cleanDivName = divisionName.replaceAll("\\s+", "").toLowerCase();
                            return cleanSeasonName.contains(cleanDivName) || cleanDivName.contains(cleanSeasonName);
                        })
                        .findFirst()
                        .orElseThrow(() -> new IllegalStateException("No se encontró un Torneo Activo que en su nombre contenga: " + divisionName));

                Division division = getOrCreateDivision(divisionName, tenantId);
                Team homeTeam = getOrCreateTeam(homeTeamName, tenantId);
                Team awayTeam = getOrCreateTeam(awayTeamName, tenantId);

                ensureTeamRegistered(homeTeam, activeSeason);
                ensureTeamRegistered(awayTeam, activeSeason);

                createMatch(activeSeason, homeTeam, awayTeam, homeScore, awayScore, matchday, isDoubleForfeit);
            }
        } catch (Exception e) {
            log.error("Error importando CSV", e);
            throw new RuntimeException("Error al procesar el archivo CSV: " + e.getMessage(), e);
        }
    }

    private Division getOrCreateDivision(String name, UUID tenantId) {
        return divisionRepository.findByNameIgnoreCaseAndTenantId(name, tenantId)
                .orElseGet(() -> {
                    Division div = new Division();
                    div.setName(name);
                    div.setTenantId(tenantId);
                    return divisionRepository.save(div);
                });
    }

    private Team getOrCreateTeam(String name, UUID tenantId) {
        return teamRepository.findByNameIgnoreCaseAndTenantId(name, tenantId)
                .orElseGet(() -> {
                    Team team = new Team();
                    team.setName(name);
                    team.setActive(true);
                    team.setTenantId(tenantId);
                    return teamRepository.save(team);
                });
    }

    private void ensureTeamRegistered(Team team, Season season) {
        teamRegistrationRepository.findBySeasonIdAndTeamId(season.getId(), team.getId())
                .orElseGet(() -> {
                    TeamRegistration reg = new TeamRegistration();
                    reg.setTeam(team);
                    reg.setSeason(season);
                    reg.setStatus(TeamRegistration.RegistrationStatus.APPROVED);
                    reg.setTenantId(season.getTenantId());
                    return teamRegistrationRepository.save(reg);
                });
    }

    private void createMatch(Season season, Team homeTeam, Team awayTeam, int homeScore, int awayScore, int matchday, boolean isDoubleForfeit) {
        Match match = new Match();
        match.setSeason(season);
        match.setHomeTeam(homeTeam);
        match.setAwayTeam(awayTeam);
        match.setHomeScore(homeScore);
        match.setAwayScore(awayScore);
        match.setMatchday(matchday);
        match.setStatus(Match.MatchStatus.FINISHED);
        match.setStage(com.leagueos.modules.competition.domain.MatchStage.REGULAR);
        match.setTenantId(season.getTenantId());
        match.setIsDoubleForfeit(isDoubleForfeit);
        
        entityManager.persist(match);
    }
}
