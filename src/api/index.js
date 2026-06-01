import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// In-Memory Fast Cache for Desktop Node Environments
const cache = {
    bookmarks: null,
    tasks: null,
    notes: null,
    ideas: null,
    stats: null,
    categories: null,
    nodes: null,
    links: null,
};

// Bookmarks Cache Controllers
export const getBookmarks = async () => {
    if (cache.bookmarks) return { data: cache.bookmarks };
    const res = await api.get('/bookmarks');
    cache.bookmarks = res.data;
    return res;
};

export const addBookmark = async (data) => {
    const res = await api.post('/bookmarks', data);
    if (cache.bookmarks) {
        cache.bookmarks = [res.data, ...cache.bookmarks];
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

export const updateBookmark = async (id, data) => {
    const res = await api.put(`/bookmarks/${id}`, data);
    if (cache.bookmarks) {
        cache.bookmarks = cache.bookmarks.map(b => b.id === id ? res.data : b);
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

export const deleteBookmark = async (id) => {
    const res = await api.delete(`/bookmarks/${id}`);
    if (cache.bookmarks) {
        cache.bookmarks = cache.bookmarks.filter(b => b.id !== id);
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

// Tasks Cache Controllers
export const getTasks = async () => {
    if (cache.tasks) return { data: cache.tasks };
    const res = await api.get('/tasks');
    cache.tasks = res.data;
    return res;
};

export const addTask = async (data) => {
    const res = await api.post('/tasks', data);
    if (cache.tasks) {
        cache.tasks = [res.data, ...cache.tasks];
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

export const updateTask = async (id, data) => {
    const res = await api.put(`/tasks/${id}`, data);
    if (cache.tasks) {
        cache.tasks = cache.tasks.map(t => t.id === id ? res.data : t);
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

export const deleteTask = async (id) => {
    const res = await api.delete(`/tasks/${id}`);
    if (cache.tasks) {
        cache.tasks = cache.tasks.filter(t => t.id !== id);
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

// Stats and Categories Controllers (Cached and invalidated reactive-style)
export const getStats = async () => {
    if (cache.stats) return { data: cache.stats };
    const res = await api.get('/stats');
    cache.stats = res.data;
    return res;
};

export const getCategories = async () => {
    if (cache.categories) return { data: cache.categories };
    const res = await api.get('/categories');
    cache.categories = res.data;
    return res;
};

// Notes Cache Controllers
export const getNotes = async () => {
    if (cache.notes) return { data: cache.notes };
    const res = await api.get('/notes');
    cache.notes = res.data;
    return res;
};

export const addNote = async (data) => {
    const res = await api.post('/notes', data);
    if (cache.notes) {
        cache.notes = [res.data, ...cache.notes];
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

export const updateNote = async (id, data) => {
    const res = await api.put(`/notes/${id}`, data);
    if (cache.notes) {
        cache.notes = cache.notes.map(n => n.id === id ? res.data : n);
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

export const deleteNote = async (id) => {
    const res = await api.delete(`/notes/${id}`);
    if (cache.notes) {
        cache.notes = cache.notes.filter(n => n.id !== id);
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

// Ideas Cache Controllers
export const getIdeas = async () => {
    if (cache.ideas) return { data: cache.ideas };
    const res = await api.get('/ideas');
    cache.ideas = res.data;
    return res;
};

export const addIdea = async (data) => {
    const res = await api.post('/ideas', data);
    if (cache.ideas) {
        cache.ideas = [res.data, ...cache.ideas];
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

export const updateIdea = async (id, data) => {
    const res = await api.put(`/ideas/${id}`, data);
    if (cache.ideas) {
        cache.ideas = cache.ideas.map(i => i.id === id ? res.data : i);
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

export const deleteIdea = async (id) => {
    const res = await api.delete(`/ideas/${id}`);
    if (cache.ideas) {
        cache.ideas = cache.ideas.filter(i => i.id !== id);
    }
    cache.stats = null;
    cache.categories = null;
    return res;
};

// Links (Graph relationships) Controllers
export const getLinks = async () => {
    if (cache.links) return { data: cache.links };
    const res = await api.get('/links');
    cache.links = res.data;
    return res;
};

export const addLink = async (data) => {
    const res = await api.post('/links', data);
    if (cache.links) {
        cache.links = [res.data, ...cache.links];
    }
    return res;
};

export const deleteLink = async (id) => {
    const res = await api.delete(`/links/${id}`);
    if (cache.links) {
        cache.links = cache.links.filter(l => l.id !== id);
    }
    return res;
};

// Nodes (Graph canvas visualization) Controllers
export const getNodes = async () => {
    if (cache.nodes) return { data: cache.nodes };
    const res = await api.get('/nodes');
    cache.nodes = res.data;
    return res;
};

export const addNode = async (data) => {
    const res = await api.post('/nodes', data);
    if (cache.nodes) {
        cache.nodes = [res.data, ...cache.nodes];
    }
    return res;
};

export const updateNode = async (id, data) => {
    const res = await api.put(`/nodes/${id}`, data);
    if (cache.nodes) {
        cache.nodes = cache.nodes.map(n => n.id === id ? res.data : n);
    }
    return res;
};

export const updateNodesBatch = async (updates) => {
    const res = await api.put('/nodes/batch', updates);
    cache.nodes = null;
    return res;
};

export const deleteNode = async (id) => {
    const res = await api.delete(`/nodes/${id}`);
    if (cache.nodes) {
        cache.nodes = cache.nodes.filter(n => n.id !== id);
    }
    return res;
};

export default api;
