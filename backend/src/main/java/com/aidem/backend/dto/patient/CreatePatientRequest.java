package com.aidem.backend.dto.patient;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreatePatientRequest(
        String fullName,
        LocalDate birthDate,
        String gender,
        String diagnosisType,
        String phone,
        String email,
        String address,
        String education,
        String profession,
        String sessionType,
        String informalCaregiverName,
        String informalCaregiverPhone,
        String informalCaregiverEmail,
        String notes,
        LocalDate assessmentDate,
        List<EgpScoreRequest> egpScores
) {
    public record EgpScoreRequest(
            String domain,
            BigDecimal score,
            BigDecimal normalizedScore,
            String riskLevel,
            Integer displayOrder
    ) {}
}