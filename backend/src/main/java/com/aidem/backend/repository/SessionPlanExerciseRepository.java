package com.aidem.backend.repository;

import com.aidem.backend.model.SessionPlanExercise;
import com.aidem.backend.model.enums.ExerciseStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionPlanExerciseRepository extends JpaRepository<SessionPlanExercise, Long> {
    List<SessionPlanExercise> findBySessionPlan_IdOrderByOrderIndexAsc(Long sessionPlanId);

    @EntityGraph(attributePaths = { "exercise", "sessionPlan" })
    List<SessionPlanExercise> findBySessionPlan_Patient_IdAndStatus(Long patientId, ExerciseStatus status);

    List<SessionPlanExercise> findByStatus(ExerciseStatus status);

    @EntityGraph(attributePaths = { "exercise", "sessionPlan" })
    List<SessionPlanExercise> findBySessionPlan_Patient_IdAndStatusInOrderByUpdatedAtDesc(
        Long patientId,
        Collection<ExerciseStatus> statuses
    );
}
