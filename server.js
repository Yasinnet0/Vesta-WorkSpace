import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const DATA_DIR = process.env.USER_DATA_PATH
    ? path.join(process.env.USER_DATA_PATH, 'data')
    : path.join(__dirname, 'data');

// Ensure that the DATA_DIR directory exists (creates it recursively if it does not)
async function ensureDataDirExists() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        
        // Copy default database templates from __dirname/data if target files do not exist
        const templateDir = path.join(__dirname, 'data');
        if (path.resolve(DATA_DIR) !== path.resolve(templateDir)) {
            try {
                const files = await fs.readdir(templateDir);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const destPath = path.join(DATA_DIR, file);
                        try {
                            await fs.access(destPath);
                            // File exists, keep it
                        } catch {
                            // File does not exist, copy from template
                            const srcPath = path.join(templateDir, file);
                            await fs.copyFile(srcPath, destPath);
                            console.log(`Initialized database: ${file} copied to ${DATA_DIR}`);
                        }
                    }
                }
            } catch (copyErr) {
                console.error("Failed to copy default template database files:", copyErr);
            }
        }
    } catch (err) {
        // Already exists or permission/other error (fallback gracefully)
    }
}

// Helper to read JSON files
async function readData(file) {
    try {
        await ensureDataDirExists();
        const data = await fs.readFile(path.join(DATA_DIR, `${file}.json`), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

// Helper to write JSON files
async function writeData(file, data) {
    await ensureDataDirExists();
    await fs.writeFile(path.join(DATA_DIR, `${file}.json`), JSON.stringify(data, null, 4));
}

// Global active locks mapping for files
const locks = {};

// Queue and serialize asynchronous actions on a specific data file to prevent parallel write clobbering
async function runLocked(file, fn) {
    if (!locks[file]) {
        locks[file] = Promise.resolve();
    }
    const previous = locks[file];
    const current = (async () => {
        try {
            await previous;
        } catch (e) {}
        return await fn();
    })();
    locks[file] = current;
    return current;
}

// --- API Endpoints ---

// Bookmarks
app.get('/api/bookmarks', async (req, res) => {
    res.json(await readData('sites'));
});

app.post('/api/bookmarks', async (req, res) => {
    const bookmarks = await readData('sites');
    const newBookmark = { ...req.body, id: uuidv4(), created: new Date().toISOString() };
    bookmarks.push(newBookmark);
    await writeData('sites', bookmarks);
    res.json(newBookmark);
});

app.delete('/api/bookmarks/:id', async (req, res) => {
    let bookmarks = await readData('sites');
    bookmarks = bookmarks.filter(b => b.id !== req.params.id);
    await writeData('sites', bookmarks);
    res.json({ success: true });
});

app.put('/api/bookmarks/:id', async (req, res) => {
    const bookmarks = await readData('sites');
    const index = bookmarks.findIndex(b => b.id === req.params.id);
    if (index !== -1) {
        bookmarks[index] = { ...bookmarks[index], ...req.body };
        await writeData('sites', bookmarks);
        res.json(bookmarks[index]);
    } else {
        res.status(404).json({ error: 'Bookmark not found' });
    }
});


// Tasks
app.get('/api/tasks', async (req, res) => {
    res.json(await readData('tasks'));
});

app.post('/api/tasks', async (req, res) => {
    const tasks = await readData('tasks');
    const newTask = { ...req.body, id: uuidv4() };
    tasks.push(newTask);
    await writeData('tasks', tasks);
    res.json(newTask);
});

app.put('/api/tasks/:id', async (req, res) => {
    const tasks = await readData('tasks');
    const index = tasks.findIndex(t => t.id === req.params.id);
    if (index !== -1) {
        tasks[index] = { ...tasks[index], ...req.body };
        await writeData('tasks', tasks);
        res.json(tasks[index]);
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    let tasks = await readData('tasks');
    tasks = tasks.filter(t => t.id !== req.params.id);
    await writeData('tasks', tasks);
    res.json({ success: true });
});

// Categories (extracted from data on the fly or stored separately)
app.get('/api/categories', async (req, res) => {
    const bookmarks = await readData('sites');
    const tasks = await readData('tasks');
    const notes = await readData('notes');
    const ideas = await readData('ideas');
    const nodes = await readData('nodes');
    
    const bookmarkCats = [...new Set(bookmarks.map(b => b.category))].filter(Boolean);
    const taskLists = [...new Set(tasks.map(t => t.list))].filter(Boolean);
    const noteCats = [...new Set(notes.map(n => n.category))].filter(Boolean);
    const ideaCats = [...new Set(ideas.map(i => i.category))].filter(Boolean);
    const nodeCats = [...new Set(nodes.map(n => n.category))].filter(Boolean);
    
    res.json({ 
        bookmarks: bookmarkCats, 
        tasks: taskLists,
        notes: noteCats,
        ideas: ideaCats,
        nodes: nodeCats
    });
});

// Notes
app.get('/api/notes', async (req, res) => res.json(await readData('notes')));
app.post('/api/notes', async (req, res) => {
    const notes = await readData('notes');
    const newNote = { ...req.body, id: uuidv4() };
    notes.push(newNote);
    await writeData('notes', notes);
    res.json(newNote);
});
app.delete('/api/notes/:id', async (req, res) => {
    let notes = await readData('notes');
    notes = notes.filter(n => n.id !== req.params.id);
    await writeData('notes', notes);
    res.json({ success: true });
});

app.put('/api/notes/:id', async (req, res) => {
    const notes = await readData('notes');
    const index = notes.findIndex(n => n.id === req.params.id);
    if (index !== -1) {
        notes[index] = { ...notes[index], ...req.body };
        await writeData('notes', notes);
        res.json(notes[index]);
    } else {
        res.status(404).json({ error: 'Note not found' });
    }
});


// Ideas
app.get('/api/ideas', async (req, res) => res.json(await readData('ideas')));
app.post('/api/ideas', async (req, res) => {
    const ideas = await readData('ideas');
    const newIdea = { ...req.body, id: uuidv4() };
    ideas.push(newIdea);
    await writeData('ideas', ideas);
    res.json(newIdea);
});
app.delete('/api/ideas/:id', async (req, res) => {
    let ideas = await readData('ideas');
    ideas = ideas.filter(i => i.id !== req.params.id);
    await writeData('ideas', ideas);
    res.json({ success: true });
});

app.put('/api/ideas/:id', async (req, res) => {
    const ideas = await readData('ideas');
    const index = ideas.findIndex(i => i.id === req.params.id);
    if (index !== -1) {
        ideas[index] = { ...ideas[index], ...req.body };
        await writeData('ideas', ideas);
        res.json(ideas[index]);
    } else {
        res.status(404).json({ error: 'Idea not found' });
    }
});


// Links (Graph Connections)
app.get('/api/links', async (req, res) => res.json(await readData('links')));
app.post('/api/links', async (req, res) => {
    const links = await readData('links');
    const newLink = { ...req.body, id: uuidv4() };
    links.push(newLink);
    await writeData('links', links);
    res.json(newLink);
});
app.delete('/api/links/:id', async (req, res) => {
    let links = await readData('links');
    links = links.filter(l => l.id !== req.params.id);
    await writeData('links', links);
    res.json({ success: true });
});

// Nodes (Graph Nodes)
app.get('/api/nodes', async (req, res) => res.json(await readData('nodes')));

app.post('/api/nodes', async (req, res) => {
    try {
        const newNode = await runLocked('nodes', async () => {
            const nodes = await readData('nodes');
            const createdNode = { ...req.body, id: uuidv4(), created: new Date().toISOString() };
            nodes.push(createdNode);
            await writeData('nodes', nodes);
            return createdNode;
        });
        res.json(newNode);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Batch update nodes coordinates and attributes atomically
app.put('/api/nodes/batch', async (req, res) => {
    try {
        const updates = req.body;
        if (!Array.isArray(updates)) {
            return res.status(400).json({ error: 'Body must be an array of updates' });
        }

        await runLocked('nodes', async () => {
            const nodes = await readData('nodes');
            let count = 0;
            updates.forEach(upd => {
                const index = nodes.findIndex(n => n.id === upd.id);
                if (index !== -1) {
                    nodes[index] = { ...nodes[index], ...upd };
                    count++;
                }
            });
            if (count > 0) {
                await writeData('nodes', nodes);
            }
        });

        res.json({ success: true, count: updates.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/nodes/:id', async (req, res) => {
    try {
        const updated = await runLocked('nodes', async () => {
            const nodes = await readData('nodes');
            const index = nodes.findIndex(n => n.id === req.params.id);
            if (index !== -1) {
                nodes[index] = { ...nodes[index], ...req.body };
                await writeData('nodes', nodes);
                return nodes[index];
            }
            return null;
        });
        if (updated) {
            res.json(updated);
        } else {
            res.status(404).json({ error: 'Node not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/nodes/:id', async (req, res) => {
    try {
        await runLocked('nodes', async () => {
            let nodes = await readData('nodes');
            nodes = nodes.filter(n => n.id !== req.params.id);
            await writeData('nodes', nodes);
        });

        // Also lock links when deleting associated links
        await runLocked('links', async () => {
            let links = await readData('links');
            links = links.filter(l => l && l.source !== req.params.id && l.target !== req.params.id);
            await writeData('links', links);
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Dashboard Stats
app.get('/api/stats', async (req, res) => {
    const bookmarks = await readData('sites');
    const tasks = await readData('tasks');
    const notes = await readData('notes');
    const ideas = await readData('ideas');
    
    res.json({
        bookmarksCount: bookmarks.length,
        tasksCount: tasks.length,
        completedTasksCount: tasks.filter(t => t.completed).length,
        notesCount: notes.length,
        ideasCount: ideas.length
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
