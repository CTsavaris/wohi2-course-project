const prisma = require("../lib/prisma");

async function isOwner(req, res, next) {
    const quizId = Number(req.params.quizId);
    const quiz = await prisma.quiz.findUnique({
        where: {
            id: quizId
        }
    });
    if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
    }
    if (quiz.userId !== req.user.userId) {
        return res.status(403).json({ error: "you can only modify your own quizzes" });
    }

    req.quiz = quiz; 
    next();
}

module.exports = isOwner;