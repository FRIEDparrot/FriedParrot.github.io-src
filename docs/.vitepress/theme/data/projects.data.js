/**
 * Project registry.
 *
 * Repo metadata is fetched in the browser from public metadata endpoints.
 * Language can be overridden here because public badge APIs may return a
 * percentage instead of the language name.
 * Page is explicit so only projects with a dedicated local page link there.
 */

const repos = [
  { repo: 'FRIEDparrot/obsidian-equation-citator', language: 'TypeScript', page: true },
  { repo: 'FRIEDparrot/zh_pinyin_decoder', language: 'C', page: false },
  { repo: 'FRIEDparrot/ClassReview', language: 'C',  page: false },
  { repo: 'FRIEDparrot/FriedParrot.github.io-src', language: 'Vue', page: false },
  { repo: 'FRIEDparrot/fish-segmentation', language: 'Python', page: false },
  { repo: 'FRIEDparrot/cifar10-diffusion-practice', language: 'Python', page: false },
  { repo: 'FRIEDparrot/ml_data_fitting', language: 'Python', page: false },
  { repo: 'FRIEDparrot/fenicsx_cell_homogenization', language: 'Python', page: false },
  { repo: 'FRIEDparrot/matlab_reliability_examples', language: 'MATLAB', page: false },
  { repo: 'FRIEDparrot/RecommendSystem_practice', language: 'Python', page: false }
]

function projectFromRepo(project) {
  const repo = project.repo
  const name = repo.split('/').pop()
  return {
    name,
    repo,
    language: project.language || null,
    page: project.page === true
  }
}

export default {
  load() {
    return {
      projects: repos.map(projectFromRepo)
    }
  }
}
