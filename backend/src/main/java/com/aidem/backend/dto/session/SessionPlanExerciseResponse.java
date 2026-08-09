package com.aidem.backend.dto.session;

import java.util.List;

public record SessionPlanExerciseResponse(
        Long sessionPlanExerciseId,
        Long exerciseId,
        Integer orderIndex,
        String title,
        String description,
        String domain,
        String activityType,
        String difficultyLevel,
        Integer durationMinutes,
        Integer sets,
        Integer repetitions,
        Integer restSeconds,
        String materials,
        String instructions,
        String mediaUrl,
        List<String> instructionMediaUrls,
        String reason,
        String status
) {}