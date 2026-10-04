package com.leagueos.modules.tenant.domain;

import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "tenant_settings")
public class TenantSettings extends BaseEntity {

    @Column(name = "show_offense_defense_widgets")
    private boolean showOffenseDefenseWidgets = true;

    @Column(name = "show_discipline_widget")
    private boolean showDisciplineWidget = false;

    @Column(name = "enable_auto_suspensions")
    private boolean enableAutoSuspensions = false;

    @Column(name = "require_jersey_numbers")
    private boolean requireJerseyNumbers = false;

    @Column(name = "min_matches_for_playoffs")
    private Integer minMatchesForPlayoffs = 0;

    @Column(name = "theme_class")
    private String themeClass;

    @Column(name = "win_points_on_win")
    private int winPointsOnWin = 3;

    @Column(name = "allow_multiple_teams_per_player")
    private boolean allowMultipleTeamsPerPlayer = true;

    @Column(name = "require_curp")
    private boolean requireCurp = false;

    @Column(name = "enable_shootout_extra_point")
    private boolean enableShootoutExtraPoint = false;

    @Column(name = "tiebreaker_order")
    private String tiebreakerOrder = "PTS_GD_GF_NAME";

    @Column(name = "allow_admin_exceed_roster_limit")
    private boolean allowAdminExceedRosterLimit = false;

    @Column(name = "reject_expired_ine")
    private boolean rejectExpiredIne = false;

    @Column(name = "enable_accumulated_yellow_suspensions")
    private boolean enableAccumulatedYellowSuspensions = false;

    @Column(name = "yellow_cards_per_suspension")
    private int yellowCardsPerSuspension = 5;

    @Column(name = "max_accumulated_suspension_matchdays")
    private int maxAccumulatedSuspensionMatchdays = 12;
}
