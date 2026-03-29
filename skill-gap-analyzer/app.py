from flask import Flask, render_template, request, jsonify, Response, stream_with_context
import json, re, os, urllib.request, urllib.error

app = Flask(__name__)

with open(os.path.join(os.path.dirname(__file__), 'data', 'job_roles.json')) as f:
    DATA = json.load(f)
JOB_ROLES = DATA['job_roles']
SKILL_RESOURCES = DATA['skill_resources']

OLLAMA_URL   = "http://localhost:11434"
# Priority order — uses first available model
PREFERRED_MODELS = ["qwen3:8b", "qwen2.5:7b", "qwen2:7b", "gemma3:4b", "deepseek-r1:8b"]
OLLAMA_MODEL = "qwen3:8b"   # overwritten at startup if not found

SKILL_KEYWORDS = [
    "python","java","javascript","typescript","c++","c#","go","rust","ruby",
    "swift","kotlin","scala","php","r","matlab","bash","shell",
    "html","css","react","angular","vue","nodejs","node.js","express",
    "django","flask","fastapi","spring","sass","webpack","next.js",
    "rest api","graphql","responsive design",
    "sql","mysql","postgresql","mongodb","sqlite","oracle","redis",
    "pandas","numpy","scikit-learn","tensorflow","pytorch","keras",
    "machine learning","deep learning","nlp","computer vision","mlops",
    "data visualization","data analysis","statistics","tableau","power bi",
    "excel","etl","data modeling","data warehousing",
    "docker","kubernetes","aws","azure","gcp","linux","git","github",
    "ci/cd","jenkins","terraform","ansible","nginx","apache",
    "android","ios","react native","flutter","firebase",
    "networking","ethical hacking","cryptography","penetration testing",
    "firewalls","siem","vulnerability assessment","database design",
    "backup recovery","performance tuning","agile","scrum","jira"
]

ALIASES = {
    "ml":"machine learning","dl":"deep learning","js":"javascript",
    "ts":"typescript","k8s":"kubernetes","node":"nodejs",
    "postgres":"postgresql","tf":"tensorflow","cv":"computer vision",
}

try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
    print("✅ spaCy loaded")
except Exception:
    SPACY_AVAILABLE = False
    print("⚠️  Using regex NLP")

def clean_text(text):
    text = text.lower()
    text = re.sub(r'[^\w\s\+#./]', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()

def extract_skills(text):
    cleaned = clean_text(text)
    found = set()
    for skill in SKILL_KEYWORDS:
        if re.search(r'\b' + re.escape(skill) + r'\b', cleaned):
            found.add(skill)
    if SPACY_AVAILABLE:
        doc = nlp(cleaned)
        for chunk in doc.noun_chunks:
            t = chunk.text.strip().lower()
            if t in SKILL_KEYWORDS: found.add(t)
        for ent in doc.ents:
            t = ent.text.strip().lower()
            if t in SKILL_KEYWORDS: found.add(t)
        for token in doc:
            if token.text.lower() in ALIASES:
                found.add(ALIASES[token.text.lower()])
    return sorted(found)

def match_roles(user_skills, jd_skills=None):
    results = []
    user_set = set(user_skills)
    jd_boost = set(jd_skills) if jd_skills else set()
    for role in JOB_ROLES:
        required = set(role['required_skills'])
        core = set(role['core_skills'])
        matching = user_set & required
        missing = required - user_set
        core_matched = user_set & core
        if not required: continue
        core_score = len(core_matched) / len(core) if core else 0
        overall_score = len(matching) / len(required)
        weighted = (core_score * 0.6 + overall_score * 0.4) * 100
        # Boost score if role skills match JD
        if jd_boost:
            jd_match = len(jd_boost & required) / max(len(jd_boost), 1)
            weighted = min(100, weighted + jd_match * 15)
        results.append({
            "title": role["title"], "description": role["description"],
            "avg_salary": role["avg_salary"], "demand": role["demand"],
            "match_score": round(weighted, 1),
            "matching_skills": sorted(list(matching)),
            "missing_skills": sorted(list(core - user_set)) + sorted(list(missing - core)),
            "priority_missing": sorted(list(core - user_set)),
            "total_required": len(required), "matched_count": len(matching)
        })
    return sorted(results, key=lambda x: x['match_score'], reverse=True)

def get_resources(missing_skills):
    resources = []
    for skill in missing_skills[:12]:
        if skill in SKILL_RESOURCES:
            res = SKILL_RESOURCES[skill].copy(); res['skill'] = skill
        else:
            res = {"skill": skill, "platform": "Google / YouTube",
                   "url": f"https://www.google.com/search?q=learn+{skill.replace(' ', '+')}",
                   "duration": "Varies"}
        resources.append(res)
    return resources

def check_ollama():
    global OLLAMA_MODEL
    try:
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read())
            models = [m['name'] for m in data.get('models', [])]
            # Auto-select best available model
            for preferred in PREFERRED_MODELS:
                if any(preferred in m for m in models):
                    OLLAMA_MODEL = preferred
                    break
            model_available = any(OLLAMA_MODEL in m for m in models)
            return {"running": True, "model_available": model_available,
                    "active_model": OLLAMA_MODEL, "models": models}
    except Exception as e:
        return {"running": False, "model_available": False,
                "active_model": OLLAMA_MODEL, "models": [], "error": str(e)}

