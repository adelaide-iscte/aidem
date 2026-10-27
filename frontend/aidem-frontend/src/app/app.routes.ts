import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard, startPageGuard } from './core/guards/auth.guards';

/*
 * Permissões por perfil:
 *  - todos os autenticados: utente (início,
 *    atividades, perfil), mensagens, conteúdos
 *  - admin + formal: lista e criação de utentes
 *  - admin: gestão de exercícios e de utilizadores
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'AIDEM - Iniciar sessão',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [startPageGuard],
        loadComponent: () => import('./pages/no-patient.page').then((m) => m.NoPatientPage),
      },
      {
        path: 'utentes',
        canActivate: [roleGuard('admin', 'formal')],
        title: 'AIDEM - Utentes',
        loadComponent: () => import('./pages/patients.page').then((m) => m.PatientsPage),
      },
      {
        path: 'utentes/novo',
        canActivate: [roleGuard('admin', 'formal')],
        title: 'AIDEM - Novo utente',
        loadComponent: () => import('./pages/create-patient.page').then((m) => m.CreatePatientPage),
      },
      {
        path: 'utentes/:patientId',
        loadComponent: () =>
          import('./pages/patient-context.page').then((m) => m.PatientContextPage),
        children: [
          {
            path: '',
            title: 'AIDEM - Início',
            loadComponent: () => import('./pages/home.page').then((m) => m.HomePage),
          },
          {
            path: 'atividades',
            title: 'AIDEM - Atividades',
            loadComponent: () => import('./pages/activities.page').then((m) => m.ActivitiesPage),
          },
          {
            path: 'perfil',
            title: 'AIDEM - Perfil',
            loadComponent: () => import('./pages/profile.page').then((m) => m.ProfilePage),
          },
        ],
      },
      {
        path: 'mensagens',
        title: 'AIDEM - Mensagens',
        loadComponent: () => import('./pages/chat.page').then((m) => m.ChatPage),
      },
      {
        path: 'conteudos',
        title: 'AIDEM - Conteúdos',
        loadComponent: () => import('./pages/contents.page').then((m) => m.ContentsPage),
      },
      {
        path: 'admin',
        canActivate: [roleGuard('admin')],
        canActivateChild: [roleGuard('admin')],
        children: [
          {
            path: 'exercicios',
            title: 'AIDEM - Exercícios',
            loadComponent: () =>
              import('./pages/admin-exercises.page').then((m) => m.AdminExercisesPage),
          },
          {
            path: 'exercicios/novo',
            title: 'AIDEM - Novo exercício',
            loadComponent: () =>
              import('./pages/exercise-form.page').then((m) => m.ExerciseFormPage),
          },
          {
            path: 'exercicios/:exerciseId/editar',
            title: 'AIDEM - Editar exercício',
            loadComponent: () =>
              import('./pages/exercise-form.page').then((m) => m.ExerciseFormPage),
          },
          {
            path: 'utilizadores',
            title: 'AIDEM - Utilizadores',
            loadComponent: () =>
              import('./pages/user-management.page').then((m) => m.UserManagementPage),
          },
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'exercicios',
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
