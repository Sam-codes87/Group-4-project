async function askAI() {
    const prompt = document.getElementById("message").value;

    const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
    });

    const data = await response.json();
    console.log(data.reply);
}