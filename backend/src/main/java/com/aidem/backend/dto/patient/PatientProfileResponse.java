package com.aidem.backend.dto.patient;

import java.time.LocalDate;

public record PatientProfileResponse(
        Long id,
        String name,
        String fullName,
        LocalDate birthDate,
        Integer age,
        String code,
        String diagnosisType,
        String gender,
        String phone,
        String email,
        String address,
        String education,
        String profession,
        String sessionType,
        String informalCaregiverName,
        String informalCaregiverPhone,
        String informalCaregiverEmail,
        String avatar,
        String subtitle
) {}