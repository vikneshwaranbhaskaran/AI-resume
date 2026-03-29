/* SkillMap — Frontend Logic */

// ─────────────────────────────────────────────
// Sample Resumes
// ─────────────────────────────────────────────
const SAMPLES = {
  data: `Experienced Data Analyst with 2 years in analytics and business intelligence.
Proficient in Python, pandas, numpy, and matplotlib for data wrangling and visualization.
Strong command of SQL and MySQL for database querying and reporting.
Familiar with Excel pivot tables and dashboards for stakeholder reporting.
Worked on multiple statistical analysis projects involving hypothesis testing and regression.
Comfortable with Tableau for building interactive dashboards.
Basic understanding of machine learning concepts.`,

  web: `Frontend developer with hands-on experience in building responsive web applications.
Skilled in HTML5, CSS3, and JavaScript (ES6+) for building modern UIs.
Worked with React.js for building SPA applications and component-based architecture.
Familiar with Git and GitHub for version control and team collaboration.
Basic knowledge of Node.js for server-side scripting.
Designed and integrated REST APIs in web projects.
Exposure to Figma for UI prototyping and wireframing.`,

  ml: `Aspiring Machine Learning Engineer with strong foundations in AI and statistics.
Experienced in Python, scikit-learn, TensorFlow, and PyTorch for model development.
Knowledge of deep learning architectures: CNNs, RNNs, Transformers.
Worked on NLP projects using NLTK, spaCy, and HuggingFace transformers.
Familiar with pandas, numpy for data processing and feature engineering.
Experience with Git, Linux, and Docker for reproducible ML environments.
Deployed models using Flask REST APIs.`,

  devops: `DevOps Engineer with experience in cloud infrastructure and CI/CD automation.
Proficient in Linux system administration, bash scripting, and networking fundamentals.
Hands-on experience with Docker and Kubernetes for container orchestration.
Worked extensively with AWS (EC2, S3, RDS, Lambda) for cloud deployments.
Set up CI/CD pipelines using GitHub Actions and Jenkins.
Experience with Terraform for infrastructure as code.
Familiar with monitoring tools for observability and alerting.
Strong foundation in Git-based workflows and branching strategies.`,
};

// ─────────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────────
const textarea = document.getElementById("resumeInput");
const charCount = document.getElementById("charCount");
const analyzeBtn = document.getElementById("analyzeBtn");
const errorBox = document.getElementById("errorBox");
const errorMsg = document.getElementById("errorMsg");
const loadingOverlay = document.getElementById("loadingOverlay");
const loaderText = document.getElementById("loaderText");
const placeholder = document.getElementById("placeholder");
const results = document.getElementById("results");

// ─────────────────────────────────────────────
// Character Counter
// ─────────────────────────────────────────────
textarea.addEventListener("input", () => {
  charCount.textContent = textarea.value.length;
});

// ─────────────────────────────────────────────
// Sample Chips
// ─────────────────────────────────────────────
document.querySelectorAll(".sample-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.sample;
    textarea.value = SAMPLES[key] || "";
    charCount.textContent = textarea.value.length;
    hideError();
  });
});

// ─────────────────────────────────────────────
// Analyze Button
// ─────────────────────────────────────────────
analyzeBtn.addEventListener("click", runAnalysis);

async function runAnalysis() {
  const text = textarea.value.trim();
  if (!text) {
    showError("Please paste your resume text before analyzing.");
    return;
  }

  hideError();
  showLoading();

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_text: text }),
    });

    const data = await response.json();
    hideLoading();

    if (!response.ok) {
      showError(data.error || "Something went wrong. Please try again.");
      return;
    }

    renderResults(data);
  } catch (err) {
    hideLoading();
    showError("Network error. Make sure the Flask server is running on port 5000.");
  }
}

