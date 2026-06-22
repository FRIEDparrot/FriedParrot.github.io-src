<template>
  <main class="project-index-layout">
    <Content class="vp-doc project-index-doc" />
  </main>
</template>

<style scoped>
.project-index-layout {
  width: min(calc(100vw - 64px), calc(var(--vp-layout-max-width) - 64px));
  margin: 0 auto;
  padding: calc(var(--vp-nav-height) + 48px) 0 96px;
}

:deep(.project-index-doc > h1),
:deep(.project-index-doc > p) {
  max-width: 760px;
}

:deep(.project-index-doc > h1:first-child) {
  margin-top: 0;
}

@media (max-width: 767px) {
  .project-index-layout {
    width: calc(100vw - 40px);
    padding-top: calc(var(--vp-nav-height) + 32px);
    padding-bottom: 64px;
  }
}
</style>
