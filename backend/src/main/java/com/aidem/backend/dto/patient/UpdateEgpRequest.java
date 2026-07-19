package com.aidem.backend.dto.patient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record UpdateEgpRequest(
        Long assessmentId,
        LocalDate assessmentDate,
        List<EgpScoreRequest> rows
) {
    public record EgpScoreRequest(
            String label,
            BigDecimal pd,
            BigDecimal nr,
            String riskLevel
    ) {}
}