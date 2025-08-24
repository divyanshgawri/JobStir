import os
import json
import uuid
from datetime import datetime
from functools import wraps
from pydantic import ValidationError as PydanticValidationError
import requests
from urllib.parse import urlparse
import time
from uuid import UUID, uuid4
import re

# Flask-Login and SQLAlchemy imports
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin, login_user, LoginManager, logout_user, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField,EmailField
from flask_mail import Mail, Message
from wtforms.validators import InputRequired, Length, EqualTo, ValidationError,Email
from flask_bcrypt import Bcrypt
import logging
from sentence_transformers import SentenceTransformer, util

# --- Flask-Dance for Google OAuth ---
from flask_dance.contrib.google import make_google_blueprint, google
from flask_dance.consumer import oauth_authorized, oauth_error
# LLM related imports
from groq import RateLimitError, Groq
from typing import Optional, List,Union
from pydantic import BaseModel, Field
import fitz  # PyMuPDF
from dotenv import load_dotenv
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, g, flash
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
import secrets
from supabase import create_client
import warnings
warnings.filterwarnings("ignore")

# Load environment variables
load_dotenv()
os.environ['GROQ_API_KEY'] = os.getenv('GROQ_API_KEY')

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
app = Flask(__name__)

# --- App config settings ---
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
app.config['MAX_CONTENT_LENGTH'] = 3 * 1024 * 1024
app.secret_key = os.getenv('FLASK_SECRET_KEY', secrets.token_hex(32))

# Database configuration
# --- Google OAuth Configuration ---
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"
app.config["GOOGLE_OAUTH_CLIENT_ID"] = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
app.config["GOOGLE_OAUTH_CLIENT_SECRET"] = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")

# --- Initialize Flask Extensions and Blueprints ---
google_bp = make_google_blueprint(
    client_id=app.config["GOOGLE_OAUTH_CLIENT_ID"],
    client_secret=app.config["GOOGLE_OAUTH_CLIENT_SECRET"],
    scope=["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"],
)
app.register_blueprint(google_bp, url_prefix="/login")

