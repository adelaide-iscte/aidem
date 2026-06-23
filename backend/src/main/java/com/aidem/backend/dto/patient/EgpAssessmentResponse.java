package com.aidem.backend.dto.patient;

import java.time.LocalDate;
import java.util.List;

public record EgpAssessmentResponse(
        Long assessmentId,
        LocalDate assessmentDate,
        List<EgpRowResponse> rows
) {}
