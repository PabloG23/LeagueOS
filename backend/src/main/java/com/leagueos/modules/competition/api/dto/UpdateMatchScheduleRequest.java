package com.leagueos.modules.competition.api.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UpdateMatchScheduleRequest {
    private LocalDateTime matchDate;
    private String location;
}
