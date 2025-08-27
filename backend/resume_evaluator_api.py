#!/usr/bin/env python3
"""
Resume Evaluator API - Backend Integration
Combines the new website's frontend with the old website's LangChain/Groq technology
"""

import os
import json
import re
import time
import logging
from datetime import datetime
from typing import Optional, List, Union, Dict, Any
from uuid import uuid4

# Flask imports
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# LLM and AI imports
from groq import RateLimitError, Groq
from pydantic import BaseModel, Field, ValidationError as PydanticValidationError
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from sentence_transformers import SentenceTransformer, util

# Environment and utilities
from dotenv import load_dotenv
import fitz  # PyMuPDF for PDF processing

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Initialize AI models
os.environ['GROQ_API_KEY'] = os.getenv('GROQ_API_KEY')
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

print("DEBUG: Initializing SentenceTransformer model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("DEBUG: SentenceTransformer model initialized.")

# LLM Chain Setup
llm = ChatGroq(model="llama3-70b-8192", temperature=0)
parser = StrOutputParser()

# Pydantic Models (from old website)
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
    link: Optional[str] = Field(None, description="Full and exact URL to the project")
    description: Optional[List[str]] = Field(None, description="Bullet points describing the project")

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
    achievements: Optional[List[str]] = Field(None, description="List of achievements")

class ResumeExtractionError(Exception):
    """Custom exception for errors during resume extraction."""
    pass

# Resume extraction prompt (from old website)
resume_extraction_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "You are a professional resume parser. Extract and align the following fields from the resume text into a JSON object:\n\n"
     "name (string), email (string), phone (string), "
     "education (list of objects with degree (string), university (string), start_year (string), end_year (string), concentration (string), cumulative_gpa (string), relevant_coursework (list of strings)), "
     "skills (list of strings), "
     "experience (list of objects with title (string), duration (string), location (string), and description (list of strings)), "
     "projects (list of objects with title (string), description (list of strings), and link (string - the full and exact URL to the project)), "
     "certificates (list of strings), achievements (list of strings).\n\n"
     "If a field is not found, use `null` for single values or an empty array `[]` for lists. "
     "Ensure all fields from the schema are present and strictly adhere to the specified structure. Do NOT include any extra fields not listed here. Do NOT explain anything.\n"
     "You must always return valid JSON fenced by a markdown code block. Do not return any additional text."),
    ("human", "{text}")
])

extraction_chain = resume_extraction_prompt | llm | parser

def extract_resume_info_llm(text: str) -> dict:
    """
    Extracts structured resume information using the LLM chain.
    Raises ResumeExtractionError on failure.
    """
    max_retries = 3
    initial_retry_delay = 5
    raw_json_str = ""

    for attempt in range(max_retries):
        try:
            raw_json_str = extraction_chain.invoke({"text": text})
            cleaned_json_str = re.sub(r'^```(?:json)?\n|```$', '', raw_json_str.strip(), flags=re.MULTILINE)
            
            if not cleaned_json_str:
                raise ResumeExtractionError("LLM returned an empty response.")

            parsed_dict = json.loads(cleaned_json_str)
            
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
                raise ResumeExtractionError("Failed due to persistent rate limits.") from e
            
        except (json.JSONDecodeError, PydanticValidationError) as e:
            logging.error(f"Failed to parse or validate LLM output. Raw response: {raw_json_str}")
            raise ResumeExtractionError(f"Invalid data structure from LLM: {e}") from e

        except Exception as e:
            logging.error(f"An unexpected error occurred during resume extraction. Raw response: {raw_json_str}")
            raise ResumeExtractionError(f"An unexpected error occurred: {e}") from e

def get_resume_score_with_breakdown(resume_json: dict, job_description: str) -> dict:
    """
    Uses Groq to analyze resume against job description and return detailed scoring.
    """
    try:
        # Create the analysis prompt
        analysis_prompt = f"""
        You are an expert HR analyst. Analyze this resume against the job description and provide a detailed evaluation.

        RESUME DATA (JSON):
        {json.dumps(resume_json, indent=2)}

        JOB DESCRIPTION:
        {job_description}

        Provide your analysis in the following JSON format:
        {{
            "total_score": <integer 0-100>,
            "skills_score": <integer 0-35>,
            "experience_score": <integer 0-25>,
            "education_score": <integer 0-20>,
            "project_score": <integer 0-20>,
            "matched_keywords": [<list of matched keywords>],
            "missing_keywords": [<list of missing important keywords>],
            "quick_suggestions": [<list of 3-5 quick improvement suggestions>],
            "strengths": [<list of candidate's strengths>],
            "improvements": [<list of areas to improve>],
            "reasoning": {{
                "skills_reasoning": "<detailed explanation of skills match>",
                "experience_reasoning": "<detailed explanation of experience match>",
                "education_reasoning": "<detailed explanation of education match>",
                "project_reasoning": "<detailed explanation of project relevance>",
                "overall_assessment": "<overall assessment of the candidate>"
            }},
            "summary": "<brief summary of the analysis>"
        }}

        Be thorough but concise. Focus on specific matches and gaps.
        """

        # Call Groq API
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert HR analyst. Provide detailed, accurate resume analysis in JSON format only."
                },
                {
                    "role": "user",
                    "content": analysis_prompt
                }
            ],
            model="llama3-70b-8192",
            temperature=0.1,
            max_tokens=4000
        )

        response_text = chat_completion.choices[0].message.content
        
        # Extract JSON from response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return result
        else:
            raise ValueError("No valid JSON found in response")

    except Exception as e:
        logging.error(f"Error in resume scoring: {e}")
        # Return a basic fallback response
        return {
            "total_score": 50,
            "skills_score": 15,
            "experience_score": 12,
            "education_score": 10,
            "project_score": 8,
            "matched_keywords": [],
            "missing_keywords": [],
            "quick_suggestions": ["Unable to analyze - please try again"],
            "strengths": [],
            "improvements": [],
            "reasoning": {
                "skills_reasoning": "Analysis failed - please try again",
                "experience_reasoning": "Analysis failed - please try again",
                "education_reasoning": "Analysis failed - please try again",
                "project_reasoning": "Analysis failed - please try again",
                "overall_assessment": "Analysis failed - please try again"
            },
            "summary": "Analysis failed - please try again"
        }

