package com.aidem.backend.dto.patient;

public record SessionHistoryExerciseResponse(
        Long sessionPlanExerciseId,
        Long exerciseId,
        Integer orderIndex,
        String title,
        String domain,
        String activityType,
        String difficultyLevel,
        Integer durationMinutes,
        String status,
        String recommendationReason,
        Boolean completed,
        String difficultyFeedback,
        String emotionFeedback,
        String caregiverReason
) {}