def stream_ollama(prompt):
    status = check_ollama()
    if not status['running']:
        yield f"data: {json.dumps({'error': 'Ollama not running', 'fix': 'ollama serve'})}\n\n"; return
    if not status['model_available']:
        yield f"data: {json.dumps({'error': f'{OLLAMA_MODEL} not found', 'fix': f'ollama pull {OLLAMA_MODEL}'})}\n\n"; return

    payload = json.dumps({
        "model": OLLAMA_MODEL, "prompt": prompt, "stream": True,
        "options": {"temperature": 0.72, "top_p": 0.9, "num_predict": 500}
    }).encode('utf-8')

    try:
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/generate", data=payload,
            headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.strip()
                if not line: continue
                try:
                    chunk = json.loads(line)
                    token = chunk.get("response", "")
                    done  = chunk.get("done", False)
                    if token: yield f"data: {json.dumps({'token': token})}\n\n"
                    if done:  yield f"data: {json.dumps({'done': True})}\n\n"; break
                except json.JSONDecodeError: continue
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

# ── ROUTES ──
@app.route('/')
def index():
    s = check_ollama()
    return render_template('index.html',
        spacy_available=SPACY_AVAILABLE, ollama_running=s['running'],
        model_available=s['model_available'], active_model=s['active_model'])

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    resume = data.get('resume', '').strip()
    jd     = data.get('job_description', '').strip()
    if not resume or len(resume) < 10:
        return jsonify({"error": "Please paste your resume or list your skills."}), 400
    skills = extract_skills(resume)
    if not skills:
        return jsonify({"error": "No technical skills found. Try listing: Python, SQL, HTML, React..."}), 400
    jd_skills = extract_skills(jd) if jd else []
    roles = match_roles(skills, jd_skills)[:5]
    all_missing, seen = [], set()
    for role in roles[:3]:
        for s in role['missing_skills']:
            if s not in seen: all_missing.append(s); seen.add(s)
    return jsonify({
        "extracted_skills": skills, "skill_count": len(skills),
        "jd_skills": jd_skills,
        "top_roles": roles, "best_match": roles[0] if roles else None,
        "learning_resources": get_resources(all_missing),
        "nlp_engine": "spaCy" if SPACY_AVAILABLE else "Regex",
        "active_model": OLLAMA_MODEL
    })

@app.route('/ai-advice', methods=['POST'])
def ai_advice():
    data = request.get_json()
    custom_prompt = data.get('custom_prompt', '').strip()
    if not custom_prompt:
        skills  = data.get('skills', [])
        role    = data.get('role', 'software developer')
        score   = data.get('match_score', 0)
        missing = data.get('missing', [])
        jd      = data.get('job_description', '')
        custom_prompt = f"""You are a friendly expert career advisor.
Student skills: {', '.join(skills)}.
Best matching role: {role} ({score}% match).
Missing skills: {', '.join(missing[:5]) or 'none'}.
{f'Job description context: {jd[:300]}' if jd else ''}
Give specific, warm, actionable career advice in under 200 words.
Include: 1) Career summary 2) Top 3 skills to learn 3) One job to apply for now 4) This week's action."""
    return Response(stream_with_context(stream_ollama(custom_prompt)),
        mimetype='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})

@app.route('/ollama-status')
def ollama_status():
    return jsonify(check_ollama())

if __name__ == '__main__':
    s = check_ollama()
    print(f"\n{'='*48}")
    print(f"  SkillMap AI  |  {s['active_model']}")
    print(f"{'='*48}")
    print(f"  NLP    : {'spaCy' if SPACY_AVAILABLE else 'Regex'}")
    print(f"  Ollama : {'✅ Running' if s['running'] else '❌ run: ollama serve'}")
    if s['running']:
        print(f"  Model  : {'✅ ' + s['active_model'] if s['model_available'] else '❌ run: ollama pull ' + OLLAMA_MODEL}")
    print(f"  URL    : http://localhost:5000\n")
    app.run(debug=True, port=5000)
