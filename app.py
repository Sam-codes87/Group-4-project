from flask import Flask, request, jsonify, render_template
from pymongo import MongoClient
from datetime import datetime
import requests

app = Flask(__name__)

# MongoDB connection
try:
    client = MongoClient(
        "mongodb+srv://amirsampoorjabar_db_user:27091387AmirVlad@well-being-cluster.gja6mwh.mongodb.net/",
        serverSelectionTimeoutMS=5000
    )
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB!")

    db = client["group_4_project"]
    collection = db["responses"]
    reflection_collection = db["reflections"]

except Exception as e:
    print(f"❌ MongoDB connection error: {e}")
    collection = None
    reflection_collection = None

OLLAMA_URL = "http://localhost:11434/api/generate"


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/submit", methods=["POST"])
def submit():
    if collection is None:
        return jsonify({"status": "error", "message": "Database unavailable"}), 503
    try:
        data = request.get_json()
        if not data or not data.get('full_name'):
            return jsonify({"status": "error", "message": "Invalid data"}), 400

        data['server_submitted_at'] = datetime.now()
        data['submission_date'] = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S")
        result = collection.insert_one(data)
        return jsonify({"status": "success", "id": str(result.inserted_id)}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/submit-reflection", methods=["POST"])
def submit_reflection():
    if reflection_collection is None:
        return jsonify({"status": "error", "message": "Database unavailable"}), 503
    try:
        data = request.get_json()
        if not data:
            return jsonify({"status": "error", "message": "No data"}), 400

        data['submitted_at'] = datetime.now()
        data['submission_date'] = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S")
        result = reflection_collection.insert_one(data)
        return jsonify({"status": "success", "id": str(result.inserted_id)}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        if not prompt:
            return jsonify({"error": "No prompt"}), 400

        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "qwen",
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.7, "max_tokens": 200}
            },
            timeout=30
        )

        if response.status_code != 200:
            return jsonify({"error": f"Ollama error: {response.status_code}"}), 500

        return jsonify({"response": response.json().get("response", "")})
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Cannot connect to Ollama"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
