import { expect } from "chai";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { signup, login, logout } from "../../../src/controllers/auth.controller.js";
import { ENV } from "../../../src/lib/env.js";
import User from "../../../src/models/User.js";

describe("Auth Controller Tests", () => {
  let req, res, statusCode, jsonResponse, cookieData;
  let existingUser; // Shared test user created directly in DB (no email sent)

  // Connect to database and create test user before all tests
  before(async function() {
    this.timeout(30000);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGO_URI);
      console.log("✓ Test database connected");
    }

    // Create a test user directly in database (bypasses signup controller, no email sent)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("testpassword123", salt);
    
    existingUser = await User.create({
      fullName: "Existing Test User",
      email: `existing-user-${Date.now()}@example.com`,
      password: hashedPassword,
    });
    console.log("✓ Shared test user created (no email sent)");
  });

  // Cleanup and disconnect after all tests
  after(async function() {
    this.timeout(10000);
    if (existingUser) {
      await User.findByIdAndDelete(existingUser._id);
      console.log("✓ Test user cleaned up");
    }
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

  describe("Signup - Validation Tests", () => {
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

  describe("Signup - Successful Creation", () => {
    it("should create a new user and return 201 with user data", async () => {
      // Only 1 email will be sent for this single successful signup test
      req.body.email = `test-signup-${Date.now()}@example.com`;

      await signup(req, res);

      expect(statusCode).to.equal(201);
      expect(jsonResponse).to.have.property("_id");
      expect(jsonResponse).to.have.property("fullName", "Test User");
      expect(jsonResponse).to.have.property("email", req.body.email);
      expect(jsonResponse).to.have.property("profilePic");
      expect(jsonResponse).to.not.have.property("password");
      expect(cookieData).to.have.property("name", "jwt");
      expect(cookieData.value).to.be.a("string");
      expect(cookieData.options).to.have.property("httpOnly", true);

      // Cleanup - delete the created user
      await User.deleteOne({ email: req.body.email });
    });
  });

  describe("Signup - Duplicate Email", () => {
    it("should return 400 if email already exists", async () => {
      // Use the existing user that was created in the before hook (no new email sent)
      req.body.email = existingUser.email;
      
      await signup(req, res);
      
      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Email already exists" });
    });
  });

  describe("Login - Validation Tests", () => {
    it("should return 400 if email is missing", async () => {
      req.body.email = "";
      req.body.password = "password123";

      await login(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Email and password are required" });
    });

    it("should return 400 if password is missing", async () => {
      req.body.email = existingUser.email;
      req.body.password = "";

      await login(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Email and password are required" });
    });
  });

  describe("Login - Invalid Credentials", () => {
    it("should return 400 if email does not exist", async () => {
      req.body.email = "nonexistent@example.com";
      req.body.password = "password123";

      await login(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Invalid Credentials" });
    });

    it("should return 400 if password is incorrect", async () => {
      req.body.email = existingUser.email;
      req.body.password = "wrongpassword";

      await login(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Invalid Credentials" });
    });
  });

  describe("Login - Successful Login", () => {
    it("should return 200 with user data and set JWT cookie", async () => {
      req.body.email = existingUser.email;
      req.body.password = "testpassword123";

      await login(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.have.property("_id");
      expect(jsonResponse).to.have.property("fullName", "Existing Test User");
      expect(jsonResponse).to.have.property("email", existingUser.email);
      expect(jsonResponse).to.have.property("profilePic");
      expect(jsonResponse).to.not.have.property("password");
      expect(cookieData).to.not.be.null;
      expect(cookieData.name).to.equal("jwt");
      expect(cookieData.value).to.be.a("string");
      expect(cookieData.options).to.have.property("httpOnly", true);
    });
  });

  describe("Logout - Tests", () => {
    it("should return 200 with success message and clear JWT cookie", async () => {
      logout(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.deep.equal({ message: "Logged out successfully!" });
      expect(cookieData).to.not.be.null;
      expect(cookieData.name).to.equal("jwt");
      expect(cookieData.value).to.equal("");
      expect(cookieData.options).to.have.property("maxAge", 0);
    });
  });
});
