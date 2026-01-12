const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const loginCard = document.querySelector('#login-card');
const sessionCard = document.querySelector('#session-card');
const logoutButton = document.querySelector('#logout-button');
const postList = document.querySelector('#post-list');
const postForm = document.querySelector('#post-form');
const newPostButton = document.querySelector('#new-post');
const publishButton = document.querySelector('#publish-button');
const editorStatus = document.querySelector('#editor-status');
const formFeedback = document.querySelector('#form-feedback');

const API_BASE = '/api';

const state = {
  token: localStorage.getItem('adminToken'),
  posts: [],
  activeId: null,
};

const setAuthState = (token) => {
  state.token = token;
  if (token) {
    localStorage.setItem('adminToken', token);
    loginCard.hidden = true;
    sessionCard.hidden = false;
  } else {
    localStorage.removeItem('adminToken');
    loginCard.hidden = false;
    sessionCard.hidden = true;
  }
};

const authFetch = (url, options = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${state.token}`,
    },
  });
};

const setForm = (post) => {
  postForm.reset();
  postForm.elements.id.value = post?.id || '';
  postForm.elements.title.value = post?.title || '';
  postForm.elements.slug.value = post?.slug || '';
  postForm.elements.excerpt.value = post?.excerpt || '';
  postForm.elements.categories.value = post?.categories?.join(', ') || '';
  postForm.elements.content.value = post?.content || '';
  if (post) {
    editorStatus.textContent = `Editing “${post.title}” (${post.status}).`;
  } else {
    editorStatus.textContent = 'Creating a new draft.';
  }
};

const renderPosts = () => {
  if (!state.posts.length) {
    postList.innerHTML = '<p class="fineprint">No posts yet. Create one to get started.</p>';
    return;
  }
  postList.innerHTML = state.posts
    .map((post) => {
      const status = post.status === 'published' ? 'Published' : 'Draft';
      const publishedAt = post.publishedAt
        ? new Date(post.publishedAt).toLocaleDateString()
        : 'Not published';
      return `
        <button class="admin-list-item" type="button" data-id="${post.id}">
          <div>
            <strong>${post.title}</strong>
            <p class="small">${status} · ${publishedAt}</p>
          </div>
          <span class="text-link">Edit</span>
        </button>
      `;
    })
    .join('');

  postList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      const post = state.posts.find((item) => item.id === id);
      state.activeId = id;
      setForm(post);
      publishButton.disabled = post.status === 'published';
    });
  });
};

const loadPosts = async () => {
  if (!state.token) {
    return;
  }
  const response = await authFetch(`${API_BASE}/admin/posts`);
  if (!response.ok) {
    setAuthState(null);
    return;
  }
  const data = await response.json();
  state.posts = data;
  renderPosts();
};

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';
  const username = loginForm.elements.username.value.trim();
  const password = loginForm.elements.password.value.trim();
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    loginError.textContent = 'Login failed. Check your credentials.';
    return;
  }
  const data = await response.json();
  setAuthState(data.token);
  await loadPosts();
});

logoutButton.addEventListener('click', () => {
  setAuthState(null);
  state.posts = [];
  state.activeId = null;
  postList.innerHTML = '';
  setForm(null);
});

newPostButton.addEventListener('click', () => {
  state.activeId = null;
  setForm(null);
  publishButton.disabled = true;
});

postForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  formFeedback.textContent = '';
  const payload = {
    title: postForm.elements.title.value.trim(),
    slug: postForm.elements.slug.value.trim(),
    excerpt: postForm.elements.excerpt.value.trim(),
    content: postForm.elements.content.value.trim(),
    categories: postForm.elements.categories.value
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  };

  const id = postForm.elements.id.value;
  const response = await authFetch(
    id ? `${API_BASE}/posts/${id}` : `${API_BASE}/posts`,
    {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    formFeedback.textContent = 'Unable to save the post.';
    return;
  }

  const updated = await response.json();
  formFeedback.textContent = 'Post saved.';
  state.activeId = updated.id;
  await loadPosts();
  setForm(updated);
  publishButton.disabled = updated.status === 'published';
});

publishButton.addEventListener('click', async () => {
  const id = postForm.elements.id.value;
  if (!id) {
    formFeedback.textContent = 'Save the draft before publishing.';
    return;
  }
  const response = await authFetch(`${API_BASE}/posts/${id}/publish`, {
    method: 'POST',
  });
  if (!response.ok) {
    formFeedback.textContent = 'Unable to publish the post.';
    return;
  }
  const updated = await response.json();
  formFeedback.textContent = 'Post published.';
  await loadPosts();
  setForm(updated);
  publishButton.disabled = true;
});

setAuthState(state.token);
setForm(null);
loadPosts();
