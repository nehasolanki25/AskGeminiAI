const button = document.getElementById("askBtn");
const question = document.getElementById("question");
const result = document.getElementById("result");

async function askQuestion() {
    const input = question.value.trim();
    if (input === "") {
        result.innerText = "Please enter a question!";
        return;
    }
    result.innerText = "Loading...";
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
        result.innerText = data.data;
    } catch (error) {
        console.log(error);
        result.innerText = "Something went wrong!";
    }
}

button.addEventListener("click", askQuestion);

// Bonus: allow pressing Enter to submit
question.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        askQuestion();
    }
});