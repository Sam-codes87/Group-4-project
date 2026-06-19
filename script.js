(function () {
    const pageIds = [
        'page-intro',
        'page-sleep',
        'page-water',
        'page-stress',
        'page-screen',
        'page-physical',
        'page-emotional',
        'page-report',
        'page-chat',
        'page-reflection'
    ];
    const totalPages = pageIds.length;
    let currentPageIndex = 0;

    const pages = document.querySelectorAll('.page');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const indicator = document.getElementById('pageIndicator');
    const progressBar = document.getElementById('progress-bar');
    const startBtn = document.getElementById('startBtn');
    const navError = document.getElementById('navError');

    // Chat elements
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const startChatBtn = document.getElementById('start-chat-btn');

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeLabel = document.getElementById('themeLabel');

    const ratingData = {};
    const reflectionData = {};
    let chatActive = false;
    let chatHistory = [];
    let userState = {};

    // ===== THEME TOGGLE =====
    let currentTheme = 'dark';
    themeToggle.addEventListener('click', function () {
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeIcon.className = 'fas fa-sun';
            themeLabel.textContent = 'Light';
            currentTheme = 'light';
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeIcon.className = 'fas fa-moon';
            themeLabel.textContent = 'Dark';
            currentTheme = 'dark';
        }
    });

    // ---------- generate rating buttons ----------
    document.querySelectorAll('.rating-group').forEach(group => {
        const qid = group.dataset.qid;
        const minLabel = group.dataset.min || 'min';
        const maxLabel = group.dataset.max || 'max';
        const maxVal = parseInt(group.dataset.max) || 10;

        for (let i = 1; i <= maxVal; i++) {
            const btn = document.createElement('button');
            btn.className = 'rating-btn';
            btn.textContent = i;
            btn.dataset.value = i;
            btn.dataset.qid = qid;
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const parent = this.closest('.rating-group');
                parent.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                // Store in appropriate data store
                if (qid.startsWith('reflection_')) {
                    reflectionData[qid] = parseInt(this.dataset.value, 10);
                } else {
                    ratingData[qid] = parseInt(this.dataset.value, 10);
                }
                updateSummaryText();
                updateProgress();
                updateReport();
                clearNavError();
            });
            group.appendChild(btn);
        }

        const minSpan = document.createElement('span');
        minSpan.className = 'rating-label rating-label-min';
        minSpan.textContent = minLabel;

        const maxSpan = document.createElement('span');
        maxSpan.className = 'rating-label rating-label-max';
        maxSpan.textContent = maxLabel;

        group.prepend(minSpan);
        group.appendChild(maxSpan);
    });

    // ---------- Reflection radio buttons ----------
    document.querySelectorAll('.reflection-options').forEach(container => {
        const qid = container.dataset.qid;
        container.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', function () {
                if (this.checked) {
                    reflectionData[qid] = this.value;
                    updateSummaryText();
                    clearNavError();
                }
            });
        });
    });

    // ---------- validation ----------
    function isCurrentPageComplete() {
        const current = document.querySelector('.page.active');
        if (!current) return false;
        if (current.id === 'page-intro') {
            const name = document.getElementById('intro-name');
            const age = document.getElementById('intro-age');
            const program = document.getElementById('intro-program');
            if (!name.value.trim()) return false;
            if (!age.value || parseInt(age.value) <= 0) return false;
            if (!program.value || program.value === '') return false;
            return true;
        }
        if (current.id === 'page-report') return true;
        if (current.id === 'page-chat') return true;
        if (current.id === 'page-reflection') {
            // Check if all reflection questions are answered
            const required = ['reflection_satisfied', 'reflection_useful', 'reflection_follow',
                'reflection_recommendations', 'reflection_exams', 'reflection_identify',
                'reflection_realistic', 'reflection_motivation', 'reflection_valuable',
                'reflection_usefulness'
            ];
            for (let q of required) {
                if (!reflectionData[q]) return false;
            }
            return true;
        }
        const groups = current.querySelectorAll('.rating-group');
        for (let g of groups) {
            if (!g.querySelector('.rating-btn.selected')) return false;
        }
        return true;
    }

    function showNavError(msg) {
        navError.innerHTML = `<span class="error-msg"><i class="fas fa-exclamation-circle"></i> ${msg}</span>`;
    }

    function clearNavError() { navError.innerHTML = ''; }

    // ---------- summary ----------
    function updateSummaryText() {
        const entries = Object.entries(ratingData);
        const reflEntries = Object.entries(reflectionData);
        const totalAnswered = entries.length + reflEntries.length;
        const total = 40;
        if (totalAnswered === 0) {
            document.querySelectorAll('#summary-output span, #reportSummary, #chatSummary').forEach(el => {
                if (el) el.textContent = 'No data yet. Complete the questionnaire to see your results.';
            });
            return;
        }
        const lastThree = entries.slice(-3).map(([q, v]) => `${q}:${v}`).join(' · ');
        const summaryText = `
                        <span style="background:var(--bg-input); padding:2px 14px; border-radius:30px; border:1px solid var(--border-color);">
                            <i class="fas fa-check-circle" style="color:var(--accent);"></i> ${totalAnswered}/${total}
                        </span>
                        <span style="background:var(--bg-input); padding:2px 14px; border-radius:30px; font-size:0.9em; border:1px solid var(--border-color);">
                            ${lastThree || '—'}
                        </span>
                    `;
        document.querySelectorAll('#summary-output span, #reportSummary, #chatSummary').forEach(el => {
            if (el) el.innerHTML = summaryText;
        });
    }

    function updateProgress() {
        const answered = Object.keys(ratingData).length + Object.keys(reflectionData).length;
        const total = 40;
        const pct = Math.min(100, Math.round((answered / total) * 100));
        progressBar.style.width = pct + '%';
    }

    // ---------- Report ----------
    function updateReport() {
        const reportGrid = document.getElementById('reportGrid');
        if (!reportGrid) return;

        const areas = [
            { key: 'sleep', label: 'Sleep', icon: 'fa-moon' },
            { key: 'sleep_quality', label: 'Sleep Quality', icon: 'fa-star' },
            { key: 'stress_nervous', label: 'Stress Level', icon: 'fa-brain', invert: true },
            { key: 'emotional_engaged', label: 'Mood', icon: 'fa-smile' },
            { key: 'physical_activity_freq', label: 'Physical Activity', icon: 'fa-running' },
            { key: 'water_intake', label: 'Hydration', icon: 'fa-tint' },
            { key: 'screen_healthy', label: 'Screen Time', icon: 'fa-mobile-alt', invert: true }
        ];

        let html = '';
        let totalScore = 0;
        let count = 0;

        areas.forEach(area => {
            let value = ratingData[area.key];
            if (value === undefined) {
                html += `
                                <div class="report-card">
                                    <div class="score-label"><i class="fas ${area.icon}"></i> ${area.label}</div>
                                    <div class="score-value" style="font-size:20px; color:var(--text-secondary);">—</div>
                                    <div class="score-status" style="background:var(--bg-input); color:var(--text-secondary);">Not answered</div>
                                </div>
                            `;
                return;
            }

            // Normalize value (some are inverted)
            let normalized = area.invert ? 11 - value : value;
            let score = Math.round((normalized / 10) * 100);
            totalScore += score;
            count++;

            let status = 'moderate';
            let statusClass = 'status-moderate';
            if (score >= 70) {
                status = 'good';
                statusClass = 'status-good';
            } else if (score < 40) {
                status = 'low';
                statusClass = 'status-low';
            }

            html += `
                            <div class="report-card">
                                <div class="score-label"><i class="fas ${area.icon}"></i> ${area.label}</div>
                                <div class="score-value">${score}%</div>
                                <div class="score-status ${statusClass}">${status}</div>
                            </div>
                        `;
        });

        // Overall score
        const overall = count > 0 ? Math.round(totalScore / count) : 0;
        let overallStatus = 'moderate';
        let overallClass = 'status-moderate';
        if (overall >= 70) {
            overallStatus = 'good';
            overallClass = 'status-good';
        } else if (overall < 40) {
            overallStatus = 'low';
            overallClass = 'status-low';
        }

        html += `
                        <div class="report-card" style="grid-column: 1 / -1; background: var(--btn-primary); border-color: var(--accent);">
                            <div class="score-label" style="color:white;"><i class="fas fa-chart-line"></i> Overall Wellbeing</div>
                            <div class="score-value" style="color:white;">${overall}%</div>
                            <div class="score-status ${overallClass}">${overallStatus}</div>
                        </div>
                    `;

        reportGrid.innerHTML = html;

        // Update summary with score
        const reportSummary = document.getElementById('reportSummary');
        if (reportSummary && count > 0) {
            reportSummary.innerHTML = `
                            <span style="background:var(--bg-input); padding:2px 14px; border-radius:30px; border:1px solid var(--border-color);">
                                <i class="fas fa-chart-line" style="color:var(--accent);"></i> Overall Score: ${overall}% (${overallStatus})
                            </span>
                            <span style="background:var(--bg-input); padding:2px 14px; border-radius:30px; font-size:0.9em; border:1px solid var(--border-color);">
                                ${count} areas assessed
                            </span>
                        `;
        }
    }

    // ---------- clear & restart ----------
    function clearAllAndRestart() {
        document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('selected'));
        document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        for (let key in ratingData) delete ratingData[key];
        for (let key in reflectionData) delete reflectionData[key];
        document.getElementById('intro-name').value = '';
        document.getElementById('intro-age').value = '';
        document.getElementById('intro-program').selectedIndex = 0;
        document.getElementById('intro-email').value = '';
        chatHistory = [];
        chatMessages.innerHTML = `
                        <div class="chat-message ai">
                            <i class="fas fa-robot" style="margin-right:8px;"></i>
                            Chat cleared. Complete the questionnaire and click "Start AI Chat" to begin.
                            <span class="msg-time">System</span>
                        </div>
                    `;
        chatActive = false;
        chatInput.disabled = true;
        chatSendBtn.disabled = true;
        startChatBtn.textContent = 'Start AI Chat';
        updateSummaryText();
        updateProgress();
        updateReport();
        clearNavError();
        document.querySelectorAll('#server-feedback, #server-feedback2, #reflectionFeedback').forEach(el => {
            if (el) {
                el.innerHTML = `<i class="fas fa-circle-info"></i> Click "Submit" to store all answers.`;
                el.className = '';
            }
        });
        goToPage(0);
    }

    // ---------- navigation ----------
    function goToPage(index) {
        if (index < 0 || index >= totalPages) return;
        if (index > currentPageIndex) {
            if (!isCurrentPageComplete()) {
                showNavError('Please answer all questions on this page before proceeding.');
                return;
            }
        }
        clearNavError();
        pages.forEach(p => p.classList.remove('active'));
        const target = document.getElementById(pageIds[index]);
        if (target) target.classList.add('active');
        currentPageIndex = index;

        prevBtn.disabled = (index === 0);
        nextBtn.disabled = (index === totalPages - 1);
        const labels = ['Intro', 'Sleep', 'Water', 'Stress', 'Screen', 'Physical', 'Emotional', 'Report', 'Chat',
            'Reflection'
        ];
        nextBtn.innerHTML = (index === totalPages - 1) ? 'Finish <i class="fas fa-check"></i>' :
            `Next <i class="fas fa-arrow-right"></i>`;
        indicator.textContent = `${index + 1} / ${totalPages} · ${labels[index]}`;
        updateProgress();
        if (pageIds[index] === 'page-report') updateReport();
        if (pageIds[index] === 'page-chat') updateSummaryText();
    }

    function nextPage() { if (currentPageIndex < totalPages - 1) goToPage(currentPageIndex + 1); }

    function prevPage() { if (currentPageIndex > 0) goToPage(currentPageIndex - 1); }

    // ===== AI Chat Functions =====

    function extractWellbeingData() {
        return {
            sleep: ratingData['sleep'] || 5,
            sleepQuality: ratingData['sleep_quality'] || 5,
            stress: ratingData['stress_nervous'] || 5,
            stressOverwhelmed: ratingData['stress_overwhelmed'] || 5,
            mood: ratingData['emotional_engaged'] || 5,
            moodRestless: ratingData['emotional_restless'] || 5,
            activity: ratingData['physical_activity_freq'] || 5,
            waterIntake: ratingData['water_intake'] || 5,
            screenTime: ratingData['screen_healthy'] || 5
        };
    }

    function calculateWellbeingScore(data) {
        const sleepScore = (data.sleep / 10) * 100;
        const stressScore = ((10 - data.stress) / 10) * 100;
        const moodScore = (data.mood / 10) * 100;
        const activityScore = (data.activity / 10) * 100;
        const total = sleepScore * 0.25 + stressScore * 0.30 + moodScore * 0.25 + activityScore * 0.20;
        return Math.round(total);
    }

    function getWellbeingState(score) {
        if (score > 75) return "good";
        if (score > 50) return "moderate";
        return "low";
    }

    function getStatusDescription(value) {
        if (value >= 8) return "excellent";
        if (value >= 6) return "good";
        if (value >= 4) return "moderate";
        return "needs attention";
    }

    async function sendToAI(prompt) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.response || "I'm having trouble responding right now. Please try again.";
        } catch (error) {
            console.error('AI Error:', error);
            return "I'm having trouble connecting to the AI service. Please check if Ollama is running on localhost:11434.";
        }
    }

    async function initializeChat() {
        const data = extractWellbeingData();
        const score = calculateWellbeingScore(data);
        const state = getWellbeingState(score);

        const sleepStatus = getStatusDescription(data.sleep);
        const stressStatus = getStatusDescription(10 - data.stress);
        const moodStatus = getStatusDescription(data.mood);
        const activityStatus = getStatusDescription(data.activity);
        const waterStatus = getStatusDescription(data.waterIntake);
        const screenStatus = getStatusDescription(10 - data.screenTime);

        userState = {
            ...data, score, state, sleepStatus, stressStatus, moodStatus, activityStatus, waterStatus,
            screenStatus
        };

        const systemPrompt = `You are a wellbeing assistant based on the user's questionnaire data.
    User state:
    - Sleep: ${data.sleep}/10 (${sleepStatus})
    - Stress: ${data.stress}/10 (${stressStatus})
    - Mood: ${data.mood}/10 (${moodStatus})
    - Activity: ${data.activity}/10 (${activityStatus})
    - Water: ${data.waterIntake}/10 (${waterStatus})
    - Screen: ${data.screenTime}/10 (${screenStatus})
    Score: ${score} (${state})

    Keep responses: calm, conversational, 2-4 sentences, supportive but not overly emotional.
    Do NOT give medical advice or diagnose. Reflect patterns and encourage awareness.
    ALWAYS end your response with a question to keep the conversation going.`;

        const reply = await sendToAI(systemPrompt + "\n\nStart a natural conversation about their wellbeing.");

        chatMessages.innerHTML = `
                        <div class="chat-message ai">
                            <i class="fas fa-robot" style="margin-right:8px;"></i>
                            ${reply}
                            <span class="msg-time">${new Date().toLocaleTimeString()}</span>
                        </div>
                        <div class="chat-score-badge">
                            <i class="fas fa-chart-line"></i> Score: ${score} (${state})
                        </div>
                    `;

        chatHistory = [{ role: 'assistant', content: reply }];
        chatActive = true;
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        startChatBtn.textContent = 'Restart Chat';
        chatInput.focus();

        const chatSummary = document.getElementById('chatSummary');
        if (chatSummary) {
            chatSummary.innerHTML = `
                            <span style="background:var(--bg-input); padding:2px 14px; border-radius:30px; border:1px solid var(--border-color);">
                                <i class="fas fa-chart-line" style="color:var(--accent);"></i> Score: ${score} (${state})
                            </span>
                            <span style="background:var(--bg-input); padding:2px 14px; border-radius:30px; font-size:0.9em; border:1px solid var(--border-color);">
                                Chat with AI about your wellbeing
                            </span>
                        `;
        }
    }

    async function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message || !chatActive) return;

        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'chat-message user';
        userMsgDiv.innerHTML = `${message}<span class="msg-time">${new Date().toLocaleTimeString()}</span>`;
        chatMessages.appendChild(userMsgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        chatInput.value = '';
        chatInput.disabled = true;
        chatSendBtn.disabled = true;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.textContent = 'AI is thinking...';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const systemPrompt = `You are a wellbeing assistant based on the user's data.
    Sleep: ${userState.sleep}/10 (${userState.sleepStatus}), Stress: ${userState.stress}/10 (${userState.stressStatus}),
    Mood: ${userState.mood}/10 (${userState.moodStatus}), Activity: ${userState.activity}/10 (${userState.activityStatus}),
    Water: ${userState.waterIntake}/10 (${userState.waterStatus}), Screen: ${userState.screenTime}/10 (${userState.screenStatus}),
    Score: ${userState.score} (${userState.state})

    Keep responses: calm, conversational, 2-4 sentences. ALWAYS end with a question.`;

            const conversationHistory = chatHistory.map(msg =>
                `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`
            ).join('\n');

            const prompt = `${systemPrompt}\n\nConversation:\n${conversationHistory}\nUser: ${message}\nAI:`;
            const reply = await sendToAI(prompt);

            chatMessages.removeChild(typingDiv);
            const aiMsgDiv = document.createElement('div');
            aiMsgDiv.className = 'chat-message ai';
            aiMsgDiv.innerHTML = `
                            <i class="fas fa-robot" style="margin-right:8px;"></i>
                            ${reply}
                            <span class="msg-time">${new Date().toLocaleTimeString()}</span>
                        `;
            chatMessages.appendChild(aiMsgDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            chatHistory.push({ role: 'user', content: message });
            chatHistory.push({ role: 'assistant', content: reply });
            if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

        } catch (error) {
            chatMessages.removeChild(typingDiv);
            const errorMsg = document.createElement('div');
            errorMsg.className = 'chat-message ai';
            errorMsg.innerHTML = `
                            <i class="fas fa-exclamation-triangle" style="color:var(--error-color); margin-right:8px;"></i>
                            Error: ${error.message}
                            <span class="msg-time">${new Date().toLocaleTimeString()}</span>
                        `;
            chatMessages.appendChild(errorMsg);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
    }

    // ---------- Submit to Database ----------
    function submitToDatabase() {
        const full_name = document.getElementById('intro-name').value.trim();
        const age = document.getElementById('intro-age').value.trim();
        const program = document.getElementById('intro-program').value;
        const email = document.getElementById('intro-email').value.trim();

        if (!full_name || !age || !program) {
            const fb = document.querySelector('#server-feedback, #server-feedback2');
            if (fb) {
                fb.innerHTML =
                    `<i class="fas fa-exclamation-triangle error"></i> Please fill in all required fields on the intro page.`;
                fb.className = 'error';
            }
            return;
        }

        const payload = {
            full_name: full_name,
            age: parseInt(age, 10),
            program: program,
            email: email || null,
            answers: { ...ratingData },
            reflection: { ...reflectionData },
            wellbeing_score: userState.score || null,
            wellbeing_state: userState.state || null
        };

        fetch('/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                const fb = document.querySelector('#server-feedback, #server-feedback2');
                if (fb) {
                    if (data.status === 'success') {
                        fb.innerHTML =
                            `<i class="fas fa-check-circle success"></i> ✅ All answers stored in MongoDB! (ID: ${data.id || '—'})`;
                        fb.className = 'success';
                    } else {
                        fb.innerHTML =
                            `<i class="fas fa-exclamation-triangle error"></i> ❌ Server error: ${data.message || 'Unknown error'}`;
                        fb.className = 'error';
                    }
                }
            })
            .catch(err => {
                const fb = document.querySelector('#server-feedback, #server-feedback2');
                if (fb) {
                    fb.innerHTML =
                        `<i class="fas fa-exclamation-triangle error"></i> ❌ Could not connect to server. (${err.message})`;
                    fb.className = 'error';
                }
            });
    }

    // ---------- Submit Reflection ----------
    function submitReflection() {
        const required = ['reflection_satisfied', 'reflection_useful', 'reflection_follow',
            'reflection_recommendations', 'reflection_exams', 'reflection_identify',
            'reflection_realistic', 'reflection_motivation', 'reflection_valuable',
            'reflection_usefulness'
        ];
        for (let q of required) {
            if (!reflectionData[q]) {
                const fb = document.getElementById('reflectionFeedback');
                if (fb) {
                    fb.innerHTML =
                        `<i class="fas fa-exclamation-triangle error"></i> Please answer all reflection questions before submitting.`;
                    fb.className = 'error';
                }
                return;
            }
        }

        const payload = {
            reflection: { ...reflectionData },
            timestamp: new Date().toISOString()
        };

        fetch('/submit-reflection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                const fb = document.getElementById('reflectionFeedback');
                if (fb) {
                    if (data.status === 'success') {
                        fb.innerHTML =
                            `<i class="fas fa-check-circle success"></i> ✅ Reflection submitted successfully! (ID: ${data.id || '—'})`;
                        fb.className = 'success';
                    } else {
                        fb.innerHTML =
                            `<i class="fas fa-exclamation-triangle error"></i> ❌ Server error: ${data.message || 'Unknown error'}`;
                        fb.className = 'error';
                    }
                }
            })
            .catch(err => {
                const fb = document.getElementById('reflectionFeedback');
                if (fb) {
                    fb.innerHTML =
                        `<i class="fas fa-exclamation-triangle error"></i> ❌ Could not connect to server. (${err.message})`;
                    fb.className = 'error';
                }
            });
    }

    // ----- event listeners -----
    nextBtn.addEventListener('click', nextPage);
    prevBtn.addEventListener('click', prevPage);

    startBtn.addEventListener('click', function () {
        if (!isCurrentPageComplete()) {
            showNavError('Please fill in all required fields (Name, Age, Programme) before starting.');
            return;
        }
        goToPage(1);
    });

    document.getElementById('clearAllBtn2')?.addEventListener('click', clearAllAndRestart);
    document.getElementById('clearAllBtn')?.addEventListener('click', clearAllAndRestart);
    document.getElementById('submitToDbBtn')?.addEventListener('click', submitToDatabase);
    document.getElementById('submitToDbBtn2')?.addEventListener('click', submitToDatabase);
    document.getElementById('submitReflectionBtn')?.addEventListener('click', submitReflection);

    startChatBtn.addEventListener('click', function () {
        if (Object.keys(ratingData).length < 10) {
            const fb = document.getElementById('server-feedback2');
            if (fb) {
                fb.innerHTML =
                    `<i class="fas fa-exclamation-triangle error"></i> Please complete at least 10 questions before starting the chat.`;
                fb.className = 'error';
            }
            return;
        }
        initializeChat();
    });

    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    document.querySelectorAll('.intro-input-group input, .intro-input-group select').forEach(el => {
        el.addEventListener('input', clearNavError);
        el.addEventListener('change', clearNavError);
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' && !e.ctrlKey && !e.metaKey && !nextBtn.disabled) nextBtn.click();
        else if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.metaKey && !prevBtn.disabled) prevBtn.click();
    });

    // init
    goToPage(0);
    updateProgress();
    updateSummaryText();
    updateReport();
})();