package com.aidem.backend.model;

import com.aidem.backend.model.enums.RiskLevel;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "domain_scores")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DomainScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "assessment_id")
    private Assessment assessment;

    @Column(nullable = false)
    private String domain;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal score;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RiskLevel riskLevel;

    private LocalDateTime createdAt;

    @Column(name = "normalized_score", precision = 5, scale = 2)
    private BigDecimal normalizedScore;

    @Column(name = "display_order")
    private Integer displayOrder;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}