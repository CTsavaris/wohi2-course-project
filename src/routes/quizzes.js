const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");


router.use(authenticate);

function formatQuiz(quiz) {
  return {
    ...quiz,
    userName: quiz.user?.name || null,
    user: undefined,
  };
}

// GET /quizzes - List all quizzes, with optional keyword filtering 
// List all quizzes
router.get("/", async (req, res) => {
  const { title} = req.query;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;


  const [filteredQuizzes, total] = await Promise.all([
    prisma.quiz.findMany({
      where: { title: title },
      include: {user: true},
      orderBy: {id: "asc"},
      skip,
      take: limit
    }),prisma.post.count({where})
  ]);

  res.json({
    data: filteredQuizzes.map(formatQuiz),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /quizzes/:quizId
// Show a specific quiz
router.get("/:quizId", async (req, res) => {
  const quizId = Number(req.params.quizId);
  const quiz = await prisma.quiz.findUnique({
    where: {id: quizId},
    include: {user: true}
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
  const userId = req.user.userId;

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
router.put("/:quizId", isOwner, async (req, res) => {
  const quizId = Number(req.params.quizId);
  const { title, answer } = req.body;
  const existingQuiz = await prisma.quiz.findUnique({
    where: {id: quizId}
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
    include: {
      user: true
    },
    data: {
      title, answer
    }
  });

  res.json(updatedQuiz);
});

// DELETE /quizzes/:quizId
// Delete a quiz
router.delete("/:quizId", isOwner, async (req, res) => {
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