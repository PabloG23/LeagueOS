package com.leagueos.modules.competition.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamStatDTO {
    private UUID id;
    private String name;
    private Long redCards;
    private Integer rank;
}