// ─────────────────────────────────────────────
// Render Results
// ─────────────────────────────────────────────
function renderResults(data) {
  placeholder.classList.add("hidden");
  results.classList.remove("hidden");

  renderExtractedSkills(data.extracted_skills);
  renderTopRoles(data.top_roles);
  renderAllRoles(data.all_roles);
  renderMissingSkills(data.priority_missing_skills, data.top_roles);
  renderResources(data.learning_resources);

  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─────────────────────────────────────────────
// Extracted Skills
// ─────────────────────────────────────────────
function renderExtractedSkills(skills) {
  const container = document.getElementById("extractedSkills");
  const countBadge = document.getElementById("skillCount");
  countBadge.textContent = skills.length;

  container.innerHTML = skills
    .map(
      (s, i) =>
        `<span class="skill-tag" style="animation-delay:${i * 40}ms">${s}</span>`
    )
    .join("");
}

// ─────────────────────────────────────────────
// Top Role Cards
// ─────────────────────────────────────────────
function renderTopRoles(roles) {
  const container = document.getElementById("topRoles");

  container.innerHTML = roles
    .map((role, idx) => {
      const matchedHtml = role.matched_skills
        .map((s) => `<span class="mini-tag mini-tag-match">✓ ${s}</span>`)
        .join("");

      const missingHtml = role.missing_required
        .map((s) => `<span class="mini-tag mini-tag-miss">✗ ${s}</span>`)
        .join("");

      const scoreColor =
        role.match_score >= 70
          ? "#e8ff47"
          : role.match_score >= 45
          ? "#38f5c8"
          : "#ff6b6b";

      return `
      <div class="role-card" style="animation-delay:${idx * 80}ms">
        <div class="role-card-header">
          <div class="role-title-group">
            <div class="role-title">${role.title}</div>
            <div class="role-category">${role.category}</div>
          </div>
          <div class="role-meta">
            <div class="match-score">${role.match_score}%</div>
            <div class="match-label">match</div>
          </div>
        </div>
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width:${role.match_score}%; background:${scoreColor}"></div>
        </div>
        <p class="role-desc">${role.description}</p>
        <div class="role-badges">
          <span class="badge badge-salary">💰 ${role.avg_salary}</span>
          <span class="badge badge-demand">📈 ${role.demand} Demand</span>
        </div>
        <div class="role-skills-row">
          ${
            matchedHtml
              ? `<div>
              <div class="skills-row-label">You have</div>
              <div class="mini-skill-tags">${matchedHtml}</div>
            </div>`
              : ""
          }
          ${
            missingHtml
              ? `<div>
              <div class="skills-row-label">You're missing</div>
              <div class="mini-skill-tags">${missingHtml}</div>
            </div>`
              : ""
          }
        </div>
      </div>`;
    })
    .join("");
}

// ─────────────────────────────────────────────
// All Roles Matrix
// ─────────────────────────────────────────────
function renderAllRoles(roles) {
  const container = document.getElementById("allRoles");

  container.innerHTML = roles
    .map((role) => {
      const score = role.match_score;
      const color =
        score >= 70 ? "#e8ff47" : score >= 45 ? "#38f5c8" : score >= 25 ? "#a78bfa" : "#4e5668";

      return `
      <div class="matrix-row">
        <div class="matrix-title" title="${role.title}">${role.title}</div>
        <div class="matrix-bar-track">
          <div class="matrix-bar-fill" style="width:${score}%; background:${color}"></div>
        </div>
        <div class="matrix-score">${score}%</div>
      </div>`;
    })
    .join("");
}

// ─────────────────────────────────────────────
// Missing Skills
// ─────────────────────────────────────────────
const SKILL_ICONS = {
  python: "🐍", sql: "🗄️", machine_learning: "🤖", deep_learning: "🧠",
  javascript: "🟨", react: "⚛️", docker: "🐳", kubernetes: "☸️",
  aws: "☁️", git: "🔀", linux: "🐧", statistics: "📊",
  "data visualization": "📈", tensorflow: "🔥", pytorch: "🔥",
  excel: "📋", tableau: "📊", "node.js": "🟢", typescript: "🔷",
  figma: "🎨", nlp: "💬", security: "🔒", networking: "🌐",
  "ci/cd": "🔄", terraform: "🏗️", java: "☕", kotlin: "🎯",
  swift: "🦅", "rest api": "🔌", default: "⚡"
};


// DOM References
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const ollamaWarn = document.getElementById("ollamaWarn");
function getIcon(skill) {
  const key = skill.toLowerCase().replace(/\s+/g, "_");
  return SKILL_ICONS[key] || SKILL_ICONS[skill.toLowerCase()] || SKILL_ICONS.default;
}

function renderMissingSkills(skills, topRoles) {
  const container = document.getElementById("missingSkills");

  if (!skills.length) {
    container.innerHTML = `<p style="color:var(--teal); font-size:14px">🎉 You already have most required skills for your top roles!</p>`;

// ─────────────────────────────────────────────
    return;
  }

  // Count how many top roles need each skill
  const freq = {};
  topRoles.forEach((role) => {
    role.missing_required.forEach((s) => {
      freq[s] = (freq[s] || 0) + 1;
    });
  });

  container.innerHTML = skills
    .map((skill, i) => {
      const count = freq[skill] || 1;
      const label =
        count === 3
          ? "Needed in all top roles"
          : count === 2
          ? "Needed in 2 top roles"
          : "Needed in top role";

      return `
      <div class="missing-card" style="animation-delay:${i * 50}ms">
        <div class="missing-card-icon">${getIcon(skill)}</div>
        <div class="missing-card-name">${skill}</div>
        <div class="missing-card-freq">${label}</div>
      </div>`;
    })
    .join("");
}

// ─────────────────────────────────────────────
// Learning Resources
// ─────────────────────────────────────────────
function renderResources(resources) {
  const section = document.getElementById("resourcesSection");
  const container = document.getElementById("learningResources");

  const entries = Object.entries(resources);

  // Send chat to backend (simulate context with extracted_skills if available)
  let context = {};
  if (window.currentAnalysis) {
    const { extracted_skills, best_match, top_roles } = window.currentAnalysis;
    context = {
      skills: extracted_skills,
      role: best_match ? best_match.title : (top_roles?.[0]?.title || 'Developer'),
      match_score: best_match ? best_match.match_score : 0,
      missing: best_match ? best_match.missing_skills.slice(0, 5) : []
    };
  }

  try {
    const res = await fetch('/ai-advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...context,
        message: msg,
        chat_history: chatHistory
      })
    });
    if (!res.ok) {
      const err = await res.json();
      ollamaWarn.innerHTML = `⚠ ${err.error}<br>Fix: <code>${err.fix || 'check Ollama'}</code>`;
      ollamaWarn.style.display = 'block';
      removeTypingIndicator();
      return false;
    }
    // Stream the response
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    removeTypingIndicator();
    addChatBubble('', 'ai');
    const aiBubble = chatMessages.querySelector('.chat-bubble.ai:last-child span:last-child');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) {
            ollamaWarn.innerHTML = `⚠ ${data.error}`;
            ollamaWarn.style.display = 'block';
            break;
          }
          if (data.token) {
            fullText += data.token;
            aiBubble.textContent = fullText;
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
          if (data.done) {
            chatHistory.push({ role: 'user', content: msg });
            chatHistory.push({ role: 'ai', content: fullText });
          }
        } catch {}
      }
    }
  } catch (e) {
    ollamaWarn.innerHTML = `⚠ Could not reach Ollama. Make sure it's running: <code>ollama serve</code>`;
    ollamaWarn.style.display = 'block';
    removeTypingIndicator();
  }
  return false;
}

