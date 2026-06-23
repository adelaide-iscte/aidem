package com.aidem.backend.dto.session;

import java.time.LocalDate;
import java.util.List;

public record SessionPlanResponse(
        Long id,
        Long patientId,
        Long assessmentId,
        LocalDate sessionDate,
        Integer targetDurationMinutes,
        Integer totalDurationMinutes,
        String status,
        List<SessionPlanExerciseResponse> exercises
) {}
