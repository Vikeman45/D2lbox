import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/inventory',
      name: 'inventory',
      component: () => import('@/views/InventoryView.vue'),
    },
    {
      path: '/builds',
      name: 'builds',
      component: () => import('@/views/BuildsView.vue'),
    },
    {
      path: '/library',
      name: 'library',
      component: () => import('@/views/LibraryView.vue'),
    },
    {
      path: '/specializations',
      name: 'specializations',
      component: () => import('@/views/SpecializationsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
    {
      path: '/analyze',
      name: 'analyze',
      component: () => import('@/views/AnalyzeView.vue'),
    },
    {
      path: '/links',
      name: 'links',
      component: () => import('@/views/LinksView.vue'),
    },
  ],
})

export default router
