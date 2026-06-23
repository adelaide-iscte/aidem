package com.aidem.backend.model;

import com.aidem.backend.model.enums.DifficultyFeedback;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "exercise_feedback")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExerciseFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "session_plan_exercise_id")
    private SessionPlanExercise sessionPlanExercise;

    @Column(nullable = false)
    private Boolean completed;

    @Enumerated(EnumType.STRING)
    private DifficultyFeedback difficultyFeedback;

    private String emotionFeedback;

    @Column(columnDefinition = "TEXT")
    private String notes;

    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}