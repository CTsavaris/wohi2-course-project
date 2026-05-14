const prisma = require("../lib/prisma");
const { NotFoundError, ForbiddenError } = require("../lib/errors");

async function isOwner(req, res, next) {
    const quizId = Number(req.params.quizId);
    const quiz = await prisma.quiz.findUnique({
        where: {
            id: quizId
        }
    });
    if (!quiz) {
        throw new NotFoundError("Quiz not found");
    }
    if (quiz.userId !== req.user.userId) {
        throw new ForbiddenError("you can only modify your own quizzes");
    }

    req.quiz = quiz; 
    next();
}

module.exports = isOwner;