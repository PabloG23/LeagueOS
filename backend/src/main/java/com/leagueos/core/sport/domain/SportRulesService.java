package com.leagueos.core.sport.domain;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SportRulesService {

    private final Map<String, SportRulesStrategy> strategies;

    public SportRulesService(List<SportRulesStrategy> strategyList) {
        this.strategies = strategyList.stream()
            .collect(Collectors.toMap(SportRulesStrategy::getSportType, Function.identity()));
    }

    public Optional<SportRulesStrategy> getStrategy(String sportType) {
        return Optional.ofNullable(strategies.get(sportType.toUpperCase()));
    }
}
