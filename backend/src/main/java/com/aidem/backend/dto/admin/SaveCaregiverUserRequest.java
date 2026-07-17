package com.aidem.backend.dto.admin;

import java.util.List;

public record SaveCaregiverUserRequest(
        String fullName,
        String email,
        String password,
        String role,
        List<Long> patientIds
) {
}