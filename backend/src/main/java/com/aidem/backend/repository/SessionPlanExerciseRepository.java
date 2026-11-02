package com.aidem.backend.repository;

import com.aidem.backend.model.SessionPlanExercise;
import com.aidem.backend.model.enums.ExerciseStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SessionPlanExerciseRepository extends JpaRepository<SessionPlanExercise, Long> {
    List<SessionPlanExercise> findBySessionPlan_IdOrderByOrderIndexAsc(Long sessionPlanId);

    @EntityGraph(attributePaths = { "exercise", "sessionPlan" })
    List<SessionPlanExercise> findBySessionPlan_Patient_IdAndStatus(Long patientId, ExerciseStatus status);

    List<SessionPlanExercise> findByStatus(ExerciseStatus status);

    @Query(
        """
        select item
        from SessionPlanExercise item
        join fetch item.sessionPlan sessionPlan
        join fetch item.exercise
        where sessionPlan.patient.id = :patientId
        order by sessionPlan.sessionDate desc, sessionPlan.id desc, item.orderIndex asc
        """
    )
    List<SessionPlanExercise> findHistoryItemsByPatientId(@Param("patientId") Long patientId);

    @EntityGraph(attributePaths = { "exercise", "sessionPlan" })
    List<SessionPlanExercise> findBySessionPlan_Patient_IdAndStatusInOrderByUpdatedAtDesc(
        Long patientId,
        Collection<ExerciseStatus> statuses
    );
}
