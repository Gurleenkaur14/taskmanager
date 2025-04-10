require('dotenv').config();
const express = require('express');
const cors = require('cors');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
const s3 = new AWS.S3();

const BUCKET = process.env.S3_BUCKET_NAME;
const FILE = process.env.TASK_FILE_NAME;

app.use(cors());
app.use(express.json());

// Read tasks from S3
const readTasks = async () => {
  try {
    const data = await s3.getObject({ Bucket: BUCKET, Key: FILE }).promise();
    return JSON.parse(data.Body.toString());
  } catch (err) {
    if (err.code === 'NoSuchKey') return [];
    throw err;
  }
};

// Write tasks to S3
const writeTasks = async (tasks) => {
  const body = JSON.stringify(tasks, null, 2);
  await s3.putObject({
    Bucket: BUCKET,
    Key: FILE,
    Body: body,
    ContentType: 'application/json',
  }).promise();
};

// Health Check
app.get('/', (req, res) => res.send('S3 BACKEND WORKING!'));

// Get tasks
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await readTasks();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add task
app.post('/tasks', async (req, res) => {
  try {
    const tasks = await readTasks();
    const newTask = { id: uuidv4(), ...req.body };
    tasks.push(newTask);
    await writeTasks(tasks);
    res.json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task
app.put('/tasks/:id', async (req, res) => {
  try {
    const tasks = await readTasks();
    const updatedTasks = tasks.map(task =>
      task.id === req.params.id ? { ...task, ...req.body } : task
    );
    await writeTasks(updatedTasks);
    const updatedTask = updatedTasks.find(t => t.id === req.params.id);
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
app.delete('/tasks/:id', async (req, res) => {
  try {
    const tasks = await readTasks();
    const filtered = tasks.filter(task => task.id !== req.params.id);
    await writeTasks(filtered);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
