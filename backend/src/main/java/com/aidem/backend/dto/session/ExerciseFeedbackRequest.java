package com.aidem.backend.dto.session;

public record ExerciseFeedbackRequest(
        Boolean completed,
        String difficultyFeedback,
        String emotionFeedback,
        String notes
) {}
