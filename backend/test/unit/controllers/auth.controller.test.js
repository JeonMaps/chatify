import { expect } from "chai";
import mongoose from "mongoose";
import { signup } from "../../../src/controllers/auth.controller.js";
import { ENV } from "../../../src/lib/env.js";

describe("Auth Controller - Signup", () => {
  let req, res, statusCode, jsonResponse, cookieData;

  // Connect to database before all tests
  before(async function() {
    this.timeout(30000);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGO_URI);
      console.log("✓ Test database connected");
    }
  });

  // Disconnect after all tests
  after(async function() {
    this.timeout(10000);
    await mongoose.connection.close();
    console.log("✓ Test database disconnected");
  });

  beforeEach(() => {
    // Reset captured data
    statusCode = null;
    jsonResponse = null;
    cookieData = null;

    // Mock request object
    req = {
      body: {
        fullName: "Test User",
        email: "test@example.com",
        password: "password123",
      },
    };

    // Mock response object with chainable methods
    res = {
      status: function(code) {
        statusCode = code;
        return this;
      },
      json: function(data) {
        jsonResponse = data;
        return this;
      },
      cookie: function(name, value, options) {
        cookieData = { name, value, options };
        return this;
      },
    };
  });

  describe("Validation Tests", () => {
    it("should return 400 if fullName is missing", async () => {
      req.body.fullName = "";

      await signup(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "All fields are required" });
    });

    it("should return 400 if email is missing", async () => {
      req.body.email = "";

      await signup(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "All fields are required" });
    });

    it("should return 400 if password is missing", async () => {
      req.body.password = "";

      await signup(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "All fields are required" });
    });

    it("should return 400 if password is less than 6 characters", async () => {
      req.body.password = "12345";

      await signup(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Password must be at least 6 characters" });
    });

    it("should return 400 if email format is invalid", async () => {
      req.body.email = "invalid-email";

      await signup(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Invalid email format" });
    });
  });

  describe("Successful Signup", () => {
    it("should create a new user and return 201 with user data", async () => {
      // Use a unique email for this test to avoid conflicts
      req.body.email = `test-${Date.now()}@example.com`;

      await signup(req, res);

      expect(statusCode).to.equal(201);
      expect(jsonResponse).to.have.property("_id");
      expect(jsonResponse).to.have.property("fullName", "Test User");
      expect(jsonResponse).to.have.property("email", req.body.email);
      expect(jsonResponse).to.have.property("profilePic");
      expect(cookieData).to.have.property("name", "jwt");
    });

    it("should hash the password before saving", async () => {
      // Use a unique email
      req.body.email = `test-hash-${Date.now()}@example.com`;
      req.body.password = "mySecretPassword";

      await signup(req, res);

      expect(statusCode).to.equal(201);
      // Password should be hashed, not plain text
      expect(jsonResponse).to.not.have.property("password");
    });

    it("should set JWT cookie on successful signup", async () => {
      // Use a unique email
      req.body.email = `test-cookie-${Date.now()}@example.com`;

      await signup(req, res);

      expect(statusCode).to.equal(201);
      expect(cookieData).to.not.be.null;
      expect(cookieData.name).to.equal("jwt");
      expect(cookieData.value).to.be.a("string");
      expect(cookieData.options).to.have.property("httpOnly", true);
    });
  });

  describe("Duplicate Email", () => {
    it("should return 400 if email already exists", async () => {
      // First signup
      const uniqueEmail = `test-duplicate-${Date.now()}@example.com`;
      req.body.email = uniqueEmail;
      
      await signup(req, res);
      expect(statusCode).to.equal(201);

      // Reset response capture
      statusCode = null;
      jsonResponse = null;

      // Try to signup again with the same email
      await signup(req, res);
      
      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Email already exists" });
    });
  });
});
