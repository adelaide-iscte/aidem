package com.aidem.backend.repository.projection;

import com.aidem.backend.model.enums.ActivityType;
import com.aidem.backend.model.enums.DifficultyFeedback;
import com.aidem.backend.model.enums.DifficultyLevel;
import com.aidem.backend.model.enums.ExerciseStatus;
import com.aidem.backend.model.enums.SessionStatus;
import java.time.LocalDate;

public interface SessionHistoryRow {
    Long getPlanId();

    LocalDate getSessionDate();

    SessionStatus getPlanStatus();

    Long getItemId();

    Integer getOrderIndex();

    Integer getDurationMinutes();

    ExerciseStatus getStatus();

    String getReason();

    Long getExerciseId();

    String getTitle();

    String getDomain();

    ActivityType getActivityType();

    DifficultyLevel getDifficultyLevel();

    Boolean getCompleted();

    DifficultyFeedback getDifficultyFeedback();

    String getEmotionFeedback();

    String getNotes();
}
