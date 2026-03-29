#!/bin/bash
echo "====================================="
echo "  SkillMap — AI Skill Gap Analyzer"
echo "====================================="
echo ""
echo "Installing dependencies..."
pip install flask --quiet --break-system-packages
echo ""
echo "Starting server at http://localhost:5000"
echo "Press Ctrl+C to stop"
echo ""
python app.py
