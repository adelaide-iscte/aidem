package com.aidem.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "session_history")
@Getter
@Setter
public class SessionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long patientId;

    private LocalDate sessionDate;

    private Integer completedActivities;

    private String averageDifficulty;

    private LocalDateTime createdAt;
}