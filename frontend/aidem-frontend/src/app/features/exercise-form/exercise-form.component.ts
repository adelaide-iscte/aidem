import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  DEFAULT_EXERCISE_IMAGE,
  resizeExerciseImage,
  resizeInstructionMedia
} from '../../core/utils/image.util';

import {
  ActivityType,
  DifficultyLevel,
  Exercise,
  ExercisePayload,
  ExerciseService
} from '../../core/services/exercise.service';


type InstructionMediaField =
  | 'instructionMedia2'
  | 'instructionMedia3'
  | 'instructionMedia4'
  | 'instructionMedia5'
  | 'instructionMedia6'
  | 'instructionMedia7';


@Component({
  selector: 'app-exercise-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './exercise-form.component.html',
  styleUrl: './exercise-form.component.scss'
})
export class ExerciseFormComponent
  implements OnChanges {

  readonly instructionMediaFields:
    InstructionMediaField[] = [
    'instructionMedia2',
    'instructionMedia3',
    'instructionMedia4',
    'instructionMedia5',
    'instructionMedia6',
    'instructionMedia7'
  ];

  @Input()
  exerciseToEdit: Exercise | null = null;

  @Output()
  goBack = new EventEmitter<void>();

  @Output()
  saved = new EventEmitter<void>();

  isSaving = false;

  errorMessage = '';
  successMessage = '';

  imageError = '';
  isProcessingImage = false;

  instructionMediaError = '';
  isProcessingInstructionMedia = false;

  form: ExercisePayload =
    this.createEmptyForm();


  constructor(
    private exerciseService: ExerciseService,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnChanges(
    changes: SimpleChanges
  ): void {
    if (changes['exerciseToEdit']) {
      this.loadExercise();
    }
  }


  get isEditing(): boolean {
    return this.exerciseToEdit !== null;
  }


  get pageTitle(): string {
    return this.isEditing
      ? 'Editar atividade'
      : 'Criar atividade';
  }


  private createEmptyForm():
    ExercisePayload {

    return {
      title: '',
      description: '',
      domain: '',
      activityType: 'MOTOR',
      difficultyLevel: 'LOW',
      durationMinutes: 0,
      sets: 0,
      repetitions: 0,
      restSeconds: 0,
      materials: '',
      instructions: '',

      media2: null,

      instructionMedia2: null,
      instructionMedia3: null,
      instructionMedia4: null,
      instructionMedia5: null,
      instructionMedia6: null,
      instructionMedia7: null
    };
  }


  private loadExercise(): void {
    if (!this.exerciseToEdit) {
      this.form = this.createEmptyForm();
      return;
    }

    this.form = {
      title:
        this.exerciseToEdit.title ?? '',

      description:
        this.exerciseToEdit.description ?? '',

      domain:
        this.exerciseToEdit.domain ?? '',

      activityType:
      this.exerciseToEdit.activityType,

      difficultyLevel:
      this.exerciseToEdit.difficultyLevel,

      durationMinutes:
        this.exerciseToEdit.durationMinutes ?? 0,

      sets:
        this.exerciseToEdit.sets ?? 0,

      repetitions:
        this.exerciseToEdit.repetitions ?? 0,

      restSeconds:
        this.exerciseToEdit.restSeconds ?? 0,

      materials:
        this.exerciseToEdit.materials ?? '',

      instructions:
        this.exerciseToEdit.instructions ?? '',

      media2:
        this.exerciseToEdit.media2 ?? null,

      instructionMedia2:
        this.exerciseToEdit.instructionMedia2 ?? null,

      instructionMedia3:
        this.exerciseToEdit.instructionMedia3 ?? null,

      instructionMedia4:
        this.exerciseToEdit.instructionMedia4 ?? null,

      instructionMedia5:
        this.exerciseToEdit.instructionMedia5 ?? null,

      instructionMedia6:
        this.exerciseToEdit.instructionMedia6 ?? null,

      instructionMedia7:
        this.exerciseToEdit.instructionMedia7 ?? null
    };
  }


  increase(
    field:
      | 'durationMinutes'
      | 'sets'
      | 'repetitions'
      | 'restSeconds'
  ): void {

    const increment =
      field === 'restSeconds'
        ? 5
        : 1;

    this.form[field] =
      (this.form[field] ?? 0) +
      increment;
  }


  decrease(
    field:
      | 'durationMinutes'
      | 'sets'
      | 'repetitions'
      | 'restSeconds'
  ): void {

    const decrement =
      field === 'restSeconds'
        ? 5
        : 1;

    this.form[field] = Math.max(
      0,
      (this.form[field] ?? 0) -
      decrement
    );
  }


  /*
   * =========================================================
   * IMAGEM / ÍCONE PRINCIPAL DO EXERCÍCIO
   * mediaUrl / media2
   * =========================================================
   */

  getExerciseImage(): string {

    const uploadedMedia =
      this.form.media2?.trim();

    if (uploadedMedia) {
      return this.normalizeImageUrl(
        uploadedMedia
      );
    }

    const originalMedia =
      this.exerciseToEdit
        ?.mediaUrl
        ?.trim();

    if (originalMedia) {
      return this.normalizeImageUrl(
        originalMedia
      );
    }

    return DEFAULT_EXERCISE_IMAGE;
  }


  private normalizeImageUrl(
    media: string
  ): string {

    if (
      media.startsWith('data:image/') ||
      media.startsWith('http://') ||
      media.startsWith('https://') ||
      media.startsWith('/')
    ) {
      return media;
    }

    return `/${media}`;
  }


  async onExerciseImageSelected(
    event: Event
  ): Promise<void> {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (!file) {
      return;
    }

    this.imageError = '';
    this.isProcessingImage = true;

    try {

      const resizedImage =
        await resizeExerciseImage(file);

      this.form = {
        ...this.form,
        media2: resizedImage
      };

      this.cdr.detectChanges();

    } catch (error) {

      this.imageError =
        error instanceof Error
          ? error.message
          : 'Não foi possível selecionar a imagem.';

      this.cdr.detectChanges();

    } finally {

      this.isProcessingImage = false;
      input.value = '';

      this.cdr.detectChanges();
    }
  }


  removeExerciseImage(): void {

    /*
     * Guardamos explicitamente a imagem default
     * para não voltar ao mediaUrl antigo.
     */
    this.form = {
      ...this.form,
      media2: DEFAULT_EXERCISE_IMAGE
    };

    this.imageError = '';

    this.cdr.detectChanges();
  }


  get hasCustomExerciseImage(): boolean {

    const media2 =
      this.form.media2?.trim();

    if (media2) {
      return (
        media2 !==
        DEFAULT_EXERCISE_IMAGE
      );
    }

    return Boolean(
      this.exerciseToEdit
        ?.mediaUrl
        ?.trim()
    );
  }


  /*
   * =========================================================
   * IMAGENS DAS INSTRUÇÕES
   * instructionMedia2 → imagem 1
   * instructionMedia3 → imagem 2
   * ...
   * instructionMedia7 → imagem 6
   * =========================================================
   */

  private normalizeMediaUrl(
    media: string
  ): string {

    if (
      media.startsWith('data:') ||
      media.startsWith('http://') ||
      media.startsWith('https://') ||
      media.startsWith('/')
    ) {
      return media;
    }

    return `/${media}`;
  }


  get instructionMediaList(): string[] {

    return this.instructionMediaFields
      .map(
        field =>
          this.form[field]?.trim()
      )
      .filter(
        (media): media is string =>
          Boolean(media)
      );
  }


  get instructionMediaCount(): number {
    return this.instructionMediaList.length;
  }


  get canAddInstructionMedia(): boolean {
    return this.instructionMediaCount < 6;
  }


  get nextInstructionMediaNumber(): number {
    return this.instructionMediaCount + 1;
  }


  getInstructionMedia(
    field: InstructionMediaField
  ): string | null {

    const media =
      this.form[field]?.trim();

    return media
      ? this.normalizeMediaUrl(media)
      : null;
  }


  async onInstructionMediaSelected(
    event: Event
  ): Promise<void> {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0];

    if (!file) {
      return;
    }

    /*
     * Procura automaticamente o primeiro
     * slot de imagem disponível.
     */
    const nextField =
      this.instructionMediaFields.find(
        field =>
          !this.form[field]?.trim()
      );

    if (!nextField) {

      this.instructionMediaError =
        'Só é possível adicionar até 6 imagens.';

      input.value = '';

      return;
    }

    this.instructionMediaError = '';
    this.isProcessingInstructionMedia = true;

    try {

      const resizedImage =
        await resizeInstructionMedia(file);

      this.form = {
        ...this.form,
        [nextField]: resizedImage
      };

      this.cdr.detectChanges();

    } catch (error) {

      this.instructionMediaError =
        error instanceof Error
          ? error.message
          : 'Não foi possível selecionar a imagem.';

    } finally {

      this.isProcessingInstructionMedia = false;
      input.value = '';

      this.cdr.detectChanges();
    }
  }


  removeInstructionMedia(
    index: number
  ): void {

    /*
     * Obtém as imagens atualmente existentes.
     */
    const updatedMedia =
      this.instructionMediaFields
        .map(
          field =>
            this.form[field]
        )
        .filter(
          (media): media is string =>
            Boolean(media?.trim())
        );

    /*
     * Remove a imagem selecionada.
     */
    updatedMedia.splice(
      index,
      1
    );

    const updatedForm = {
      ...this.form
    };

    /*
     * Reorganiza os slots para não ficarem
     * espaços vazios entre imagens.
     *
     * Exemplo:
     *
     * imagem1
     * imagem2  <- removida
     * imagem3
     *
     * passa para:
     *
     * imagem1
     * imagem3
     * null
     */
    this.instructionMediaFields.forEach(
      (field, fieldIndex) => {

        updatedForm[field] =
          updatedMedia[fieldIndex] ??
          null;
      }
    );

    this.form = updatedForm;
    this.instructionMediaError = '';

    this.cdr.detectChanges();
  }


  /*
   * =========================================================
   * GUARDAR
   * =========================================================
   */

  async save(): Promise<void> {

    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.title.trim()) {

      this.errorMessage =
        'Indique o nome da atividade.';

      return;
    }

    if (!this.form.domain.trim()) {

      this.errorMessage =
        'Indique o domínio da atividade.';

      return;
    }

    this.isSaving = true;

    try {

      if (
        this.isEditing &&
        this.exerciseToEdit
      ) {

        await this.exerciseService
          .updateExercise(
            this.exerciseToEdit.id,
            this.form
          );

      } else {

        await this.exerciseService
          .createExercise(
            this.form
          );
      }

      this.successMessage =
        this.isEditing
          ? 'Atividade atualizada com sucesso.'
          : 'Atividade criada com sucesso.';

      this.saved.emit();

    } catch (error) {

      console.error(
        'Erro ao guardar atividade:',
        error
      );

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Não foi possível guardar a atividade.';

    } finally {

      this.isSaving = false;

      this.cdr.detectChanges();
    }
  }


  /*
   * =========================================================
   * OPÇÕES
   * =========================================================
   */

  activityTypes:
    Array<{
      value: ActivityType;
      label: string;
    }> = [
    {
      value: 'MOTOR',
      label: 'Motora'
    },
    {
      value: 'COGNITIVE',
      label: 'Cognitiva'
    },
    {
      value: 'MIXED',
      label: 'Mista'
    }
  ];


  difficultyLevels:
    Array<{
      value: DifficultyLevel;
      label: string;
    }> = [
    {
      value: 'LOW',
      label: 'Baixa'
    },
    {
      value: 'MEDIUM',
      label: 'Média'
    },
    {
      value: 'HIGH',
      label: 'Alta'
    }
  ];
}
