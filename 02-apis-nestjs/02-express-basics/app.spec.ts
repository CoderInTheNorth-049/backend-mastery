import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./src/app";

describe("health", () => {
  it("reports ok with uptime", async () => {
    const res = await request(createApp()).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok" });
    expect(typeof res.body.uptime).toBe("number");
  });
});

describe("POST /users — validation", () => {
  it("creates a user and returns 201 with id", async () => {
    const res = await request(createApp())
      .post("/users")
      .send({ name: "Ada Lovelace", email: "ada@example.com" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 1,
      name: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("collects ALL validation issues in one envelope", async () => {
    const res = await request(createApp())
      .post("/users")
      .send({ name: "", email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
    expect(res.body.error.issues).toEqual([
      { field: "name", message: expect.any(String) },
      { field: "email", message: expect.any(String) },
    ]);
  });

  it("trims names before storing", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/users")
      .send({ name: "   Grace   ", email: "grace@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Grace");
  });

  it("normalizes emails for storage", async () => {
    const res = await request(createApp())
      .post("/users")
      .send({ name: "X", email: "MiXeD@Example.COM" });

    expect(res.body.email).toBe("mixed@example.com");
  });

  it("translates malformed JSON to a BAD_JSON envelope", async () => {
    const res = await request(createApp())
      .post("/users")
      .set("Content-Type", "application/json")
      .send('{"name": broken}');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_JSON");
  });
});

describe("email conflicts", () => {
  it("rejects duplicates case-insensitively with 409", async () => {
    const app = createApp();
    await request(app)
      .post("/users")
      .send({ name: "First", email: "dupe@example.com" });

    const res = await request(app)
      .post("/users")
      .send({ name: "Second", email: "DUPE@EXAMPLE.COM" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});

describe("reading and deleting users", () => {
  it("lists users in insertion order", async () => {
    const app = createApp();
    await request(app).post("/users").send({ name: "A", email: "a@x.io" });
    await request(app).post("/users").send({ name: "B", email: "b@x.io" });

    const res = await request(app).get("/users");
    expect(res.body.map((u: { name: string }) => u.name)).toEqual(["A", "B"]);
  });

  it("fetches one user by id", async () => {
    const app = createApp();
    await request(app).post("/users").send({ name: "A", email: "a@x.io" });

    const res = await request(app).get("/users/1");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("a@x.io");
  });

  it("404s unknown ids with the standard envelope", async () => {
    const res = await request(createApp()).get("/users/999");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("deletes with 204 and empty body, then 404 on repeat", async () => {
    const app = createApp();
    await request(app).post("/users").send({ name: "A", email: "a@x.io" });

    const deleted = await request(app).delete("/users/1");
    expect(deleted.status).toBe(204);
    expect(deleted.text).toBe("");

    const again = await request(app).delete("/users/1");
    expect(again.status).toBe(404);
  });
});

describe("framework-level errors", () => {
  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(createApp()).get("/definitely/not/here");

    expect(res.status).toBe(404);
    expect(res.type).toMatch(/json/);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("hides internals on unexpected failures", async () => {
    // Attach a failing router through the composition hook — the same way
    // real bootstraps mount feature modules before the error tail.
    const app = createApp({
      attach: (a) => {
        a.use("/boom", () => {
          throw new Error("secret stack details: password=hunter2");
        });
      },
    });

    const res = await request(app).get("/boom");

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/hunter2/);
    expect(res.body.error.code).toBe("INTERNAL");
  });
});

describe("instance isolation", () => {
  it("two apps never share state", async () => {
    const appA = createApp();
    const appB = createApp();

    await request(appA).post("/users").send({ name: "Only-A", email: "a@x.io" });

    const listB = await request(appB).get("/users");
    expect(listB.body).toEqual([]);
  });
});
