package com.aidem.backend.repository;

import com.aidem.backend.model.DomainScore;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DomainScoreRepository extends JpaRepository<DomainScore, Long> {
    List<DomainScore> findByAssessment_IdOrderByDisplayOrderAscIdAsc(Long assessmentId);
}
