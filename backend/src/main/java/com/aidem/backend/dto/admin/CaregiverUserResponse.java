package com.aidem.backend.dto.admin;

import java.util.List;

public record CaregiverUserResponse(
        Long id,
        String fullName,
        String email,
        String role,
        String avatar,
        List<CaregiverPatientResponse> patients
) {
}