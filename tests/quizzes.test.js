const { resetDb, registerAndLogin, createQuiz, request, app, prisma } = require("./helpers");
beforeEach(resetDb);

describe("quiz tests", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/quizzes");
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown quiz", async () => {
    const token = await registerAndLogin();
    const res = await request(app).get("/api/quizzes/99999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Quiz not found");
  });

  it("returns 400 for invalid quiz body", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/quizzes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "" });
    expect(res.status).toBe(400);
  });
});

describe("creating and reading quizzes", () => {
  it("creates a quiz and returns 201 with correct shape", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/quizzes")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "What is 2+2?", answer: "4", keywords: ["math"] });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("What is 2+2?");
    expect(res.body.answer).toBe("4");
    expect(res.body.keywords).toEqual(["math"]);
    expect(res.body.id).toEqual(expect.any(Number));
    expect(res.body.user).toMatchObject({ name: expect.any(String) });
    expect(res.body.solved).toBe(false);
  });

  it("lists quizzes with pagination shape", async () => {
    const token = await registerAndLogin();
    await createQuiz(token, { title: "Q1", answer: "A1" });
    await createQuiz(token, { title: "Q2", answer: "A2" });

    const res = await request(app).get("/api/quizzes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBe(1);
  });

  it("returns a single quiz with user name included", async () => {
    const token = await registerAndLogin("owner@test.io", "Owner");
    const quiz = await createQuiz(token, { title: "Capital of France?", answer: "Paris" });

    const res = await request(app).get(`/api/quizzes/${quiz.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Capital of France?");
    expect(res.body.user.name).toBe("Owner");
    expect(res.body.solved).toBe(false);
  });

  it("filters quizzes by keyword", async () => {
    const token = await registerAndLogin();
    await createQuiz(token, { title: "Math Q", answer: "1", keywords: ["math"] });
    await createQuiz(token, { title: "Science Q", answer: "2", keywords: ["science"] });

    const res = await request(app).get("/api/quizzes?keyword=math")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].title).toBe("Math Q");
  });
});

describe("editing and deleting quizzes", () => {
  it("owner can edit their quiz", async () => {
    const token = await registerAndLogin();
    const quiz = await createQuiz(token, { title: "Old title", answer: "Old answer" });

    const res = await request(app).put(`/api/quizzes/${quiz.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "New title", answer: "New answer" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("New title");
    expect(res.body.answer).toBe("New answer");
  });

  it("owner can delete their quiz", async () => {
    const token = await registerAndLogin();
    const quiz = await createQuiz(token);

    const delRes = await request(app).delete(`/api/quizzes/${quiz.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toBe("Quiz deleted successfully");

    const getRes = await request(app).get(`/api/quizzes/${quiz.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it("non-owner gets 403 when deleting", async () => {
    const ownerToken = await registerAndLogin("owner@test.io", "Owner");
    const quiz = await createQuiz(ownerToken);

    const otherToken = await registerAndLogin("other@test.io", "Other");
    const res = await request(app).delete(`/api/quizzes/${quiz.id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });
});

describe("playing quizzes", () => {
  it("correct answer returns correct:true and marks quiz as solved", async () => {
    const token = await registerAndLogin();
    const quiz = await createQuiz(token, { title: "2+2?", answer: "4" });

    const playRes = await request(app).post(`/api/quizzes/${quiz.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "4" });

    expect(playRes.status).toBe(200);
    expect(playRes.body.correct).toBe(true);

    const getRes = await request(app).get(`/api/quizzes/${quiz.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.body.solved).toBe(true);
  });

  it("correct answer is case-insensitive", async () => {
    const token = await registerAndLogin();
    const quiz = await createQuiz(token, { title: "Capital?", answer: "Paris" });

    const res = await request(app).post(`/api/quizzes/${quiz.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "PARIS" });

    expect(res.body.correct).toBe(true);
  });

  it("wrong answer returns correct:false and quiz stays unsolved", async () => {
    const token = await registerAndLogin();
    const quiz = await createQuiz(token, { title: "2+2?", answer: "4" });

    const playRes = await request(app).post(`/api/quizzes/${quiz.id}/play`)
      .set("Authorization", `Bearer ${token}`)
      .send({ answer: "5" });

    expect(playRes.body.correct).toBe(false);
    expect(playRes.body.correctAnswer).toBe("4");

    const getRes = await request(app).get(`/api/quizzes/${quiz.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.body.solved).toBe(false);
  });
});
