package com.aidem.backend.dto.exercise;

import com.aidem.backend.model.enums.ActivityType;
import com.aidem.backend.model.enums.DifficultyLevel;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ExerciseRequest {

    private String title;
    private String description;
    private String domain;

    private ActivityType activityType;
    private DifficultyLevel difficultyLevel;

    private Integer durationMinutes;
    private Integer sets;
    private Integer repetitions;
    private Integer restSeconds;

    private String materials;
    private String instructions;
    private String mediaUrl;
    private String media2;
    private String instructionMedia2;
}