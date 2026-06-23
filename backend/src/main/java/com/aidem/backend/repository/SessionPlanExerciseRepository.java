package com.aidem.backend.repository;

import com.aidem.backend.model.SessionPlanExercise;
import com.aidem.backend.model.enums.ExerciseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface SessionPlanExerciseRepository extends JpaRepository<SessionPlanExercise, Long> {

    List<SessionPlanExercise> findBySessionPlan_IdOrderByOrderIndexAsc(Long sessionPlanId);

    @Query("""
            select distinct spe.exercise.id
            from SessionPlanExercise spe
            where spe.sessionPlan.patient.id = :patientId
              and spe.status = 'COMPLETED'
            """)
    List<Long> findCompletedExerciseIdsByPatient(@Param("patientId") Long patientId);

    List<SessionPlanExercise> findBySessionPlan_Patient_IdAndStatusInOrderByUpdatedAtDesc(
            Long patientId,
            Collection<ExerciseStatus> statuses
    );

    @Query("""
            select count(spe)
            from SessionPlanExercise spe
            where spe.sessionPlan.patient.id = :patientId
              and spe.exercise.domain = :domain
              and spe.status = 'COMPLETED'
              and spe.updatedAt > :afterDate
            """)
    long countCompletedInDomainAfter(
            @Param("patientId") Long patientId,
            @Param("domain") String domain,
            @Param("afterDate") LocalDateTime afterDate
    );
}
