import { RenderMode, ServerRoute } from '@angular/ssr';

/*
 * A sessão está no localStorage (só existe
 * no browser), por isso as rotas são
 * renderizadas no cliente. O servidor
 * devolve a app para qualquer URL, o que
 * permite refresh e links diretos.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
