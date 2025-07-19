import os
import json
import uuid
from datetime import datetime
from functools import wraps
import requests
from urllib.parse import urlparse
import time
import re
from google.oauth2.service_account import Credentials  


# LLM related imports
from groq import RateLimitError
from typing import Optional, List
from pydantic import BaseModel, Field, ValidationError
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
import fitz  # PyMuPDF
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, g,flash
from flask import get_flashed_messages

# Google Sheets imports
import gspread

# Load environment variables (e.g., GROQ_API_KEY)
load_dotenv()
os.environ['GROQ_API_KEY'] = os.getenv('GROQ_API_KEY')

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'a_very_secret_key_for_dev') # Use a strong, random key in production

# Define a file for persistent storage (for development/debugging)
DATA_FILE = 'jobs_data.json'

# --- Google Sheets API setup for a SINGLE MASTER SHEET ---
# Path to your service account key file
# Make sure 'credentials.json' is in the root directory of your Flask app
GOOGLE_SHEETS_CREDENTIALS_PATH = 'credentials.json'
contact_form_worksheet = None
# Define the scope for Google Sheets API
GOOGLE_SHEETS_SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive" # Needed for creating new sheets/files, and sometimes for opening
]

# --- IMPORTANT: REPLACE WITH YOUR MASTER GOOGLE SHEET ID ---
# This is the ID of the ONE Google Sheet that will contain both your "Jobs" and "Candidates" tabs.
MASTER_SPREADSHEET_ID = os.getenv("MASTER_SPREADSHEET_ID") # <<< REPLACE THIS PLACEHOLDER

# Define the names of the worksheets (tabs) within your master spreadsheet
JOBS_WORKSHEET_NAME = 'Jobs'
CANDIDATES_WORKSHEET_NAME = 'Candidates'

# Global variables to hold the authenticated gspread client and worksheet objects
gs_client = None
jobs_worksheet = None
candidates_worksheet = None

# def initialize_google_sheets():
#     """
#     Authenticates gspread client and gets references to the Jobs and Candidates worksheets.
#     Also ensures headers are set in these sheets.
#     """
#     global gs_client, jobs_worksheet, candidates_worksheet

#     try:
#         gs_client = gspread.service_account(filename=GOOGLE_SHEETS_CREDENTIALS_PATH, scopes=GOOGLE_SHEETS_SCOPE)
#         print("DEBUG: Google Sheets client authenticated successfully.")

#         master_spreadsheet = gs_client.open_by_key(MASTER_SPREADSHEET_ID)
#         print(f"DEBUG: Opened master spreadsheet: '{master_spreadsheet.title}'")

#         # Get or create Jobs worksheet and set headers
#         try:
#             jobs_worksheet = master_spreadsheet.worksheet(JOBS_WORKSHEET_NAME)
#             print(f"DEBUG: Connected to '{JOBS_WORKSHEET_NAME}' worksheet.")
#         except gspread.exceptions.WorksheetNotFound:
#             jobs_worksheet = master_spreadsheet.add_worksheet(title=JOBS_WORKSHEET_NAME, rows="100", cols="20")
#             print(f"DEBUG: Created new '{JOBS_WORKSHEET_NAME}' worksheet.")
        
#         jobs_headers = ["Job ID", "Company Name", "Job Title", "Job Description", "Date Posted"]
#         if not jobs_worksheet.row_values(1): # Check if first row is empty
#             jobs_worksheet.update([jobs_headers])
#             print(f"DEBUG: Headers set in '{JOBS_WORKSHEET_NAME}' worksheet.")

#         # Get or create Candidates worksheet and set headers
#         try:
#             candidates_worksheet = master_spreadsheet.worksheet(CANDIDATES_WORKSHEET_NAME)
#             print(f"DEBUG: Connected to '{CANDIDATES_WORKSHEET_NAME}' worksheet.")
#         except gspread.exceptions.WorksheetNotFound:
#             candidates_worksheet = master_spreadsheet.add_worksheet(title=CANDIDATES_WORKSHEET_NAME, rows="100", cols="20")
#             print(f"DEBUG: Created new '{CANDIDATES_WORKSHEET_NAME}' worksheet.")
        
#         # MODIFIED: Added "Company Name" to candidates_headers
#         candidates_headers = [
#             "Application ID", "Job ID", "Company Name", "Candidate Name", "Email", "Phone", "Submission Date",
#             "Eligibility Status", "Match Score", "Evaluation Reason", "Exam Taken",
#             "Exam Score", "Skills Summary", "Education Summary", "Experience Summary",
#             "Projects Summary"
#         ]
#         if not candidates_worksheet.row_values(1): # Check if first row is empty
#             candidates_worksheet.update([candidates_headers])
#             print(f"DEBUG: Headers set in '{CANDIDATES_WORKSHEET_NAME}' worksheet.")

#         print("DEBUG: Google Sheets initialization complete.")
#         return True
#     except FileNotFoundError:
#         print(f"CRITICAL ERROR: Google Sheets credentials file not found at {GOOGLE_SHEETS_CREDENTIALS_PATH}. Please ensure it exists.")
#         return False
#     except gspread.exceptions.APIError as e:
#         print(f"CRITICAL ERROR: Google Sheets API error during initialization: {e}. Check API quotas or permissions for '{MASTER_SPREADSHEET_ID}'.")
#         return False
#     except Exception as e:
#         print(f"CRITICAL ERROR: Unexpected error during Google Sheets initialization: {e}")
#         return False

# Modified code of 15 july
GOOGLE_CREDENTIALS_ENV ="GOOGLE_CREDENTIALS_JSON"

def initialize_google_sheets():
    """
    Authenticates gspread client using credentials from env,
    and gets references to the Jobs and Candidates worksheets.
    """
    global gs_client, jobs_worksheet, candidates_worksheet
    
    global contact_form_worksheet

    try:
        # Load credentials from env var
        raw_json = os.getenv(GOOGLE_CREDENTIALS_ENV)
        if not raw_json:
            raise ValueError("GOOGLE_CREDENTIALS_JSON not found in environment.")

        creds_dict = json.loads(raw_json)

        # ✅ Replace literal \\n with real \n in private_key
        if "private_key" in creds_dict:
            creds_dict["private_key"] = creds_dict["private_key"].replace("\\n", "\n")

        # Authenticate with gspread
        credentials = Credentials.from_service_account_info(creds_dict, scopes=GOOGLE_SHEETS_SCOPE)
        gs_client = gspread.authorize(credentials)
        print("✅ Google Sheets client authenticated successfully.")

        # Open master spreadsheet
        master_spreadsheet = gs_client.open_by_key(MASTER_SPREADSHEET_ID)
        print(f"📄 Opened spreadsheet: '{master_spreadsheet.title}'")
        try:
            contact_worksheet = master_spreadsheet.worksheet("Contact Submissions")
            print("✅ Connected to 'Contact Submissions' worksheet.")
        except gspread.exceptions.WorksheetNotFound:
            contact_worksheet = master_spreadsheet.add_worksheet(title="Contact Submissions", rows="100", cols="10")
            print("✅ Created 'Contact Submissions' worksheet.")

        contact_headers = ["Name", "Email", "Message", "Submitted At"]
        if not contact_worksheet.row_values(1):
            contact_worksheet.update([contact_headers])
            print("✅ Headers set in 'Contact Submissions' worksheet.")

        contact_form_worksheet = contact_worksheet
        # --- JOBS SHEET ---
        try:
            jobs_worksheet = master_spreadsheet.worksheet(JOBS_WORKSHEET_NAME)
            print(f"📌 Connected to '{JOBS_WORKSHEET_NAME}' worksheet.")
        except gspread.exceptions.WorksheetNotFound:
            jobs_worksheet = master_spreadsheet.add_worksheet(title=JOBS_WORKSHEET_NAME, rows="100", cols="20")
            print(f"📄 Created '{JOBS_WORKSHEET_NAME}' worksheet.")

        jobs_headers = ["Job ID", "Company Name", "Job Title", "Job Description", "Date Posted"]
        if not jobs_worksheet.row_values(1):
            jobs_worksheet.update([jobs_headers])
            print(f"📝 Headers set in '{JOBS_WORKSHEET_NAME}'.")

        # --- CANDIDATES SHEET ---
        try:
            candidates_worksheet = master_spreadsheet.worksheet(CANDIDATES_WORKSHEET_NAME)
            print(f"📌 Connected to '{CANDIDATES_WORKSHEET_NAME}' worksheet.")
        except gspread.exceptions.WorksheetNotFound:
            candidates_worksheet = master_spreadsheet.add_worksheet(title=CANDIDATES_WORKSHEET_NAME, rows="1000", cols="20")
            print(f"📄 Created '{CANDIDATES_WORKSHEET_NAME}' worksheet.")
        try:
            contact_worksheet = master_spreadsheet.worksheet("Contact Submissions")
            print("✅ Connected to 'Contact Submissions' worksheet.")
        except gspread.exceptions.WorksheetNotFound:
            contact_worksheet = master_spreadsheet.add_worksheet(title="Contact Submissions", rows="1000", cols="10")
            print("✅ Created 'Contact Submissions' worksheet.")
        candidates_headers = [
            "Application ID", "Job ID", "Company Name", "Candidate Name", "Email", "Phone", "Submission Date",
            "Eligibility Status", "Match Score", "Evaluation Reason", "Exam Taken",
            "Exam Score", "Skills Summary", "Education Summary", "Experience Summary",
            "Projects Summary"
        ]
        if not candidates_worksheet.row_values(1):
            candidates_worksheet.update([candidates_headers])
            print(f"📝 Headers set in '{CANDIDATES_WORKSHEET_NAME}'.")

        print("✅ Google Sheets initialization complete.")
        return True

    except json.JSONDecodeError:
        print("❌ Failed to decode GOOGLE_CREDENTIALS_JSON.")
        return False
    except gspread.exceptions.APIError as e:
        print(f"❌ Google Sheets API error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error during Google Sheets initialization: {e}")
        return False

