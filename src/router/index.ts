import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/connect',
      name: 'connect',
      component: () => import('@/views/ConnectView.vue'),
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresReady: true },
    },
    {
      path: '/abrechnung',
      name: 'abrechnung',
      component: () => import('@/views/AbrechnungView.vue'),
      meta: { requiresReady: true },
    },
    {
      path: '/einstellungen',
      name: 'einstellungen',
      component: () => import('@/views/EinstellungenView.vue'),
      meta: { requiresReady: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/connect',
    },
  ],
})

// Zugang nach SVWS-Anmeldung oder bewusst ohne Verbindung (ADR 002, O4)
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresReady && !auth.isReady) {
    return { name: 'connect' }
  }
})

export default router