print("DEBUG: Initializing SentenceTransformer model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("DEBUG: SentenceTransformer model initialized.")


bcrypt = Bcrypt(app)


# --- Flask-Mail Configuration ---
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = ('JobStir Recruitment', app.config['MAIL_USERNAME'])
mail = Mail(app)

# --- Helper Class ---
class AttrDict(dict):
    """A dictionary that allows for attribute-style access."""
    def __init__(self, *args, **kwargs):
        super(AttrDict, self).__init__(*args, **kwargs)
        self.__dict__ = self
        for key, value in self.items():
            if isinstance(value, dict):
                self[key] = AttrDict(value)
            elif isinstance(value, list):
                self[key] = [AttrDict(i) if isinstance(i, dict) else i for i in value]

# --- Forms ---
class RegisterForm(FlaskForm):
    email = EmailField(validators=[InputRequired(), Email()], render_kw={"placeholder": "Email"})
    password = PasswordField(validators=[InputRequired(), Length(min=8, max=80)], render_kw={"placeholder": "Password"})
    confirm_password = PasswordField(validators=[InputRequired(), EqualTo('password', message='Passwords must match')], render_kw={"placeholder": "Confirm Password"})
    is_hr = BooleanField('Register as HR?')
    submit = SubmitField('Register')
class LoginForm(FlaskForm):
    # Change this line from username to email
    email = EmailField(validators=[InputRequired(), Email()], render_kw={"placeholder": "Email"})
    password = PasswordField(validators=[InputRequired(), Length(min=8, max=80)], render_kw={"placeholder": "Password"})
    submit = SubmitField('Login')

# --- Pydantic Models for LLM (MODIFIED) ---
class KnockoutCriterion(BaseModel):
    type: str
    # --- FIX: Allow 'value' to be a string, integer, or list of strings ---
    value: Optional[Union[str, int, List[str]]] = Field(None, description="The specific value for the criterion (e.g., '5', 'Django', ['python', 'pandas'])")
    unit: Optional[str] = Field(None, description="Unit for value if applicable (e.g., 'years')")
    keywords: Optional[List[str]] = Field(None, description="Keywords to look for in conjunction with the value")
    reason_if_failed: str = Field(..., description="A concise reason why failing this criterion leads to knockout.")


class KnockoutQuestions(BaseModel):
    criteria: List[KnockoutCriterion]
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # This checks for our Supabase user info in the session
        if 'user_info' not in session:
            flash("Please log in to access this page.", "warning")
            return redirect(url_for('login'))
        # You could add token validation here with supabase.auth.get_user() for extra security
        g.user_id = session['user_info'].get('id') # Store user ID in g for the request
        g.is_hr = session['user_info'].get('is_hr', False)
        return f(*args, **kwargs)
    return decorated_function

def hr_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # This relies on the 'is_hr' flag we save in the session during login
        if not session.get('user_info', {}).get('is_hr', False):
            flash('Access Denied: HR privileges are required for this page.', 'danger')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extracts text from a PDF file's byte content."""
    try:
        # Open the PDF directly from the in-memory byte content
        with fitz.open(stream=file_content, filetype="pdf") as doc:
            if not doc.is_pdf:
                logging.error("Uploaded file is not a valid PDF.")
                return ""
            if doc.is_encrypted:
                logging.error("PDF is encrypted and cannot be read.")
                return ""
            
            # text_content = "".join(page.get_text() for page in doc)   
            full_text_content = []
            # Iterate through each page of the PDF
            for page in doc:
                # First, get the plain text of the page
                full_text_content.append(page.get_text())

                # --- NEW: Hyperlink Extraction Logic ---
                # Get all hyperlink objects on the current page
                links = page.get_links()
                for link in links:
                    # Check if the link has a URI (a web address)
                    if 'uri' in link:
                        # Append a special, easy-to-parse marker with the actual URL
                        # This makes the URL explicit and impossible for the LLM to miss.
                        full_text_content.append(f"\n[HYPERLINK_DETECTED: {link['uri']}]\n")
                # --- END of NEW Logic ---

            text_content = "".join(full_text_content)

            if not text_content.strip():
                logging.warning("PDF was read successfully, but contained no text.")
                return ""

            return text_content
    except Exception as e:
        # Log the specific error from the PyMuPDF library
        logging.error(f"Failed to extract text from PDF due to an error: {e}", exc_info=True)
        return ""
class Job(BaseModel):
    """
    Represents the structure of a job object.
    """
    id: UUID = Field(default_factory=uuid4)
    title: str
    description: str
    knockout_questions: KnockoutQuestions = Field(default_factory=KnockoutQuestions)
    # # Add any other fields your job might have
    # company: Optional[str] = None
    # location: Optional[str] = None
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
    # achievments: Optional[List[str]] = Field(None, description="List of achievements")
    memberships: Optional[List[Membership]] = Field(None, description="List of professional memberships")
    campus_involvement: Optional[List[CampusInvolvement]] = Field(None, description="List of campus involvement activities")

class ProjectInsights(BaseModel):
    purpose: Optional[str] = Field(None, description="The main purpose or goal of the project.")
    key_features: Optional[List[str]] = Field(None, description="List of key features or functionalities.")
    technologies_used: Optional[List[str]] = Field(None, description="List of technologies, languages, frameworks used.")
    target_users: Optional[List[str]] = Field(None, description="Who the intended users are.")
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
llm = ChatGroq(model="llama3-70b-8192", temperature=0)
parser = StrOutputParser()

# Initialize Groq client for chat completions (used in get_resume_score_with_breakdown)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
class ResumeExtractionError(Exception):
    """Custom exception for errors during resume extraction."""
    pass

def extract_resume_info_llm(text: str) -> dict:
    """
    Extracts structured resume information using the LLM chain.
    Raises ResumeExtractionError on failure.
    """
    max_retries = 3
    initial_retry_delay = 5
    raw_json_str = ""  # Initialize for error logging

    for attempt in range(max_retries):
        try:
            raw_json_str = extraction_chain.invoke({"text": text})
            cleaned_json_str = re.sub(r'^```(?:json)?\n|```$', '', raw_json_str.strip(), flags=re.MULTILINE)
            
            if not cleaned_json_str:
                raise ResumeExtractionError("LLM returned an empty response.")

            parsed_dict = json.loads(cleaned_json_str)
            print(parsed_dict)  # For debugging purposes
            # Handle the case where the LLM returns a list of phone numbers
            if isinstance(parsed_dict.get('phone'), list):
                logging.debug("Multiple phone numbers found; converting list to a single string.")
                parsed_dict['phone'] = ', '.join(map(str, parsed_dict['phone']))

            validated_info = ResumeInfo(**parsed_dict)
            extracted_data = validated_info.model_dump(exclude_none=True)
            
            logging.info("Successfully extracted and validated resume data.")
            
            return extracted_data
            
        except RateLimitError as e:
            logging.warning(f"Rate limit hit (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                sleep_time = initial_retry_delay * (2 ** attempt)
                time.sleep(sleep_time)
            else:
                # Raise the custom exception after the final attempt
                raise ResumeExtractionError("Failed due to persistent rate limits.") from e
            
        except (json.JSONDecodeError, PydanticValidationError) as e:
            # For parsing/validation errors, fail immediately and raise the custom exception
            logging.error(f"Failed to parse or validate LLM output. Raw response: {raw_json_str}")
            raise ResumeExtractionError(f"Invalid data structure from LLM: {e}") from e

        except Exception as e:
            # Catch any other unexpected errors
            logging.error(f"An unexpected error occurred during resume extraction. Raw response: {raw_json_str}")
            raise ResumeExtractionError(f"An unexpected error occurred: {e}") from e

# New LLM Chain for Knockout Questions
knockout_llm = ChatGroq(model="llama3-70b-8192", temperature=0, max_tokens=5000)
knockout_parser = StrOutputParser()

# In app_trial.py, use this ultra-strict prompt for knockout generation

knockout_question_prompt = ChatPromptTemplate.from_messages([
    ("system",
     """You are 'Recruiter-Prime v6.0', a JSON-only extraction AI. Your single function is to extract hard knockout criteria from a job description.

--- **Primary Directive: Schema Compliance is CRITICAL** ---
You MUST adhere to the following output schema. Any deviation will cause a downstream system failure. Your entire response must be ONLY the JSON object.

--- **STRICT OUTPUT SCHEMA** ---
1.  **Overall Structure**: A single JSON object `{{"criteria": [...]}}`.
2.  **`criteria` List**: A list of objects. If no criteria are found, the list MUST be empty: `[]`.
3.  **Object Keys**: Each object MUST contain `type`, `value`, and `reason_if_failed`.
4.  **`type` Key - CRITICAL CONSTRAINT**: The value for `type` MUST be one of these EXACT, case-sensitive strings:
    * `experience_years` - **EXPERIENCE**: For experience requirements like "2-4 years" or "2+ years", you MUST use the minimum value (e.g., `2`). The `value` in the JSON should always be an integer representing the lowest required number of years, if it is like 0 then provide a number 0 there .
    * `Education`
    * `Location`-- **LOCATION**: Only extract a location if a specific city or state is listed as a mandatory requirement. If the job description says "Remote", "Remote (anywhere)", or a similar variation, you MUST treat it as if there is no location requirement .

--- **Analysis Rules** ---
- **IGNORE ALL SKILLS AND CERTIFICATIONS**: Do not extract criteria for Python, AWS, PMP, etc.
- **EXPERIENCE**: For a range like "3-5 years", you MUST use the minimum value (`3`).
- **MANDATORY ONLY**: Only extract requirements stated with words like "required", "minimum", "must have".

--- **Final Review Protocol** ---
Before generating the JSON, perform a final mental check:
1.  Have I included any skills? (If yes, delete it).
2.  Does every `type` field exactly match a value from the `type` Key Constraint list, including capitalization? (If no, fix it).
3.  Is my output ONLY a JSON object starting with `{{` and ending with `}}`? (If no, remove all other text).

Now, process the following job description according to these unbreakable rules.
     """),
    ("human", "Analyze this Job Description:\n{job_desc}")
])

knockout_chain = knockout_question_prompt | knockout_llm | knockout_parser

# --- Define a custom exception for this specific task ---
class KnockoutGenerationError(Exception):
    """Custom exception for failures in generating knockout questions."""
    pass

def generate_knockout_questions_llm(job_description: str) -> dict:
    """
    Generates structured knockout questions from a job description.
    Raises KnockoutGenerationError on failure.
    """
    max_retries = 3
    initial_retry_delay = 5

    for attempt in range(max_retries):
        try:
            # 1. Invoke the LLM
            raw_json_str = knockout_chain.invoke({"job_desc": job_description})
            
            # 2. Reliably find the JSON object in the response
            match = re.search(r'\{.*\}', raw_json_str, re.DOTALL)
            if not match:
                raise json.JSONDecodeError("No valid JSON object found in LLM response.", raw_json_str, 0)
            
            json_content = match.group(0)
            
            # 3. Parse and validate the data
            parsed_dict = json.loads(json_content)
            validated_knockout = KnockoutQuestions(**parsed_dict)
            
            logging.info("Successfully generated and validated knockout questions.")
            return validated_knockout.model_dump(exclude_none=True)
            
        except RateLimitError as e:
            logging.warning(f"Rate limit hit (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt >= max_retries - 1: # If it's the last attempt
                raise KnockoutGenerationError("Failed due to persistent rate limits.") from e
            time.sleep(initial_retry_delay * (2 ** attempt))

        except (json.JSONDecodeError, ValidationError) as e:
            # This is the key improvement: retry on flaky LLM output
            logging.warning(f"Parsing/validation failed (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt >= max_retries - 1: # If it's the last attempt
                raise KnockoutGenerationError("Failed to parse or validate LLM response after multiple attempts.") from e
            time.sleep(initial_retry_delay) # Wait a short time before retrying
    
    # This line is reached if the loop completes without a successful return
    raise KnockoutGenerationError("Failed to generate knockout questions after all retries.")

def _parse_duration_to_years(duration_str: str) -> float:
    """
    An improved helper function to parse different duration formats into a total number of years.
    It more accurately handles same-year ranges and prioritizes explicit year/month text.
    """
    if not duration_str:
        return 0.0

    duration_str = duration_str.strip()
    total_years = 0.0

    # --- IMPROVEMENT 1: Prioritize explicit "X years Y months" text first ---
    years_match = re.search(r'(\d+)\s*year', duration_str, re.IGNORECASE)
    months_match = re.search(r'(\d+)\s*month', duration_str, re.IGNORECASE)

    if years_match or months_match:
        if years_match:
            total_years += float(years_match.group(1))
        if months_match:
            total_years += float(months_match.group(1)) / 12.0
        return round(total_years, 2)

    # --- Case 2: Handle date ranges like "2021 - 2023" or "Jan 2022 - Present" ---
    # Use word boundaries (\b) to avoid matching year-like numbers in company names
    range_match = re.findall(r'\b(\d{4})\b', duration_str)
    
    if len(range_match) >= 1:
        start_year = int(range_match[0])
        end_year = 0

        if 'present' in duration_str.lower() or 'current' in duration_str.lower():
            end_year = datetime.now().year
        elif len(range_match) == 2:
            end_year = int(range_match[1])

        if end_year > 0:
            # --- IMPROVEMENT 2: More precise calculation for date ranges ---
            year_diff = end_year - start_year
            # If the duration is within the same year, count it as a partial year (e.g., 0.5)
            # instead of a full 1.0, as it's likely less than a full year's experience.
            if year_diff == 0:
                return 0.5
            return float(year_diff)
            
    # Return 0.0 if no parsable format is found
    return 0.0

KNOCKOUT_PASS_THRESHOLD = 50


# Add these new Pydantic models with your other models
class ValidationResult(BaseModel):
    criterion_type: str = Field(..., description="The type of the criterion being validated.")
    is_met: bool = Field(..., description="A boolean indicating if the candidate meets the criterion.")
    reasoning: str = Field(..., description="A brief, logical explanation for the decision.")
    evidence: Optional[str] = Field(None, description="A direct quote or summary from the resume that supports the decision.")

class ValidationResponse(BaseModel):
    results: List[ValidationResult]

validation_prompt = ChatPromptTemplate.from_messages([
    ("system",
     """You are 'Recruiter-Prime v4.1', the final validation layer for knockout criteria.

Your task: For each knockout criterion, determine if the candidate's resume JSON meets it.
- Use ONLY the provided resume JSON data.
- Never guess or fabricate information.
- If data is missing or unclear, mark the criterion as NOT met.
 **QUOTING RULE**: Every key and every string value MUST be enclosed in **DOUBLE QUOTES** (`"`). Single quotes (`'`) are forbidden and will break the system.
    - **CORRECT**: `{{"key": "value"}}`
    - **INCORRECT**: `{{'key': "value"}}` (This will cause an error)

======================
CRITERIA TYPES & RULES
======================
1. experience_years
   - Use explicit dates or total experience in the resume JSON.
   - Candidate meets criterion if total professional experience >= required years.
   - Otherwise, mark as not met.
   - Sum experience across roles if needed.

2. education
   - Accept equivalent degrees (e.g., "B.Sc." == "Bachelor's").
   - Degree and field must match or exceed the required criterion.
   - Missing or unrelated education means criterion is not met.

3. location
   - Candidate must explicitly list the required city/state or "remote" if applicable.
   - Missing or different location means criterion is not met.

======================
OUTPUT FORMAT
======================
Return ONLY valid JSON with the exact structure below:
{{{{
  "results": [
    {{{{
      "criterion_type": "<experience_years|education|location>",
      "is_met": true|false,
      "reasoning": "<brief reason>",
      "evidence": "<exact text snippet from resume JSON>"
    }}}}
  ]
}}}}

- Response MUST start with '{{{{' and end with '}}}}'.
- No markdown, no extra explanations outside JSON.

======================
FEW-SHOT EXAMPLES
======================

Example 1 - Experience met
Resume JSON:
{{{{
  "experience": [
    {{"duration": "2019-2023", "title": "Software Engineer"}}
  ]
}}}}
Criteria:
{{{{
  "criteria": [
    {{"type": "experience_years", "value": 3}}
  ]
}}}}
Output:
{{{{
  "results": [
    {{{{
      "criterion_type": "experience_years",
      "is_met": true,
      "reasoning": "4 years >= 3 required",
      "evidence": "duration: 2019-2023"
    }}}}
  ]
}}}}

Example 2 - Education met
Resume JSON:
{{{{
  "education": [
    {{"degree": "B.Sc. in Computer Science"}}
  ]
}}}}
Criteria:
{{{{
  "criteria": [
    {{"type": "education", "value": "Bachelor's degree in Computer Science"}}
  ]
}}}}
Output:
{{{{
  "results": [
    {{{{
      "criterion_type": "education",
      "is_met": true,
      "reasoning": "B.Sc equals Bachelor's in Computer Science",
      "evidence": "degree: B.Sc. in Computer Science"
    }}}}
  ]
}}}}

Example 3 - Location not met
Resume JSON:
{{{{
  "location": "San Francisco"
}}}}
Criteria:
{{{{
  "criteria": [
    {{"type": "location", "value": "New York City"}}
  ]
}}}}
Output:
{{{{
  "results": [
    {{{{
      "criterion_type": "location",
      "is_met": false,
      "reasoning": "Candidate location is San Francisco, required is New York City",
      "evidence": "location: San Francisco"
    }}}}
  ]
}}}}



"""),
    ("human", 
     "**Candidate Resume (JSON):**\n{resume_json}\n\n"
     "**Knockout Criteria to Validate:**\n{criteria_json}\n\n"
     "Check each criterion and return the JSON result array.")
])
# This is the new function that replaces 'check_knockout_criteria'
def validate_knockout_criteria_llm(resume_json: dict, criteria: dict) -> dict:
    """Uses a dedicated validation chain to check criteria against a resume."""
    # NOTE: You might want to use a less powerful model here to save costs if needed,
    # but llama3-70b-8192 will provide the highest quality analysis.
    validation_llm = ChatGroq(model="llama3-70b-8192", temperature=0, max_tokens=5000)
    validation_chain = validation_prompt | validation_llm | StrOutputParser()
    
    try:
        raw_response = validation_chain.invoke({
            "resume_json": json.dumps(resume_json, indent=2),
            "criteria_json": json.dumps(criteria, indent=2)
        })
        
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if not match:
            raise json.JSONDecodeError("No valid JSON object found in validation response.", raw_response, 0)
        
        json_content = match.group(0)
        parsed_dict = json.loads(json_content)
        validated_response = ValidationResponse(**parsed_dict)
        
        # Process the results from the AI validator
        met_criteria = []
        missed_criteria = []
        all_criteria_from_job = criteria.get("criteria", [])

        for result in validated_response.results:
            # Find the original criterion this result corresponds to
            original_criterion = next((c for c in all_criteria_from_job if c['type'] == result.criterion_type), None)
            if original_criterion:
                if result.is_met:
                    met_criteria.append(original_criterion)
                else:
                    missed_criteria.append({
                        "criterion": original_criterion,
                        "reason": result.reasoning,
                        "evidence": result.evidence
                    })
        
        total_criteria_count = len(all_criteria_from_job)
        met_count = len(met_criteria)
        score = (met_count / total_criteria_count) * 100 if total_criteria_count > 0 else 100
        
        # Use your global KNOCKOUT_PASS_THRESHOLD here
        passed = score >= KNOCKOUT_PASS_THRESHOLD

        final_reason = f"Candidate met {met_count} of {total_criteria_count} mandatory criteria ({int(score)}%). "
        if not passed:
            missed_reasons = ' '.join([item['reason'] for item in missed_criteria])
            final_reason += "Did not pass threshold. " + missed_reasons
        else:
            final_reason += "Passed knockout threshold."

        return {
            "passed": passed,
            "reason": final_reason,
            "score": int(score),
            "met_criteria": met_criteria,
            "missed_criteria": [item['criterion'] for item in missed_criteria]
        }

    except Exception as e:
        print(f"ERROR during validation chain: {e}")
        return {"passed": False, "score": 0, "met_criteria": [], "missed_criteria": [], "reason": f"Failed during validation: {e}"}


def _check_experience(criterion: dict, total_years: float) -> bool:
    try: return total_years >= float(criterion.get('value', 999))
    except (ValueError, TypeError): return False

def _check_education(criterion: dict, education_entries: list) -> bool:
    DEGREE_ALIASES = {"bachelor": ["b.sc", "b.s.", "b.a.", "bachelor"], "master": ["m.sc", "m.s.", "master"], "phd": ["ph.d.", "phd", "doctorate"]}
    required_keywords = [k.lower() for k in criterion.get('keywords', [])]
    if not required_keywords: return False
    education_text = ' '.join(f"{edu.get('degree', '')}" for edu in education_entries).lower()
    for keyword in required_keywords:
        aliases = DEGREE_ALIASES.get(keyword, [keyword])
        if any(alias in education_text for alias in aliases):
            return True
    return False

def _check_location(criterion: dict, resume_json: dict) -> bool:
    try:
        required_location = str(criterion.get('value', 'a_very_unlikely_string')).lower()
        searchable_text = json.dumps(resume_json.get('experience', []) + resume_json.get('education', [])).lower()
        if required_location in searchable_text: return True
        # Check top-level contact info as well
        return required_location in f"{resume_json.get('name', '')} {resume_json.get('phone', '')}".lower()
    except Exception: return False

#########################################################################


def check_knockout_criteria_python(resume_json: dict, job_obj: dict) -> dict:
    knockout_data = job_obj.get("knockout_questions_json", {})
    if isinstance(knockout_data, str):
        try:
            knockout_data = json.loads(knockout_data)
        except json.JSONDecodeError:
            knockout_data = {}

    all_criteria = knockout_data.get("criteria", [])
    if not all_criteria:
        return {
            "passed": True,
            "score": 100,
            "met_criteria": [],
            "missed_criteria": [],
            "reason": "No knockout criteria defined."
        }

    met_criteria = []
    missed_criteria = []

    total_candidate_years = sum(
        _parse_duration_to_years(exp.get('duration', ''))
        for exp in resume_json.get('experience', [])
    )

    for criterion in all_criteria:
        ctype = criterion.get("type", "").lower()

        if ctype == "experience_years":
            if _check_experience(criterion, total_candidate_years):
                met_criteria.append(criterion)
            else:
                missed_criteria.append(criterion)

        elif ctype == "education":
            if _check_education(criterion, resume_json.get("education", [])):
                met_criteria.append(criterion)
            else:
                missed_criteria.append(criterion)

        elif ctype == "location":
            if _check_location(criterion, resume_json):
                met_criteria.append(criterion)
            else:
                missed_criteria.append(criterion)

    total_criteria_count = len(all_criteria)
    met_count = len(met_criteria)
    score = (met_count / total_criteria_count) * 100 if total_criteria_count > 0 else 100
    passed = score >= 50

    final_reason = f"Candidate met {met_count} of {total_criteria_count} mandatory criteria ({int(score)}%)."

    return {
        "passed": passed,
        "score": int(score),
        "met_criteria": met_criteria,
        "missed_criteria": missed_criteria,
        "reason": final_reason
    }

# --- Main validation function (Orchestrator) ---
MATCH_THRESHOLD = 70
evaluation_llm = ChatGroq(model="llama3-70b-8192", temperature=0)


matching_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "**Role:** You are a hyper-critical AI recruitment analyst. Your task is to score a candidate's fit for a job, focusing entirely on tangible, demonstrated alignment. You must penalize superficial strengths.\n\n"
     "**Instructions:** Return only an integer score between 0 and 100.\n\n"
     "**Evaluation Criteria:**\n\n"
     "🔹 **1. Skills Match (35 points):**\n"
     "- Compare candidate skills directly against the job's required skills.\n"
     "- **CRITICAL RULE**: If the candidate's work experience does not explicitly mention using a listed skill, that skill's value is halved. A list of skills without proof of application is a major red flag.\n\n"
     "🔹 **2. Experience Match (25 points):**\n"
     "- **CRITICAL RULE**: Score this section based ONLY on the direct relevance of job titles and descriptions to the job requirements. Experience in a different field MUST receive a score of 0 for this section, even if the skills are transferable.\n"
     "- Deduct points severely if the years of *relevant* experience are less than required.\n\n"
     "🔹 **3. Education Match (10 points):**\n"
     "- Score based on direct alignment with the required degree and field.\n\n"
     "🔹 **4. Project Relevance (20 points):**\n"
     "- Score ONLY projects that use technologies and solve problems directly related to the job.\n\n"
     "🔹 **5. Holistic Review (10 points):**\n"
     "- Review the entire resume for consistency and professionalism. Award points for clear, impactful descriptions. Deduct points for vagueness, typos, or a resume that seems like a 'keyword stuff'.\n\n"
      "🔹 **Penalty Rules:**\n"
        "- If <50% of required skills are proven in work experience → subtract 15 points.\n"
        "- If relevant experience years < 50% of required → subtract 10 points.\n"
        "- If resume has no specific achievements → subtract 5–20 points.\n"
        "- If 0 relevant projects → subtract 10 points.\n"
        "Apply these AFTER computing category scores, then return final adjusted score."
     "**Scoring Philosophy:**\n"
     "- A 'Career Changer' will score low in Experience but can still get a moderate score from Skills and Projects.\n"
     "- A 'Keyword Stuffer' will score very low because their Skills score will be halved and their Holistic Review score will be poor.\n"
     "- Do NOT return explanations. Return only a clean integer score between 0–100."
    
     ),
    ("human",
     "**Candidate Resume (structured JSON):**\n{resume}\n\n"
     "**Job Description:**\n{job_desc}\n\n"
     "📊 Score this candidate based on the criteria above. Return only the numeric score.")
])
evaluation_chain = matching_prompt | evaluation_llm | parser

OVERRIDE_SCORE_CAP = 40

def apply_quantitative_logic(score: int, resume_json: dict, job_reqs: dict) -> dict:
    """
    Applies a simple, hard-coded logic check to the AI's score and returns a
    full evaluation dictionary.
    """
    total_experience = 0
    if resume_json.get('experience'):
        for exp in resume_json['experience']:
            # Assumes you have a helper function _parse_duration_to_years
            total_experience += _parse_duration_to_years(exp.get('duration', ''))
            
    required_experience = job_reqs.get('required_years', 0)
    
    # --- This is the main logic check ---
    if score >= MATCH_THRESHOLD and required_experience > 0 and total_experience < (required_experience / 2):
        
        # --- FIX: Build the full dictionary on override ---
        new_score = OVERRIDE_SCORE_CAP
        reason = (f"AI score ({score}%) overridden. Candidate experience ({total_experience} yrs) is less than "
                  f"50% of required ({required_experience} yrs).")
        
        return {
            "score": new_score,
            "decision": "Not Recommended",
            "reason": reason
        }
    
    # --- FIX: Also return a full dictionary on success ---
    # This ensures the function always returns the same data structure
    decision = "Recommended" if score >= MATCH_THRESHOLD else "Not Recommended"
    reason = f"AI Match Score: {score}% (Threshold: {MATCH_THRESHOLD}%)"

    return {
        "score": score,
        "decision": decision,
        "reason": reason
    }
    
def parse_score(raw: str) -> int:
    """Parses a raw string to extract an integer score."""
    try:
        match = re.search(r'\d+', raw.strip())
        return int(match.group(0)) if match else 0
    except (ValueError, TypeError):
        return 0

def evaluate_candidate_llm(resume_json: dict, job_requirements: dict) -> dict:
    """Evaluates candidate eligibility using an LLM and validates with quantitative logic."""
    max_retries = 3
    initial_retry_delay = 5
    job_description = job_requirements.get('description', '') # Extract description from the job data

    for attempt in range(max_retries):
        try:
            result_raw = evaluation_chain.invoke({
                "resume": json.dumps(resume_json, indent=2), 
                "job_desc": job_description
            })
            
            initial_score = parse_score(result_raw)
            
            # --- FIX STARTS HERE ---
            # Call the logic function and get the complete evaluation dictionary.
            final_evaluation = apply_quantitative_logic(initial_score, resume_json, job_requirements)
            
            # Simply return the dictionary, as it already contains the final score, decision, and reason.
            return final_evaluation
            # --- FIX ENDS HERE ---

        except RateLimitError as e:
            print(f"Rate limit hit during evaluation (attempt {attempt + 1}/{max_retries}): {e}")
            sleep_time = initial_retry_delay * (2 ** attempt)
            match = re.search(r'Please try again in (\d+\.?\d*)s', str(e))
            if match:
                try: sleep_time = max(sleep_time, float(match.group(1)))
                except ValueError: pass
            if attempt < max_retries - 1: time.sleep(sleep_time)
            else: return {"score": 0, "decision": "Not Recommended", "reason": "Rate limit consistently hit."}
        except Exception as e:
            # This is where your error message was printed from
            print(f"An unexpected error occurred during evaluation: {e}")
            return {"score": 0, "decision": "Not Recommended", "reason": f"Error during evaluation: {str(e)}"}


detailed_feedback_prompt = ChatPromptTemplate.from_messages([
    ("system",
     """You are an expert AI Principal Technical Recruiter. Your task is to write a supportive, insightful, and professional feedback paragraph for a rejected candidate. Your response MUST be a single, concise paragraph and must NOT include the candidate's score.

--- **Analysis Protocol** ---
First, analyze the candidate's entire profile to identify their archetype and then apply the specific protocol.

--- **Feedback Generation Protocols** ---

**1. Standard Protocol (Default):**
- **Use When**: The candidate is a standard fit but is missing a key skill or the required years of experience.
- **Action**: Acknowledge their relevant background, pinpoint the specific technical gap (e.g., "lack of hands-on experience with Kubernetes"), and suggest a targeted action plan (e.g., "pursuing a CKA certification").

**2. Career Changer Protocol:**
- **Use When**: The candidate has strong skills but from a different professional field (e.g., a Backend Developer applying for a DevOps role).
- **Action**: Acknowledge their strong technical foundation. Frame the feedback around **bridging** their current skills to the new field. Mention both the specific technical gap (e.g., "cloud infrastructure") and the need to demonstrate how their existing backend skills apply to DevOps challenges.

**3. Job Hopper Protocol:**
- **Use When**: The candidate has relevant skills but has held multiple short-term roles (many under 1.5 years).
- **Action**: Frame the feedback around the need to demonstrate deeper, long-term project impact. Mention the technical skill gap but also subtly hint at the importance of showing project ownership and **stability** through longer tenures or significant project contributions.

**4. Overqualified Protocol:**
- **Use When**: The candidate is far too senior for the role (e.g., a Principal Architect for a Senior Engineer role).
- **Action**: Acknowledge their extensive experience. Frame the feedback around a mismatch in **scope** and responsibilities. Suggest that the role wouldn't fully utilize their strategic or architectural skills and that they are better suited for higher-level positions.

**CRITICAL META-INSTRUCTION**: In your response, you MUST integrate the unique advice from the chosen protocol. For example, for a Career Changer, you MUST use the word "bridge"; for a Job Hopper, you MUST mention "stability" or "duration". This is not optional.

--- **Example Output (For a Career Changer)** ---
'While your extensive experience as a backend developer is impressive, this role required a dedicated focus on cloud and infrastructure that was not the primary emphasis of your background. To successfully **bridge** your strong software engineering skills to a DevOps career, we recommend focusing on foundational cloud certifications and building projects that specifically solve infrastructure challenges, which would powerfully complement your existing development expertise.'
"""),

    ("human",
     "Candidate Resume (JSON):\n{resume}\n\n"
     "Job Description:\n{job_desc}\n\n"
     "Based on the protocols, provide a single, supportive paragraph of feedback.")
])
feedback_llm = ChatGroq(model="llama3-70b-8192", temperature=0)
feedback_chain = detailed_feedback_prompt | feedback_llm | parser
# --- Define a custom exception for this task ---
class FeedbackGenerationError(Exception):
    """Custom exception for failures during feedback generation."""
    pass

def generate_detailed_feedback(resume_json: dict, job_description: str, score: int) -> str:
    """
    Generates detailed feedback for non-eligible candidates.
    Raises FeedbackGenerationError on failure.
    """
    max_retries = 3
    initial_retry_delay = 5

    for attempt in range(max_retries):
        try:
            # On success, return the feedback string directly
            feedback = feedback_chain.invoke({
                "resume": json.dumps(resume_json, indent=2), 
                "job_desc": job_description, 
                "score": score
            })
            return feedback

        except RateLimitError as e:
            logging.warning(f"Rate limit hit during feedback generation (attempt {attempt + 1}/{max_retries}): {e}")
            if attempt >= max_retries - 1:
                # After the last retry, raise the custom exception
                raise FeedbackGenerationError("Failed due to persistent rate limits.") from e
            
            # Your existing backoff logic is good
            sleep_time = initial_retry_delay * (2 ** attempt)
            match = re.search(r'Please try again in (\d+\.?\d*)s', str(e))
            if match:
                try: sleep_time = max(sleep_time, float(match.group(1)))
                except ValueError: pass
            time.sleep(sleep_time)

        except Exception as e:
            # For any other error, log it and raise the custom exception immediately
            logging.error(f"An unexpected error occurred during feedback generation: {e}")
            raise FeedbackGenerationError(f"Could not generate feedback due to an internal error: {e}") from e

    # This line is technically unreachable but good practice to have
    raise FeedbackGenerationError("Failed to generate feedback after all retries.")

selection_reason_prompt = ChatPromptTemplate.from_messages([
    ("system",
     """You are an expert AI replica of a Senior Hiring Manager. Your task is to write a concise, strategic paragraph explaining a hiring decision.

--- **Core Directive: Create a Strengths-Based Narrative** ---
Synthesize the candidate's skills, experience, and projects to explain *why* they are a strong fit for the specific challenges of this role.

--- **Analysis & Synthesis Protocol** ---
1.  **Identify the Primary Strength**: Pinpoint the candidate's single most compelling qualification for this role.
2.  **Find Supporting Evidence**: Select one or two other strong points that reinforce the primary strength.
3.  **Connect to the Job**: Explicitly tie these strengths back to the key requirements in the job description.

--- **MISMATCH PROTOCOL (Critical Edge Case)** ---
- **IF** the candidate's core experience and skills are for a completely **different role** (e.g., a Data Scientist applying to a Backend Engineer job), your primary task is to state this mismatch clearly.
- **DO NOT** try to invent reasons why they would be a good fit.
- Your output should explain that while the candidate is skilled, their expertise is in a **different field** and does not align with this specific position's requirements.

**CRITICAL CONSTRAINTS:**
- Your response MUST be a single, professional paragraph.
- Do NOT mention the numeric score.
- The tone should be confident and decisive.

--- **Example Output (For a Mismatched Role)** ---
'While the candidate has a strong background in data science, their experience does not align with the core requirements of this Senior Backend Engineer role. The position requires a deep focus on building scalable REST APIs with frameworks like Django/Flask, which is a different skill set from their expertise in data analysis and machine learning.'
"""),

    ("human",
     "Candidate Resume (JSON):\n{resume}\n\n"
     "Job Description:\n{job_desc}\n\n"
     "Based on the protocol, provide the strategic reason for this hiring decision:")
])
selection_reason_llm = ChatGroq(model="llama3-70b-8192", temperature=0)
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

#######################################################

def get_evaluation_with_reason(resume_json: dict, job_requirements: dict) -> dict:
    """
    Orchestrates the entire candidate evaluation process:
    1. Gets a base score from an AI.
    2. Applies quantitative override logic.
    3. Fetches a detailed reason based on the final decision.
    """
    job_description = job_requirements.get('description', '')

    # Step 1: Get the initial AI score (using the simple evaluation chain)
    try:
        raw_score_str = evaluation_chain.invoke({
            "resume": json.dumps(resume_json, indent=2),
            "job_desc": job_description
        })
        initial_score = parse_score(raw_score_str)
    except Exception as e:
        logging.error(f"Failed to get initial score from LLM: {e}")
        return {"score": 0, "decision": "Not Recommended", "reason": "Error during initial AI scoring."}

    # Step 2: Apply the quantitative logic to get the final score and decision
    # This function already contains your experience override rule
    final_evaluation = apply_quantitative_logic(initial_score, resume_json, job_requirements)
    
    final_decision = final_evaluation.get("decision")
    final_score = final_evaluation.get("score")

    # Step 3: Fetch the detailed reason based on the final decision
    try:
        if final_decision == "Recommended":
            # If recommended, get the positive selection reason
            final_evaluation['reason'] = generate_selection_reason(
                resume_json, job_description, final_score
            )
        else:
            # If not recommended, get the constructive feedback
            # The override reason from apply_quantitative_logic will be replaced by this more detailed one.
            final_evaluation['reason'] = generate_detailed_feedback(
                resume_json, job_description, final_score
            )
    except (FeedbackGenerationError, Exception) as e:
        logging.error(f"Failed to generate detailed reason: {e}")
        # Fallback to the simple reason if the detailed generation fails
        final_evaluation['reason'] = f"AI Match Score: {final_score}%. Reason generation failed."

    return final_evaluation
#######################################################
exam_generation_prompt = ChatPromptTemplate.from_messages([
    ("system",
     """You are an AI assistant that generates technical exam questions. Your entire response MUST be a single, valid JSON object with no other text.

--- **Core Directive: Assess Competency Levels** ---
Generate **exactly 3** technical questions designed to test a candidate on three levels:
1.  **Core Knowledge**: A fundamental concept.
2.  **Practical Application**: Using a key tool or solving a common problem.
3.  **Problem-Solving**: A brief, hypothetical scenario.
--- **CRITICAL RULE: Contextual Grounding** ---
You MUST incorporate the key technologies and terms from the provided job description into your questions. For example, if the job description mentions "Kotlin" and "Jetpack," your questions must be about Android development using Kotlin and Jetpack. Do not generate generic programming questions.

--- **STRICT JSON SCHEMA** ---
- The output MUST be a single JSON object: `{{"questions": {{...}}}}`.
- The `questions` key holds a list of exactly 3 objects.
- Each object MUST contain `id` (string), `question` (string), and `ideal_answer` (string).
- **CRITICAL**: All keys and string values must be enclosed in **double quotes (`"`)**.


--- **Example Output (for a Frontend Developer role)** ---
{{
  "questions": 
    {{
      "id": "q1_knowledge",
      "question": "What is the difference between `let`, `const`, and `var` in JavaScript?",
      "ideal_answer": "`var` is function-scoped, while `let` and `const` are block-scoped. `let` can be reassigned, but `const` cannot, making it suitable for variables that should not change."
    }},
    {{
      "id": "q2_application",
      "question": "You need to fetch data from a REST API when a React component mounts. Which hook would you use and why?",
      "ideal_answer": "I would use the `useEffect` hook with an empty dependency array (`[]`). This ensures the fetch operation runs only once after the component mounts, preventing infinite loops."
    }},
    {{
      "id": "q3_problem_solving",
      "question": "A user reports that a web page is loading very slowly. What are the first 3 things you would investigate?",
      "ideal_answer": "First, I would check the browser's Network tab to identify large assets like unoptimized images. Second, I'd analyze the JavaScript bundle size for potential code splitting. Third, I would examine the API response times to check for backend bottlenecks."
    }}
  
}}
--- **Final Audit Protocol (Mental Check)** ---
1.  Is my output ONLY a JSON object?
2.  Are all my keys and strings enclosed in double quotes?
3.  Are there any trailing commas? (If yes, remove them).

Now, process the request according to these unbreakable rules.
     """),
     ("human", "Job Description:\n{job_desc}\n\nGenerate the 3 exam questions in the specified JSON format.")
])

def generate_exam_llm(job_description: str) -> Optional[List[dict]]:
    """Generates exam questions using the LLM chain with improved JSON cleaning."""
    exam_llm = ChatGroq(model="llama3-70b-8192", temperature=0.4)
    exam_generation_chain = exam_generation_prompt | exam_llm | StrOutputParser()
    max_retries = 3
    for attempt in range(max_retries):
        try:
            raw_response = exam_generation_chain.invoke({"job_desc": job_description})
            
            # --- IMPROVED, MORE AGGRESSIVE JSON CLEANING ---
            # Find the JSON object within the raw string
            match = re.search(r'\{.*\}', raw_response, re.DOTALL)
            if not match:
                raise json.JSONDecodeError("No valid JSON object found in the AI's response.", raw_response, 0)
            
            json_content = match.group(0)
            
            # Repair common errors like trailing commas
            json_content = re.sub(r",\s*([\]}])", r"\1", json_content)

            parsed_dict = json.loads(json_content)
            
            if "questions" not in parsed_dict or not isinstance(parsed_dict["questions"], list):
                raise Exception("Root 'questions' key is missing or not a list.")

            return parsed_dict.get("questions", [])

        except Exception as e:
            print(f"ERROR on attempt {attempt + 1} during exam generation: {e}")
            if attempt == max_retries - 1:
                return None # Return None after all retries fail
    return None

answer_evaluation_prompt = ChatPromptTemplate.from_messages([
    ("system",
     """
You are an AI Exam Proctor and elite Subject Matter Expert, grading candidate answers with precision equal to the top 1% of human graders.

=====================
INTERNAL ANALYSIS (DO NOT INCLUDE IN OUTPUT)
=====================
Step 1 — Plagiarism Analysis:
- Compare to ideal answer.
- If ≥80% same phrasing/structure or generic textbook style with no depth → plagiarized.
- Mark: PLAGIARIZED = YES / NO (internally).

Step 2 — If PLAGIARIZED = YES:
- Score = 1
- Feedback must start with: "Answer appears plagiarized or unoriginal."
- Skip rubric scoring.

Step 3 — If PLAGIARIZED = NO:
Score each category separately:
Correctness (0–5):
- 5 Fully correct, all parts covered.
- 4 Mostly correct, 1–2 small gaps.
- 3 Main idea correct, several missing points.
- 2 Significant misunderstandings.
- 1 Minimal correctness.
- 0 Fully wrong.

Depth (0–3):
- 3 Explains why/how with examples.
- 2 Some reasoning but lacks depth.
- 1 Surface-level.
- 0 No reasoning.

Clarity (0–2):
- 2 Clear and concise.
- 1 Understandable but wordy/unclear.
- 0 Hard to follow.

Final Score = Correctness + Depth + Clarity (max 10).

Step 4 — Feedback:
- Short, direct, actionable.
- Mention exact category scores in parentheses.

=====================
OUTPUT FORMAT (STRICT)
=====================
Return ONLY:
{{ 
  "score": <integer>, 
  "feedback": "<string>" 
}}
Must start with '{{' and end with '}}'. No markdown, no extra text.

=====================
EXAMPLES
=====================
Plagiarism:
{{ "score": 1, "feedback": "Answer appears plagiarized or unoriginal. Please provide your own explanation." }}

Non-plagiarized, strong answer:
{{ "score": 8, "feedback": "Correct (5/5) and deep (3/3), but could be more concise (1/2)." }}

Now analyse and grade accordingly.
     """),
    ("human",
     "Job Description:\n{job_desc}\n\n"
     "Question:\n{question}\n\n"
     "Ideal Answer:\n{ideal_answer}\n\n"
     "Candidate's Answer:\n{answer}\n\n"
     "Return only the JSON object as per the rules above.")
])


answer_evaluation_llm = ChatGroq(model="llama3-70b-8192", temperature=0)
answer_evaluation_chain = answer_evaluation_prompt | answer_evaluation_llm | parser
def evaluate_answer_llm(job_description: str, question: str, ideal_answer: str, answer: str) -> dict:
    """Evaluates a single answer using the LLM chain with strict JSON compliance and plagiarism detection."""
    max_retries = 3
    retry_delay = 5
    raw_json_str = None  # Initialize to avoid UnboundLocalError

    for attempt in range(max_retries):
        try:
            raw_json_str = answer_evaluation_chain.invoke({
                "job_desc": job_description,
                "question": question,
                "ideal_answer": ideal_answer,
                "answer": answer
            })

            # Remove any code fences just in case
            cleaned_json_str = re.sub(r"^```(?:json)?\n", "", raw_json_str.strip())
            cleaned_json_str = re.sub(r"\n```$", "", cleaned_json_str)

            if not cleaned_json_str.startswith("{") or not cleaned_json_str.endswith("}"):
                raise ValueError("LLM output not in valid JSON object format.")

            parsed = json.loads(cleaned_json_str)
            return {
                "score": int(parsed.get("score", 0)),
                "feedback": str(parsed.get("feedback", "No feedback provided."))
            }

        except (json.JSONDecodeError, ValueError) as e:
            print(f"JSON parsing error on attempt {attempt + 1}: {e}")
        except RateLimitError as e:
            wait_time = retry_delay * (2 ** attempt)
            match = re.search(r'Please try again in (\d+\.?\d*)s', str(e))
            if match:
                wait_time = max(wait_time, float(match.group(1)))
            print(f"Rate limit hit, retrying in {wait_time}s...")
            time.sleep(wait_time)
        except Exception as e:
            print(f"Error evaluating answer: {e}, Raw: {raw_json_str}")

        if attempt < max_retries - 1:
            time.sleep(retry_delay * (2 ** attempt))

    return {"score": 0, "feedback": "Evaluation failed after multiple attempts due to output errors or rate limits."}

# Project Insights Chain
project_insights_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are a highly skilled technical project analyst. Carefully analyze the provided project README content and extract the following structured information into a valid JSON object:\n\n"
     "1. `purpose`: A concise summary of the main purpose or objective of the project (2-3 sentences).\n"
     "2. `key_features`: A list of 3-7 standout features, functionalities, or capabilities of the project.\n"
     "3. `technologies_used`: A list of the main technologies, libraries, frameworks, or programming languages used (3-7 items).\n"
     "4. `target_users`: Who the intended users are (e.g., students, HR teams, enterprise clients, developers, etc.).\n"
     "5. `project_challenges`: List 3-4 major technical or non-technical challenges the developer faced during implementation.\n"
     "6. `business_value`: A 3-4 sentence explanation of how this project provides value to businesses, users, or stakeholders.\n"
     "7. `future_scope`: 3-5 improvements or features planned for future versions of the project.\n"
     "8. `design_considerations`: 3-5 design principles, patterns, or architectural decisions that shaped the implementation.\n\n"
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
    for attempt in range(max_retries):
        try:
            raw_json_str = project_insights_chain.invoke({"readme_content": readme_content})
            
            # Find the JSON object within the raw string
            match = re.search(r'\{.*\}', raw_json_str, re.DOTALL)
            if not match:
                raise json.JSONDecodeError("No valid JSON object found.", raw_json_str, 0)
            
            json_content = match.group(0)
            parsed_dict = json.loads(json_content)
            
            # --- ADD THIS SANITIZATION BLOCK ---
            # If the AI returns target_users as a string, convert it to a list
            if 'target_users' in parsed_dict and isinstance(parsed_dict['target_users'], str):
                parsed_dict['target_users'] = [parsed_dict['target_users']]
            # --- END OF FIX ---

            validated_insights = ProjectInsights(**parsed_dict)
            return validated_insights.model_dump(exclude_none=True)
            
        except (json.JSONDecodeError, PydanticValidationError, Exception) as e:
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

# evaluation_prompt_template = [
#     {
#       "role": "system",
#         "content": """
# **Role: ##You are a seasoned, discerning AI recruitment expert with a deep understanding of human potential, career trajectories, and market dynamics. Your task is to provide a comprehensive, nuanced assessment of a candidate's fit for a specific job role, blending strict adherence to job requirements with an expert's eye for transferable skills, growth potential, and the overall narrative of the resume. Beyond simple keyword matching, you must analyze *why* certain scores are given, what a human recruiter would observe, and pinpoint both strengths and potential areas of concern (red flags). Your final output must reflect a holistic, expert-level judgment, not just a mechanistic score.##**

# **STRICT ADHERENCE RULE:** "If there is *any doubt* about direct alignment, or if only very few *broadly* relevant items match, **assign 0 points for that category immediately.** Only assign partial scores if there is clear, direct, but incomplete alignment with *specific* requirements. Do not assign max points unless there's **near-perfect, direct alignment**."

# **Step 1: Job Description Analysis (MANDATORY)**
# Before scoring the resume, extract the following from the job description:
# 1. **Required Skills** – Must-have technical and soft skills.
# 2. **Preferred Skills** – Nice-to-have skills.
# 3. **Key Responsibilities** – Core experience expected.
# 4. **Required Education** – Degrees, fields, or certifications.
# 5. **Relevant Projects/Technologies** – Specific domains, stacks, or problem types.

# If the JD is malformed, irrelevant, or nonsensical, assign 0 for all scores immediately.

# ---

# **Step 2: Candidate Evaluation**
# Compare the candidate resume **strictly against the extracted JD elements**.

# **Important Validation Rule (Non-Match Handling):**
# - If the candidate resume is malformed, or does not contain relevant information for evaluation (e.g. fake/unrelated content, or obviously non-resume text), return 0 immediately.
# - Also return 0 immediately if the content is irrelevant, nonsensical, or clearly not a resume.
# - Do not proceed with the score breakdown in such cases.

# **Evaluation Criteria:(very important to consider these points of Evaluation Criteria)**
# **1. Skills Match (35 points):**
# **- VERY VERY IMPORTANT: Compare candidate skills with REQUIRED AND PREFERRED skills ONLY. Strictly disregard anything not mentioned in the job description for direct scoring.**
# **- VERY IMPORTANT: Score based ONLY on skills EXPLICITLY REQUIRED/PREFERRED in the job description. If a skill is not listed in the JD, it gets 0 points for direct match. HOWEVER, in your reasoning, you *may note* highly valuable transferable skills (e.g., strong Python fundamentals for a JavaScript role) but these do NOT contribute to points unless explicitly asked for in the JD.**
# **- SCORING METHOD: Score 30-35 for NEAR-PERFECT, DIRECT overlap with *most* required/preferred skills. Score 15-29 for significant, direct overlap with *some* required/preferred skills. Score 1-14 for minimal, *direct* overlap with *very few* specific required/preferred skills. **Assign 0 points if no EXPLICITLY relevant skills are found.**
# **- STRICT: Evaluate both quality and quantity. If a candidate provides non-meaningful skills or general skills not listed in the JD, these contribute 0 points.**
# **##BE EXTREMELY STRICT WHILE SCORING THIS SECTION. ONLY EXACT MATCHES GET POINTS.##**

# **2. Experience Match (25 points):**
# **- Compare the candidate’s work history to job responsibilities and expectations.**
# **- VERY VERY IMPORTANT: Experience in a DIFFERENT FIELD or experience that is NOT DIRECTLY APPLICABLE to the job description = **0 points**. This includes 'overqualified' experience that lacks direct relevance. However, your reasoning *should highlight* any highly relevant transferable experiences (e.g., project management in an unrelated field if the JD emphasizes organization).**
# **- Score based STRICTLY on relevance, depth, and duration of experience *as it pertains directly to the JD's requirements*.**
# **- Strictly use the "experience" field. If it's missing, assign 0 for experience_score.**
# **- Strictly compare years of experience; deduct heavily if less than required. If duration is very short and relevance is low, lean towards 0 points.**
# **- Consider the *impact* and *accomplishments* over just duration. Are the descriptions result-oriented?**
# **##BE EXTREMELY STRICT WHILE SCORING THIS SECTION.##**

# **3. Education Match (20 points):**
# **- Check if the candidate meets or exceeds the REQUIRED academic qualifications outlined in the JD. If specific degree or field is required, others get 0 points. However, acknowledge strong academic performance or highly analytical fields even if not a direct match, but do not score them.**
# **- Prefer complete records. Incomplete timelines = partial credit.**
# **- If education is missing, assign 0 for education_score.**
# **- Also consider GPA if provided; low cumulative_gpa = 0 points. If good, provide good points, but only if the *field of study is directly relevant*. Note any strong academic institutions or honors.**
# **##BE EXTREMELY STRICT WHILE SCORING THIS SECTION.##**

# **4. Project Relevance (20 points):**
# **- Evaluate projects based on their DIRECT RELEVANCE, complexity, and impact *to the specific requirements of the job description*.**
# **- Prefer real-world applications ALIGNED PRECISELY with job needs.**
# **- STRICTLY: If a project is not directly aligned with the job description's technical stack or problem domain, it receives **0 points**, even if impressive in another field. You *may note* innovative projects that demonstrate problem-solving even if the domain is different, but they score 0 points.**
# **- STRICTLY: If only one project is provided, evaluate it strictly on direct impact and alignment. Do not give full points for quantity alone.**
# **- Assess whether projects show independent initiative, problem-solving abilities, and practical application of skills.**
# **##BE EXTREMELY STRICT WHILE SCORING THIS SECTION.##**

# **Scoring Philosophy:**
# - Use only explicit info for *scoring*. Don’t infer hidden strengths for *points*.
# - Return only a clean integer score between 0–100.
# - **Human Touch:** While scoring is strict, your reasoning should delve deeper, offering insights a human recruiter would consider beyond the score: transferable skills, growth indicators, and potential red flags.

# **VERY VERY IMPORTANT : If a required section is missing, assign 0 for that part of the score.**
# **VERY VERY IMPORTANT : If a section (e.g. experience or any other section) is missing, score it as 0 — no assumptions allowed for any section.**

# - If valid, evaluate using the rubric below and return the **score breakdown in this exact JSON format**:
# ```json
# {
#   "skills_score": 0,
#   "experience_score": 0,
#   "education_score": 0,
#   "project_score": 0,
#   "total_score": 0,
#   "reasoning": {
#     "skills_reasoning": "<Explain why this score was given. Crucially, if 0 points were given, explain *why* (e.g., lack of direct match to required skills). If there are valuable *transferable* skills not scored, explicitly mention their relevance and **discuss if they indicate a strong aptitude or learning agility relevant to the role, even if the exact skill isn't present.** Identify any gaps.>",
#     "experience_reasoning": "<Explain why this score was given, focusing on direct relevance to the JD. If experience is in a different field, explicitly state it received 0 points due to lack of direct relevance. Note specific accomplishments and their quantifiable impact. Critically, **discuss how the experience highlights problem-solving abilities, independent initiative, adaptability, or other soft skills** crucial for a professional role, regardless of direct domain match. Identify any red flags like short tenures, career gaps, or vague descriptions.>",
#     "education_reasoning": "<Explain why this score was given, focusing on the *direct alignment* of the degree, major, and GPA with the job description's specific requirements. If the field of study is not directly relevant to the JD, explicitly state that it received 0 points for direct match. **However, in your expert capacity, comment on the quality of the institution, the analytical rigor implied by the degree (e.g., strong statistical or mathematical foundations), or any notable academic achievements (honors, high GPA if provided) that demonstrate a candidate's intellectual capacity and learning ability, even if not a direct vocational fit for THIS role.** Also, note any mismatch in required degree level or incomplete timelines.>",
#     "project_reasoning": "<Explain why this score was given, focusing on direct technical relevance to the JD's stack/domain. If projects are in an unrelated field, explicitly state 0 points given for direct relevance. **However, thoroughly comment on the candidate's independent initiative, depth of understanding, innovation, and the complexity of the problems solved**, even if the domain differs. Discuss the quality of execution seen in projects, if details allow. Identify if links are missing, non-functional, or if project descriptions are vague.>",
#     "overall_assessment": "<As a recruiter expert, provide a concise, strategic holistic summary. **Analyze the candidate's general career trajectory and identify their core strengths and areas for development as they relate to the hiring market.** What is the overall 'feel' of the resume? **Based on their background, what kind of roles (even outside this specific JD) might they be an excellent fit for?** Is there high potential and a strong growth mindset despite current gaps? Summarize any critical red flags (e.g., consistent vague descriptions, frequent short tenures, major gaps without explanation, or professionalism issues). Finally, **provide specific, actionable recommendations for a human recruiter regarding next steps for THIS role (e.g., immediate reject, strong potential for interview despite score if X/Y is true, consider for junior role, or recommend for a different but related open position within the company).**>"
#   }
# }
# ** Use Job Description:**\n{job_desc}\n\n for the analysis if the description is not relevant or contains gibberish words. The total analysis should be based on this with compare to **Candidate Resume (structured JSON):**\n{resume}\n\n
# ```"""
#     }
# ]

evaluation_prompt_template = [
    {
        "role": "system",
        "content": """
**Role:** You are a seasoned AI recruitment expert with deep knowledge of talent evaluation, career trajectories, and market dynamics. Your task is to provide a **holistic, nuanced assessment** of a candidate's fit for a job, combining strict adherence to the JD with insight into transferable skills, growth potential, and overall resume narrative.

**STRICT ADHERENCE RULE:**  
- If there is any doubt about direct alignment, or if very few *specific* items match, **assign 0 points** for that category.  
- Partial points are only allowed for clear, direct but incomplete alignment.  
- Do not assign max points unless there is near-perfect, direct alignment with JD requirements.

**Use Job Description:**\n{job_desc}\n\n
- Always base the analysis on this Job Description.
- If the JD is irrelevant, malformed, or contains gibberish, assign 0 points for all categories.
- Compare the JD strictly against **Candidate Resume (structured JSON):**\n{resume}\n\n
very important -**If the Job Description does NOT clearly list required skills, responsibilities, education, or projects, treat it as invalid and assign 0 points for that particular category. **
**Do NOT try to guess or assume content from vague or minimal text. Only analyze if explicit JD elements are present.**
---
**Step 1: Job Description Analysis (MANDATORY)**  
Extract the following explicit requirements from the JD:  
1. Required Skills – must-have technical/soft skills  
2. Preferred Skills – nice-to-have skills  
3. Key Responsibilities – core duties  
4. Required Education – degree, field, certifications  
5. Relevant Projects/Technologies – domains, tech stacks, problem types  

**If the JD is malformed, irrelevant, or nonsensical, assign 0 points for all categories immediately.**

---

**Step 2: Candidate Evaluation**  
Compare the candidate resume **strictly against the extracted JD elements**.

**Important Validation:**  
- If the resume is malformed, unrelated, or nonsensical, assign 0 points for all categories immediately.  
- Only explicit matches with JD requirements contribute to scores; transferable skills may be noted in reasoning but do **not** contribute points.

**Evaluation Criteria:**  

**1. Skills Match (35 points)**  
- Compare candidate skills with **required and preferred skills only**.  
- Strictly 0 points for skills not listed in the JD.  
- Partial points only for partial matches.  
- Score 30–35: near-perfect alignment; 15–29: some alignment; 1–14: minimal alignment; 0: no direct match.

**2. Experience Match (25 points)**  
- Compare work history to JD responsibilities.  
- Unrelated or overqualified experience = 0 points.  
- Consider relevance, depth, duration, impact, accomplishments.  
- Note transferable experience in reasoning, but 0 points if not directly relevant.

**3. Education Match (20 points)**  
- Match degree, field, or certification with JD requirements.  
- Incomplete or unrelated education = 0 points.  
- Acknowledge strong academic performance in reasoning without awarding points if not aligned.

**4. Project Relevance (20 points)**  
- Score projects **only for direct technical relevance** to the JD’s stack/domain.  
- Projects outside domain = 0 points (note innovation or problem-solving in reasoning).  
- Assess independent initiative, complexity, and execution quality.

---

**Scoring Philosophy:**  
- Use **only explicit information** for scoring.  
- Missing sections = 0 points.  
- Provide reasoning that explains scores, transferable skills, red flags, and actionable recruiter recommendations.  

**Output JSON Format:**  
```json
{
  "skills_score": 0,
  "experience_score": 0,
  "education_score": 0,
  "project_score": 0,
  "total_score": 0,
  "reasoning": {
    "skills_reasoning": "<Explain exact rationale for score; highlight transferable skills without scoring them; identify gaps>",
    "experience_reasoning": "<Explain direct relevance; highlight accomplishments, red flags, transferable skills>",
    "education_reasoning": "<Explain direct match; note academic rigor or strong performance without awarding points if not aligned>",
    "project_reasoning": "<Explain direct technical relevance; highlight problem-solving, initiative, innovation; note gaps>",
    "overall_assessment": "<Holistic summary: career trajectory, strengths, gaps, growth potential, recruiter recommendations>"
  }
}


"""
}]


# --- Main Function for Resume Breakdown ---
def get_resume_score_with_breakdown(resume_json: dict, job_description: str) -> dict:
    """
    Evaluates a candidate's resume against a job description using the Groq API
    and returns a detailed score breakdown including reasoning for each section.

    Args:
        resume_json (dict): A dictionary containing the structured resume information.
        job_description (str): The text content of the job description.

    Returns:
        dict: A dictionary containing the score breakdown, total score, and reasoning
              for each section, or an error message if the evaluation fails.
    """
    evaluation_messages = list(evaluation_prompt_template) # Create a copy to avoid modifying the global template
    evaluation_messages.append({
        "role": "user",
        "content": f"""
**Candidate Resume (structured JSON):**
{json.dumps(resume_json, indent=2)}

**Job Description:**
{job_description}

📊 Score this candidate based on the rubric and return only the score breakdown as JSON.
"""
    })

    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192", # This model is specified in the prompt template for detailed reasoning
            messages=evaluation_messages,
            temperature=0, # Low temperature for consistent, factual output
            max_tokens=1000, # Sufficient tokens for detailed reasoning
            response_format={"type": "json_object"} # Ensure JSON output for structured data
        )
        message_content = response.choices[0].message.content.strip()
        score_data = json.loads(message_content)
        return score_data
    except RateLimitError as e:
        # Implements exponential backoff with a maximum number of retries
        # This part of the logic needs to be handled outside or within a retry decorator
        # For simplicity, returning an error for now
        return {"error": "Rate limit exceeded. Please try again later.", "details": str(e)}
    except json.JSONDecodeError as e:
        # Log the raw response if JSON parsing fails to aid debugging
        raw_response_content = response.choices[0].message.content if 'response' in locals() else "No response object"
        return {"error": "Failed to parse evaluation response from AI. Please try again.", "details": f"{str(e)}. Raw response: {raw_response_content}"}
    except Exception as e:
        # Catch any other unexpected errors
        return {"error": "An unexpected error occurred during evaluation.", "details": str(e)}

