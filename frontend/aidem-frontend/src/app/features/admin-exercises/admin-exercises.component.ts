import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Exercise,
  ExerciseService
} from '../../core/services/exercise.service';

import {
  LoadingSpinnerComponent
} from '../../shared/laoding-spinner-modal/loading-spinner.component';

@Component({
  selector: 'app-admin-exercises',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingSpinnerComponent
  ],
  templateUrl:
    './admin-exercises.component.html',
  styleUrl:
    './admin-exercises.component.scss'
})
export class AdminExercisesComponent
  implements OnInit, OnDestroy {

  @Input() isAdmin = false;

  @Output()
  goBack = new EventEmitter<void>();

  @Output()
  createExercise = new EventEmitter<void>();

  @Output()
  editExercise = new EventEmitter<Exercise>();

  exercises: Exercise[] = [];

  searchTerm = '';

  currentPage = 0;
  pageSize = 20;

  totalPages = 0;
  totalElements = 0;

  isLoading = false;
  deletingId: number | null = null;
  errorMessage = '';

  showDeleteModal = false;
  exerciseToDelete: Exercise | null = null;

  private searchTimeout?:
    ReturnType<typeof setTimeout>;

  constructor(
    private exerciseService: ExerciseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.loadExercises(0);
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }

  async loadExercises(
    page = this.currentPage
  ): Promise<void> {
    if (page < 0) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result =
        await this.exerciseService.getExercises(
          page,
          this.pageSize,
          this.searchTerm
        );

      this.exercises = result.content ?? [];

      this.currentPage = result.number ?? 0;
      this.totalPages = result.totalPages ?? 0;
      this.totalElements =
        result.totalElements ?? 0;
    } catch (error) {
      console.error(
        'Erro ao carregar atividades:',
        error
      );

      this.exercises = [];

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as atividades.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  onSearchChange(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(
      () => {
        this.currentPage = 0;
        void this.loadExercises(0);
      },
      350
    );
  }

  clearSearch(): void {
    if (!this.searchTerm) {
      return;
    }

    this.searchTerm = '';
    this.currentPage = 0;

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    void this.loadExercises(0);
  }

  previousPage(): void {
    if (
      this.isLoading ||
      this.currentPage <= 0
    ) {
      return;
    }

    void this.loadExercises(
      this.currentPage - 1
    );
  }

  nextPage(): void {
    if (
      this.isLoading ||
      !this.hasNextPage
    ) {
      return;
    }

    void this.loadExercises(
      this.currentPage + 1
    );
  }

  get displayedPage(): number {
    return this.totalPages === 0
      ? 0
      : this.currentPage + 1;
  }

  get hasPreviousPage(): boolean {
    return this.currentPage > 0;
  }

  get hasNextPage(): boolean {
    return (
      this.totalPages > 0 &&
      this.currentPage <
      this.totalPages - 1
    );
  }

  requestEdit(
    exercise: Exercise
  ): void {
    this.editExercise.emit(exercise);
  }

  openDeleteModal(
    exercise: Exercise
  ): void {
    this.exerciseToDelete = exercise;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    if (this.deletingId !== null) {
      return;
    }

    this.showDeleteModal = false;
    this.exerciseToDelete = null;
  }

  async confirmDelete(): Promise<void> {
    if (!this.exerciseToDelete) {
      return;
    }

    const exercise = this.exerciseToDelete;

    this.deletingId = exercise.id;
    this.errorMessage = '';

    try {
      await this.exerciseService
        .deleteExercise(exercise.id);

      this.showDeleteModal = false;
      this.exerciseToDelete = null;

      const targetPage =
        this.exercises.length === 1 &&
        this.currentPage > 0
          ? this.currentPage - 1
          : this.currentPage;

      await this.loadExercises(targetPage);
    } catch (error) {
      console.error(
        'Erro ao apagar atividade:',
        error
      );

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Não foi possível apagar a atividade.';
    } finally {
      this.deletingId = null;
      this.cdr.detectChanges();
    }
  }

  getImage(
    exercise: Exercise
  ): string {
    if (!exercise.mediaUrl?.trim()) {
      return '/icons/generic_exercise.svg';
    }

    if (
      exercise.mediaUrl.startsWith('http') ||
      exercise.mediaUrl.startsWith('/')
    ) {
      return exercise.mediaUrl;
    }

    return `/${exercise.mediaUrl}`;
  }

  getActivitySummary(
    exercise: Exercise
  ): string {
    const values: string[] = [];

    if (
      exercise.durationMinutes !== null &&
      exercise.durationMinutes > 0
    ) {
      values.push(
        `${exercise.durationMinutes} minutos`
      );
    }

    if (
      exercise.sets !== null &&
      exercise.sets > 0
    ) {
      values.push(
        `${exercise.sets} séries`
      );
    }

    if (
      exercise.repetitions !== null &&
      exercise.repetitions > 0
    ) {
      values.push(
        `${exercise.repetitions} repetições`
      );
    }

    return values.join(' | ');
  }

  getRestSummary(
    exercise: Exercise
  ): string {
    return (
      exercise.restSeconds !== null &&
      exercise.restSeconds > 0
    )
      ? `${exercise.restSeconds} segundos entre séries`
      : '';
  }
}
