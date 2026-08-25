package com.leagueos.modules.referee.service;

import com.leagueos.modules.competition.domain.Match;
import com.leagueos.modules.competition.persistence.MatchRepository;
import com.leagueos.modules.media.service.StorageService;
import com.leagueos.modules.referee.api.dto.RefereeMatchDTO;
import com.leagueos.modules.referee.domain.Referee;
import com.leagueos.modules.referee.persistence.RefereeRepository;
import com.leagueos.shared.domain.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MatchReportPhotoService {

    private final MatchRepository matchRepository;
    private final RefereeRepository refereeRepository;
    private final StorageService storageService;

    @Transactional(readOnly = true)
    public List<RefereeMatchDTO> getMyMatches(UUID refereeUserId, UUID tenantId) {
        Referee referee = refereeRepository.findByUserId(refereeUserId)
                .orElseThrow(() -> new ResourceNotFoundException("No referee profile found for current user"));

        if (!referee.getTenantId().equals(tenantId)) {
            throw new IllegalArgumentException("Unauthorized tenant access");
        }

        List<Match> matches = matchRepository.findAll().stream()
                .filter(m -> m.getTenantId() != null && m.getTenantId().equals(tenantId))
                .filter(m -> m.getReferee() != null && m.getReferee().getId().equals(referee.getId()))
                .sorted(Comparator.comparing(
                        Match::getMatchDate,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ).thenComparing(Match::getMatchday, Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());

        return matches.stream().map(this::toRefereeMatchDTO).collect(Collectors.toList());
    }

    @Transactional
    public RefereeMatchDTO uploadMatchReportPhoto(UUID matchId, UUID refereeUserId, byte[] imageBytes, String contentType, UUID tenantId) {
        Referee referee = refereeRepository.findByUserId(refereeUserId)
                .orElseThrow(() -> new ResourceNotFoundException("No referee profile found for current user"));

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found: " + matchId));

        if (!match.getTenantId().equals(tenantId)) {
            throw new IllegalArgumentException("Unauthorized tenant access");
        }

        if (match.getReferee() == null || !match.getReferee().getId().equals(referee.getId())) {
            throw new IllegalArgumentException("You are not assigned as the referee for this match");
        }

        String extension = ".jpg";
        if (contentType != null) {
            if (contentType.contains("png")) extension = ".png";
            else if (contentType.contains("webp")) extension = ".webp";
            else if (contentType.contains("jpeg") || contentType.contains("jpg")) extension = ".jpg";
        }

        String homeSlug = match.getHomeTeam() != null ? StorageService.toSlug(match.getHomeTeam().getName()) : "local";
        String awaySlug = match.getAwayTeam() != null ? StorageService.toSlug(match.getAwayTeam().getName()) : "visitante";
        int matchday = match.getMatchday() != null ? match.getMatchday() : 1;
        String shortId = UUID.randomUUID().toString().substring(0, 8);

        String filename = "J" + matchday + "_" + homeSlug + "_vs_" + awaySlug + "_" + shortId + extension;
        String key = storageService.buildTenantKey(tenantId, "referees/matchReport", filename);

        if (match.getReportPhotoUrl() != null && match.getReportPhotoUrl().contains("matchReport")) {
            storageService.deleteFile(match.getReportPhotoUrl());
        }

        storageService.uploadFile(key, imageBytes, contentType != null ? contentType : "image/jpeg");
        match.setReportPhotoUrl(key);
        match = matchRepository.save(match);

        return toRefereeMatchDTO(match);
    }

    @Transactional(readOnly = true)
    public String getMatchReportSignedUrl(UUID matchId, UUID tenantId) {
        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found: " + matchId));

        if (!match.getTenantId().equals(tenantId)) {
            throw new IllegalArgumentException("Unauthorized tenant access");
        }

        if (match.getReportPhotoUrl() == null || match.getReportPhotoUrl().isBlank()) {
            throw new ResourceNotFoundException("No report photo uploaded for this match");
        }

        return storageService.getSignedUrl(match.getReportPhotoUrl(), 60);
    }

    private RefereeMatchDTO toRefereeMatchDTO(Match match) {
        String homeLogoSignedUrl = null;
        if (match.getHomeTeam() != null && match.getHomeTeam().getLogoUrl() != null) {
            homeLogoSignedUrl = storageService.getSignedUrl(match.getHomeTeam().getLogoUrl(), 60);
        }

        String awayLogoSignedUrl = null;
        if (match.getAwayTeam() != null && match.getAwayTeam().getLogoUrl() != null) {
            awayLogoSignedUrl = storageService.getSignedUrl(match.getAwayTeam().getLogoUrl(), 60);
        }

        String reportSignedUrl = null;
        if (match.getReportPhotoUrl() != null && !match.getReportPhotoUrl().isBlank()) {
            reportSignedUrl = storageService.getSignedUrl(match.getReportPhotoUrl(), 60);
        }

        return RefereeMatchDTO.builder()
                .id(match.getId())
                .seasonId(match.getSeason() != null ? match.getSeason().getId() : null)
                .seasonName(match.getSeason() != null ? match.getSeason().getName() : null)
                .matchday(match.getMatchday())
                .matchDate(match.getMatchDate())
                .location(match.getLocation())
                .fieldName(match.getField() != null ? match.getField().getName() : match.getLocation())
                .homeTeamName(match.getHomeTeam() != null ? match.getHomeTeam().getName() : "Local")
                .homeTeamLogoUrl(homeLogoSignedUrl)
                .awayTeamName(match.getAwayTeam() != null ? match.getAwayTeam().getName() : "Visitante")
                .awayTeamLogoUrl(awayLogoSignedUrl)
                .homeScore(match.getHomeScore())
                .awayScore(match.getAwayScore())
                .status(match.getStatus() != null ? match.getStatus().name() : "SCHEDULED")
                .hasReportPhoto(match.getReportPhotoUrl() != null && !match.getReportPhotoUrl().isBlank())
                .reportPhotoUrl(match.getReportPhotoUrl())
                .reportPhotoSignedUrl(reportSignedUrl)
                .build();
    }
}
