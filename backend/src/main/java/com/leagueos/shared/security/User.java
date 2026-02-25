package com.leagueos.shared.security;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private java.util.UUID id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column(nullable = false)
    private String tenantId;

    // Optional: Link to a Team if the user is a Team Representative
    private java.util.UUID teamId;

    // Optional: Link to a Person profile
    @Column(name = "person_id")
    private java.util.UUID personId;
}