temp_analysis_cache = {}
# --- Flask Routes ---
# --- Flask Routes (Corrected for DB usage and consistent authentication) ---
@app.route('/')
def index():
    # 1. Check for user info in the session
    user_info = session.get('user_info')
    user_logged_in = user_info is not None
    is_hr = user_info.get('is_hr', False) if user_info else False

    # 2. Fetch jobs from the Supabase 'jobs' table
    try:
        response = supabase.table('jobs').select('*').order('date_posted', desc=True).execute()
        all_jobs_from_db = response.data
    except Exception as e:
        all_jobs_from_db = []
        flash(f"Could not load jobs: {e}", "danger")

    return render_template('index.html', user_logged_in=user_logged_in, is_hr=is_hr, jobs_data=all_jobs_from_db)

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        try:
            # Authenticate with Supabase
            res = supabase.auth.sign_in_with_password({
                "email": form.email.data,
                "password": form.password.data
            })
            
            # Store session info
            session['user_session'] = res.session.model_dump()
            session['user_info'] = {
                'id': str(res.user.id),
                'email': res.user.email,
                'is_hr': res.user.user_metadata.get('is_hr', False)
            }
            
            flash('Logged in successfully!', 'success')
            
            # --- NEW REDIRECT LOGIC ---
            # 1. Check if the URL has a 'next' parameter
            next_page = request.args.get('next')
            if next_page:
                # If it does, redirect the user back to where they were
                return redirect(next_page)
            
            if res.user.last_sign_in_at is None:
                return redirect(url_for('magic_moment'))
            # --- END OF NEW LOGIC ---
            
            # 2. If no 'next' page, use the role-based redirect as a fallback
            if session['user_info']['is_hr']:
                return redirect(url_for('hr_dashboard'))
            else:
                return redirect(url_for('index'))
            # --- END OF NEW LOGIC ---

        except Exception as e:
            flash('Invalid email or password.', 'danger')
            
    return render_template('login.html', form=form) 
