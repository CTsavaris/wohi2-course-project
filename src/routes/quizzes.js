const express = require("express");
const router = express.Router();

const quizzes = require("../data/quizzes");

// GET /quizzes - List all quizzes, with optional keyword filtering 
// List all quizzes
router.get("/", (req, res) => {
  const { title } = req.query;

  if (!title) {
    return res.json(quizzes);
  }

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(title.toLowerCase())
  );

  res.json(filteredQuizzes);
});

// GET /quizzes/:quizId
// Show a specific quiz
router.get("/:quizId", (req, res) => {
  const quizId = Number(req.params.quizId);

  const quiz = quizzes.find((q) => q.id === quizId);

  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found" });
  }

  res.json(quiz);
});

// POST /quizzes
// Create a new quiz
router.post("/", (req, res) => {
  const { title, options, answer } = req.body;

  if (!title || !options || !answer) {
    return res.status(400).json({
      message: "title, options, and answer are required"
    });
  }
  const maxId = Math.max(...quizzes.map(q => q.id), 0);

  const newQuiz = {
    id: quizzes.length ? maxId + 1 : 1,
    title, options, answer
  };
  quizzes.push(newQuiz);
  res.status(201).json(newQuiz);
});

// PUT /quizzes/:quizId
// Edit a quiz
router.put("/:quizId", (req, res) => {
  const quizId = Number(req.params.quizId);
  const { title, options, answer } = req.body;

  const quiz = quizzes.find((q) => q.id === quizId);

  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found" });
  }

  if (!title || !options || !answer) {
    return res.json({
      message: "title, options, and answer are required"
    });
  }

  quiz.title = title;
  quiz.options = options;
  quiz.answer = answer;

  res.json(quiz);
});

// DELETE /quizzes/:quizId
// Delete a quiz
router.delete("/:quizId", (req, res) => {
  const quizId = Number(req.params.quizId);

  const quizIndex = quizzes.findIndex((q) => q.id === quizId);

  if (quizIndex === -1) {
    return res.status(404).json({ message: "Quiz not found" });
  }

  const deletedQuiz = quizzes.splice(quizIndex, 1);

  res.json({
    message: "Quiz deleted successfully",
    quiz: deletedQuiz[0]
  });
});


module.exports = router;