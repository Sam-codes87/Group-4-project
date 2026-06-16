import requests

url = "http://localhost:11434/api/generate"

# === SYSTEM PROMPT ===
system_prompt = """
You are a wellbeing assistant talking to a student.

Style:
- Natural, casual, human
- Short responses (2–4 sentences)
- Slightly warm, not robotic

Rules:
- Do not act like a doctor
- Do not lecture
- Be conversational, not formal
- Ask follow-up questions sometimes

Goal:
Help the user reflect on their wellbeing based on known data.
"""

# === SCORING ===


def calculate_score(sleep, stress, mood, activity):
    sleep_score = min(sleep / 8, 1) * 100
    stress_score = (6 - stress) / 5 * 100
    mood_score = (mood / 5) * 100
    activity_score = min(activity / 60, 1) * 100

    total = (
        sleep_score * 0.25 +
        stress_score * 0.30 +
        mood_score * 0.25 +
        activity_score * 0.20
    )

    return round(total, 1)


def classify(score):
    if score > 75:
        return "good"
    elif score > 50:
        return "moderate"
    else:
        return "low"

# === AI CALL ===


def ask_ai(prompt):
    response = requests.post(
        url,
        json={
            "model": "qwen",
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "max_tokens": 120
            }
        }
    )
    return response.json()["response"]


# === STEP 1: INITIAL DATA COLLECTION ===
print("\n--- Quick Wellbeing Check ---")

sleep = float(input("Hours of sleep: "))
stress = int(input("Stress (1-5): "))
mood = int(input("Mood (1-5): "))
activity = int(input("Activity (minutes): "))

data = {
    "sleep": sleep,
    "stress": stress,
    "mood": mood,
    "activity": activity
}

score = calculate_score(sleep, stress, mood, activity)
state = classify(score)

print(f"\n[Internal] Score: {score} → {state.upper()}")

# === INITIAL RESPONSE ===
initial_prompt = f"""
{system_prompt}

User wellbeing data:
- Sleep: {sleep} hours
- Stress: {stress}/5
- Mood: {mood}/5
- Activity: {activity} minutes

State: {state}

Start the conversation naturally by reflecting on their state.
"""

reply = ask_ai(initial_prompt)
print("\nAI:", reply)

# === STEP 2: CONVERSATION LOOP ===
history = f"AI: {reply}"

while True:
    user_input = input("\nYou: ")

    full_prompt = f"""
{system_prompt}

Known wellbeing data:
- Sleep: {sleep}
- Stress: {stress}
- Mood: {mood}
- Activity: {activity}
- State: {state}

Conversation so far:
{history}

User: {user_input}
AI:
"""

    reply = ask_ai(full_prompt)

    print("\nAI:", reply)

    # update memory (trim to avoid overload)
    history = (history + f"\nUser: {user_input}\nAI: {reply}")[-2000:]
