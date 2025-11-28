# **JobStir — AI-Powered Recruitment & Resume Evaluation Platform**

JobStir is an advanced recruitment automation platform that streamlines candidate screening, resume parsing, job matching, knockout filtering, AI-generated exams, and detailed evaluation analytics using LLMs (Groq + LangChain), machine learning, and a Supabase backend.

This system is designed for **startups, HR teams, and modern recruitment workflows**, enabling fair, scalable, and automated candidate evaluation.

---

## 🚀 **Key Features**

### **✅ Candidate-Side Features**

* Resume upload (PDF only)
* AI-powered resume parsing using strict JSON schema
* Automatic extraction of:

  * Education
  * Skills
  * Experience
  * Projects with URL extraction (hyperlinks auto-detected)
  * Certifications, memberships, achievements
* Auto-evaluation against job requirements

---

### **🔶 HR-Side Features**

* Create job postings
* Automatic extraction of knockout criteria from job description using LLM
* HR-only dashboard with restricted access
* Auto-generated technical exam questions (+ JSON)
* Auto-evaluation of candidate exam answers
* Candidate insights + selection reasons
* Candidate JSON profile view

---

### **🧠 AI / LLM Features**

#### **1. Resume Parsing AI**

* Extracts structured fields using strict JSON schema
* Pydantic validation to enforce correctness
* Cleans malformed LLM responses
* Retries on rate-limit or parsing errors

#### **2. Knockout Criteria Generator**

* Extracts mandatory conditions like:

  * experience_min_years
  * education
  * location
* Ensures strict schema output with type/value/reason

#### **3. Knockout Validation Layer**

* Evaluates candidate data against knockout rules
* Uses LLM + Python logic for dual validation
* Calculates knockout score and pass/fail

#### **4. AI Resume–Job Matching Engine**

Scoring breakdown:

* 35 pts Skills
* 25 pts Experience
* 10 pts Education
* 20 pts Projects
* 10 pts Holistic review
  Including penalties, overrides, and fairness rules.

#### **5. Exam Generation System**

* Creates 3 technical questions:

  * Core Knowledge
  * Practical Application
  * Problem Solving
* Strict JSON enforced

#### **6. Exam Answer Grader**

* Plagiarism detection
* Correctness / Depth / Clarity scoring
* Returns JSON: `{ "score": X, "feedback": "" }`

#### **7. Selection Reason Generator**

* For accepted candidates
* Generates a hiring justification paragraph

#### **8. Rejection Feedback Generator**

* For rejected candidates
* Uses archetype protocols:

  * Standard
  * Career Changer
  * Job Hopper
  * Overqualified

---

## 🛢 **Database – Supabase Schema**

### **Table 1: users**

| Column   | Type    | Description                  |
| -------- | ------- | ---------------------------- |
| id       | UUID    | Primary key                  |
| email    | text    | User login                   |
| password | text    | Bcrypt-hashed password       |
| is_hr    | boolean | True = HR, False = Candidate |

---

### **Table 2: jobs**

| Column                  | Type      |
| ----------------------- | --------- |
| id                      | UUID      |
| title                   | text      |
| description             | text      |
| knockout_questions_json | JSON      |
| created_at              | timestamp |

---

### **Table 3: candidates**

| Column      | Type |
| ----------- | ---- |
| id          | UUID |
| user_id     | UUID |
| resume_json | JSON |
| parsed_text | text |

---

### **Table 4: evaluations**

| Column               | Type |
| -------------------- | ---- |
| id                   | UUID |
| candidate_id         | UUID |
| job_id               | UUID |
| score                | int  |
| decision             | text |
| reason               | text |
| knockout_result_json | JSON |

---

### **Table 5: exams**

| Column         | Type |
| -------------- | ---- |
| id             | UUID |
| job_id         | UUID |
| questions_json | JSON |

---

### **Table 6: exam_submissions**

