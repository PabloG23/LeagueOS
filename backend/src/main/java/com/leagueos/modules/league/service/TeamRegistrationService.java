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
}