def find_similar_jobs(resume_json: dict, top_k: int = 5) -> List[dict]:
    """
    Find similar jobs based on resume content using semantic similarity.
    This is a simplified version - in production, you'd query your job database.
    """
    try:
        # Sample jobs (in production, this would come from your database)
        sample_jobs = [
            {
                "id": "job_1",
                "title": "Senior Software Engineer",
                "company": "TechCorp Inc.",
                "description": "We are looking for a Senior Software Engineer with experience in Python, JavaScript, React, and cloud technologies. The ideal candidate will have 5+ years of experience building scalable web applications.",
                "requirements": ["Python", "JavaScript", "React", "AWS", "5+ years experience"]
            },
            {
                "id": "job_2", 
                "title": "Data Scientist",
                "company": "DataFlow Solutions",
                "description": "Join our data science team to build machine learning models and analyze large datasets. Experience with Python, SQL, TensorFlow, and statistical analysis required.",
                "requirements": ["Python", "SQL", "Machine Learning", "TensorFlow", "Statistics"]
            },
            {
                "id": "job_3",
                "title": "Frontend Developer",
                "company": "WebDesign Pro",
                "description": "We need a creative Frontend Developer skilled in React, Vue.js, HTML, CSS, and modern JavaScript frameworks. Experience with responsive design is essential.",
                "requirements": ["React", "Vue.js", "HTML", "CSS", "JavaScript", "Responsive Design"]
            }
        ]

        # Create resume text for similarity comparison
        resume_text = ""
        if resume_json.get('skills'):
            resume_text += " ".join(resume_json['skills']) + " "
        if resume_json.get('experience'):
            for exp in resume_json['experience']:
                if exp.get('title'):
                    resume_text += exp['title'] + " "
                if exp.get('description'):
                    resume_text += " ".join(exp['description']) + " "

        if not resume_text.strip():
            return []

        # Calculate similarities
        resume_embedding = embedding_model.encode(resume_text)
        job_similarities = []

        for job in sample_jobs:
            job_text = f"{job['title']} {job['description']} {' '.join(job['requirements'])}"
            job_embedding = embedding_model.encode(job_text)
            similarity = util.cos_sim(resume_embedding, job_embedding).item()
            
            job_similarities.append({
                "id": job["id"],
                "title": job["title"],
                "company": job["company"],
                "description": job["description"],
                "similarity_score": similarity
            })

        # Sort by similarity and return top_k
        job_similarities.sort(key=lambda x: x['similarity_score'], reverse=True)
        return job_similarities[:top_k]

    except Exception as e:
        logging.error(f"Error finding similar jobs: {e}")
        return []

@app.route('/api/evaluate-resume', methods=['POST'])
def evaluate_resume():
    """
    Main API endpoint for resume evaluation.
    Expects JSON with 'resume_text' and 'job_description' fields.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        resume_text = data.get('resume_text', '').strip()
        job_description = data.get('job_description', '').strip()
        
        if not resume_text:
            return jsonify({"error": "Resume text is required"}), 400
        
        if not job_description:
            return jsonify({"error": "Job description is required"}), 400

        # Step 1: Extract structured data from resume
        logging.info("Extracting resume information...")
        resume_json = extract_resume_info_llm(resume_text)
        
        # Step 2: Analyze resume against job description
        logging.info("Analyzing resume against job description...")
        analysis_result = get_resume_score_with_breakdown(resume_json, job_description)
        
        # Step 3: Find similar jobs (optional)
        logging.info("Finding similar jobs...")
        job_recommendations = find_similar_jobs(resume_json)
        
        # Step 4: Combine results
        final_result = {
            **analysis_result,
            "job_recommendations": job_recommendations,
            "parsed_resume": resume_json,
            "timestamp": datetime.now().isoformat()
        }
        
        logging.info(f"Analysis completed successfully. Score: {analysis_result.get('total_score', 'N/A')}")
        return jsonify(final_result)
        
    except ResumeExtractionError as e:
        logging.error(f"Resume extraction error: {e}")
        return jsonify({"error": f"Failed to extract resume information: {str(e)}"}), 422
        
    except Exception as e:
        logging.error(f"Unexpected error in evaluate_resume: {e}")
        return jsonify({"error": "Internal server error. Please try again."}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })

@app.route('/', methods=['GET'])
def index():
    """Basic index route."""
    return jsonify({
        "message": "Resume Evaluator API",
        "version": "1.0.0",
        "endpoints": {
            "evaluate": "/api/evaluate-resume",
            "health": "/api/health"
        }
    })

if __name__ == '__main__':
    # Check for required environment variables
    if not os.getenv('GROQ_API_KEY'):
        print("ERROR: GROQ_API_KEY environment variable is required")
        exit(1)
    
    print("Starting Resume Evaluator API...")
    print("Make sure to set your GROQ_API_KEY in your environment variables")
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('FLASK_ENV') == 'development'
    )