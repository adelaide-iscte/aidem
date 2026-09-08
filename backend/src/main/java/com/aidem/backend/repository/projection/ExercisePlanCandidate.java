package com.aidem.backend.repository.projection;

import com.aidem.backend.model.enums.ActivityType;
import com.aidem.backend.model.enums.DifficultyLevel;

/**
 * Dados mínimos necessários para escolher uma atividade para um plano.
 *
 * Não inclui os campos TEXT com imagens/base64. Assim, a geração de um
 * plano não carrega para memória todas as imagens de todas as atividades.
 */
public interface ExercisePlanCandidate {

    Long getId();

    String getDomain();

    ActivityType getActivityType();

    DifficultyLevel getDifficultyLevel();

    Integer getDurationMinutes();
}
