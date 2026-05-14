const express = require("express");
const router = express.Router();
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/auth");
const isOwner = require("../middleware/isOwner");
const multer = require("multer");
const path = require("path");
const { z } = require("zod");
const { NotFoundError, ValidationError } = require("../lib/errors");

const PostInput = z.object({
  title: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.union([z.string(), z.array(z.string())]).optional(),
});

const storage = multer.diskStorage({
  destination: path.join(__dirname, "..", "..", "public", "uploads"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(authenticate);

function formatQuiz(quiz) {
  return {
    ...quiz,
    keywords: quiz.keywords.map((k) => k.name),
    user: quiz.user ? { id: quiz.user.id, name: quiz.user.name } : null,
    likeCount: quiz._count?.likes ?? 0,
    liked: quiz.likes ? quiz.likes.length > 0 : false,
    solved: quiz.solves ? quiz.solves.length > 0 : false,
    likes: undefined,
    solves: undefined,
    _count: undefined,
  };
}

// GET /quizzes - List all quizzes, with optional keyword filtering 
// List all quizzes
router.get("/", async (req, res) => {
  const { keyword } = req.query;

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 5));
  const skip = (page - 1) * limit;
  
  const where = keyword
    ? { keywords: { some: { name: keyword } } }
    : {};

  const [filteredQuizzes, total] = await Promise.all([
    prisma.quiz.findMany({
        where,
        include: { keywords: true, user: true, likes: { where: { userId: req.user.userId }, take: 1 },
        solves: { where: { userId: req.user.userId }, take: 1 },
        _count: { select: { likes: true } }, },
        orderBy: { id: "asc" },
        skip,
        take: limit,
    }),
    prisma.quiz.count({ where }),
]);

  res.json({
    data: filteredQuizzes.map(formatQuiz),
  
  page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});


  

// GET /quizzes/:quizId
// Show a specific quiz
router.get("/:quizId", async (req, res) => {
  const quizId = Number(req.params.quizId);
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { keywords: true, user: true,
      likes: { where: { userId: req.user.userId }, take: 1 },
      solves: { where: { userId: req.user.userId }, take: 1 },
      _count: { select: { likes: true } },
    },
  });


  if (!quiz) {
    throw new NotFoundError("Quiz not found")
    };

  res.json(formatQuiz(quiz));
});

// POST /quizzes
// Create a new quiz
router.post("/", upload.single("image"), async (req, res) => {
  const { title, answer, keywords } = PostInput.parse(req.body);
  
  if (!title || !answer) {
    throw new ValidationError("Title and answer are mandatory");
  }

  const keywordsArray = Array.isArray(keywords) ? keywords : [];
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const newQuiz = await prisma.quiz.create({
    data: {
      title, answer, imageUrl,
      userId: req.user.userId,
      keywords: {
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw }, create: { name: kw },
        })),
      },
    },
    include: { keywords: true, user: true },
  });

  res.status(201).json(formatQuiz(newQuiz));
});


// PUT /quizzes/:quizId
// Edit a quiz
router.put("/:quizId", upload.single("image"), isOwner, async (req, res) => {
  const quizId = Number(req.params.quizId);
  const { title, answer, keywords } = PostInput.parse(req.body);
  const existingQuiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!existingQuiz) {
    throw new NotFoundError("Quiz not found");
  }

  if (!title || !answer) {
    throw new ValidationError("Title and answer are mandatory");
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const keywordsArray = Array.isArray(keywords) ? keywords : [];
  const updatedQuiz = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      title, answer, imageUrl,
      keywords: {
        set: [],
        connectOrCreate: keywordsArray.map((kw) => ({
          where: { name: kw },
          create: { name: kw },
        })),
      },
    },
    include: { keywords: true, user: true },
  });
  res.json(formatQuiz(updatedQuiz));
});

// DELETE /quizzes/:quizId
// Delete a quiz
router.delete("/:quizId", isOwner, async (req, res) => {
  const quizId = Number(req.params.quizId);

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId},
    include: { keywords: true , user: true},
  });

  if (!quiz) {
    throw new NotFoundError("Quiz not found");
  }

  await prisma.quiz.delete({ where: { id: quizId } });

  res.json({
    message: "Quiz deleted successfully",
    quiz: formatQuiz(quiz),
  });

  });

// POST /quizzes/:quizId/play
// Check a user's answer against the stored answer
router.post("/:quizId/play", async (req, res) => {
  const quizId = Number(req.params.quizId);
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });

  if (!quiz) {
    throw new NotFoundError("Quiz not found");
  }

  const userAnswer = (req.body.answer || "").trim().toLowerCase();
  const correctAnswer = quiz.answer.trim().toLowerCase();
  const correct = userAnswer === correctAnswer;

  if (correct) {
    await prisma.solve.upsert({
      where: { userId_quizId: { userId: req.user.userId, quizId } },
      update: {},
      create: { userId: req.user.userId, quizId },
    });
  }

  res.json({ correct, correctAnswer: quiz.answer });
});

module.exports = router;

router.post("/:quizId/like", async (req, res) => {
  const quizId = Number(req.params.quizId);
  const quiz = await prisma.quiz.findUnique({where: { id: quizId }});

  if (!quiz) {
    throw new NotFoundError("Quiz not found");
  }

  const like = await prisma.like.upsert({
    where: { userId_quizId: { userId: req.user.userId, quizId } },  
    update: {},
    create: { userId: req.user.userId, quizId },
  });

  const likeCount = await prisma.like.count({ where: { quizId } });
  
  res.json({
    id: like.id,
    quizId,
    liked: true,
    likeCount,
    createdAt: like.createdAt,
  });

});


router.delete("/:quizId/like", async (req, res) => {
    const quizId = Number(req.params.quizId);

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
        throw new NotFoundError("Quiz not found");
    }

    await prisma.like.deleteMany({
        where: { userId: req.user.userId, quizId },
    });

    const likeCount = await prisma.like.count({ where: { quizId } });

    res.json({ quizId, liked: false, likeCount });
});


