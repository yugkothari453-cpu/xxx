import express from 'express';
import serverless from 'serverless-http';
import { apiRouter } from '../../src/server/api.js';

const app = express();

app.use(express.json());

// Support both direct Netlify functions path, /api rewrite, and root
app.use('/api', apiRouter);
app.use('/.netlify/functions/api', apiRouter);
app.use('/', apiRouter);

export const handler = serverless(app);
