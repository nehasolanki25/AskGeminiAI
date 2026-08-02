const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.static("public"));
app.use(express.json());

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.API_KEY;

// Startup check - agar API key nahi mili to server crash hone se pehle warn karo
if (!API_KEY) {
    console.error("ERROR: API_KEY .env file me nahi mili. Please .env file banao aur API_KEY=your_key_here add karo.");
    process.exit(1);
}

// Ask Route
app.post("/ask", async (req, res) => {
    try {
        const question = req.body.question;
        if (!question || question.trim() === "") {
            return res.status(400).json({ data: "Question khali nahi ho sakta!" });
        }
        const answer = await callGemini(question);
        res.json({
            data: answer
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            data: "Something went wrong!"
        });
    }
});

async function callGemini(inputPrompt) {
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
    const response = await fetch(URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: inputPrompt
                        }
                    ]
                }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

app.listen(PORT, () => {
    console.log(`Server Running on http://localhost:${PORT}`);
});