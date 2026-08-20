package com.leagueos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaAuditing
@EntityScan(basePackages = "com.leagueos")
@EnableJpaRepositories(basePackages = "com.leagueos")
public class LeagueOsApplication {

    public static void main(String[] args) {
        SpringApplication.run(LeagueOsApplication.class, args);
    }
}
