const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const quizzes = require("../data/quizzes");

// GET /quizzes - List all quizzes, with optional keyword filtering 
// List all quizzes
router.get("/", async (req, res) => {
  const { title } = req.query;

  if (!title) {
    const allQuizzes = await prisma.quiz.findMany();
    return res.json(allQuizzes);
  }

  const filteredQuizzes = await prisma.quiz.findMany({
    where: {
      title: {
        contains: title,
        mode: 'insensitive'
      }
    }
  });

  res.json(filteredQuizzes);
});

// GET /quizzes/:quizId
// Show a specific quiz
router.get("/:quizId", async (req, res) => {
  const quizId = Number(req.params.quizId);
  const quiz = await prisma.quiz.findUnique({
    where: {
      id: quizId
    }
  });

  if (!quiz) {
    return res.status(404).json({ 
      message: "Quiz not found" 
    });
  }

  res.json(quiz);
});

// POST /quizzes
// Create a new quiz
router.post("/", async (req, res) => {
  const { title, answer } = req.body;

  if (!title || !answer) {
    return res.status(400).json({
      message: "title and answer are required"
    });
  }

  const newQuiz = await prisma.quiz.create({
    title, answer
  });
  res.status(201).json(newQuiz);
});

// PUT /quizzes/:quizId
// Edit a quiz
router.put("/:quizId", async (req, res) => {
  const quizId = Number(req.params.quizId);
  const { title, answer } = req.body;
  const existingQuiz = await prisma.quiz.findUnique({
    where: {
      id: quizId
    }
  });
  if (!existingQuiz) {
    return res.status(404).json({ message: "Quiz not found" });
  }

  if (!title || !answer) {
    return res.status(400).json({
      message: "title and answer are required"
    });
  }
  const updatedQuiz = await prisma.quiz.update({
    where: {
      id: quizId
    },
    data: {
      title, answer
    }
  });

  res.json(updatedQuiz);
});

// DELETE /quizzes/:quizId
// Delete a quiz
router.delete("/:quizId", async (req, res) => {
  const quizId = Number(req.params.quizId);

  const quiz = await prisma.quiz.findUnique({
    where: {
      id: quizId
    }
  });

  if (!quiz) {
    return res.status(404).json({ message: "Quiz not found" });
  }

  await prisma.quiz.delete({
    where: {
      id: quizId
    }
  });

  res.json({
    message: "Quiz deleted successfully",
    quiz: quiz,
  });
});


module.exports = router;