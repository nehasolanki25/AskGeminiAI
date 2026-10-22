
const form = document.getElementById("questionForm");
const question = document.getElementById("question");
const askBtn = document.getElementById("askBtn");
const sendIcon = document.getElementById("sendIcon");

const messages = document.getElementById("messages");
const welcomeScreen = document.getElementById("welcomeScreen");

const newChatBtn = document.getElementById("newChatBtn");
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");

let isLoading = false;

// Automatically adjust textarea height
function resizeInput() {
    question.style.height = "auto";

    question.style.height =
        Math.min(question.scrollHeight, 160) + "px";
}

question.addEventListener("input", resizeInput);

// Scroll to the latest message
function scrollToBottom() {
    messages.lastElementChild?.scrollIntoView({
        behavior: "smooth",
        block: "end"
    });
}

// Create a message safely using DOM elements
function createMessage(role, text, options = {}) {
    const message = document.createElement("article");
    message.className =
        role === "user"
            ? "message user-message"
            : "message ai-message";

    const content = document.createElement("div");
    content.className = "message-content";

    const roleLabel = document.createElement("div");
    roleLabel.className = "message-role";
    roleLabel.innerText =
        role === "user" ? "You" : "Gemini AI";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.innerText = text;

    content.appendChild(roleLabel);
    content.appendChild(bubble);

    if (role === "ai") {
        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.innerText = "✳";
        avatar.setAttribute("aria-hidden", "true");

        message.appendChild(avatar);
    }

    message.appendChild(content);
    messages.appendChild(message);

    if (options.loading) {
        bubble.innerHTML = `
            <div class="loading-dots" aria-label="Gemini is thinking">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        bubble.setAttribute("aria-label", "Generating answer");
    }

    return { message, bubble, content };
}

// Add a copy button to an AI response
function addCopyButton(content, answer) {
    const actions = document.createElement("div");
    actions.className = "message-actions";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "copy-btn";
    copyBtn.innerText = "Copy answer";

    copyBtn.addEventListener("click", async function() {
        try {
            await navigator.clipboard.writeText(answer);

            copyBtn.innerText = "Copied!";

            window.setTimeout(function() {
                copyBtn.innerText = "Copy answer";
            }, 1500);
        } catch (error) {
            copyBtn.innerText =
                "Copy unavailable — select the answer text";
        }
    });

    actions.appendChild(copyBtn);
    content.appendChild(actions);
}

// Send question to the Express backend
async function askQuestion(inputText) {
    const input = inputText.trim();

    if (!input || isLoading) {
        return;
    }

    welcomeScreen.hidden = true;

    createMessage("user", input);

    question.value = "";
    resizeInput();

    isLoading = true;
    askBtn.disabled = true;
    sendIcon.innerText = "…";

    const loadingMessage = createMessage(
        "ai",
        "",
        { loading: true }
    );

    scrollToBottom();

    try {
        const response = await fetch("/ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question: input
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.data || "Unable to get an answer."
            );
        }

        const answer =
            typeof data.data === "string"
                ? data.data
                : "No answer was returned. Please try again.";

        if (!answer.trim()) {
            throw new Error("Gemini returned an empty answer.");
        }

        loadingMessage.bubble.innerText = answer;

        addCopyButton(loadingMessage.content, answer);
    } catch (error) {
        console.error("Ask Gemini error:", error);

        loadingMessage.bubble.classList.add("error");

        loadingMessage.bubble.innerText =
            error.message === "Failed to fetch"
                ? "Cannot connect to the server. Please check that the backend is running and try again."
                : error.message || "Something went wrong. Please try again.";
    } finally {
        isLoading = false;
        askBtn.disabled = false;
        sendIcon.innerText = "↑";

        question.focus();
        scrollToBottom();
    }
}

// Submit the question using the send button
form.addEventListener("submit", function(event) {
    event.preventDefault();
    askQuestion(question.value);
});

// Enter sends; Shift + Enter adds a new line
question.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
    }
});

// Handle welcome cards and sidebar quick prompts
document.querySelectorAll("[data-prompt]").forEach(function(button) {
    button.addEventListener("click", function() {
        question.value = button.dataset.prompt;

        resizeInput();
        question.focus();

        // Close sidebar after selecting a prompt on mobile
        sidebar.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
    });
});

// Start a fresh conversation
newChatBtn.addEventListener("click", function() {
    if (isLoading) {
        return;
    }

    messages.replaceChildren();
    welcomeScreen.hidden = false;

    question.value = "";
    resizeInput();
    question.focus();

    sidebar.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
});

// Mobile sidebar toggle
menuBtn.addEventListener("click", function() {
    const isOpen = sidebar.classList.toggle("open");

    menuBtn.setAttribute("aria-expanded", String(isOpen));
});

// Close sidebar with Escape
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        sidebar.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
    }
});
