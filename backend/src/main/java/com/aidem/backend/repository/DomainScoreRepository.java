package com.aidem.backend.repository;

import com.aidem.backend.model.DomainScore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DomainScoreRepository extends JpaRepository<DomainScore, Long> {
    List<DomainScore> findByAssessment_IdOrderByDisplayOrderAscIdAsc(Long assessmentId);
}
