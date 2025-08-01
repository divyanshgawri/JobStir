# debug_sheets.py
import os
import json
import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv

# --- Configuration (Copied from your app.py globals) ---
# Load environment variables from .env file
load_dotenv()

# Replace with your actual Google Sheet ID
# This should match how it's set in your app.py's MASTER_SPREADSHEET_ID
MASTER_SPREADSHEET_ID = os.getenv("MASTER_SPREADSHEET_ID", "1yUXbkcC7G9119kjRE7ZnhaaLLiej43r8PWwvc8rY3lQ") # Ensure this is your ACTUAL Sheet ID if you want to connect!

# Google Sheets API setup
GOOGLE_SHEETS_CREDENTIALS_PATH = 'credentials.json' # Path to your service account key file
GOOGLE_SHEETS_SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive"
]
GOOGLE_CREDENTIALS_ENV = "GOOGLE_CREDENTIALS_JSON" # Name of the environment variable for GSheets credentials

# Worksheet names (copied from app.py)
JOBS_WORKSHEET_NAME = 'Jobs'
CANDIDATES_WORKSHEET_NAME = 'Candidates'

# Global variables to hold the authenticated gspread client and worksheet objects
# These will be populated by initialize_google_sheets
gs_client = None
jobs_worksheet = None
candidates_worksheet = None
contact_form_worksheet = None


# --- initialize_google_sheets function (Copied directly from your app.py) ---
# Added even more explicit prints for debugging network interaction points
def initialize_google_sheets():
    global gs_client, jobs_worksheet, candidates_worksheet, contact_form_worksheet

    print(f"\n--- DEBUG: Starting Google Sheets Initialization ---")
    print(f"DEBUG: Attempting to load MASTER_SPREADSHEET_ID: '{MASTER_SPREADSHEET_ID}'")

    if MASTER_SPREADSHEET_ID == "1yUXbkcC7G9119kjRE7ZnhaaLLiej43r8PWwvc8rY3lQ": # Still checking against the default placeholder
        print("WARNING: MASTER_SPREADSHEET_ID is still the default placeholder. Google Sheets integration will be skipped.")
        return False

    try:
        raw_json = os.getenv(GOOGLE_CREDENTIALS_ENV)
        print(f"DEBUG: GOOGLE_CREDENTIALS_JSON env var status: {'Set' if raw_json else 'Not Set'}")
        if not raw_json:
            print(f"ERROR: GOOGLE_CREDENTIALS_JSON environment variable is not set. Google Sheets functions will fail.")
            return False
            
        creds_dict = json.loads(raw_json)
        if "private_key" in creds_dict:
            creds_dict["private_key"] = creds_dict["private_key"].replace("\\n", "\n")
        print("DEBUG: Credentials JSON loaded and private key formatted.")

        credentials = Credentials.from_service_account_info(creds_dict, scopes=GOOGLE_SHEETS_SCOPE)
        print("DEBUG: Service account credentials created.")
        
        # --- CRITICAL HANG POINT 1: gspread.authorize ---
        print("DEBUG: Attempting gspread.authorize(credentials)...")
        gs_client = gspread.authorize(credentials)
        print("✅ Google Sheets client authenticated successfully.")
        # --- END CRITICAL HANG POINT 1 ---

        # --- CRITICAL HANG POINT 2: master_spreadsheet.open_by_key ---
        print(f"DEBUG: Attempting to open spreadsheet by key: '{MASTER_SPREADSHEET_ID}'...")
        master_spreadsheet = gs_client.open_by_key(MASTER_SPREADSHEET_ID)
        print(f"📄 Opened spreadsheet: '{master_spreadsheet.title}'")
        # --- END CRITICAL HANG POINT 2 ---

        worksheets_to_init = {
            "Contact Submissions": ["Name", "Email", "Message", "Submitted At"],
            JOBS_WORKSHEET_NAME: ["Job ID", "Company Name", "Job Title", "Job Description", "Date Posted"],
            CANDIDATES_WORKSHEET_NAME: ["Application ID", "Job ID", "Company Name", "Candidate Name", "Email", "Phone", "Submission Date", "Eligibility Status", "Match Score", "Evaluation Reason", "Exam Taken", "Exam Score", "Skills Summary", "Education Summary", "Experience Summary", "Projects Summary"]
        }

        for sheet_name, headers in worksheets_to_init.items():
            print(f"DEBUG: Initializing worksheet '{sheet_name}'...")
            try:
                # --- CRITICAL HANG POINT 3: master_spreadsheet.worksheet ---
                print(f"DEBUG: Attempting to get worksheet '{sheet_name}'...")
                worksheet = master_spreadsheet.worksheet(sheet_name)
                print(f"📌 Connected to '{sheet_name}' worksheet.")
            except gspread.exceptions.WorksheetNotFound:
                # --- CRITICAL HANG POINT 4: master_spreadsheet.add_worksheet ---
                print(f"DEBUG: Worksheet '{sheet_name}' not found. Attempting to create new one.")
                worksheet = master_spreadsheet.add_worksheet(title=sheet_name, rows="1000", cols="20")
                print(f"📄 Created '{sheet_name}' worksheet.")

            if not worksheet.row_values(1): # Check if first row is empty to set headers
                # --- CRITICAL HANG POINT 5: worksheet.update (setting headers) ---
                print(f"DEBUG: Setting headers for '{sheet_name}' using worksheet.update()...")
                worksheet.update([headers])
                print(f"📝 Headers set in '{sheet_name}'.")
            else:
                print(f"DEBUG: Headers already present in '{sheet_name}'. Skipping.")

            # Assign to global variables
            if sheet_name == "Contact Submissions":
                contact_form_worksheet = worksheet
            elif sheet_name == JOBS_WORKSHEET_NAME:
                jobs_worksheet = worksheet
            elif sheet_name == CANDIDATES_WORKSHEET_NAME:
                candidates_worksheet = worksheet
            print(f"DEBUG: Worksheet '{sheet_name}' fully processed.")

        print("✅ Google Sheets initialization complete.")
        return True

    except json.JSONDecodeError:
        print("❌ Failed to decode GOOGLE_CREDENTIALS_JSON. Make sure it's valid JSON.")
        return False
    except gspread.exceptions.APIError as e:
        print(f"❌ Google Sheets API error during initialization: {e}. Details: {e}")
        if hasattr(e, 'response') and hasattr(e.response, 'text'):
            print(f"API Error Response: {e.response.text}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error during Google Sheets initialization: {e}. Details: {e}")
        return False

# --- Main execution for debugging ---
if __name__ == '__main__':
    print("--- Running Sheets Debugger ---")
    success = initialize_google_sheets()
    if success:
        print("\n--- Google Sheets setup reported SUCCESS ---")
        print(f"Global gs_client is: {gs_client is not None}")
        print(f"Global jobs_worksheet is: {jobs_worksheet is not None}")
        print(f"Global candidates_worksheet is: {candidates_worksheet is not None}")
        print(f"Global contact_form_worksheet is: {contact_form_worksheet is not None}")
    else:
        print("\n--- Google Sheets setup reported FAILURE ---")
    print("--- Sheets Debugger Finished ---")