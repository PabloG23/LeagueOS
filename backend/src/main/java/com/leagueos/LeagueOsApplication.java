package com.leagueos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class LeagueOsApplication {

    public static void main(String[] args) {
        SpringApplication.run(LeagueOsApplication.class, args);
    }
}
