package com.leagueos.modules.referee.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefereeMatchDTO {
    private UUID id;
    private UUID seasonId;
    private String seasonName;
    private Integer matchday;
    private LocalDateTime matchDate;
    private String location;
    private String fieldName;
    private String homeTeamName;
    private String homeTeamLogoUrl;
    private String awayTeamName;
    private String awayTeamLogoUrl;
    private Integer homeScore;
    private Integer awayScore;
    private String status;
    private boolean hasReportPhoto;
    private String reportPhotoUrl;
    private String reportPhotoSignedUrl;
}
