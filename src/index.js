const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const quizzesRouter = require('./routes/quizzes');

// Middleware to parse JSON bodies (will be useful in later steps)
app.use(express.json());

// everything under /api/quizzes
app.use("/api/quizzes", quizzesRouter);

app.use((req, res) => {
  res.json({msg: "Not found"});
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
