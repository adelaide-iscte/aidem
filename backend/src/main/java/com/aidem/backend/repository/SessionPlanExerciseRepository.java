package com.aidem.backend.repository;

import com.aidem.backend.model.SessionPlanExercise;
import com.aidem.backend.model.enums.ExerciseStatus;
import com.aidem.backend.repository.projection.SessionHistoryRow;
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
        select
            sessionPlan.id as planId,
            sessionPlan.sessionDate as sessionDate,
            sessionPlan.status as planStatus,
            item.id as itemId,
            item.orderIndex as orderIndex,
            item.recommendedDurationMinutes as durationMinutes,
            item.status as status,
            item.reason as reason,
            exercise.id as exerciseId,
            exercise.title as title,
            exercise.domain as domain,
            exercise.activityType as activityType,
            exercise.difficultyLevel as difficultyLevel,
            feedback.completed as completed,
            feedback.difficultyFeedback as difficultyFeedback,
            feedback.emotionFeedback as emotionFeedback,
            feedback.notes as notes
        from SessionPlanExercise item
        join item.sessionPlan sessionPlan
        join item.exercise exercise
        left join ExerciseFeedback feedback on feedback.sessionPlanExercise = item
        where sessionPlan.patient.id = :patientId
        order by sessionPlan.sessionDate desc, sessionPlan.id desc, item.orderIndex asc
        """
    )
    List<SessionHistoryRow> findHistoryRowsByPatientId(@Param("patientId") Long patientId);

    @EntityGraph(attributePaths = { "exercise", "sessionPlan" })
    List<SessionPlanExercise> findBySessionPlan_Patient_IdAndStatusInOrderByUpdatedAtDesc(
        Long patientId,
        Collection<ExerciseStatus> statuses
    );
}
