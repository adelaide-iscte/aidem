package com.aidem.backend.dto.patient;

import java.time.LocalDate;
import java.util.List;

public record SessionHistoryResponse(
        Long id,
        Long patientId,
        LocalDate sessionDate,
        String status,
        Integer completedActivities,
        Integer totalActivities,
        String averageDifficulty,
        List<SessionHistoryExerciseResponse> exercises
) {}