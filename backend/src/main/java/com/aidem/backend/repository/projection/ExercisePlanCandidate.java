package com.aidem.backend.repository.projection;

import com.aidem.backend.model.enums.ActivityType;
import com.aidem.backend.model.enums.DifficultyLevel;

public interface ExercisePlanCandidate {
    Long getId();

    String getDomain();

    ActivityType getActivityType();

    DifficultyLevel getDifficultyLevel();

    Integer getDurationMinutes();
}