if (chatForm) {
  chatForm.onsubmit = sendChat;
}

  if (!entries.length) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");

  container.innerHTML = entries
    .map(([skill, links]) => {
      const linksHtml = links
        .map(
          (r) =>
            `<a href="${r.url}" target="_blank" rel="noopener" class="resource-link">${r.name}</a>`
        )
        .join("");

      return `
      <div class="resource-group">
        <div class="resource-skill-label">${skill.toUpperCase()}</div>
        <div class="resource-links">${linksHtml}</div>
      </div>`;
    })
    .join("");
}

// ─────────────────────────────────────────────
// Loading Messages
// ─────────────────────────────────────────────
const LOADING_MSGS = [
  "Parsing resume text…",
  "Extracting technical skills…",
  "Matching against 15 job roles…",
  "Computing skill gaps…",
  "Curating learning resources…",
];

let loadingInterval = null;

function showLoading() {
  loadingOverlay.classList.remove("hidden");
  let i = 0;
  loaderText.textContent = LOADING_MSGS[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_MSGS.length;
    loaderText.textContent = LOADING_MSGS[i];
  }, 700);
}

function hideLoading() {
  clearInterval(loadingInterval);
  loadingOverlay.classList.add("hidden");
}

// ─────────────────────────────────────────────
// Error Helpers
// ─────────────────────────────────────────────
function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.classList.remove("hidden");
  errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideError() {
  errorBox.classList.add("hidden");
}
