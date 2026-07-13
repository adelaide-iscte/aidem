package com.aidem.backend.repository;

import com.aidem.backend.model.Exercise;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExerciseRepository
        extends JpaRepository<Exercise, Long> {

    /**
     * Usado pela geração automática do plano.
     * Precisa de devolver todos os exercícios ativos.
     */
    List<Exercise> findByActiveTrue();

    /**
     * Usado na página de administração,
     * com paginação de 20 atividades.
     */
    Page<Exercise> findByActiveTrue(
            Pageable pageable
    );

    /**
     * Usado para pesquisar atividades pelo nome,
     * mantendo a paginação.
     */
    Page<Exercise>
    findByActiveTrueAndTitleContainingIgnoreCase(
            String title,
            Pageable pageable
    );
}