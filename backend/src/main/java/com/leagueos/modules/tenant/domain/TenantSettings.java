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

    @Column(name = "min_matches_for_playoffs")
    private Integer minMatchesForPlayoffs = 0;

    @Column(name = "theme_class")
    private String themeClass;
}
