package com.leagueos.modules.competition.api.dto;

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
public class PlayerMatchAttendanceDTO {
    private UUID matchId;
    private Integer matchday;
    private LocalDateTime matchDate;
    private String opponentName;
    private String opponentLogo;
    private boolean isHome;
    private int goals;
    private int yellowCards;
    private int redCards;
    private boolean verifiedInReport; // Indica presencia oficial registrada en cédula
}
