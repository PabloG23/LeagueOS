package com.leagueos.modules.league.service;

import com.leagueos.modules.league.domain.Season;
import com.leagueos.modules.league.domain.Team;
import com.leagueos.modules.league.domain.TeamRegistration;
import com.leagueos.modules.league.dto.TeamRegistrationRequest;
import com.leagueos.modules.league.persistence.SeasonRepository;
import com.leagueos.modules.league.persistence.TeamRegistrationRepository;
import com.leagueos.modules.league.persistence.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TeamRegistrationService {

    private final TeamRegistrationRepository teamRegistrationRepository;
    private final TeamRepository teamRepository;
    private final SeasonRepository seasonRepository;
    private final com.leagueos.modules.league.persistence.PersonRepository personRepository;

    @Transactional
    public TeamRegistration registerTeam(TeamRegistrationRequest request, UUID tenantId) {
        Season season = seasonRepository.findById(request.getSeasonId())
                .orElseThrow(() -> new RuntimeException("Torneo no encontrado"));

        // Create the representative Person profile
        String repNameStr = request.getRepresentativeName() != null ? request.getRepresentativeName() : "Desconocido";
        String[] nameParts = repNameStr.split(" ", 2);
        com.leagueos.modules.league.domain.Person representative = new com.leagueos.modules.league.domain.Person();
        representative.setFirstName(nameParts[0]);
        representative.setLastName(nameParts.length > 1 ? nameParts[1] : "");
        representative.setPhone(request.getRepresentativePhone());
        representative.setTenantId(tenantId);
        representative = personRepository.save(representative);

        // Create the team
        Team team = new Team();
        team.setName(request.getTeamName());
        team.setRepresentative(representative);
        team.setLogoUrl(request.getLogoUrl());
        team.setTenantId(tenantId);
        team = teamRepository.save(team);

        // Create the registration record
        TeamRegistration registration = new TeamRegistration();
        registration.setTeam(team);
        registration.setSeason(season);
        registration.setStatus(TeamRegistration.RegistrationStatus.PENDING);
        registration.setTenantId(tenantId);

        return teamRegistrationRepository.save(registration);
    }

    @Transactional
    public java.util.List<TeamRegistration> enrollTeamsToSeason(UUID seasonId, java.util.List<UUID> teamIds, UUID tenantId) {
        Season season = seasonRepository.findById(seasonId)
                .orElseThrow(() -> new RuntimeException("Season not found"));

        java.util.List<TeamRegistration> registrations = new java.util.ArrayList<>();
        for (UUID teamId : teamIds) {
            Team team = teamRepository.findById(teamId)
                    .orElseThrow(() -> new RuntimeException("Team not found"));

            // Check if already registered
            if (teamRegistrationRepository.findBySeasonIdAndTeamId(seasonId, teamId).isPresent()) {
                continue;
            }

            TeamRegistration registration = new TeamRegistration();
            registration.setTeam(team);
            registration.setSeason(season);
            registration.setStatus(TeamRegistration.RegistrationStatus.APPROVED);
            registration.setTenantId(tenantId);
            registrations.add(teamRegistrationRepository.save(registration));
        }
        return registrations;
    }

    @Transactional(readOnly = true)
    public java.util.List<TeamRegistration> getEnrolledTeams(UUID seasonId) {
        return teamRegistrationRepository.findBySeasonId(seasonId);
    }

    @Transactional
    public void unenrollTeam(UUID seasonId, UUID teamId) {
        teamRegistrationRepository.findBySeasonIdAndTeamId(seasonId, teamId)
                .ifPresent(teamRegistrationRepository::delete);
    }
}
