document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('analyze-button');
    const resetButton = document.getElementById('reset-button');
    const mainContent = document.getElementById('main-content');
    const loader = document.getElementById('loader');
    const resultsSection = document.getElementById('results-section');
    const resumeText = document.getElementById('resume-text');
    const jobDescription = document.getElementById('job-description');
    const pdfUploadInput = document.getElementById('pdf-upload');
    const pdfStatus = document.getElementById('pdf-status');
    const progressCircle = document.getElementById('progress-circle');
    const scoreText = document.getElementById('score-text');
    const summaryText = document.getElementById('summary-text');
    const matchedKeywordsList = document.getElementById('matched-keywords');
    const missingKeywordsList = document.getElementById('missing-keywords');
    const skillsGapList = document.getElementById('skills-gap');
    const suggestionsList = document.getElementById('suggestions-list');
    const errorBox = document.getElementById('error-box');
    const errorMessage = document.getElementById('error-message');
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const charCountSpan = document.getElementById('char-count');
    const radius = progressCircle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = circumference;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;

    const style = document.createElement('style');
    style.textContent = `
        .fade-in { animation: fadeIn 0.6s ease-in-out forwards; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .analyzing-pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.4); }
            70% { box-shadow: 0 0 0 12px rgba(79, 70, 229, 0); }
            100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
        }
    `;
    document.head.appendChild(style);

    analyzeButton.addEventListener('click', handleAnalysis);
    resetButton.addEventListener('click', resetUI);
    pdfUploadInput.addEventListener('change', handlePdfUpload);
    if (charCountSpan) {
        jobDescription.addEventListener('input', () => {
            charCountSpan.textContent = `${jobDescription.value.length} characters`;
        });
    }
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tab.dataset.tab + '-content').classList.add('active');
        });
    });

    // --- Core Functions ---
    async function handlePdfUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            pdfStatus.textContent = 'Error: Please select a PDF file.';
            pdfStatus.style.color = '#dc2626';
            return;
        }
        pdfStatus.textContent = 'Parsing PDF...';
        pdfStatus.style.color = '#6b7280';
        resumeText.value = '';
        const reader = new FileReader();
        reader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
                }
                resumeText.value = fullText.trim();
                pdfStatus.textContent = `Successfully parsed: ${file.name}`;
                pdfStatus.style.color = '#059669';
            } catch (error) {
                console.error('Error parsing PDF:', error);
                pdfStatus.textContent = 'Failed to parse PDF.';
                pdfStatus.style.color = '#dc2626';
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = null;
    }

    async function handleAnalysis() {
        const resume = resumeText.value.trim();
        const jobDesc = jobDescription.value.trim();
        if (!resume || !jobDesc) {
            showError("Please provide both your resume and the job description.");
            return;
        }
        showLoader(true);
        hideError();
        analyzeButton.classList.add('analyzing-pulse');
        analyzeButton.disabled = true;
        try {
            const analysisResult = await getAIAnalysis(resume, jobDesc);
            if (analysisResult) {
                displayResults(analysisResult);
            } else {
                showError("The analysis returned no data. The AI model might be busy.");
            }
        } catch (error) {
            console.error("Analysis failed:", error);
            showError("An error occurred during analysis. Check the console for details.");
        } finally {
            showLoader(false);
            analyzeButton.classList.remove('analyzing-pulse');
            analyzeButton.disabled = false;
        }
    }

    async function getAIAnalysis(resume, jobDesc) {
        const prompt = `
            Act as an expert career coach and resume evaluator. Analyze the provided resume against the job description.
            Provide a detailed analysis in a strict JSON format. Do not include any text outside of the JSON object.

            Resume:
            \`\`\`
            ${resume}
            \`\`\`

            Job Description:
            \`\`\`
            ${jobDesc}
            \`\`\`
        `;
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        matchScore: { type: "NUMBER" },
                        summary: { type: "STRING" },
                        keywordAnalysis: {
                            type: "OBJECT",
                            properties: {
                                matchedKeywords: { type: "ARRAY", items: { type: "STRING" } },
                                missingKeywords: { type: "ARRAY", items: { type: "STRING" } }
                            }
                        },
                        skillsGap: { type: "ARRAY", items: { type: "STRING" } },
                        suggestions: { type: "ARRAY", items: { "type": "STRING" } }
                    },
                }
            }
        };
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        
        let attempts = 0;
        let delay = 1000;
        while (attempts < 3) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const result = await response.json();
                if (result.candidates?.[0]?.content?.parts?.[0]) {
                    return JSON.parse(result.candidates[0].content.parts[0].text);
                } else {
                    throw new Error("Unexpected API response structure.");
                }
            } catch (error) {
                attempts++;
                if (attempts >= 3) throw error;
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
        return null;
    }

    function displayResults(data) {
        mainContent.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        resultsSection.classList.add('fade-in');

        const score = Math.round(data.matchScore || 0);
        animateValue(scoreText, 0, score, 1000);
        const offset = circumference - (score / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;

        typeWriter(summaryText, data.summary || "No summary provided.");
        populateKeywordList(matchedKeywordsList, data.keywordAnalysis?.matchedKeywords);
        populateKeywordList(missingKeywordsList, data.keywordAnalysis?.missingKeywords);
        populateList(skillsGapList, data.skillsGap);
        populateList(suggestionsList, data.suggestions);
    }

    function populateKeywordList(listElement, items) {
        listElement.innerHTML = '';
        if (!items || items.length === 0) {
            listElement.innerHTML = `<span style="background:none; color:#6b7280; font-style:italic;">None found.</span>`;
            return;
        }
        items.forEach(item => {
            const span = document.createElement('span');
            span.textContent = item;
            listElement.appendChild(span);
        });
    }
    
    function populateList(listElement, items) {
        listElement.innerHTML = '';
        if (!items || items.length === 0) {
            listElement.innerHTML = `<li style="background:none; color:#6b7280; font-style:italic;">None found.</li>`;
            return;
        }
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            listElement.appendChild(li);
        });
    }

    function animateValue(obj, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start) + '%';
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    function typeWriter(element, text, speed = 20) {
        element.innerHTML = "";
        let i = 0;
        function type() {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        type();
    }

    function showLoader(isLoading) {
        loader.classList.toggle('hidden', !isLoading);
        mainContent.classList.toggle('hidden', isLoading);
        resultsSection.classList.add('hidden');
    }

    function resetUI() {
        resultsSection.classList.add('hidden');
        resultsSection.classList.remove('fade-in');
        mainContent.classList.remove('hidden');
        hideError();
        resumeText.value = '';
        jobDescription.value = '';
        if (charCountSpan) charCountSpan.textContent = '0 characters';
        pdfStatus.textContent = 'or paste content below';
        pdfStatus.style.color = '#6b7280';
        
        progressCircle.style.transition = 'none';
        progressCircle.style.strokeDashoffset = circumference;
        setTimeout(() => {
            progressCircle.style.transition = 'stroke-dashoffset 1s cubic-bezier(0.25, 1, 0.5, 1)';
        }, 50);

        tabs.forEach(t => t.classList.remove('active'));
        tabs[0].classList.add('active');
        tabContents.forEach(c => c.classList.remove('active'));
        document.getElementById('keywords-content').classList.add('active');
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorBox.classList.remove('hidden');
    }

    function hideError() {
        errorBox.classList.add('hidden');
    }
});
