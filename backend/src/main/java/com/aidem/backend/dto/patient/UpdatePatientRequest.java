package com.aidem.backend.dto.patient;

import java.time.LocalDate;

public record UpdatePatientRequest(
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
        String avatar
) {}