#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@

def add_job_to_master_sheet(job_data: dict) -> bool:
    """Appends job data to the 'Jobs' worksheet in the master Google Sheet."""
    if jobs_worksheet is None:
        print("WARNING: Jobs worksheet not initialized. Cannot add job to sheet.")
        return False
    try:
        row_data = [
            job_data['id'], # Assuming job_data will contain 'id'
            job_data['company_name'],
            job_data['job_title'],
            job_data['job_description'],
            job_data['date_posted'] # Assuming job_data will contain 'date_posted'
        ]
        jobs_worksheet.append_row(row_data)
        print(f"DEBUG: Job '{job_data['job_title']}' added to '{JOBS_WORKSHEET_NAME}' worksheet.")
        return True
    except gspread.exceptions.APIError as e:
        print(f"ERROR: Google Sheets API error adding job: {e}. Check API quotas or permissions.")
        return False
    except Exception as e:
        print(f"ERROR: Unexpected error adding job to Google Sheet: {e}")
        return False

def upload_candidate_to_master_sheet(application_id: str, candidate_data: dict, job_id: str) -> bool:
    """
    Uploads candidate information as a new row to the 'Candidates' worksheet
    in the master Google Sheet.
    """
    if candidates_worksheet is None:
        print("WARNING: Candidates worksheet not initialized. Cannot upload candidate to sheet.")
        return False
    try:
        # Retrieve company name from the global jobs dictionary
        company_name = jobs.get(job_id, {}).get('company_name', 'N/A')

        # Flatten complex fields into string summaries
        skills_summary = ", ".join(candidate_data['extracted_info'].get('skills', []))
        education_summary = "; ".join([
            f"{edu.get('degree', 'N/A')}"
            + (f", {edu.get('concentration')}" if edu.get('concentration') else "")
            + f" at {edu.get('university', 'N/A')} ({edu.get('start_year', 'N/A')} - {edu.get('end_year', 'N/A')})"
            for edu in candidate_data['extracted_info'].get('education', [])
        ])
        experience_summary = "; ".join([
            f"{exp.get('title', 'N/A')} at {exp.get('location', 'N/A')} ({exp.get('duration', 'N/A')})"
            for exp in candidate_data['extracted_info'].get('experience', [])
        ])
        projects_summary = "; ".join([
            f"{proj.get('title', 'N/A')}"
            + (f" ({proj.get('link')})" if proj.get('link') else "")
            for proj in candidate_data['extracted_info'].get('projects', [])
        ])

        # MODIFIED: Added company_name to row_data
        row_data = [
            application_id, # Use the passed application_id directly
            job_id, # Link to the job
            company_name, # The company name for the applied job
            candidate_data['extracted_info'].get('name', 'N/A'),
            candidate_data['extracted_info'].get('email', 'N/A'),
            candidate_data['extracted_info'].get('phone', 'N/A'),
            candidate_data['submission_date'],
            candidate_data['eligibility_status'],
            candidate_data['match_score'],
            candidate_data['eligibility_reason'],
            "Yes" if candidate_data['exam_taken'] else "No",
            candidate_data['exam_score'] if candidate_data['exam_taken'] else "N/A",
            skills_summary,
            education_summary,
            experience_summary,
            projects_summary
        ]

        candidates_worksheet.append_row(row_data)
        print(f"DEBUG: Candidate {application_id} uploaded to '{CANDIDATES_WORKSHEET_NAME}' worksheet.")
        return True
    except gspread.exceptions.APIError as e:
        print(f"ERROR: Google Sheets API error uploading candidate: {e}. Check API quotas or permissions.")
        return False
    except Exception as e:
        print(f"ERROR: Unexpected error uploading candidate to Google Sheet: {e}")
        return False


def jinja2_enumerate(iterable):
    """Jinja2 filter to allow enumeration in templates."""
    return enumerate(iterable)

app.jinja_env.filters['enumerate'] = jinja2_enumerate

# Global dictionary to store jobs and candidates
jobs = {}

def load_jobs():
    """Loads job and candidate data from a JSON file."""
    global jobs
    if os.path.exists(DATA_FILE):
        print(f"DEBUG: {DATA_FILE} exists: {os.path.exists(DATA_FILE)}")
        try:
            with open(DATA_FILE, 'r') as f:
                jobs = json.load(f)
            print(f"Loaded {len(jobs)} jobs from {DATA_FILE}")
            print(f"DEBUG: Jobs after loading: {jobs.keys()}") # Print keys for brevity
        except json.JSONDecodeError as e:
            print(f"ERROR: Error decoding JSON from {DATA_FILE}: {e}. Starting with empty data.")
            jobs = {}
        except Exception as e:
            print(f"ERROR: Unexpected error loading {DATA_FILE}: {e}. Starting with empty data.")
            jobs = {}
    else:
        print(f"DEBUG: {DATA_FILE} not found at {os.getcwd()}. Starting with empty data.")
        jobs = {}

def save_jobs():
    """Saves current job and candidate data to a JSON file."""
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(jobs, f, indent=4)
        print(f"Saved {len(jobs)} jobs to {DATA_FILE}")
    except Exception as e:
        print(f"ERROR: Failed to save jobs to {DATA_FILE}: {e}")

# Load data and initialize Google Sheets when the application starts
with app.app_context():
    load_jobs()
    initialize_google_sheets() # Initialize Google Sheets connection

# --- Authentication Decorators ---

@app.before_request
def load_logged_in_user():
    """Loads user information from session into g.user before each request."""
    user_id = session.get('user_id')
    if user_id is None:
        g.user = None
    else:
        # In a real app, you'd fetch user details from a database
        g.user = {
            'uid': user_id,
            'email': session.get('user_email', f"{user_id}@example.com"),
            'is_hr': session.get('is_hr', False)
        }
    print(f"DEBUG: Before request - g.user: {g.user}")


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is None:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def hr_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if g.user is None:
            return redirect(url_for('login'))
        if not g.user.get('is_hr'):
            print(f"ACCESS DENIED: User {g.user.get('uid')} is not HR.")
            return "Access Denied: HR privileges required.", 403
        return f(*args, **kwargs)
    return decorated_function