| Column             | Type |
| ------------------ | ---- |
| id                 | UUID |
| candidate_id       | UUID |
| job_id             | UUID |
| answers_json       | JSON |
| score              | int  |
| evaluator_feedback | text |

---

## ⚙️ **Tech Stack**

### **Backend**

* Python 3.10+
* Flask
* Flask-WTF (Forms)
* Flask-Mail (Email)
* Flask-Login
* Bcrypt

### **AI / NLP**

* Groq LLaMA-3.3–70B (via LangChain)
* SentenceTransformers (MiniLM embeddings)
* PyMuPDF (PDF Parsing)
* Custom Pydantic Validate Models
* Custom JSON Repair Logic

### **Database & Auth**

* Supabase
* Supabase Python SDK

---

## 📌 **Architecture Overview**

```
Client (HTML / Forms)
   ⬇
Flask Backend (app.py)
   ⬇
LLM Pipelines (Resume → Knockouts → Matching → Feedback)
   ⬇
Supabase (Storage + Auth + DB)
```

---

## 🔄 **Candidate Workflow**

1. Upload PDF resume
2. System extracts text and hyperlinks
3. LLM converts text into structured JSON
4. Job’s knockout rules are generated
5. Resume is passed through knockout validator
6. Resume is evaluated and scored
7. Selection reason or rejection feedback generated
8. Optional: Candidate takes exam
9. Exam answers graded automatically

---

## 🔄 **HR Workflow**

1. HR logs in
2. Creates new job posting
3. Knockout rules auto-generated
4. HR receives parsed candidate data
5. HR views:

   * Resume JSON
   * Knockout results
   * Match score
   * Selection reason / Feedback
   * Exam questions
   * Exam submissions + graded results

---

## 📁 **Project Structure**

```
project/
│── app.py                 # Main Flask application
│── templates/             # Login, dashboard, HR screens
│── static/                # CSS, JS, images
│── uploads/               # Uploaded resumes
│── .env                   # API Keys
│── requirements.txt
│── README.md
```

---

## 🧪 **Evaluation Logic (Important)**

### **1. LLM Score (0–100)**

Returned strictly as integer.

### **2. Quantitative Override**

If:

```
AI Score >= 70 AND candidate_experience < 50% of required
→ Final score overridden to 40 (auto reject)
```

### **3. Decision**

```
>= 70 → Recommended
< 70 → Not Recommended
```

### **4. Feedback**

* Accepted → Selection Reason
* Rejected → Detailed Feedback Paragraph

---

## 📬 **Email Integration**

Uses SMTP credentials from `.env`:

```
MAIL_SERVER=smtp.gmail.com
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_PORT=587
MAIL_USE_TLS=True
```

Used for:

* Account registration
* Notifications

---

## 🔐 **Authentication**

* Supabase Auth API
* Flask Session
* HR role-based restriction
* `login_required`, `hr_required` decorators

---

## 🧰 **Environment Variables (.env)**

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
GROQ_API_KEY=
FLASK_SECRET_KEY=
MAIL_SERVER=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_PORT=
MAIL_USE_TLS=
MAIL_USE_SSL=
```

---

## 🛠 **Installation & Setup**

### **1. Clone the repo**

```
git clone <repo-url>
cd jobstir
```

### **2. Create virtual environment**

```
python3 -m venv venv
source venv/bin/activate
```

### **3. Install dependencies**

```
pip install -r requirements.txt
```

### **4. Create `.env` file**

Copy example above.

### **5. Run the server**

```
python app.py
```

Your app will run at:

```
http://127.0.0.1:5000
```

---

## 📌 **Future Improvements**

* Add admin analytics dashboard
* Add candidate portal tracking
* Add job recommender system
* Add email templates
* Connect WhatsApp Bot (Twilio) for auto-apply
* Add LinkedIn profile import

---


If you want, I can also generate a **professional GitHub-style README with badges, screenshots, and architecture diagrams**.
