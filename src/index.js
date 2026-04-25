const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const quizzesRouter = require('./routes/quizzes');
const prisma = require("./lib/prisma");
const authRouter = require("./routes/auth");


// Middleware to parse JSON bodies (will be useful in later steps)
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/quizzes", quizzesRouter);

app.use((req, res) => {
  res.json({msg: "Not found"});
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
