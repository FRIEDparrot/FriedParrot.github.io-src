<template>
  <main class="project-index-layout">
    <Content class="vp-doc project-index-doc" />
  </main>
</template>

<style scoped>
.project-index-layout {
  width: min(calc(100vw - 64px), calc(var(--vp-layout-max-width) - 64px));
  margin: 0 auto;
  padding: 0 0 96px;
}

:deep(.project-index-doc > :is(h1, h2, h3, h4, h5, h6)),
:deep(.project-index-doc > p) {
  max-width: 760px;
}

:deep(.project-index-doc > :is(h1, h2, h3, h4, h5, h6):first-child) {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

@media (max-width: 767px) {
  .project-index-layout {
    width: calc(100vw - 40px);
    padding-top: 0;
    padding-bottom: 64px;
  }
}
</style>
