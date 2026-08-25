package com.leagueos.modules.referee.domain;

import com.leagueos.shared.infrastructure.persistence.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "referees")
public class Referee extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @Column
    private String phone;

    @Column(name = "photo_url")
    private String photoUrl;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "raw_password")
    private String rawPassword;
}
