const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let nextId = 4;

const habits = [
  {
    id: 1,
    title: 'Morning Workout',
    category: 'Gym',
    streak: 5,
    completedToday: false,
    history: ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08'],
  },
  {
    id: 2,
    title: 'LeetCode Practice',
    category: 'Coding',
    streak: 3,
    completedToday: true,
    history: ['2026-09-07', '2026-09-08', '2026-09-09'],
  },
  {
    id: 3,
    title: 'Read 20 Pages',
    category: 'Reading',
    streak: 2,
    completedToday: false,
    history: ['2026-09-07', '2026-09-08'],
  },
];

app.get('/api/habits', (req, res) => {
  res.json(habits);
});

app.post('/api/habits', (req, res) => {
  const { title, category } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: 'title and category are required' });
  }

  const newHabit = {
    id: nextId++,
    title,
    category,
    streak: 0,
    completedToday: false,
    history: [],
  };

  habits.push(newHabit);
  return res.status(200).json(newHabit);
});

app.patch('/api/habits/:id/toggle', (req, res) => {
  const id = Number(req.params.id);
  const habit = habits.find((h) => h.id === id);

  if (!habit) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  habit.completedToday = !habit.completedToday;

  if (habit.completedToday) {
    habit.streak += 1;
  } else {
    habit.streak = Math.max(0, habit.streak - 1);
  }

  res.json(habit);
});

app.delete('/api/habits/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = habits.findIndex((h) => h.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  habits.splice(index, 1);
  res.status(200).json({ success: true });
});

app.listen(PORT, () => {
  console.log('Server running on port 5000');
});
