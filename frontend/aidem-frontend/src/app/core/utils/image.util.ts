export const DEFAULT_PATIENT_AVATAR =
  '/icons/generic_user.svg';

export const DEFAULT_FORMAL_AVATAR =
  '/icons/Professional_doctor.svg';

export const DEFAULT_INFORMAL_AVATAR =
  '/icons/User.svg';

export async function resizeProfileImage(
  file: File
): Promise<string> {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      'Selecione uma fotografia JPG, PNG ou WEBP.'
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      'A fotografia não pode ter mais de 5 MB.'
    );
  }

  const imageUrl =
    URL.createObjectURL(file);

  try {
    const image =
      await loadImage(imageUrl);

    const outputSize = 512;

    const sourceSize =
      Math.min(
        image.naturalWidth,
        image.naturalHeight
      );

    const sourceX =
      (
        image.naturalWidth -
        sourceSize
      ) / 2;

    const sourceY =
      (
        image.naturalHeight -
        sourceSize
      ) / 2;

    const canvas =
      document.createElement('canvas');

    canvas.width = outputSize;
    canvas.height = outputSize;

    const context =
      canvas.getContext('2d');

    if (!context) {
      throw new Error(
        'Não foi possível processar a fotografia.'
      );
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize
    );

    return canvas.toDataURL(
      'image/jpeg',
      0.82
    );
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(
  source: string
): Promise<HTMLImageElement> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const image =
        new Image();

      image.onload =
        () => resolve(image);

      image.onerror =
        () => reject(
          new Error(
            'Não foi possível ler a fotografia.'
          )
        );

      image.src = source;
    }
  );
}

export const DEFAULT_EXERCISE_IMAGE =
  '/icons/generic_exercise.svg';

export async function resizeExerciseImage(
  file: File
): Promise<string> {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      'Selecione uma imagem JPG, PNG ou WEBP.'
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error(
      'A imagem não pode ter mais de 5 MB.'
    );
  }

  const imageUrl =
    URL.createObjectURL(file);

  try {
    const image =
      await loadExerciseImage(imageUrl);

    /*
     * Formato horizontal adequado aos
     * cartões dos exercícios.
     */
    const outputWidth = 900;
    const outputHeight = 600;

    const sourceRatio =
      image.naturalWidth /
      image.naturalHeight;

    const targetRatio =
      outputWidth /
      outputHeight;

    let sourceWidth =
      image.naturalWidth;

    let sourceHeight =
      image.naturalHeight;

    let sourceX = 0;
    let sourceY = 0;

    if (sourceRatio > targetRatio) {
      sourceWidth =
        image.naturalHeight *
        targetRatio;

      sourceX =
        (
          image.naturalWidth -
          sourceWidth
        ) / 2;

    } else {
      sourceHeight =
        image.naturalWidth /
        targetRatio;

      sourceY =
        (
          image.naturalHeight -
          sourceHeight
        ) / 2;
    }

    const canvas =
      document.createElement('canvas');

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context =
      canvas.getContext('2d');

    if (!context) {
      throw new Error(
        'Não foi possível processar a imagem.'
      );
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    return canvas.toDataURL(
      'image/jpeg',
      0.82
    );

  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadExerciseImage(
  source: string
): Promise<HTMLImageElement> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const image =
        new Image();

      image.onload =
        () => resolve(image);

      image.onerror =
        () => reject(
          new Error(
            'Não foi possível ler a imagem.'
          )
        );

      image.src = source;
    }
  );
}
