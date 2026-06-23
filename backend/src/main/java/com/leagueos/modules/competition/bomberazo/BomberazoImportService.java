package com.leagueos.modules.competition.bomberazo;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.domain.PlayoffRound;
import com.leagueos.modules.competition.domain.PlayoffTie;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.competition.persistence.PlayoffTieRepository;
import com.leagueos.modules.competition.service.PlayoffService;
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
    private final PlayoffTieRepository playoffTieRepository;
    private final MatchRepository matchRepository;
    private final PlayoffService playoffService;

    @Transactional
    public void resolveQuarters() {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            throw new IllegalStateException("Se requiere el X-Tenant-ID para resolver cuartos.");
        }

        List<Season> activeSeasons = seasonRepository.findByTenantIdAndStatus(tenantId, SeasonStatus.ACTIVE);
        
        class QFResult {
            final String homeTeam;
            final String awayTeam;
            final int homeScore;
            final int awayScore;

            QFResult(String homeTeam, String awayTeam, int homeScore, int awayScore) {
                this.homeTeam = homeTeam.toLowerCase().trim();
                this.awayTeam = awayTeam.toLowerCase().trim();
                this.homeScore = homeScore;
                this.awayScore = awayScore;
            }
        }

        List<QFResult> results = List.of(
            // 1ra Fuerza
            new QFResult("TREBOL", "GARAÑONES", 6, 0),
            new QFResult("DEP. GUADALUPE", "ATL. SAN SEBASTIÁN", 1, 0),
            new QFResult("BAYER", "PIRMA FC", 1, 3),
            new QFResult("DEP. SAN PEDRO", "ZORROS", 5, 6),

            // 2da Fuerza
            new QFResult("INDEPENDIENTE", "JUVENTUD CENTRO", 2, 0),
            new QFResult("MEXIQUENSE", "GALÁCTICOS", 4, 1),
            new QFResult("TECOS", "CHELSEA", 2, 0),
            new QFResult("ATLAS CUAJIMALPA", "DEP. RUBÍ", 5, 6),

            // 3ra Fuerza
            new QFResult("DEP. ESTRELLA", "TOLUCA SAN GASPAR", 3, 1),
            new QFResult("SEÑALAMIENTOS", "SAN PEDRO", 4, 5),
            new QFResult("TIGRES", "ROMA", 3, 2),
            new QFResult("DIABLOS ROJOS", "ATLAS", 6, 5)
        );

        for (Season season : activeSeasons) {
            String seasonName = season.getName().toLowerCase();
            List<PlayoffTie> ties = playoffTieRepository.findBySeasonId(season.getId());
            List<PlayoffTie> quarters = ties.stream().filter(t -> t.getRound() == PlayoffRound.QUARTER_FINALS).toList();
            List<PlayoffTie> semis = ties.stream().filter(t -> t.getRound() == PlayoffRound.SEMI_FINALS).toList();
            
            if (quarters.isEmpty() || semis.size() < 2) {
                log.warn("No hay llaves de cuartos o semis completas para la temporada: {}", season.getName());
                continue;
            }

            PlayoffTie semiA = semis.get(0);
            PlayoffTie semiB = semis.get(1);

            // Step 1: Re-route next_tie_id based on the customized matchups
            for (PlayoffTie tie : quarters) {
                String home = tie.getHomeSeedTeam().getName().toLowerCase();

                if (seasonName.contains("primera") || seasonName.contains("1ra")) {
                    if (home.contains("trebol") || home.contains("garañon") || 
                        home.contains("bayer") || home.contains("pirma")) {
                        tie.setNextTieId(semiA.getId());
                    } else if (home.contains("guadalupe") || home.contains("sebastián") || 
                               home.contains("san pedro") || home.contains("zorro")) {
                        tie.setNextTieId(semiB.getId());
                    }
                } else if (seasonName.contains("tercera") || seasonName.contains("3ra")) {
                    if (home.contains("estrella") || home.contains("gaspar") || 
                        home.contains("señal") || home.contains("san pedro")) {
                        tie.setNextTieId(semiA.getId());
                    } else if (home.contains("tigre") || home.contains("roma") || 
                               home.contains("diablo") || home.contains("atlas")) {
                        tie.setNextTieId(semiB.getId());
                    }
                } else if (seasonName.contains("segunda") || seasonName.contains("2da")) {
                    if (home.contains("independiente") || home.contains("centro") || 
                        home.contains("cuajimalpa") || home.contains("rubí")) {
                        tie.setNextTieId(semiA.getId());
                    } else if (home.contains("mexiquense") || home.contains("galáctico") || 
                               home.contains("teco") || home.contains("chelsea")) {
                        tie.setNextTieId(semiB.getId());
                    }
                }
                playoffTieRepository.save(tie);
            }

            // Step 2: Record scores and resolve
            for (PlayoffTie tie : quarters) {
                String homeName = tie.getHomeSeedTeam().getName();
                String awayName = tie.getAwaySeedTeam().getName();
                
                // Find matching QFResult
                QFResult matchResult = null;
                for (QFResult r : results) {
                    if (teamNamesMatch(homeName, r.homeTeam) && teamNamesMatch(awayName, r.awayTeam)) {
                        matchResult = r;
                        break;
                    } else if (teamNamesMatch(homeName, r.awayTeam) && teamNamesMatch(awayName, r.homeTeam)) {
                        matchResult = r;
                        break;
                    }
                }

                if (matchResult == null) {
                    throw new IllegalStateException("No se encontró resultado programado para: " + homeName + " vs " + awayName);
                }

                List<Match> matches = matchRepository.findByPlayoffTieId(tie.getId());
                if (matches.isEmpty()) {
                    throw new IllegalStateException("No se encontraron partidos para la llave: " + tie.getId());
                }

                Match match = matches.get(0);
                
                if (teamNamesMatch(match.getHomeTeam().getName(), homeName)) {
                    match.setHomeScore(matchResult.homeScore);
                    match.setAwayScore(matchResult.awayScore);
                } else {
                    match.setHomeScore(matchResult.awayScore);
                    match.setAwayScore(matchResult.homeScore);
                }
                match.setStatus(Match.MatchStatus.FINISHED);
                matchRepository.save(match);

                playoffService.resolveTie(tie.getId());
            }
        }
    }

    private boolean teamNamesMatch(String dbName, String targetName) {
        String dbClean = dbName.toLowerCase().replaceAll("[.\\s]", "");
        String targetClean = targetName.toLowerCase().replaceAll("[.\\s]", "");
        return dbClean.contains(targetClean) || targetClean.contains(dbClean);
    }

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
