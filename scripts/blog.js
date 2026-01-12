const searchInput = document.querySelector('#search-input');
const categoryChips = document.querySelector('#category-chips');
const fromMonthInput = document.querySelector('#from-month');
const toMonthInput = document.querySelector('#to-month');
const sortSelect = document.querySelector('#sort-select');
const postGrid = document.querySelector('#post-grid');
const emptyState = document.querySelector('#empty-state');

const state = {
  posts: [],
  selectedCategories: new Set(),
};

const formatDate = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const parseMonthStart = (value) => {
  if (!value) {
    return null;
  }
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) {
    return null;
  }
  return new Date(year, month - 1, 1);
};

const parseMonthEnd = (value) => {
  if (!value) {
    return null;
  }
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) {
    return null;
  }
  return new Date(year, month, 0, 23, 59, 59, 999);
};

const sortPosts = (posts) => {
  const sorted = [...posts].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sortSelect.value === 'newest') {
    return sorted.reverse();
  }
  return sorted;
};

const matchesSearch = (post, query) => {
  if (!query) {
    return true;
  }
  const haystack = `${post.title} ${post.excerpt}`.toLowerCase();
  return haystack.includes(query);
};

const matchesCategories = (post, selected) => {
  if (selected.size === 0) {
    return true;
  }
  return post.categories.some((category) => selected.has(category));
};

const matchesDateRange = (post, fromDate, toDate) => {
  if (!fromDate && !toDate) {
    return true;
  }
  const postDate = new Date(post.date);
  if (fromDate && postDate < fromDate) {
    return false;
  }
  if (toDate && postDate > toDate) {
    return false;
  }
  return true;
};

const renderPosts = () => {
  const query = searchInput.value.trim().toLowerCase();
  const fromDate = parseMonthStart(fromMonthInput.value);
  const toDate = parseMonthEnd(toMonthInput.value);

  const filtered = state.posts.filter((post) => {
    return (
      matchesSearch(post, query) &&
      matchesCategories(post, state.selectedCategories) &&
      matchesDateRange(post, fromDate, toDate)
    );
  });

  const sorted = sortPosts(filtered);

  postGrid.innerHTML = sorted
    .map((post) => {
      const tags = post.categories
        .map((category) => `<span class="tag">${category}</span>`)
        .join('');
      const formattedDate = formatDate.format(new Date(post.date));
      return `
        <article class="post-card">
          <p class="post-meta">${formattedDate}</p>
          <h3>${post.title}</h3>
          <div class="tag-list">${tags}</div>
          <p>${post.excerpt}</p>
          <a class="text-link" href="#">Read more →</a>
        </article>
      `;
    })
    .join('');

  emptyState.hidden = sorted.length !== 0;
};

const renderCategoryChips = (categories) => {
  categoryChips.innerHTML = categories
    .map((category) => {
      return `
        <button class="chip" type="button" data-category="${category}" aria-pressed="false">
          ${category}
        </button>
      `;
    })
    .join('');

  categoryChips.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;
      if (state.selectedCategories.has(category)) {
        state.selectedCategories.delete(category);
        button.classList.remove('is-active');
        button.setAttribute('aria-pressed', 'false');
      } else {
        state.selectedCategories.add(category);
        button.classList.add('is-active');
        button.setAttribute('aria-pressed', 'true');
      }
      renderPosts();
    });
  });
};

const attachFilterListeners = () => {
  [searchInput, fromMonthInput, toMonthInput, sortSelect].forEach((input) => {
    input.addEventListener('input', renderPosts);
  });
  sortSelect.addEventListener('change', renderPosts);
};

const normalizePosts = (posts) => {
  return posts.map((post) => {
    return {
      ...post,
      date: post.publishedAt,
      categories: Array.isArray(post.categories) ? post.categories : [],
    };
  });
};

const init = async () => {
  try {
    const response = await fetch('/api/posts');
    if (!response.ok) {
      throw new Error('Failed to load posts.');
    }
    const data = await response.json();
    const normalized = normalizePosts(data);
    state.posts = normalized;

    const categories = Array.from(
      new Set(normalized.flatMap((post) => post.categories))
    ).sort();

    renderCategoryChips(categories);
    attachFilterListeners();
    renderPosts();
  } catch (error) {
    postGrid.innerHTML = '';
    emptyState.hidden = false;
    emptyState.querySelector('h3').textContent = 'Unable to load posts.';
    emptyState.querySelector('p').textContent =
      'Please refresh the page or check back later.';
  }
};

init();
