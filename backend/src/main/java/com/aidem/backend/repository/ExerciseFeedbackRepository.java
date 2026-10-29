package com.aidem.backend.repository;

import com.aidem.backend.model.ExerciseFeedback;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseFeedbackRepository extends JpaRepository<ExerciseFeedback, Long> {
    void deleteBySessionPlanExercise_Id(Long sessionPlanExerciseId);

    Optional<ExerciseFeedback> findBySessionPlanExercise_Id(Long sessionPlanExerciseId);

    List<ExerciseFeedback> findBySessionPlanExercise_SessionPlan_Id(Long sessionPlanId);

    List<ExerciseFeedback> findBySessionPlanExercise_IdIn(List<Long> sessionPlanExerciseIds);
}
