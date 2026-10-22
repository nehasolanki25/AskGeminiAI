
const express = require("express");
require("dotenv").config();

const app = express();

app.use(express.json({ limit: "20kb" }));
app.use(express.static("public"));

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.API_KEY;

const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Check API key before starting the server
if (!API_KEY) {
    console.error(
        "ERROR: API_KEY is missing. Add API_KEY to your .env file."
    );

    process.exit(1);
}

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Ask Gemini AI server is running."
    });
});

// Ask Gemini
app.post("/ask", async (req, res) => {
    try {
        const question = req.body?.question;

        if (typeof question !== "string" || !question.trim()) {
            return res.status(400).json({
                data: "Please enter a valid question."
            });
        }

        if (question.length > 10000) {
            return res.status(400).json({
                data: "Your question is too long. Please use fewer than 10,000 characters."
            });
        }

        const answer = await callGemini(question.trim());

        return res.json({
            data: answer
        });
    } catch (error) {
        console.error("Gemini API error:", error.message);

        if (error.status === 429) {
            return res.status(429).json({
                data: "Too many requests. Please wait a moment and try again."
            });
        }

        if (error.status === 401 || error.status === 403) {
            return res.status(502).json({
                data: "Gemini API authentication failed. Check your API key and API access."
            });
        }

        return res.status(502).json({
            data: "Gemini could not generate an answer. Please try again."
        });
    }
});

// Call Gemini API
async function callGemini(question) {
    const response = await fetch(
        `${GEMINI_URL}?key=${encodeURIComponent(API_KEY)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: question
                            }
                        ]
                    }
                ]
            }),
            signal: AbortSignal.timeout(30000)
        }
    );

    if (!response.ok) {
        const error = new Error(
            `Gemini API returned HTTP ${response.status}`
        );

        error.status = response.status;
        throw error;
    }

    const data = await response.json();

    const answer = data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!answer) {
        throw new Error(
            "Gemini returned no text. The response may have been blocked or empty."
        );
    }

    return answer;
}

// Handle invalid JSON bodies
app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && "body" in error) {
        return res.status(400).json({
            data: "Invalid JSON request."
        });
    }

    if (error.type === "entity.too.large") {
        return res.status(413).json({
            data: "Request is too large."
        });
    }

    next(error);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
