# SkillMap — AI Skill Gap Analyzer

## Quick Start

```bash
cd skill-gap-analyzer
pip install flask
python app.py
```

Then open http://localhost:5000

## Project Structure

```
skill-gap-analyzer/
├── app.py                  # Flask backend + NLP pipeline
├── requirements.txt        # Dependencies (just Flask)
├── run.sh                  # One-click startup script
├── data/
│   └── job_roles.json      # Job roles + skill requirements + resources
└── templates/
    └── index.html          # Full frontend (single file)
```

## How the NLP Pipeline Works

1. **Text Cleaning** — lowercase, remove punctuation, normalize whitespace
2. **Skill Extraction** — regex keyword matching against 60+ skill keywords
3. **Role Matching** — weighted scoring (core skills 60%, overall 40%)
4. **Gap Detection** — set difference between user skills and required skills
5. **Resource Mapping** — links missing skills to learning platforms

## Extending the Project

### Add more job roles
Edit `data/job_roles.json` — add entries to the `job_roles` array.

### Add more skills
Edit the `SKILL_KEYWORDS` list in `app.py`.

### Upgrade NLP (optional)
Install spaCy and replace the regex matcher with:
```python
import spacy
nlp = spacy.load("en_core_web_sm")
```

### Add TF-IDF scoring (optional)
```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
```

## Example Input/Output

**Input:** `"I know Python and HTML"`

**Output:**
- Extracted skills: `python`, `html`
- Best match: `Web Developer` (25% match)
- Missing: `css`, `javascript`, `react`, `git`
- Resources: Links to MDN, freeCodeCamp, React Docs