# --- Resume and Project Processing Functions (LLM Integrations) ---
def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts text content and hyperlinks from a PDF file using PyMuPDF (fitz).
    Hyperlinks are appended to the text in a parseable format for the LLM.
    """
    try:
        doc = fitz.open(file_path)
        text_content = []
        for page in doc:
            text_content.append(page.get_text())
            links = page.get_links()
            for link in links:
                if link['kind'] == fitz.LINK_URI:
                    text_content.append(f"\n[HYPERLINK_DETECTED: {link['uri']}]")
        doc.close()
        return "\n".join(text_content)
    except Exception as e:
        print(f"Error extracting text or links from PDF: {e}")
        return ""

# Pydantic models for structured data extraction
class Education(BaseModel):
    degree: Optional[str] = Field(None, description="The academic degree obtained")
    university: Optional[str] = Field(None, description="The name of the university")
    start_year: Optional[str] = Field(None, description="Start year of education")
    end_year: Optional[str] = Field(None, description="End year of education")
    concentration: Optional[str] = Field(None, description="Concentration or major within the degree")
    cumulative_gpa: Optional[str] = Field(None, description="Cumulative GPA")
    relevant_coursework: Optional[List[str]] = Field(None, description="List of relevant courses taken")

class ExperienceItem(BaseModel):
    title: Optional[str] = Field(None, description="Job title or role")
    duration: Optional[str] = Field(None, description="Time period of the experience")
    location: Optional[str] = Field(None, description="Job location")
    description: Optional[List[str]] = Field(None, description="List of responsibilities or achievements")

class ProjectItem(BaseModel):
    title: Optional[str] = Field(None, description="Project title")
    link: Optional[str] = Field(None, description="Full and exact URL to the project (e.g., GitHub repository, live demo link, including http:// or https://)")
    description: Optional[List[str]] = Field(None, description="Bullet points describing the project")

class Membership(BaseModel):
    name: Optional[str] = Field(None, description="Name of the organization or membership")
    location: Optional[str] = Field(None, description="Location of the organization")
    duration: Optional[str] = Field(None, description="Duration of the membership")

class CampusInvolvement(BaseModel):
    name: Optional[str] = Field(None, description="Name of the campus involvement or role")
    location: Optional[str] = Field(None, description="Location of the campus involvement")
    duration: Optional[str] = Field(None, description="Duration of the involvement")
    description: Optional[List[str]] = Field(None, description="Description of responsibilities or achievements")

class ResumeInfo(BaseModel):
    """Structured information from a candidate resume."""
    name: Optional[str] = Field(None, description="Full name of the candidate")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    education: Optional[List[Education]] = Field(None, description="List of education entries")
    skills: Optional[List[str]] = Field(None, description="List of skills")
    experience: Optional[List[ExperienceItem]] = Field(None, description="List of work experience entries")
    projects: Optional[List[ProjectItem]] = Field(None, description="List of projects undertaken")
    certificates: Optional[List[str]] = Field(None, description="List of certifications")
    achievments: Optional[List[str]] = Field(None, description="List of achievements")
    memberships: Optional[List[Membership]] = Field(None, description="List of professional memberships")
    campus_involvement: Optional[List[CampusInvolvement]] = Field(None, description="List of campus involvement activities")

class ProjectInsights(BaseModel):
    purpose: Optional[str] = Field(None, description="The main purpose or goal of the project.")
    key_features: Optional[List[str]] = Field(None, description="List of key features or functionalities.")
    technologies_used: Optional[List[str]] = Field(None, description="List of technologies, languages, frameworks used.")
    target_users: Optional[str] = Field(None, description="Who the intended users are.")
    project_challenges: Optional[List[str]] = Field(None, description="List of major technical or non-technical challenges.")
    business_value: Optional[str] = Field(None, description="Explanation of how this project provides value.")
    future_scope: Optional[List[str]] = Field(None, description="List of improvements or features planned for future versions.")
    design_considerations: Optional[List[str]] = Field(None, description="List of design principles, patterns, or architectural decisions.")
    interview_questions: Optional[List[str]] = Field(None, description="List of potential interview questions.")

class ExamQuestion(BaseModel):
    id: str = Field(..., description="Unique ID for the question")
    question: str = Field(..., description="The exam question text")
    ideal_answer: Optional[str] = Field(None, description="A short, ideal answer to the question")

class Exam(BaseModel):
    questions: List[ExamQuestion] = Field(..., description="List of exam questions")

# LLM Chain Setup
llm = ChatGroq(model="llama3-8b-8192", temperature=0)
parser = StrOutputParser()

# Resume Extraction Chain
resume_extraction_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are a professional resume parser. Extract and align the following fields from the resume text into a JSON object:\n\n"
     "name (string), email (string), phone (string), "
     "education (list of objects with degree (string), university (string), start_year (string), end_year (string), concentration (string), cumulative_gpa (string), relevant_coursework (list of strings)), "
     "skills (list of strings), "
     "experience (list of objects with title (string), duration (string), location (string), and description (list of strings)), "
     "projects (list of objects with title (string), description (list of strings), and link (string - the full and exact URL to the project. Prioritize URLs found within `[HYPERLINK_DETECTED: URL]` markers if present, ensuring the link starts with http:// or https://)), "
     "certificates (list of strings), achievements (list of strings), "
     "memberships (list of objects with name (string), location (string), duration (string)), "
     "campus_involvement (list of objects with name (string), location (string), duration (string), and description (list of strings)).\n\n"
     "If a field is not found, use `null` for single values or an empty array `[]` for lists. "
     "Ensure all fields from the schema are present and strictly adhere to the specified structure. Do NOT include any extra fields not listed here. Do NOT explain anything.\n"
     "You must always return valid JSON fenced by a markdown code block. Do not return any additional text."),
    ("human", "{text}")
])
extraction_chain = resume_extraction_prompt | llm | parser

def extract_resume_info_llm(text: str, save_path: str = "extracted_resume.json") -> dict:
    """Extracts structured resume information using the LLM chain."""
    max_retries = 3
    initial_retry_delay = 5
    for attempt in range(max_retries):
        try:
            raw_json_str = extraction_chain.invoke({"text": text})
            cleaned_json_str = re.sub(r'^```(?:json)?\n|```$', '', raw_json_str.strip(), flags=re.MULTILINE)
            parsed_dict = json.loads(cleaned_json_str)
            validated_info = ResumeInfo(**parsed_dict)
            extracted_data = validated_info.model_dump(exclude_none=True)
            print("\n")
            print("This is extracted data")
            print(extracted_data)
            with open(save_path, 'w', encoding='utf-8') as f:
                json.dump(extracted_data, f, indent=4, ensure_ascii=False)
            return extracted_data
        except RateLimitError as e:
            print(f"Rate limit hit during resume extraction (attempt {attempt + 1}/{max_retries}): {e}")
            sleep_time = initial_retry_delay * (2 ** attempt)
            match = re.search(r'Please try again in (\d+\.?\d*)s', str(e))
            if match:
                try: sleep_time = max(sleep_time, float(match.group(1)))
                except ValueError: pass
            if attempt < max_retries - 1: time.sleep(sleep_time)
            else: return {"error": "Failed to extract resume info due to persistent rate limits."}
        except (json.JSONDecodeError, ValidationError, Exception) as e:
            print(f"Error during resume info extraction: {e}, Raw: {raw_json_str}")
            return {"error": f"Failed to parse or validate resume info: {e}"}

# Candidate Evaluation Chain
MATCH_THRESHOLD = 75
evaluation_llm = ChatGroq(model="llama3-8b-8192", temperature=0)
matching_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "**Role:** You are an expert AI recruitment evaluator with deep insight into hiring decisions. Your task is to intelligently score how well a candidate fits a job, based on structured resume data (JSON) and a detailed job description.\n\n"
     "**Instructions:** Return only an integer score between 0 and 100. Do NOT include any words, labels, or formatting — only the numeric score.\n\n"
     "**Important Validation Rule (Non-Match Handling):**\n"
     "- If the candidate resume is **malformed**, or **does not contain relevant information for evaluation** (e.g.fake/unrelated content, or obviously non-resume text), return **0 immediately**.\n"
     "- Also return **0 immediately** if the content is **irrelevant**, **nonsensical**, or clearly **not a resume**.\n"
     "- Do **not** proceed with the score breakdown in such cases.\n\n"
     "**Evaluation Criteria:**\n\n"
     "🔹 **1. Skills Match (35 points):**\n"
     "- Compare candidate skills with required and preferred skills.\n"
     "- Give full credit for strong overlaps, especially in technical/domain-critical areas.\n"
     "- Related or adjacent skills should be weighed fairly.\n"
     "- Missing key skills = deduction, but balance it if other strengths compensate.\n\n"
     "🔹 **2. Experience Match (25 points):**\n"
     "- Compare the candidate’s work history to job responsibilities and expectations.\n"
     "- Compare the candidate’s total years of experience (precomputed and included in the resume JSON) with the required years stated in the job description.\n"
    "- If the candidate falls short in required years, deduct points **seriously** — the closer to the gap, the heavier the penalty.\n"
    "- Evaluate job titles, domain, and impact to ensure experience is relevant.\n"
    "- Extra years beyond required may slightly boost the score only if they show clear value.\n"
    "- Do not ignore year mismatch even if titles or domains align.\n"
     "- Evaluate job titles, domain, impact, and **whether the total experience meets the required years**.\n"
     "- Account for meaningful experience, even if not from identical roles.\n\n"
     "- **Strictly compare total years of experience against the job's required experience. If the candidate falls short, deduct points significantly.**\n"
     "- Do not overlook shortfalls in required experience, even if titles or domains are relevant.\n"
     "- Extra years beyond required can be rewarded only if clearly beneficial.\n\n"
     "🔹 **3. Education Match (10 points):**\n"
     "-- Check if the candidate has clearly mentioned academic qualifications that meet or exceed the job’s required degree (e.g., B.Tech, M.Sc, etc.).\n"
     "- Do not penalize for overqualification unless stated.\n\n"
     "- Check if the candidate meets or exceeds the required academic qualifications.\n"
     "- Prefer complete records with both start and end years. Incomplete or ambiguous timelines should reduce the score.\n"
     "- Give partial credit for closely related degrees or for diploma programs, if they match the job domain.\n"
     "🔹 **4. Project Relevance (20 points):**\n"
     "- Evaluate the candidate’s listed projects based on relevance, problem-solving, depth, and complexity.\n"
     "- Pay attention to insights and impact if available.\n"
     "- Give higher marks for real-world application aligned with job needs.\n\n"
     "🔹 **5. Bonus Fit (10 points):**\n"
     "- Include certifications, achievements, soft skills, or values that match company culture.\n"
     "- Reward strong alignment, but don’t force points if it's not there.\n\n"
     "**Scoring Philosophy:**\n"
     "- Think like a seasoned recruiter — practical, fair, and perceptive.\n"
     "- Evaluate holistically. Compensate minor gaps with standout strengths.\n"
     "- Do not reward fluff. Real alignment matters more than keywords.\n"
     "- Do not infer hidden strengths. Use only explicit information.\n"
     "- A score of 50+ is passable. 65+ is a strong match. 75+ is exceptional. 85+ is rare and outstanding.\n"
     "- Do NOT return explanations. Return only a clean integer score between 0–100."),
    ("human", 
     "**Candidate Resume (structured JSON):**\n{resume}\n\n"
     "**Job Description:**\n{job_desc}\n\n"
     "📊 Score this candidate based on the criteria above. Return only the numeric score.")
])


evaluation_chain = matching_prompt | evaluation_llm | parser

def parse_score(raw: str) -> int:
    """Parses a raw string to extract an integer score."""
    try:
        match = re.search(r'\d+', raw.strip())
        if match: return int(match.group(0))
        return 0
    except ValueError: return 0

def evaluate_candidate_llm(resume_json: dict, job_description: str) -> dict:
    """Evaluates candidate eligibility using the LLM chain."""
    max_retries = 3
    initial_retry_delay = 5
    for attempt in range(max_retries):
        try:
            result_raw = evaluation_chain.invoke({"resume": json.dumps(resume_json, indent=2), "job_desc": job_description})
            score = parse_score(result_raw)
            decision = "Eligible" if score >= MATCH_THRESHOLD else "Not Eligible"
            return {"score": score, "decision": decision, "reason": f"Match score: {score}% (Threshold: {MATCH_THRESHOLD}%)"}
        except RateLimitError as e:
            print(f"Rate limit hit during evaluation (attempt {attempt + 1}/{max_retries}): {e}")
            sleep_time = initial_retry_delay * (2 ** attempt)
            match = re.search(r'Please try again in (\d+\.?\d*)s', str(e))
            if match:
                try: sleep_time = max(sleep_time, float(match.group(1)))
                except ValueError: pass
            if attempt < max_retries - 1: time.sleep(sleep_time)
            else: return {"score": 0, "decision": "Not Eligible", "reason": "Rate limit consistently hit."}
        except Exception as e:
            print(f"An unexpected error occurred during evaluation: {e}")
            return {"score": 0, "decision": "Not Eligible", "reason": f"Error during evaluation: {str(e)}"}

detailed_feedback_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are an experienced AI recruitment assistant.\n\n"
     "Your task is to provide **concise, constructive, and professional feedback** to a candidate who was **not selected** for a job, based on their structured resume (JSON), the job description, and their evaluation score.\n\n"
     "**Guidelines:**\n"
     "1. **Explain clearly** the main reasons the candidate was not selected.\n"
     "   - Focus on specific gaps in required **skills**, **experience**, **education**, or **project relevance**.\n"
     "   - Avoid generic or vague statements.\n"
     "   - If the candidate’s total experience does not meet the job's required years, mention it politely.\n\n"
     "2. **Suggest 2–3 actionable improvements**:\n"
     "   - Recommend technologies or skills they should learn.\n"
     "   - Suggest ways to build relevant experience (e.g., projects, certifications).\n"
     "   - Tailor advice to the type of roles they're targeting.\n\n"
     "**Formatting:**\n"
     "- Write a short, readable paragraph (3–5 sentences).\n"
     "- Maintain a **respectful and supportive tone** — this is to help the candidate improve.\n"
     "- **Do NOT** mention or include the numeric score.\n\n"
     "**Example Output:**\n"
     "'The candidate shows potential but lacks direct experience in cloud infrastructure, which was a core requirement for the role. Their project work is relevant but doesn’t demonstrate depth in DevOps tools or large-scale deployments. To strengthen their profile, they should consider contributing to open-source cloud projects, gaining certification in AWS or Azure, and highlighting measurable outcomes in future roles.'"),
    
    ("human", 
     "Candidate Resume (JSON):\n{resume}\n\n"
     "Job Description:\n{job_desc}\n\n"
     "Candidate Score: {score}\n\n"
     "Please provide a brief but informative reason for non-selection, and suggest 2–3 specific improvements:")
])

feedback_llm = ChatGroq(model="llama3-8b-8192", temperature=0.7)
feedback_chain = detailed_feedback_prompt | feedback_llm | parser

def generate_detailed_feedback(resume_json: dict, job_description: str, score: int) -> str:
    """Generates detailed feedback for non-eligible candidates."""
    max_retries = 3
    initial_retry_delay = 5
    for attempt in range(max_retries):
        try: return feedback_chain.invoke({"resume": json.dumps(resume_json, indent=2), "job_desc": job_description, "score": score})
        except RateLimitError as e:
            print(f"Rate limit hit during feedback generation (attempt {attempt + 1}/{max_retries}): {e}")
            sleep_time = initial_retry_delay * (2 ** attempt)
            match = re.search(r'Please try again in (\d+\.?\d*)s', str(e))
            if match:
                try: sleep_time = max(sleep_time, float(match.group(1)))
                except ValueError: pass
            if attempt < max_retries - 1: time.sleep(sleep_time)
            else: return "Could not generate detailed feedback due to persistent rate limits."
        except Exception as e: return f"Could not generate detailed feedback due to an internal error: {str(e)}"

selection_reason_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are a professional recruitment assistant. Given a candidate's resume (JSON), a job description, and their matching score, "
     "provide a concise explanation of why they were selected for the role. "
     "Highlight their key strengths, relevant skills, experience, and projects that align well with the job requirements. "
     "Focus on 2-3 strongest points. Do not include the score in your explanation. "
     "Format your response as a clear, readable paragraph. "
     "Example: 'The candidate was selected due to their strong background in [area X], extensive experience with [technology Y], and a relevant project showcasing [skill Z].'"),
    ("human", "Candidate Resume:\n{resume}\n\nJob Description:\n{job_desc}\n\nCandidate Score: {score}\n\nReason for selection:")
])
selection_reason_llm = ChatGroq(model="llama3-8b-8192", temperature=0.2)
selection_reason_chain = selection_reason_prompt | selection_reason_llm | parser

def generate_selection_reason(resume_json: dict, job_description: str, score: int) -> str:
    """Generates a detailed reason for selecting an eligible candidate."""
    max_retries = 3
    initial_retry_delay = 5
    for attempt in range(max_retries):
        try: return selection_reason_chain.invoke({"resume": json.dumps(resume_json, indent=2), "job_desc": job_description, "score": score})
        except RateLimitError as e:
            print(f"Rate limit hit during selection reason generation (attempt {attempt + 1}/{max_retries}): {e}")
            sleep_time = initial_retry_delay * (2 ** attempt)
            match = re.search(r'Please try again in (\d+\.?\d*)s', str(e))
            if match:
                try: sleep_time = max(sleep_time, float(match.group(1)))
                except ValueError: pass
            if attempt < max_retries - 1: time.sleep(sleep_time)
            else: return "Could not generate detailed selection reason due to API rate limits."
        except Exception as e: return f"Could not generate detailed selection reason due to an internal error: {str(e)}"

# Exam Generation Chain
exam_generation_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are an exam generator. Create a 3-question technical exam based on the provided job description. "
     "Each question should test relevant skills and knowledge for the role. "
     "For each question, also provide a concise, ideal short answer (1-2 sentences). "
     "Output a JSON object with a single key 'questions', which is an array of question objects. "
     "Each question object must have an 'id' (a unique string), a 'question' (string), AND an 'ideal_answer' (string). "
     "Do NOT include any other text or formatting outside the JSON markdown block. "
     "Ensure no trailing commas in arrays or objects."),
    ("human", "Job Description:\n{job_desc}\n\nGenerate exam questions.")
])
exam_llm = ChatGroq(model="llama3-8b-8192", temperature=0.5)
exam_generation_chain = exam_generation_prompt | exam_llm | parser

def generate_exam_llm(job_description: str) -> Optional[List[dict]]:
    """Generates exam questions (and ideal answers) using the LLM chain."""
    max_retries = 3
    initial_retry_delay = 5
    for attempt in range(max_retries):
        try:
            raw_json_str = exam_generation_chain.invoke({"job_desc": job_description})
            json_content = re.sub(r'^```(?:json)?\s*\n|\s*```$', '', raw_json_str.strip(), flags=re.MULTILINE).strip()
            parsed_dict = json.loads(json_content)
            validated_exam = Exam(**parsed_dict)
            return [q.model_dump() for q in validated_exam.questions]
        except RateLimitError as e:
            print(f"Rate limit hit during exam generation (attempt {attempt + 1}/{max_retries}): {e}")
            sleep_time = initial_retry_delay * (2 ** attempt)
            match = re.search(r'Please try again in (\d+\.?\d*)s', str(e))
            if match:
                try: sleep_time = max(sleep_time, float(match.group(1)))
                except ValueError: pass
            if attempt < max_retries - 1: time.sleep(sleep_time)
            else: return None
        except (json.JSONDecodeError, ValidationError, Exception) as e:
            print(f"Error generating exam: {e}, Raw: {raw_json_str}")
            return None

# Answer Evaluation Chain
answer_evaluation_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are an exam grader. Evaluate the candidate's answer to a specific question based on the original question, the job description, AND the provided ideal answer. "
     "Provide a score from 0 to 10 (integer only) and a brief, constructive feedback (string). "
     "Output a JSON object with 'score' (integer) and 'feedback' (string). "
     "Example: ```json\n{{\"score\": 8, \"feedback\": \"Good understanding of concepts.\"}}\n```"),
    ("human", "Job Description:\n{job_desc}\nQuestion:\n{question}\nIdeal Answer:\n{ideal_answer}\nCandidate Answer:\n{answer}")
])
answer_evaluation_llm = ChatGroq(model="llama3-8b-8192", temperature=0.1)
answer_evaluation_chain = answer_evaluation_prompt | answer_evaluation_llm | parser

def evaluate_answer_llm(job_description: str, question: str, ideal_answer: str, answer: str) -> dict:
    """Evaluates a single answer using the LLM chain."""
    max_retries = 3
    initial_retry_delay = 5
    for attempt in range(max_retries):
        try:
            raw_json_str = answer_evaluation_chain.invoke({
                "job_desc": job_description, "question": question, "ideal_answer": ideal_answer, "answer": answer
            })
            cleaned_json_str = re.sub(r'^```(?:json)?\n|```$', '', raw_json_str.strip(), flags=re.MULTILINE)
            parsed_dict = json.loads(cleaned_json_str)
            score = parsed_dict.get('score', 0)
            feedback = parsed_dict.get('feedback', 'No specific feedback provided.')
            return {"score": int(score), "feedback": str(feedback)}
        except RateLimitError as e:
            print(f"Rate limit hit during answer evaluation (attempt {attempt + 1}/{max_retries}): {e}")
            sleep_time = initial_retry_delay * (2 ** attempt)
            match = re.search(r'Please try again in (\d+\.?\d*)s', str(e))
            if match:
                try: sleep_time = max(sleep_time, float(match.group(1)))
                except ValueError: pass
            if attempt < max_retries - 1: time.sleep(sleep_time)
            else: return {"score": 0, "feedback": "Evaluation failed due to persistent rate limits."}
        except (json.JSONDecodeError, KeyError, ValueError, Exception) as e:
            print(f"Error evaluating answer: {e}, Raw: {raw_json_str}")
            return {"score": 0, "feedback": "Evaluation failed due to malformed LLM response or internal error."}

# Project Insights Chain
project_insights_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are a highly skilled technical project analyst. Carefully analyze the provided project README content and extract the following structured information into a valid JSON object:\n\n"
     "1. `purpose`: A concise summary of the main purpose or objective of the project (1-2 sentences).\n"
     "2. `key_features`: A list of 3-7 standout features, functionalities, or capabilities of the project.\n"
     "3. `technologies_used`: A list of the main technologies, libraries, frameworks, or programming languages used (3-7 items).\n"
     "4. `target_users`: Who the intended users are (e.g., students, HR teams, enterprise clients, developers, etc.).\n"
     "5. `project_challenges`: List 2-4 major technical or non-technical challenges the developer faced during implementation.\n"
     "6. `business_value`: A 1-2 sentence explanation of how this project provides value to businesses, users, or stakeholders.\n"
     "7. `future_scope`: 2-4 improvements or features planned for future versions of the project.\n"
     "8. `design_considerations`: 2-4 design principles, patterns, or architectural decisions that shaped the implementation.\n\n"
     "If a field is not explicitly mentioned, use `null` for single values and an empty list `[]` for arrays. "
     "Do not infer anything beyond what's explicitly stated in the README.\n"
     "Return ONLY valid JSON enclosed within a markdown-style code block (```). No extra explanation."),
    ("human", "Project README Content:\n{readme_content}")
])
project_insights_llm = ChatGroq(model="llama3-8b-8192", temperature=0.3)
project_insights_chain = project_insights_prompt | project_insights_llm | parser

def generate_project_insights(readme_content: str) -> Optional[dict]:
    """Generates structured insights from a project README using the LLM chain."""
    max_retries = 3
    initial_retry_delay = 5
    for attempt in range(max_retries):
        try:
            raw_json_str = project_insights_chain.invoke({"readme_content": readme_content})
            json_content = re.sub(r'^```(?:json)?\s*\n|\s*```$', '', raw_json_str.strip(), flags=re.MULTILINE).strip()
            parsed_dict = json.loads(json_content)
            validated_insights = ProjectInsights(**parsed_dict)
            return validated_insights.model_dump(exclude_none=True)
        except RateLimitError as e:
            print(f"Rate limit hit during project insights generation (attempt {attempt + 1}/{max_retries}): {e}")
            sleep_time = initial_retry_delay * (2 ** attempt)
            match = re.search(r'Please try again in (\d+\.?\d*)s', str(e))
            if match:
                try: sleep_time = max(sleep_time, float(match.group(1)))
                except ValueError: pass
            if attempt < max_retries - 1: time.sleep(sleep_time)
            else: return None
        except (json.JSONDecodeError, ValidationError, Exception) as e:
            print(f"Error generating structured project insights: {e}, Raw: {raw_json_str}")
            return None

def fetch_github_readme(repo_url: str) -> Optional[str]:
    """Fetches the README.md content from a GitHub repository URL."""
    print(f"DEBUG: Initial URL for fetching README: {repo_url}")
    try:
        # Corrected: Remove the problematic markdown link structure if present
        cleaned_repo_url = repo_url.replace('[https://raw.githubusercontent.com/](https://raw.githubusercontent.com/)', '').strip()
        # Further general cleaning for any remaining stray markdown characters or brackets
        cleaned_repo_url = re.sub(r'\[.*?\]|\(|\)', '', cleaned_repo_url).strip()
        
        # Ensure the URL has a scheme, prepend https:// if missing and it looks like a valid domain
        if not (cleaned_repo_url.startswith('http://') or cleaned_repo_url.startswith('https://')):
            if 'github.com' in cleaned_repo_url:
                cleaned_repo_url = 'https://' + cleaned_repo_url
            else:
                print(f"DEBUG: Cleaned URL '{cleaned_repo_url}' does not appear to be a valid GitHub URL. Missing scheme.")
                return None

        print(f"DEBUG: Cleaned URL for parsing: {cleaned_repo_url}")
        parsed_url = urlparse(cleaned_repo_url)
        
        if 'github.com' not in parsed_url.netloc:
            print(f"DEBUG: URL '{cleaned_repo_url}' is not a GitHub domain.")
            return None

        path_parts = [part for part in parsed_url.path.split('/') if part]
        
        if len(path_parts) < 2:
            print(f"DEBUG: URL path '{parsed_url.path}' does not contain enough parts (owner/repo).")
            return None

        owner = path_parts[0]
        repo_name = path_parts[1]

        if repo_name.endswith('.git'):
            repo_name = repo_name[:-4]
        
        print(f"DEBUG: Extracted owner: {owner}, repo_name: {repo_name}")

        for branch in ['main', 'master']:
            # CORRECTED LINE: Ensure this is a direct URL, not a markdown link.
            raw_readme_url = f"https://raw.githubusercontent.com/{owner}/{repo_name}/{branch}/README.md"
            print(f"DEBUG: Checking README URL (definitively plain): {raw_readme_url}")
            try:
                response = requests.get(raw_readme_url, timeout=15)
                if response.status_code == 200:
                    print(f"DEBUG: Successfully fetched README from {raw_readme_url}")
                    return response.text
                elif response.status_code == 404:
                    print(f"DEBUG: README.md not found at {raw_readme_url} (404 Not Found). Trying next branch.")
                    continue
                else:
                    print(f"DEBUG: Error fetching README from {raw_readme_url}: Status {response.status_code}, Response: {response.text[:200]}")
                    return None
            except requests.exceptions.Timeout:
                print(f"ERROR: Timeout error fetching README from {raw_readme_url}")
                return None
            except requests.exceptions.ConnectionError as ce:
                print(f"ERROR: Connection error fetching README from {raw_readme_url}: {ce}")
                return None
        print(f"DEBUG: README.md not found in 'main' or 'master' branch for {repo_url} after all attempts.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"ERROR: General network error fetching README for {repo_url}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred during README fetch for {repo_url}: {e}")
        return None


# --- Flask Routes ---

@app.route('/')
def index():
    user_logged_in = (g.user is not None)
    is_hr = (g.user and g.user.get('is_hr', False))
    return render_template('index.html', user_logged_in=user_logged_in, is_hr=is_hr)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json() # Get JSON data from the frontend
        username = data.get('username')
        password = data.get('password')
        role = data.get('role') # Get the selected role

        print(f"DEBUG: Login attempt - Username: '{username}', Role: '{role}', Password Length: {len(password) if password else 0}") # Mask password for security

        if role == 'hr' and username == 'hr' and password == 'hrpass': # Specific HR credentials
            session['logged_in'] = True
            session['user_id'] = username
            session['user_email'] = f"{username}@example.com"
            session['is_hr'] = True
            print(f"DEBUG: HR Login successful for {username}. Session: {session}")
            return jsonify({"message": "HR Login successful!", "redirect": url_for('index')}), 200 
        elif role == 'candidate':
      
            session['logged_in'] = True
            session['user_id'] = username
            session['user_email'] = f"{username}@example.com"
            session['is_hr'] = False
            print(f"DEBUG: Candidate Login successful for {username}. Session: {session}")
            return jsonify({"message": "Candidate Login successful!", "redirect": url_for('index')}), 200
        else:
            session.clear() # Clear session if login fails
            print(f"DEBUG: Login failed for '{username}'. Invalid credentials or role mismatch. Received role: '{role}', password length: {len(password) if password else 0}")
            return jsonify({"error": "Invalid username, password, or role."}), 401
    return render_template('login.html')

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/submit_contact", methods=["POST"])
def submit_contact():
    name = request.form.get("name")
    email = request.form.get("email")
    message = request.form.get("message")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        contact_form_worksheet.append_row([name, email, message, timestamp])
        flash("✅ Your query has been submitted successfully!")
        return redirect(url_for('contact'))
    except Exception as e:
        print(f"❌ ERROR submitting contact form: {e}")
        return "<h3>❌ Something went wrong. Please try again later.</h3><a href='/contact'>Back</a>"

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirm_password')

        if not username or not email or not password or not confirm_password:
            return jsonify({'error': 'All fields are required.'}), 400

        if password != confirm_password:
            return jsonify({'error': 'Passwords do not match.'}), 400

        session['user_id'] = str(uuid.uuid4()) # Generate a unique ID for this transient user
        session['user_email'] = email
        session['user_role'] = 'candidate' # Default role for new signups

        print(f"New user '{username}' ({email}) signed up and logged in (transient session).")
        return jsonify({
            'message': 'Account created successfully! You are now logged in.',
            'redirect_url': url_for('index') # Redirect to index or dashboard after automatic login
        }), 201
    
    return render_template('signup.html')
@app.route('/logout')
@login_required
def logout():
    session.pop('logged_in', None)
    session.pop('user_id', None)
    session.pop('user_email', None)
    session.pop('is_hr', None)
    print(f"DEBUG: Session after logout: {session}")
    return redirect(url_for('index'))

@app.route('/hr_job_upload', methods=['GET', 'POST'])
@hr_required
def hr_job_upload():
    if request.method == 'POST':
        company_name = request.form['company_name']
        job_title = request.form['job_title']
        job_description = request.form['job_description']

        job_id = str(uuid.uuid4())
        date_posted = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Add job data to the master 'Jobs' worksheet
        job_data_for_sheet = {
            "id": job_id,
            "company_name": company_name,
            "job_title": job_title,
            "job_description": job_description,
            "date_posted": date_posted
        }
        sheet_add_success = add_job_to_master_sheet(job_data_for_sheet)
        if not sheet_add_success:
            print("ERROR: Failed to add job to Google Sheet. Please check server logs.")
            return jsonify({"error": "Failed to add job to Google Sheet. Please check server logs."}), 500

        jobs[job_id] = {
            "company_name": company_name,
            "job_title": job_title,
            "job_description": job_description,
            "candidates": {}, # Initialize candidates dict for this job
            # No longer storing 'google_sheet_id' per job, as we use a master sheet
        }
        save_jobs() # Save after adding a new job
        print(f"DEBUG: New job added: {job_id}")
        return redirect(url_for('hr_dashboard'))
    return render_template('hr_job_upload.html')

@app.route('/candidate_apply', methods=['GET', 'POST'])
@login_required
def candidate_apply():
    # Prepare available jobs data for the frontend
    available_jobs = [
        {
            "id": job_id,
            "title": jobs[job_id]['job_title'],
            "company_name": jobs[job_id]['company_name'],
            "description": jobs[job_id]['job_description']
        }
        for job_id in jobs
    ]
    print(f"DEBUG: available_jobs being passed to template: {available_jobs}")

    if request.method == 'POST':
        job_id_to_apply = request.form.get('job_id')
        candidate_user_id = g.user['uid']
        candidate_application_id = str(uuid.uuid4())
        
        print(f"DEBUG: Application POST received for Job ID: {job_id_to_apply}, Candidate User ID: {candidate_user_id}")

        if not job_id_to_apply or job_id_to_apply not in jobs:
            print(f"ERROR: Invalid job_id_to_apply: {job_id_to_apply}")
            return jsonify({"error": "Please select a valid job opportunity."}), 400

        if 'resume' not in request.files:
            print("ERROR: No resume file part in request.")
            return jsonify({"error": "No resume file part"}), 400
        
        resume_file = request.files['resume']
        if resume_file.filename == '':
            print("ERROR: No selected file for resume.")
            return jsonify({"error": "No selected file"}), 400

        if resume_file:
            # Save resume locally
            filename = os.path.join(app.config['UPLOAD_FOLDER'], resume_file.filename)
            try:
                resume_file.save(filename)
                print(f"DEBUG: Resume saved locally to: {filename}")
            except Exception as e:
                print(f"ERROR: Failed to save resume file locally: {e}")
                return jsonify({"error": "Failed to save resume file."}), 500

            # Extract text from PDF
            resume_text = extract_text_from_pdf(filename)
            if not resume_text:
                print("ERROR: Failed to extract text from resume.")
                os.remove(filename) # Clean up file
                return jsonify({"error": "Failed to extract text from resume. Please ensure it's a valid PDF."}), 400
            print(f"DEBUG: Extracted resume text length: {len(resume_text)}")

            # Extract structured info using LLM
            extracted_info = extract_resume_info_llm(resume_text)
            if "error" in extracted_info:
                print(f"ERROR: Failed to extract resume info: {extracted_info['error']}")
                os.remove(filename) # Clean up file
                return jsonify({"error": f"Failed to extract resume info: {extracted_info['error']}"}), 500
            print(f"DEBUG: Extracted resume info: {extracted_info.get('name', 'N/A')}, Skills: {extracted_info.get('skills', [])[:3]}...")

            job_description = jobs[job_id_to_apply]["job_description"]
            
            # Process projects for insights
            processed_projects = []
            if 'projects' in extracted_info and extracted_info['projects']:
                print(f"DEBUG: Processing {len(extracted_info['projects'])} projects for insights...")
                for project in extracted_info['projects']:
                    print(f"DEBUG: Processing project: {project.get('title', 'N/A')}")
                    if project.get('link') and 'github.com' in project['link']:
                        print(f"DEBUG: Attempting to fetch README from: {project['link']}")
                        readme_content = fetch_github_readme(project['link'])
                        if readme_content:
                            print(f"DEBUG: Successfully fetched README for {project['title']}. Length: {len(readme_content)} chars.")
                            insights = generate_project_insights(readme_content)
                            if insights:
                                project['insights'] = insights
                                print(f"DEBUG: Successfully generated insights for {project['title']}.")
                            else:
                                project['insights'] = None
                                print(f"DEBUG: Failed to generate insights for {project['title']}.")
                        else:
                            project['readme_content'] = "Could not fetch README.md"
                            project['insights'] = None
                            print(f"DEBUG: Could not fetch README.md for {project['title']}.")
                    else:
                        print(f"DEBUG: Project {project.get('title', 'N/A')} has no GitHub link or link is invalid.")
                        project['insights'] = None
                    processed_projects.append(project)
            extracted_info['projects'] = processed_projects
            print(f"DEBUG: Final processed projects for candidate (after insights generation): {extracted_info.get('projects', [])}")

            # Evaluate candidate eligibility
            eligibility_result = evaluate_candidate_llm(extracted_info, job_description)
            print(f"DEBUG: Eligibility result: {eligibility_result}")

            # Generate detailed feedback or selection reason
            if eligibility_result.get("decision") == "Not Eligible":
                detailed_reason = generate_detailed_feedback(
                    extracted_info,
                    job_description,
                    eligibility_result.get("score", 0)
                )
                eligibility_result["reason"] = detailed_reason
                print(f"DEBUG: Generated detailed reason for non-eligibility: {detailed_reason[:100]}...")
            elif eligibility_result.get("decision") == "Eligible":
                selection_reason = generate_selection_reason(
                    extracted_info,
                    job_description,
                    eligibility_result.get("score", 0)
                )
                eligibility_result["reason"] = selection_reason
                print(f"DEBUG: Generated detailed reason for selection: {selection_reason[:100]}...")

            # Generate exam questions if eligible
            exam_questions = None
            if eligibility_result.get("decision") == "Eligible":
                exam_questions = generate_exam_llm(job_description)
                if exam_questions is None:
                    print("ERROR: Failed to generate exam questions for eligible candidate.")
                    if "Exam generation failed" not in eligibility_result["reason"]:
                        eligibility_result["reason"] += " (Note: Exam generation failed, please contact HR.)"
                    eligibility_result["decision"] = "Eligible (Exam Gen Failed)"
                else:
                    print(f"DEBUG: Generated {len(exam_questions)} exam questions.")

            # Store application data in the global 'jobs' dictionary
            candidate_full_data = {
                "candidate_user_id": candidate_user_id,
                "resume_filename": filename, # Path to locally saved resume
                "extracted_info": extracted_info,
                "eligibility_status": eligibility_result.get("decision"),
                "eligibility_reason": eligibility_result.get("reason", "N/A"),
                "match_score": eligibility_result.get("score", 0),
                "submission_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "exam_questions": exam_questions,
                "exam_taken": False,
                "exam_score": None,
                "exam_feedback": None,
                "submitted_answers": []
            }
            jobs[job_id_to_apply]["candidates"][candidate_application_id] = candidate_full_data
            
            # Upload candidate data to the master 'Candidates' worksheet
            # Pass candidate_application_id directly as it's the unique identifier for the row
            upload_success = upload_candidate_to_master_sheet(candidate_application_id, candidate_full_data, job_id_to_apply)
            if not upload_success:
                print(f"WARNING: Failed to upload candidate {candidate_application_id} to master Google Sheet.")

            save_jobs() # Save updated jobs data to JSON file
            print(f"DEBUG: Application saved for job {job_id_to_apply}, candidate {candidate_application_id}")
            return jsonify({"message": "Application submitted successfully!", "application_id": candidate_application_id}), 200
    
    return render_template('candidate_apply.html', available_jobs=available_jobs)

@app.route('/hr_dashboard')
@hr_required
def hr_dashboard():
    print("\n--- HR Dashboard Data Inspection ---")
    dashboard_jobs = []
    for job_id, job_data in jobs.items():
        job_copy = job_data.copy()
        job_copy['id'] = job_id # Add job ID for template use
        job_copy['candidates_list'] = [] # Prepare a list of candidates for this job
        
        if job_data.get('candidates'):
            for candidate_id, candidate_data in job_data['candidates'].items():
                candidate_copy = candidate_data.copy()
                candidate_copy['application_id'] = candidate_id # Add application ID
                
                # Ensure extracted_info is a dict, even if empty
                if not isinstance(candidate_copy.get('extracted_info'), dict):
                    candidate_copy['extracted_info'] = {}

                # Ensure projects and insights are handled gracefully for display
                projects = candidate_copy['extracted_info'].get('projects', [])
                for idx, proj in enumerate(projects):
                    # Ensure insights is a dict if present, or None/empty dict
                    if 'insights' in proj and not isinstance(proj['insights'], dict):
                        proj['insights'] = {} # Convert to empty dict if not dict
                    elif 'insights' not in proj:
                        proj['insights'] = {} # Add empty dict if missing
                    
                    # Add project_index for linking to project_insights page
                    proj['project_index'] = idx
                candidate_copy['extracted_info']['projects'] = projects # Update projects in copy

                job_copy['candidates_list'].append(candidate_copy)
                print(f"  Candidate: {candidate_copy['extracted_info'].get('name', 'N/A')}, App ID: {candidate_id}")
                for idx, proj in enumerate(candidate_copy['extracted_info'].get('projects', [])):
                    print(f"    Project {idx}: {proj.get('title', 'N/A')}, Insights exist: {bool(proj.get('insights'))}")
        dashboard_jobs.append(job_copy)
    
    print("--- End HR Dashboard Data Inspection ---\n")
    return render_template('hr_dashboard.html', jobs=dashboard_jobs)

@app.route('/client_portal')
@login_required
def client_portal():
    candidate_user_id = g.user['uid']
    print(f"DEBUG: Accessing client_portal for user: {candidate_user_id}")
    
    user_applications = []
    for job_id, job_data in jobs.items():
        if job_data.get('candidates'):
            for app_id, app_data in job_data['candidates'].items():
                if app_data.get('candidate_user_id') == candidate_user_id:
                    app_copy = app_data.copy()
                    app_copy['job_id'] = job_id # Add job_id
                    app_copy['application_id'] = app_id # Add application_id
                    app_copy['job_title'] = job_data['job_title']
                    app_copy['company_name'] = job_data['company_name']
                    
                    # Ensure extracted_info is a dict
                    if not isinstance(app_copy.get('extracted_info'), dict):
                        app_copy['extracted_info'] = {}
                    
                    # Ensure exam_questions is a list or None
                    if not isinstance(app_copy.get('exam_questions'), list) and app_copy.get('exam_questions') is not None:
                        app_copy['exam_questions'] = []

                    user_applications.append(app_copy)
                    print(f"DEBUG: Found application for {candidate_user_id}: Job '{job_data['job_title']}', App ID '{app_id}'")
    
    print(f"DEBUG: Total applications for {candidate_user_id} in client_portal: {len(user_applications)}")
    return render_template('client_portal.html', applications=user_applications)

@app.route('/get_exam/<job_id>/<candidate_id>', methods=['GET'])
@login_required
def get_exam(job_id, candidate_id):
    candidate_user_id = g.user['uid']
    
    job = jobs.get(job_id)
    if not job:
        print(f"ERROR: get_exam - Job not found: {job_id}")
        return jsonify({"error": "Job not found."}), 404
    
    candidate_app = job['candidates'].get(candidate_id)
    if not candidate_app or candidate_app.get('candidate_user_id') != candidate_user_id:
        print(f"ERROR: get_exam - Application not found or unauthorized for candidate_id: {candidate_id}, user: {candidate_user_id}")
        return jsonify({"error": "Application not found or unauthorized."}), 404

    if candidate_app.get('eligibility_status') != 'Eligible':
        print(f"DEBUG: get_exam - Candidate {candidate_id} not eligible for exam. Status: {candidate_app.get('eligibility_status')}")
        return jsonify({"error": "Candidate is not eligible to take the exam."}), 403

    if candidate_app.get('exam_taken'):
        print(f"DEBUG: get_exam - Exam already taken by {candidate_id}.")
        return jsonify({"error": "Exam already taken."}), 400

    exam_questions = candidate_app.get('exam_questions')
    if not exam_questions:
        print(f"DEBUG: get_exam - Generating new exam questions for {candidate_id}.")
        exam_questions = generate_exam_llm(job['job_description'])
        if exam_questions:
            candidate_app['exam_questions'] = exam_questions
            save_jobs()
            print(f"DEBUG: get_exam - Generated and saved {len(exam_questions)} exam questions for {candidate_id}.")
        else:
            print(f"ERROR: get_exam - Failed to generate exam questions.")
            return jsonify({"error": "Failed to generate exam questions."}), 500

    return jsonify({"exam_questions": exam_questions}), 200

@app.route('/submit_exam/<job_id>/<candidate_id>', methods=['POST'])
@login_required
def submit_exam(job_id, candidate_id):
    candidate_user_id = g.user['uid']
    
    job = jobs.get(job_id)
    if not job:
        print(f"ERROR: submit_exam - Job not found: {job_id}")
        return jsonify({"error": "Job not found."}), 404
    
    candidate_app = job['candidates'].get(candidate_id)
    if not candidate_app or candidate_app.get('candidate_user_id') != candidate_user_id:
        print(f"ERROR: submit_exam - Application not found or unauthorized for candidate_id: {candidate_id}, user: {candidate_user_id}")
        return jsonify({"error": "Application not found or unauthorized."}), 404

    if candidate_app.get('eligibility_status') != 'Eligible':
        print(f"DEBUG: submit_exam - Candidate {candidate_id} not eligible for exam. Status: {candidate_app.get('eligibility_status')}")
        return jsonify({"error": "Candidate is not eligible to take the exam."}), 403

    if candidate_app.get('exam_taken'):
        print(f"DEBUG: submit_exam - Exam already taken by {candidate_id}.")
        return jsonify({"error": "Exam already taken."}), 400

    submitted_answers = request.json.get('answers')
    if not submitted_answers:
        print("ERROR: submit_exam - No answers submitted.")
        return jsonify({"error": "No answers submitted."}), 400

    job_description = job['job_description']
    exam_questions = candidate_app.get('exam_questions', [])
    
    total_score = 0
    detailed_feedback = []
    
    for submitted_ans in submitted_answers:
        q_id = submitted_ans.get('question_id')
        ans_text = submitted_ans.get('answer')

        original_question_obj = next((q for q in exam_questions if q['id'] == q_id), None)
        
        if original_question_obj and ans_text:
            original_question_text = original_question_obj['question']
            ideal_answer_text = original_question_obj.get('ideal_answer', '')
            
            evaluation = evaluate_answer_llm(job_description, original_question_text, ideal_answer_text, ans_text)
            total_score += evaluation['score']
            detailed_feedback.append({
                "question_id": q_id,
                "question": original_question_text,
                "answer": ans_text,
                "score": evaluation['score'],
                "feedback": evaluation['feedback']
            })
            print(f"DEBUG: Question {q_id} scored: {evaluation['score']}, Feedback: {evaluation['feedback'][:50]}...")
        else:
            detailed_feedback.append({
                "question_id": q_id,
                "question": original_question_obj['question'] if original_question_obj else "Question not found",
                "answer": ans_text if ans_text else "No answer provided",
                "score": 0,
                "feedback": "Invalid question ID or missing answer."
            })
            print(f"DEBUG: Question {q_id} (or missing) failed evaluation.")

    candidate_app['exam_taken'] = True
    candidate_app['exam_score'] = total_score
    candidate_app['exam_feedback'] = detailed_feedback
    candidate_app['submitted_answers'] = submitted_answers
    save_jobs()
    print(f"DEBUG: Exam submitted and graded for {candidate_id}. Total score: {total_score}")
    return jsonify({"message": "Exam submitted and graded successfully!", "score": total_score, "feedback": detailed_feedback}), 200

@app.route('/project_insights/<job_id>/<candidate_id>/<int:project_index>')
@hr_required
def project_insights(job_id, candidate_id, project_index):
    print(f"DEBUG: Accessing project_insights for job_id={job_id}, candidate_id={candidate_id}, project_index={project_index}")
    job = jobs.get(job_id)
    if not job:
        print(f"ERROR: project_insights - Job not found: {job_id}")
        return "Job not found", 404
    
    candidate_app = job['candidates'].get(candidate_id)
    if not candidate_app:
        print(f"ERROR: project_insights - Candidate application not found: {candidate_id}")
        return "Candidate application not found", 404

    projects = candidate_app['extracted_info'].get('projects', [])
    if project_index < 0 or project_index >= len(projects):
        print(f"ERROR: project_insights - Project index out of bounds: {project_index}")
        return "Project not found", 404

    project = projects[project_index]
    
    # Ensure project['insights'] is a dictionary for rendering
    if not isinstance(project.get('insights'), dict):
        project['insights'] = {} # Default to empty dict if not dict or None
        print(f"DEBUG: project_insights - Project insights not a dict for project {project.get('title', 'N/A')}, defaulting to empty dict.")

    print(f"DEBUG: Rendering project_insights.html for project: {project.get('title', 'N/A')}")
    return render_template('project_insights.html', 
                           job_title=job['job_title'],
                           candidate_name=candidate_app['extracted_info'].get('name', 'N/A'),
                           project=project)


if __name__ == '__main__':
    app.run(debug=True,host='0.0.0.0')