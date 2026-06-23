package com.aidem.backend.dto.patient;

import java.time.LocalDate;

public record PatientListResponse(
        Long id,
        String name,
        LocalDate birthDate,
        Integer age,
        String code,
        String avatar,
        String subtitle
) {}