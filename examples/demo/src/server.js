import express from 'express';
import { validateBody } from 'express-schema-guardian';

const app = express();

app.post('/users', async (req, res) => {
  validateBody(req.body);
  try {
    await saveUser(req.body);
  } catch (e) {}
  // ... rest of the handlers
  res.sendStatus(201);
});
