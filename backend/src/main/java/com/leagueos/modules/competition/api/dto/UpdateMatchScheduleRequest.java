package com.leagueos.modules.competition.api.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class UpdateMatchScheduleRequest {
    private LocalDateTime matchDate;
    private String location;
    private UUID fieldId;
    private UUID refereeId;
}
