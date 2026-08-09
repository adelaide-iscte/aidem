package com.aidem.backend.model;

import com.aidem.backend.model.enums.ActivityType;
import com.aidem.backend.model.enums.DifficultyLevel;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "exercises")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String domain;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivityType activityType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DifficultyLevel difficultyLevel;

    private Integer durationMinutes;
    private Integer sets;
    private Integer repetitions;
    private Integer restSeconds;

    @Column(columnDefinition = "TEXT")
    private String materials;

    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(columnDefinition = "TEXT")
    private String mediaUrl;

    @Column(name = "media_2",columnDefinition = "TEXT")
    private String media2;

    @Column(
            name = "instruction_media_2",
            columnDefinition = "TEXT"
    )
    private String instructionMedia2;

    @Column(
            name = "instruction_media_3",
            columnDefinition = "TEXT"
    )
    private String instructionMedia3;

    @Column(
            name = "instruction_media_4",
            columnDefinition = "TEXT"
    )
    private String instructionMedia4;

    @Column(
            name = "instruction_media_5",
            columnDefinition = "TEXT"
    )
    private String instructionMedia5;

    @Column(
            name = "instruction_media_6",
            columnDefinition = "TEXT"
    )
    private String instructionMedia6;

    @Column(
            name = "instruction_media_7",
            columnDefinition = "TEXT"
    )
    private String instructionMedia7;
    private Boolean active = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;


    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}