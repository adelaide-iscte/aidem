package com.aidem.backend.repository;

import com.aidem.backend.model.RecommendationExplanation;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationExplanationRepository extends JpaRepository<RecommendationExplanation, Long> {
    List<RecommendationExplanation> findBySessionPlanExercise_IdIn(List<Long> sessionPlanExerciseIds);
}
