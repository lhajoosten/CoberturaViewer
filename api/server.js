require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// GitHub OAuth callback endpoint
app.get("/api/auth/github/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    // Exchange code for GitHub access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const { access_token, error } = tokenResponse.data;

    if (error || !access_token) {
      console.error("GitHub token error:", tokenResponse.data);
      return res
        .status(400)
        .json({ error: error || "Failed to get access token" });
    }

    // Get GitHub user data with the token
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `token ${access_token}`,
      },
    });

    // Get GitHub user emails (if scope includes email)
    let userEmails = [];
    try {
      const emailsResponse = await axios.get(
        "https://api.github.com/user/emails",
        {
          headers: {
            Authorization: `token ${access_token}`,
          },
        }
      );
      userEmails = emailsResponse.data;
    } catch (emailErr) {
      console.log("Could not fetch emails, might not have the right scope");
    }

    // Find primary email
    const primaryEmail =
      userEmails.find((email) => email.primary)?.email ||
      userEmails[0]?.email ||
      `${userResponse.data.login}@users.noreply.github.com`;

    // Combine user data with email
    const userData = {
      ...userResponse.data,
      email: userResponse.data.email || primaryEmail,
    };

    // Send the user data and token back to the frontend
    res.json({
      user: userData,
      token: access_token,
    });
  } catch (error) {
    console.error(
      "Error during GitHub OAuth:",
      error.response?.data || error.message
    );
    res.status(500).json({
      error: "Authentication failed",
      details: error.response?.data || error.message,
    });
  }
});

// GitHub data refresh endpoint
app.get("/api/auth/github/refresh", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    // Get fresh GitHub user data with the token
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
      },
    });

    // Get GitHub user emails
    let userEmails = [];
    try {
      const emailsResponse = await axios.get(
        "https://api.github.com/user/emails",
        {
          headers: {
            Authorization: `token ${token}`,
          },
        }
      );
      userEmails = emailsResponse.data;
    } catch (emailErr) {
      console.log("Could not fetch emails, might not have the right scope");
    }

    // Find primary email
    const primaryEmail =
      userEmails.find((email) => email.primary)?.email ||
      userEmails[0]?.email ||
      `${userResponse.data.login}@users.noreply.github.com`;

    // Combine user data with email
    const userData = {
      ...userResponse.data,
      email: userResponse.data.email || primaryEmail,
    };

    // Send the user data back to the frontend
    res.json({
      user: userData,
    });
  } catch (error) {
    console.error(
      "Error refreshing GitHub data:",
      error.response?.data || error.message
    );

    // If token is invalid, tell the client
    if (error.response?.status === 401) {
      return res
        .status(401)
        .json({ error: "GitHub token is invalid or expired" });
    }

    res.status(500).json({
      error: "Failed to refresh GitHub data",
      details: error.response?.data || error.message,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
