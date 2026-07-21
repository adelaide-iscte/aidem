package com.aidem.backend.repository;

import com.aidem.backend.model.RecommendationExplanation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecommendationExplanationRepository
        extends JpaRepository<RecommendationExplanation, Long> {

    List<RecommendationExplanation>
    findBySessionPlanExercise_IdIn(
            List<Long> sessionPlanExerciseIds
    );
}