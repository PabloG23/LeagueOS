package com.leagueos.modules.league.service;

import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.Tenant;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import com.leagueos.modules.league.persistence.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LeagueService {

    private final TenantRepository tenantRepository;
    private final SeasonRepository seasonRepository;
    private final TeamRepository teamRepository;

    @Transactional(readOnly = true)
    public List<Tenant> getAllTenants() {
        return tenantRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Team> getAllTeams() {
        return teamRepository.findAll();
    }

    @Transactional
    public Team createTeam(Team team) {
        return teamRepository.save(team);
    }

    @Transactional(readOnly = true)
    public Optional<Tenant> getTenantBySubdomain(String subdomain) {
        return tenantRepository.findBySubdomain(subdomain);
    }

    @Transactional(readOnly = true)
    public List<Season> getAllSeasons() {
        return seasonRepository.findAll();
    }

    @Transactional
    public Season createSeason(Season season) {
        return seasonRepository.save(season);
    }

    @Transactional
    public Season activateSeason(UUID seasonId) {
        Season targetSeason = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new RuntimeException("Season not found"));
        
        // Deactivate all other seasons in the same division
        if (targetSeason.getDivision() != null) {
            List<Season> activeSeasons = seasonRepository.findByStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE);
            for (Season s : activeSeasons) {
                if (s.getDivision() != null && s.getDivision().getId().equals(targetSeason.getDivision().getId()) 
                    && !s.getId().equals(seasonId)) {
                    s.setStatus(com.leagueos.modules.league.domain.SeasonStatus.COMPLETED); // or DRAFT/etc depending on business rule
                    seasonRepository.save(s);
                }
            }
        }

        targetSeason.setStatus(com.leagueos.modules.league.domain.SeasonStatus.ACTIVE);
        return seasonRepository.save(targetSeason);
    }

    @Transactional
    public Season advanceMatchday(UUID seasonId) {
        Season targetSeason = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new RuntimeException("Season not found"));
        
        targetSeason.setCurrentMatchday(targetSeason.getCurrentMatchday() + 1);
        return seasonRepository.save(targetSeason);
    }
}
