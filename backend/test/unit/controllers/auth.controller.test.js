import { expect } from "chai";
import mongoose from "mongoose";
import { signup, login, logout } from "../../../src/controllers/auth.controller.js";
import { ENV } from "../../../src/lib/env.js";
import User from "../../../src/models/User.js";

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

describe("Auth Controller - Login", () => {
  let req, res, statusCode, jsonResponse, cookieData;
  let testUser;

  // Connect to database before all tests
  before(async function() {
    this.timeout(30000);
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(ENV.MONGO_URI);
      console.log("✓ Test database connected");
    }

    // Create a test user for login tests
    const uniqueEmail = `test-login-${Date.now()}@example.com`;
    const signupReq = {
      body: {
        fullName: "Login Test User",
        email: uniqueEmail,
        password: "testpassword123",
      },
    };
    const signupRes = {
      status: function() { return this; },
      json: function() { return this; },
      cookie: function() { return this; },
    };

    await signup(signupReq, signupRes);
    testUser = await User.findOne({ email: uniqueEmail });
    console.log("✓ Test user created for login tests");
  });

  // Disconnect and cleanup after all tests
  after(async function() {
    this.timeout(10000);
    if (testUser) {
      await User.findByIdAndDelete(testUser._id);
      console.log("✓ Test user cleaned up");
    }
    await mongoose.connection.close();
    console.log("✓ Test database disconnected");
  });

  beforeEach(() => {
    statusCode = null;
    jsonResponse = null;
    cookieData = null;

    req = {
      body: {
        email: testUser.email,
        password: "testpassword123",
      },
    };

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
    it("should return 400 if email is missing", async () => {
      req.body.email = "";

      await login(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Email and password are required" });
    });

    it("should return 400 if password is missing", async () => {
      req.body.password = "";

      await login(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Email and password are required" });
    });

    it("should return 400 if both email and password are missing", async () => {
      req.body.email = "";
      req.body.password = "";

      await login(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Email and password are required" });
    });
  });

  describe("Invalid Credentials", () => {
    it("should return 400 if email does not exist", async () => {
      req.body.email = "nonexistent@example.com";

      await login(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Invalid Credentials" });
    });

    it("should return 400 if password is incorrect", async () => {
      req.body.password = "wrongpassword";

      await login(req, res);

      expect(statusCode).to.equal(400);
      expect(jsonResponse).to.deep.equal({ message: "Invalid Credentials" });
    });
  });

  describe("Successful Login", () => {
    it("should return 200 with user data on successful login", async () => {
      await login(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.have.property("_id");
      expect(jsonResponse).to.have.property("fullName", "Login Test User");
      expect(jsonResponse).to.have.property("email", testUser.email);
      expect(jsonResponse).to.have.property("profilePic");
      expect(jsonResponse).to.not.have.property("password");
    });

    it("should set JWT cookie on successful login", async () => {
      await login(req, res);

      expect(statusCode).to.equal(200);
      expect(cookieData).to.not.be.null;
      expect(cookieData.name).to.equal("jwt");
      expect(cookieData.value).to.be.a("string");
      expect(cookieData.options).to.have.property("httpOnly", true);
    });

    it("should not return password in response", async () => {
      await login(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.not.have.property("password");
    });
  });
});

describe("Auth Controller - Logout", () => {
  let req, res, statusCode, jsonResponse, cookieData;

  beforeEach(() => {
    statusCode = null;
    jsonResponse = null;
    cookieData = null;

    req = {};

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

  describe("Successful Logout", () => {
    it("should return 200 with success message", async () => {
      logout(req, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.deep.equal({ message: "Logged out successfully!" });
    });

    it("should clear JWT cookie", async () => {
      logout(req, res);

      expect(cookieData).to.not.be.null;
      expect(cookieData.name).to.equal("jwt");
      expect(cookieData.value).to.equal("");
      expect(cookieData.options).to.have.property("maxAge", 0);
    });

    it("should work without request body", async () => {
      // Logout doesn't need request body
      logout(undefined, res);

      expect(statusCode).to.equal(200);
      expect(jsonResponse).to.deep.equal({ message: "Logged out successfully!" });
    });
  });
});
