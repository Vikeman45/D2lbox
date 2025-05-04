<template>
  <main class="home app-grid-main">
    <h1>Welcome {{ store.userName.length > 0 ? `Back ${store.userName}` : 'Agent' }}!</h1>
    <p>App Database State : {{ db.dbStatus }}</p>
    <p>Open: {{ db.dbIsOpen }}</p>
    <p>May Be Stale: {{ db.dbMayBeStale }}</p>
  </main>
</template>

<script setup lang="ts">
import { useUserProfileStore } from '@/stores/userProfileStore'
import { useAppDatabaseStore } from '@/stores/appDatabaseStore'

const store = useUserProfileStore()
const db = useAppDatabaseStore()
</script>
