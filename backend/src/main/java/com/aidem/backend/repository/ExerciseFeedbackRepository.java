package com.aidem.backend.repository;

import com.aidem.backend.model.ExerciseFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseFeedbackRepository extends JpaRepository<ExerciseFeedback, Long> {

    void deleteBySessionPlanExercise_Id(Long sessionPlanExerciseId);

    boolean existsBySessionPlanExercise_Id(Long sessionPlanExerciseId);
}

