const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();



const seedQuizzes = [
    {
        title: 'What is the symbol for the element Gold in chemistry?',
        answer: 'Au'
    },
    {
        title: 'What houshold product is the chemical symbol NaCl?',
        answer: 'Salt'
    },
    {
        title: 'Who invented the second law of thermodynamics?',
        answer: 'Sadi Carnot'
    },
    {
        title: 'What is the chemical symbol for water?',
        answer: 'H2O'
    },
];

async function main() {
  // Create a default user
  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  console.log("Created user:", user.email);

  for (const quiz of seedQuizzes) {
    await prisma.quiz.create({
      data: {
        title: quiz.title,
        answer: quiz.answer,
        userId: user.id,
      },
    })}
};

console.log("Seed data inserted successfully");


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