@app.route("/about")
def about():
    return render_template("about.html")
@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/submit_contact", methods=["POST"])
def submit_contact():
    try:
        name = request.form.get("name")
        email = request.form.get("email")
        message = request.form.get("message")

        data = {"name": name, "email": email, "message": message}
        response = supabase.table("contacts").insert(data).execute()

        if response.data:
            flash("✅ Thank you! Your message has been submitted.", "success")
        else:
            flash("❌ Something went wrong. Please try again.", "error")

    except Exception as e:
        flash(f"⚠️ Error: {str(e)}", "error")

    return redirect(url_for("contact"))


@app.route('/magic_moment')
@login_required # Ensure only logged-in users can access this page
def magic_moment():
    # --- ADDED: Check session variable to only show the page once ---
    # If the flag is already True, it means the user has seen this page before.
    if session.get('magic_moment_seen', False):
        # If there's a pending analysis, redirect there, otherwise to index
        if 'pending_analysis_id' in session:
            return redirect(url_for('evaluate_resume'))
        elif current_user.is_hr: # Redirect HRs to their dashboard if they've seen magic moment
            return redirect(url_for('hr_dashboard'))
        else:
            return redirect(url_for('index')) # Default for regular users
    
    # If this is the first visit (magic_moment_seen is False or not set), set it to True
    session['magic_moment_seen'] = True
    
    # Check if a pending resume analysis exists, redirect there first if needed
    # This takes precedence over the magic moment page itself if an analysis is waiting
    if 'pending_analysis_id' in session:
        return redirect(url_for('evaluate_resume'))

    # Render the magic moment page for the first time
    return render_template('magic_moment.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    form = RegisterForm()
    if form.validate_on_submit():
        try:
            # Use Supabase to create the user
            res = supabase.auth.sign_up({
                "email": form.email.data, # Assuming RegisterForm uses email
                "password": form.password.data,
                "options": {
                    "data": {
                        "is_hr": form.is_hr.data
                    }
                }
            })
            flash('Registration successful! Please check your email to confirm your account.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            flash(f'Signup failed: {e}', 'danger')
            
    return render_template('signup.html', form=form)
@app.route('/logout')
@login_required # Use the new decorator
def logout():
    # Invalidate the Supabase token
    supabase.auth.sign_out()
    # Clear the entire session for a clean logout
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/hr_job_upload', methods=['GET', 'POST'])
@login_required # The new login_required will run first
@hr_required    # Then the new hr_required will run
def hr_job_upload():
    if request.method == 'POST':
        try:
            job_description = request.form['job_description']
            
            # The LLM call remains the same
            knockout_q = generate_knockout_questions_llm(job_description)
            knockout_questions_json = json.dumps(knockout_q or {"criteria": []})

            # The data to insert into your Supabase table
            job_data = {
                "id": str(uuid.uuid4()),
                "company_name": request.form['company_name'],
                "job_title": request.form['job_title'],
                "job_description": job_description,
                "date_posted": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "hr_user_id": g.user_id, # Get the user ID from the decorator
                "knockout_questions_json": knockout_questions_json
            }

            # Insert the new job into the 'jobs' table
            supabase.table('jobs').insert(job_data).execute()

            return jsonify({"status": "success", "message": "Job posted successfully!"}), 200

        except Exception as e:
            # The rollback is no longer needed as the insert is a single atomic call
            logging.error(f"CRITICAL ERROR during job upload: {e}") 
            return jsonify({"status": "error", "message": str(e)}), 500

    return render_template('hr_job_upload.html')

@app.route('/candidate_apply', methods=['GET', 'POST'])
@login_required # Use your new Supabase-aware decorator
def candidate_apply():
    # --- GET Request Logic ---
    if request.method == 'GET':
        selected_job_id = request.args.get('job_id')
        selected_job_details = None
        
        if selected_job_id:
            try:
                response = supabase.table('jobs').select('*').eq('id', selected_job_id).single().execute()
                selected_job_details = response.data
            except Exception:
                flash('The job you are looking for was not found.', 'warning')

        jobs_response = supabase.table('jobs').select('id, job_title, company_name, job_description').order('date_posted', desc=True).execute()
        available_jobs = jobs_response.data
        
        return render_template('candidate_apply.html', selected_job=selected_job_details, available_jobs=available_jobs)

    # --- POST Request Logic ---
    if request.method == 'POST':
        try:
            job_id_to_apply = request.form.get('job_id')
            candidate_user_id = session['user_info']['id']
            
            job_response = supabase.table('jobs').select('*').eq('id', job_id_to_apply).single().execute()
            selected_job = job_response.data
            if not selected_job:
                return jsonify({"error": "Invalid Job ID selected."}), 400

            resume_file = request.files.get('resume')
            if not resume_file or resume_file.filename == "":
                return jsonify({"error": "No resume file selected."}), 400
            
            # 1. Upload resume and extract text
            file_content = resume_file.read()
            path_in_bucket = f"{candidate_user_id}/{uuid.uuid4()}_{resume_file.filename}"
            supabase.storage.from_('resumes').upload(
                file=file_content,
                path=path_in_bucket,
                file_options={"content-type": resume_file.content_type}
            )
            resume_url = supabase.storage.from_('resumes').get_public_url(path_in_bucket)
            resume_text = extract_text_from_pdf(file_content)
            if not resume_text:
                return jsonify({"error": "Failed to extract text from resume."}), 400
            
            # 2. Run the main LLM processing pipeline
            extracted_info = extract_resume_info_llm(resume_text)
            knockout_analysis_result = check_knockout_criteria_python(extracted_info, selected_job)
            
            # This is where eligibility_result is correctly defined
            # eligibility_result = evaluate_candidate_llm(extracted_info, selected_job)

            eligibility_result = get_evaluation_with_reason(extracted_info, selected_job)

            # 3. Now, generate exam questions based on the eligibility result
            exam_questions = None
            if "Recommended" in eligibility_result.get("decision", ""):
                job_description = selected_job.get('job_description', '')
                exam_questions = generate_exam_llm(job_description)
                if exam_questions is None:
                    eligibility_result["reason"] += " (Note: Exam generation failed.)"
                    eligibility_result["decision"] = "Recommended (Exam Gen Failed)"
        
            # 4. Create and save the final application record
            application_data = {
                "job_id": selected_job['id'],
                "candidate_user_id": candidate_user_id,
                "submission_date": datetime.now().isoformat(),
                "resume_url": resume_url,
                "eligibility_status": eligibility_result.get("decision"),
                "match_score": eligibility_result.get("score", 0),
                "eligibility_reason": eligibility_result.get("reason", "N/A"),
                "extracted_info": extracted_info,
                "exam_questions": exam_questions,
                "knockout_analysis": knockout_analysis_result,
                "exam_taken": False
            }
            # supabase.table('candidate_applications').insert(application_data).execute()
            insert_response = supabase.table('candidate_applications').insert(application_data).execute()

            # Verify insert success
            if not insert_response.data:
                return jsonify({"error": "Failed to Send Email"}), 500

            # Now get the new ID
            new_application_id = insert_response.data[0]['id']

            # If candidate is recommended, send email
            if "Recommended" in eligibility_result.get("decision", ""):
                candidate_email = extracted_info.get('email')
                candidate_name = extracted_info.get('name', 'Candidate')

                send_exam_invitation_email(
                    recipient_email=candidate_email,
                    candidate_name=candidate_name,
                    job_title=selected_job.get('job_title', 'the role'),
                    job_id=selected_job['id'],
                    application_id=new_application_id,
                    decision=eligibility_result.get("decision")
                )

            return jsonify({"message": "Application submitted successfully!"}), 200

        except Exception as e:
            logging.error(f"Error during application process: {e}", exc_info=True)
            return jsonify({"error": f"Failed to process application: {e}"}), 500
    return render_template('candidate_apply.html', available_jobs=available_jobs, selected_job=selected_job_details)

# --- Helper Function for Sending Candidate Approval Email ---
def send_candidate_approval_email(recipient_email: str, candidate_name: str, job_title: str):
    """
    Sends an email to the candidate notifying them of their approval.
    """
    if not app.config.get('MAIL_USERNAME') or not app.config.get('MAIL_PASSWORD'):
        logging.warning("Email credentials not set. Skipping approval email sending.")
        return False

    try:
        msg = Message(
            subject=f"Congratulations! Your Application for {job_title} Has Been Approved!",
            recipients=[recipient_email],
            html=f"""
            <p>Dear {candidate_name},</p>
            <p>We are thrilled to inform you that your application for the <strong>{job_title}</strong> position has been <strong>approved</strong>!</p>
            <p>The JobStir team found your qualifications and performance outstanding.</p>
            <p>Our HR team will be in touch shortly to discuss the next steps, including offer details and onboarding.</p>
            <p>We look forward to welcoming you to the team!</p>
            <p>Best regards,</p>
            <p>The JobStir Recruitment Team</p>
            """
        )
        mail.send(msg)
        logging.info(f"Approval email sent to {recipient_email} for job {job_title}.")
        return True
    except Exception as e:
        logging.error(f"Failed to send approval email to {recipient_email}: {e}", exc_info=True)
        return False



# --- Approve Candidate Route ---
@app.route('/approve_candidate/<application_id>', methods=['POST'])
@hr_required
def approve_candidate(application_id):
    try:
        # 1. Fetch application
        app_response = supabase.table('candidate_applications').select('*').eq('id', application_id).single().execute()
        application = app_response.data
        
        if not application:
            flash('Candidate application not found.', 'error')
            return redirect(url_for('hr_dashboard'))

        # 2. Validation checks
        if not application.get('exam_taken'):
            flash('Cannot approve: Candidate has not completed the exam yet.', 'warning')
            return redirect(url_for('hr_dashboard'))

        if application.get('eligibility_status') == 'Approved':
            flash('Candidate already approved.', 'info')
            return redirect(url_for('hr_dashboard'))

        # 3. Update status in Supabase
        supabase.table('candidate_applications').update({
            'eligibility_status': 'Approved'
        }).eq('id', application_id).execute()

        flash(f'Candidate {application["extracted_info"].get("name", "N/A")} approved!', 'success')

        # 4. Email sending
        candidate_email = application["extracted_info"].get('email')
        candidate_name = application["extracted_info"].get('name', 'Candidate')
        
        job_response = supabase.table('jobs').select('job_title').eq('id', application['job_id']).single().execute()
        job_title = job_response.data.get('job_title', 'your applied position')

        if candidate_email:
            send_candidate_approval_email(candidate_email, candidate_name, job_title)
        else:
            logging.warning(f"No email found for approved candidate {application_id}.")

    except Exception as e:
        flash(f'Failed to approve candidate: {e}', 'error')
        logging.error(f"Failed to approve candidate {application_id}: {e}", exc_info=True)

    return redirect(url_for('hr_dashboard'))

def send_exam_invitation_email(
    recipient_email: str, 
    candidate_name: str, 
    job_title: str, 
    job_id: str, 
    application_id: str,
    decision: str
):
    """Sends an email to the candidate with dynamic message based on decision."""
    if not app.config.get('MAIL_USERNAME'):
        logging.error("Email credentials are not set. Cannot send emails.")
        raise ConnectionError("Email service is not configured on the server.")

    try:
        if "Recommended" in decision:
            # Candidate moves to exam stage
            subject = f"Next Steps: Assessment for {job_title}"
            exam_url = url_for('get_exam', job_id=job_id, candidate_id=application_id, _external=True)
            message_html = f"""
                <p>Dear {candidate_name},</p>
                <p>Congratulations! Your application for the <strong>{job_title}</strong> position has been <strong>{decision}</strong>.</p>
                <p>We are excited to move you to the next stage of our recruitment process.</p>
                <p>To proceed, please complete a short online assessment. This exam will help us evaluate your skills further.</p>
                <p><a href="{exam_url}" style="display: inline-block; padding: 10px 20px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px;">Take Your Exam Now</a></p>
                <p>Please ensure you complete the exam at your earliest convenience.</p>
                <p>Best regards,<br>The JobStir Recruitment Team</p>
            """
        else:
            # Candidate is not recommended
            subject = f"Application Update for {job_title}"
            message_html = f"""
                <p>Dear {candidate_name},</p>
                <p>Thank you for applying for the <strong>{job_title}</strong> position.</p>
                <p>Your current application status is: <strong>{decision}</strong>.</p>
                <p>We appreciate your interest in joining our team and encourage you to apply for future opportunities with JobStir.</p>
                <p>Best regards,<br>The JobStir Recruitment Team</p>
            """

        msg = Message(
            subject=subject,
            recipients=[recipient_email],
            html=message_html
        )
        mail.send(msg)
        logging.info(f"Email sent to {recipient_email} for application {application_id} with status '{decision}'.")
        return True

    except Exception as e:
        logging.error(f"Failed to send email to {recipient_email}: {e}", exc_info=True)
        return False

####################################################################


# ... (your other code) ...

@app.route('/hr_dashboard')
@hr_required
def hr_dashboard():
    try:
        hr_user_id = session['user_info']['id']

        # 1. Fetch all jobs for the current HR user
        jobs_response = supabase.table('jobs').select('*').eq('hr_user_id', hr_user_id).order('date_posted', desc=True).execute()
        hr_jobs = jobs_response.data
        
        if not hr_jobs:
            # If there are no jobs, render the page with empty data
            return render_template('hr_dashboard.html', jobs=[], summary={}, apps_by_job={})

        job_ids = [job['id'] for job in hr_jobs]

        # 2. Fetch all applications related to those jobs in a single query
        apps_response = supabase.table('candidate_applications').select('*').in_('job_id', job_ids).execute()
        all_applications = apps_response.data

        # 3. Group applications by their job_id for easy lookup
        apps_by_job = {}
        for app in all_applications:
            job_id = app.get('job_id')
            if job_id not in apps_by_job:
                apps_by_job[job_id] = []
            apps_by_job[job_id].append(app)

        # 4. Process the data in Python for summary stats
        total_candidates = len(all_applications)
        pending_reviews = 0
        
        for job in hr_jobs:
            job_applications = apps_by_job.get(job['id'], [])

            # --- FIX STARTS HERE: Parse the knockout questions JSON ---
            knockout_json_string = job.get('knockout_questions_json')
            if knockout_json_string and isinstance(knockout_json_string, str):
                try:
                    # Parse the string and store it in a new, clearly named key
                    job['knockout_questions_parsed'] = json.loads(knockout_json_string)
                except json.JSONDecodeError:
                    # Handle cases where the JSON might be invalid
                    job['knockout_questions_parsed'] = None
            else:
                # If it's already a dict or None, just pass it through
                job['knockout_questions_parsed'] = knockout_json_string
            # --- END OF FIX ---
            
            # Add new attributes directly to the job dictionary for the template
            job['total_applications'] = len(job_applications)
            job['recommended_candidates'] = sum(1 for app in job_applications if "Recommended" in app.get('eligibility_status', ''))
            job['completed_exams'] = sum(1 for app in job_applications if app.get('exam_taken'))
            job['sharable_link'] = url_for('candidate_apply', job_id=job['id'], _external=True)

            for app in job_applications:
                if app.get('exam_taken') and app.get('eligibility_status') != 'Approved':
                    pending_reviews += 1
        
        dashboard_summary = {
            'total_jobs': len(hr_jobs),
            'total_candidates': total_candidates,
            'pending_reviews': pending_reviews
        }

        # 5. Render the template with all the necessary data
        return render_template(
            'hr_dashboard.html', 
            jobs=hr_jobs, 
            summary=dashboard_summary,
            apps_by_job=apps_by_job
        )

    except Exception as e:
        logging.error(f"Error in hr_dashboard: {e}", exc_info=True)
        flash('An error occurred while loading the dashboard.', 'error')
        return render_template('hr_dashboard.html', jobs=[], summary={}, apps_by_job={})

@app.route('/client_portal')
@login_required # Use the new Supabase-aware decorator
def client_portal():
    try:
        candidate_user_id = session['user_info']['id']

        # 1. Fetch all applications for the current user
        apps_response = supabase.table('candidate_applications').select('*').eq('candidate_user_id', candidate_user_id).execute()
        user_applications = apps_response.data

        if not user_applications:
            # If the user has no applications, render the page with an empty list
            return render_template('client_portal.html', applications=[])

        # 2. Collect all unique job IDs from the applications
        job_ids = list(set(app['job_id'] for app in user_applications))


        # --- ADD THIS FIX ---
        # Before sending to the template, parse the exam_feedback JSON string for each application
        for app in user_applications:
            feedback_json_string = app.get('exam_feedback')
            if feedback_json_string and isinstance(feedback_json_string, str):
                try:
                    # Overwrite the string with the parsed list of dictionaries
                    app['exam_feedback'] = json.loads(feedback_json_string)
                except json.JSONDecodeError:
                    # If parsing fails for any reason, default to an empty list
                    app['exam_feedback'] = []
        # --- END OF FIX ---

        # 3. Fetch all related jobs in a single, efficient query
        jobs_response = supabase.table('jobs').select('id, job_title, company_name').in_('id', job_ids).execute()
        
        # 4. Create a dictionary for quick job lookups
        jobs_by_id = {job['id']: job for job in jobs_response.data}

        # 5. Combine the application and job data in Python
        for app_data in user_applications:
            job_details = jobs_by_id.get(app_data['job_id'])
            app_data['job_title'] = job_details.get('job_title', 'Unknown Job') if job_details else 'Unknown Job'
            app_data['company_name'] = job_details.get('company_name', 'Unknown Company') if job_details else 'Unknown Company'
        # print(user_applications)
        return render_template('client_portal.html', applications=user_applications)

    except Exception as e:
        logging.error(f"Error in client_portal: {e}", exc_info=True)
        flash('An error occurred while loading your applications.', 'error')
        return render_template('client_portal.html', applications=[])

@app.route('/get_exam', methods=['GET'])
@login_required # Use your new Supabase-aware decorator
def get_exam():
    job_id = request.args.get('job_id')
    application_id = request.args.get('candidate_id') # Renamed for clarity

    if not job_id or not application_id:
        flash('Invalid exam link. Please ensure both job and application IDs are present.', 'error')
        return redirect(url_for('index'))

    try:
        # Get the logged-in user's ID from the session
        candidate_user_id = session['user_info']['id']
        
        # 1. Fetch the job from Supabase
        job_response = supabase.table('jobs').select('job_title, job_description').eq('id', job_id).single().execute()
        job_obj = job_response.data
        if not job_obj:
            flash('Job not found for this exam.', 'error')
            return redirect(url_for('client_portal'))
        
        # 2. Fetch the candidate's application from Supabase
        app_response = supabase.table('candidate_applications').select('*').eq('id', application_id).single().execute()
        candidate_app_obj = app_response.data

        # 3. Perform authorization and business logic checks
        if not candidate_app_obj or str(candidate_app_obj.get('candidate_user_id')) != candidate_user_id:
            flash('Application not found or you are not authorized to view this exam.', 'error')
            return redirect(url_for('client_portal'))

        if "Recommended" not in candidate_app_obj.get('eligibility_status', ''):
            flash(f"You are not eligible to take the exam for '{job_obj['job_title']}'. Status: {candidate_app_obj['eligibility_status']}", 'warning')
            return redirect(url_for('client_portal'))

        if candidate_app_obj.get('exam_taken'):
            flash('You have already completed this exam.', 'info')
            return redirect(url_for('client_portal'))

        # 4. Generate exam questions if they don't exist
        exam_questions = candidate_app_obj.get('exam_questions')
        if not exam_questions:
            logging.info(f"Generating new exam questions for application {application_id}.")
            exam_questions = generate_exam_llm(job_obj['job_description'])
            
            if exam_questions:
                # 5. Update the application record with the new questions
                supabase.table('candidate_applications').update({
                    'exam_questions': exam_questions
                }).eq('id', application_id).execute()
                logging.info(f"Generated and saved {len(exam_questions)} exam questions for {application_id}.")
            else:
                logging.error(f"Failed to generate exam questions for {application_id}.")
                flash('Failed to generate exam questions. Please try again later or contact support.', 'error')
                return redirect(url_for('client_portal'))
        
        return render_template(
            'get_exam.html',
            job_id=job_id,
            candidate_id=application_id,
            job_title=job_obj['job_title'],
            candidate_name=candidate_app_obj['extracted_info'].get('name', 'Candidate'),
            exam_questions_json=json.dumps(exam_questions)
        )

    except Exception as e:
        logging.error(f"Error in get_exam: {e}", exc_info=True)
        flash('An unexpected error occurred while loading the exam.', 'error')
        return redirect(url_for('client_portal'))

@app.route('/submit_exam/<job_id>/<application_id>', methods=['POST'])
@login_required # Use your new Supabase-aware decorator
def submit_exam(job_id, application_id):
    try:
        # Get the logged-in user's ID from the session
        candidate_user_id = session['user_info']['id']
        
        # 1. Fetch the job and application data from Supabase
        job_response = supabase.table('jobs').select('job_description').eq('id', job_id).single().execute()
        job_obj = job_response.data
        if not job_obj:
            return jsonify({"error": "Job not found."}), 404

        app_response = supabase.table('candidate_applications').select('*').eq('id', application_id).single().execute()
        candidate_app_obj = app_response.data
        if not candidate_app_obj or str(candidate_app_obj.get('candidate_user_id')) != candidate_user_id:
            return jsonify({"error": "Application not found or unauthorized."}), 404

        # 2. Perform business logic checks
        if "Recommended" not in candidate_app_obj.get('eligibility_status', ''):
            return jsonify({"error": "Candidate is not eligible to take the exam."}), 403

        if candidate_app_obj.get('exam_taken'):
            return jsonify({"error": "Exam already taken."}), 400

        submitted_answers = request.json.get('answers')
        if not submitted_answers:
            return jsonify({"error": "No answers submitted."}), 400

        # 3. Grade the exam using your LLM function (this logic remains the same)
        job_description = job_obj['job_description']
        exam_questions = candidate_app_obj['exam_questions']
        
        total_score = 0
        detailed_feedback = []
        
        for submitted_ans in submitted_answers:
            q_id = submitted_ans.get('question_id')
            ans_text = submitted_ans.get('answer')
            original_question_obj = next((q for q in exam_questions if q['id'] == q_id), None)
            
            if original_question_obj and ans_text:
                evaluation = evaluate_answer_llm(
                    job_description, 
                    original_question_obj['question'], 
                    original_question_obj.get('ideal_answer', ''), 
                    ans_text
                )
                total_score += evaluation['score']
                detailed_feedback.append({
                    "question_id": q_id,
                    "question": original_question_obj['question'],
                    "answer": ans_text,
                    "score": evaluation['score'],
                    "feedback": evaluation['feedback']
                })
        
        # 4. Update the application record in Supabase with the exam results
        update_data = {
            "exam_taken": True,
            "exam_score": total_score,
            "exam_feedback": detailed_feedback,
            "submitted_answers": submitted_answers
        }
        supabase.table('candidate_applications').update(update_data).eq('id', application_id).execute()
        
        return jsonify({"message": "Exam submitted and graded successfully!", "score": total_score, "feedback": detailed_feedback}), 200

    except Exception as e:
        logging.error(f"Error in submit_exam for application {application_id}: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred while submitting the exam."}), 500
    

@app.route('/project_insights/<job_id>/<application_id>/<int:project_index>', methods=['GET'])
@hr_required # Use your new Supabase-aware decorator
def project_insights(job_id, application_id, project_index):
    try:
        # 1. Fetch the job and application data in parallel (or sequentially)
        job_response = supabase.table('jobs').select('job_title').eq('id', job_id).single().execute()
        job_obj = job_response.data
        if not job_obj:
            flash('Job not found.', 'error')
            return redirect(url_for('hr_dashboard'))

        app_response = supabase.table('candidate_applications').select('extracted_info').eq('id', application_id).single().execute()
        candidate_app_obj = app_response.data
        if not candidate_app_obj:
            flash('Candidate application not found.', 'error')
            return redirect(url_for('hr_dashboard'))

        # 2. Safely access the project list and the specific project
        current_extracted_info = candidate_app_obj.get('extracted_info', {})
        projects = current_extracted_info.get('projects', [])
        
        if not (0 <= project_index < len(projects)):
            flash('Project not found at the specified index.', 'error')
            return redirect(url_for('hr_dashboard'))

        project = projects[project_index]

        # 3. Generate insights if they are missing
        if not project.get('insights') and project.get('link'):
            logging.info(f"Generating insights for project: {project.get('title', 'N/A')}")
            readme_content = fetch_github_readme(project.get('link'))
            if readme_content:
                generated_insights = generate_project_insights(readme_content)
                if generated_insights:
                    # Update the specific project's insights in our local dictionary
                    current_extracted_info['projects'][project_index]['insights'] = generated_insights
                    
                    # 4. Save the entire updated 'extracted_info' object back to Supabase
                    supabase.table('candidate_applications').update({
                        'extracted_info': current_extracted_info
                    }).eq('id', application_id).execute()
                    
                    # Also update the local 'project' variable to pass to the template
                    project['insights'] = generated_insights
                    logging.info("Successfully generated and saved insights to DB.")
                else:
                    logging.error("Failed to generate insights for project.")
                    flash('Unable to generate project insights at this time.', 'warning')
        
        # Ensure project['insights'] is a dictionary for safe rendering
        if not isinstance(project.get('insights'), dict):
            project['insights'] = {}

        return render_template(
            'project_insights.html',
            job_title=job_obj.get('job_title', 'N/A'),
            candidate_name=current_extracted_info.get('name', 'N/A'),
            project=project
        )

    except Exception as e:
        logging.error(f"Error in project_insights: {e}", exc_info=True)
        flash('An unexpected error occurred while loading project insights.', 'error')
        return redirect(url_for('hr_dashboard'))

def make_current_user():
    user_info = session.get('user_info')
    if not user_info:
        return SimpleNamespace(
            is_authenticated=False,
            is_hr=False,
            username=None
        )
    
    # --- FIX IS HERE ---
    # Read from the 'email' key that you saved during login.
    email = user_info.get('email')
    # For a nicer display, let's use the name part of the email.
    display_name = email.split('@')[0] if email else None

    return SimpleNamespace(
        is_authenticated=True,
        is_hr=user_info.get('is_hr', False),
        username=display_name # Use the display_name
    )

@app.context_processor
def inject_current_user():
    return dict(current_user=make_current_user())

from types import SimpleNamespace
@app.route('/evaluate_resume', methods=['GET', 'POST'])
def evaluate_resume():
    """Handle resume upload, evaluation, and job recommendations."""
    user_logged_in = bool(session.get('user_info'))

    if request.method == 'POST':
        try:
            # --- 1. Validate inputs ---
            resume_file = request.files.get('resume')
            job_description = request.form.get('job_description', '').strip()

            if not resume_file or not resume_file.filename:
                raise ValueError("No resume file selected.")
            if not job_description:
                raise ValueError("Job description cannot be empty.")
            if not allowed_file(resume_file.filename):
                raise ValueError("Invalid file type. Only PDF files are allowed.")

            # --- 2. Extract resume text ---
            resume_content = resume_file.read()
            resume_text = extract_text_from_pdf(resume_content)
            if not resume_text:
                raise ValueError("Could not extract text from the resume PDF.")

            # --- 3. Parse resume JSON ---
            extracted_resume_json = extract_resume_info_llm(resume_text)
            if "error" in extracted_resume_json:
                raise RuntimeError(f"Error parsing resume: {extracted_resume_json['error']}")

            # --- 4. Evaluate resume ---
            evaluation_result = get_resume_score_with_breakdown(extracted_resume_json, job_description)
            if "error" in evaluation_result:
                raise RuntimeError(f"Error evaluating resume: {evaluation_result['error']}")
            # --- 5. (NEW) SAVE EVALUATION TO SUPABASE ---
            if evaluation_result:
                try:
                    # Prepare the data payload for insertion
                    data_to_insert = {  
                        "total_score": evaluation_result.get('total_score'),
                        "skills_score": evaluation_result.get('skills_score'),
                        "experience_score": evaluation_result.get('experience_score'),
                        "education_score": evaluation_result.get('education_score'),
                        "project_score": evaluation_result.get('project_score'),
                        "reasoning": evaluation_result.get('reasoning'),
                        "job_description": job_description,
                        "parsed_resume": extracted_resume_json,
                        "candidate_name": extracted_resume_json.get('name', 'N/A')
                    }

                    # If the user is logged in, associate the evaluation with their ID
                    if 'user_info' in session and session['user_info'].get('id'):
                        data_to_insert['user_id'] = session['user_info']['id']

                # Execute the insert query to your 'evaluations' table
  # Execute the insert query
                    supabase.table('evaluations').insert(data_to_insert).execute()
                    
                except Exception as db_error:
                    # Log the database error but don't block the user from seeing results
                    logging.error(f"Could not save evaluation to Supabase: {db_error}")

            # --- 5. Get job recommendations ---
            jobs_response = supabase.table('jobs').select(
                'id, job_title, company_name, job_description'
            ).execute()
            all_jobs_in_db = jobs_response.data or []

            resume_embedding = embedding_model.encode(resume_text, convert_to_tensor=True)
            job_recommendations_raw = []

            for job in all_jobs_in_db:
                description = job.get('job_description')
                if not description:
                    continue
                job_embedding = embedding_model.encode(description, convert_to_tensor=True)
                similarity_score = util.pytorch_cos_sim(resume_embedding, job_embedding).item()

                job_recommendations_raw.append({
                    'job_id': job['id'],
                    'job_title': job['job_title'],
                    'company_name': job['company_name'],
                    'score': similarity_score
                })

            recommended_jobs = sorted(
                job_recommendations_raw,
                key=lambda x: x['score'],
                reverse=True
            )[:5]

            # --- 6. Render results ---
            flash('Resume analyzed successfully!', 'success')
            return render_template(
                'evaluate_resume.html',
                evaluation_result=evaluation_result,
                uploaded_data={
                    "resume_text": resume_text,
                    "job_description": job_description,
                    "parsed_resume": json.dumps(extracted_resume_json, indent=2)
                },
                recommended_jobs=recommended_jobs,
                user_logged_in=user_logged_in
            )

        except ValueError as ve:
            flash(str(ve), 'error')
        except RuntimeError as re_err:
            flash(str(re_err), 'error')
        except Exception as e:
            logging.error(f"Unexpected error during resume evaluation: {e}", exc_info=True)
            flash(f"An unexpected error occurred: {e}", "error")

        return redirect(request.url)

    # GET request → Render empty form
    return render_template('evaluate_resume.html', user_logged_in=user_logged_in,current_user=make_current_user(),uploaded_data=SimpleNamespace(job_description=""))

def allowed_file(filename):
    """Checks if the uploaded file has a .pdf extension."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() == 'pdf'  

from markupsafe import Markup
# Create and register nl2br filter
def nl2br(value):
    if not value:
        return ""
    # Replace newlines with <br> and mark as safe HTML
    return Markup(value.replace("\n", "<br>\n"))

app.jinja_env.filters['nl2br'] = nl2br
@app.errorhandler(404)
def not_found_error(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    
    return render_template('500.html'), 500
@app.route('/privacy-policy')
def privacy_policy():
    return render_template('privacy_policy.html')
@app.route('/terms-of-service')
def terms_of_service():
    return render_template('terms_of_service.html')
# --- Main execution block ---
if __name__ == '__main__':    
    app.run(debug=True, host='0.0.0.0', port=8000)
