package com.aidem.backend.repository;

import com.aidem.backend.model.Exercise;
import com.aidem.backend.repository.projection.ExercisePlanCandidate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {

    @Query("""
            select
                exercise.id as id,
                exercise.domain as domain,
                exercise.activityType as activityType,
                exercise.difficultyLevel as difficultyLevel,
                exercise.durationMinutes as durationMinutes
            from Exercise exercise
            where exercise.active = true
            """)
    List<ExercisePlanCandidate> findActivePlanCandidates();

    Page<Exercise> findByActiveTrue(Pageable pageable);

    Page<Exercise> findByActiveTrueAndTitleContainingIgnoreCase(String title, Pageable pageable);
}
