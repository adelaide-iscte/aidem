package com.aidem.backend.dto.patient;

import java.math.BigDecimal;

public record EgpRowResponse(
        String label,
        BigDecimal pd,
        BigDecimal nr,
        String riskLevel,
        Integer displayOrder,
        boolean summary
) {}
