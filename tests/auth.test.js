const bcrypt = require("bcrypt");
const { resetDb, registerAndLogin, createQuiz, request, app, prisma } = require("./helpers");

beforeEach(resetDb);

it("registers, hashes the password, returns a token", async () => {
  const res = await request(app).post("/api/auth/register")
    .send({ email: "a@test.io", password: "pw12345", name: "A" });

  expect(res.status).toBe(201);
  expect(res.body.token).toEqual(expect.any(String));

  const user = await prisma.user.findUnique({ where: { email: "a@test.io" } });
  expect(user.password).not.toBe("pw12345");
  expect(await bcrypt.compare("pw12345", user.password)).toBe(true);
});

it("returns 403 when editing someone else's quiz", async () => {
  const aliceToken = await registerAndLogin("alice@test.io", "Alice");
  const quiz = await createQuiz(aliceToken, { title: "Alice's quiz" });

  const bobToken = await registerAndLogin("bob@test.io", "Bob");
  const res = await request(app).put(`/api/quizzes/${quiz.id}`)
    .set("Authorization", `Bearer ${bobToken}`)
    .send({ title: "hijacked", answer: "x" });

  expect(res.status).toBe(403);

  const after = await prisma.quiz.findUnique({ where: { id: quiz.id } });
  expect(after.title).toBe("Alice's quiz");
});
