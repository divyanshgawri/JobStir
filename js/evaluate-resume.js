// Enhanced AI Resume Evaluator - Advanced JavaScript Implementation
// Features: Real-time analysis, AI scoring, job matching, and career insights

class ResumeEvaluator {
    constructor() {
        this.evaluatorEngine = null;
        this.isProcessing = false;
        this.analysisHistory = [];
        this.currentAnalysis = null;
        this.autoSaveEnabled = true;
        this.realTimeMode = false;
        this.initializeElements();
        this.bindEvents();
        this.initializeEngine();
        this.loadUserPreferences();
    }

    async initializeEngine() {
        try {
            // Initialize the enhanced evaluator engine with advanced features
            this.evaluatorEngine = new ResumeEvaluatorEngine();
            console.log('✅ Enhanced resume evaluator engine initialized successfully');
            
            // Initialize advanced features
            await this.initializeAdvancedFeatures();
            
            // Check Supabase integration
            if (window.resumeEvaluatorSupabase) {
                console.log('✅ Supabase integration ready');
                await this.loadAnalysisHistory();
            } else {
                console.log('⚠️ Supabase integration not available - evaluations will not be saved');
            }
            
            // Log enhanced system status
            console.log('🚀 JobStir Enhanced Resume Evaluator Status:');
            console.log('   - Engine: Ready with AI enhancements');
            console.log('   - Real-time Analysis: ' + (this.realTimeMode ? 'Enabled' : 'Disabled'));
            console.log('   - Database: ' + (window.resumeEvaluatorSupabase ? 'Connected' : 'Offline'));
            console.log('   - Analysis History: ' + this.analysisHistory.length + ' records');
            console.log('   - Auto-save: ' + (this.autoSaveEnabled ? 'Enabled' : 'Disabled'));
            console.log('   - Web Workers: ' + (typeof Worker !== 'undefined' ? 'Available' : 'Not supported'));
            
        } catch (error) {
            console.error('❌ Failed to initialize evaluator engine:', error);
            this.showError('Failed to initialize resume evaluator. Please refresh the page.');
        }
    }

    async initializeAdvancedFeatures() {
        // Initialize real-time analysis if supported
        if (typeof Worker !== 'undefined') {
            this.setupRealTimeAnalysis();
        }
        
        // Initialize career insights engine
        this.careerInsights = new CareerInsightsEngine();
        
        // Initialize ATS compatibility checker
        this.atsChecker = new ATSCompatibilityChecker();
        
        // Initialize salary estimator
        this.salaryEstimator = new SalaryEstimator();
        
        console.log('✅ Advanced features initialized');
    }

    setupRealTimeAnalysis() {
        // Enable real-time analysis with debouncing
        let analysisTimeout;
        const debounceDelay = 2000; // 2 seconds
        
        const triggerRealTimeAnalysis = () => {
            if (!this.realTimeMode || this.isProcessing) return;
            
            clearTimeout(analysisTimeout);
            analysisTimeout = setTimeout(() => {
                this.performQuickAnalysis();
            }, debounceDelay);
        };
        
        this.resumeText.addEventListener('input', triggerRealTimeAnalysis);
        this.jobDescription.addEventListener('input', triggerRealTimeAnalysis);
    }

    async loadUserPreferences() {
        const preferences = localStorage.getItem('jobstir_evaluator_preferences');
        if (preferences) {
            const prefs = JSON.parse(preferences);
            this.realTimeMode = prefs.realTimeMode || false;
            this.autoSaveEnabled = prefs.autoSaveEnabled !== false;
        }
    }

    async loadAnalysisHistory() {
        try {
            if (window.resumeEvaluatorSupabase) {
                this.analysisHistory = await window.resumeEvaluatorSupabase.getAnalysisHistory();
                this.updateHistoryUI();
            }
        } catch (error) {
            console.warn('Failed to load analysis history:', error);
        }
    }

    initializeElements() {
        // Input elements
        this.pdfUpload = document.getElementById('pdf-upload');
        this.resumeText = document.getElementById('resume-text');
        this.jobDescription = document.getElementById('job-description');
        this.analyzeButton = document.getElementById('analyze-button');
        this.resetButton = document.getElementById('reset-button');
        
        // Status elements
        this.pdfStatus = document.getElementById('pdf-status');
        this.charCount = document.getElementById('char-count');
        this.loader = document.getElementById('loader');
        this.errorBox = document.getElementById('error-box');
        this.errorMessage = document.getElementById('error-message');
        
        // Results elements
        this.resultsSection = document.getElementById('results-section');
        this.scoreText = document.getElementById('score-text');
        this.progressCircle = document.getElementById('progress-circle');
        this.summaryText = document.getElementById('summary-text');
        
        // Tab elements
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Keywords elements
        this.matchedKeywords = document.getElementById('matched-keywords');
        this.missingKeywords = document.getElementById('missing-keywords');
        this.quickSuggestions = document.getElementById('quick-suggestions');
        
        // Detailed analysis elements
        this.skillsScore = document.getElementById('skills-score');
        this.experienceScore = document.getElementById('experience-score');
        this.educationScore = document.getElementById('education-score');
        this.projectScore = document.getElementById('project-score');
        this.skillsBar = document.getElementById('skills-bar');
        this.experienceBar = document.getElementById('experience-bar');
        this.educationBar = document.getElementById('education-bar');
        this.projectBar = document.getElementById('project-bar');
        
        // Reasoning elements
        this.skillsReasoning = document.getElementById('skills-reasoning');
        this.experienceReasoning = document.getElementById('experience-reasoning');
        this.educationReasoning = document.getElementById('education-reasoning');
        this.projectReasoning = document.getElementById('project-reasoning');
        
        // Insights elements
        this.strengthsList = document.getElementById('strengths-list');
        this.improvementsList = document.getElementById('improvements-list');
        this.overallAssessment = document.getElementById('overall-assessment');
        this.hiringRecommendation = document.getElementById('hiring-recommendation');
        
        // Job recommendations
        this.jobRecommendations = document.getElementById('job-recommendations');
        this.noJobsMessage = document.getElementById('no-jobs-message');
        
        // Enhanced features elements
        this.realTimeToggle = document.getElementById('realtime-toggle');
        this.analysisHistory = document.getElementById('analysis-history');
        this.careerInsightsSection = document.getElementById('career-insights');
        this.atsCompatibilitySection = document.getElementById('ats-compatibility');
        this.salaryEstimateSection = document.getElementById('salary-estimate');
        this.exportButton = document.getElementById('export-analysis');
        this.compareButton = document.getElementById('compare-analysis');
        this.settingsButton = document.getElementById('settings-button');
        this.settingsModal = document.getElementById('settings-modal');
    }

    bindEvents() {
        // File upload handling
        this.pdfUpload.addEventListener('change', (e) => this.handlePdfUpload(e));
        
        // Character counter
        this.jobDescription.addEventListener('input', () => this.updateCharCount());
        
        // Main analyze button
        this.analyzeButton.addEventListener('click', () => this.analyzeResume());
        
        // Reset button
        this.resetButton.addEventListener('click', () => this.resetForm());
        
        // Tab navigation
        this.tabButtons.forEach(button => {
            button.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Enhanced event bindings
        this.realTimeToggle?.addEventListener('change', (e) => this.toggleRealTimeMode(e.target.checked));
        this.exportButton?.addEventListener('click', () => this.exportAnalysis());
        this.compareButton?.addEventListener('click', () => this.showComparisonModal());
        this.settingsButton?.addEventListener('click', () => this.showSettingsModal());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Initial character count
        this.updateCharCount();
    }

    async handlePdfUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            this.showError('Please upload a PDF file only.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.showError('File size must be less than 10MB.');
            return;
        }

        this.pdfStatus.textContent = 'Extracting text from PDF...';
        this.pdfStatus.className = 'pdf-status-text processing';

        try {
            const text = await this.extractTextFromPdf(file);
            this.resumeText.value = text;
            this.pdfStatus.textContent = `✓ PDF processed (${file.name})`;
            this.pdfStatus.className = 'pdf-status-text success';
        } catch (error) {
            console.error('PDF extraction error:', error);
            this.pdfStatus.textContent = '✗ Failed to extract text from PDF';
            this.pdfStatus.className = 'pdf-status-text error';
            this.showError('Failed to extract text from PDF. Please try copying and pasting the text manually.');
        }
    }

    async extractTextFromPdf(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = async function() {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = '';

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n';
                    }

                    resolve(fullText.trim());
                } catch (error) {
                    reject(error);
                }
            };
            fileReader.onerror = () => reject(new Error('Failed to read file'));
            fileReader.readAsArrayBuffer(file);
        });
    }

    updateCharCount() {
        const count = this.jobDescription.value.length;
        this.charCount.textContent = `${count.toLocaleString()} characters`;
    }

    async analyzeResume() {
        if (this.isProcessing) {
            console.warn('Analysis already in progress');
            return;
        }

        const resumeContent = this.resumeText.value.trim();
        const jobContent = this.jobDescription.value.trim();

        if (!resumeContent) {
            this.showError('Please upload a resume or paste resume text.');
            return;
        }

        if (!jobContent) {
            this.showError('Please paste the job description.');
            return;
        }

        if (jobContent.length < 50) {
            this.showError('Job description seems too short. Please provide more details.');
            return;
        }

        this.isProcessing = true;
        this.showEnhancedLoader();
        this.hideError();

        try {
            const startTime = performance.now();
            console.log('🚀 Starting advanced resume analysis...');
            
            let result;
            
            // Priority 1: Use enhanced client-side evaluator
            if (window.clientResumeEvaluator) {
                console.log('🤖 Using enhanced client-side evaluator with advanced features');
                result = await window.clientResumeEvaluator.evaluateResume(resumeContent, jobContent);
            }
            // Priority 2: Use backend API if available
            else if (window.jobAPI) {
                console.log('🌐 Using backend API evaluator');
                result = await window.jobAPI.evaluateResume(resumeContent, jobContent);
            }
            // Priority 3: Use existing evaluator engine
            else if (this.evaluatorEngine) {
                console.log('⚡ Using existing evaluator engine');
                result = await this.evaluatorEngine.evaluateResume(resumeContent, jobContent);
            }
            // Priority 4: Basic fallback analysis
            else {
                console.log('📋 Using basic analysis');
                result = this.performBasicAnalysis(resumeContent, jobContent);
            }

            const processingTime = performance.now() - startTime;
            console.log(`✅ Analysis completed in ${processingTime.toFixed(2)}ms`);
            
            // Enhance result with metadata
            const enhancedResult = {
                ...result,
                analysis_timestamp: new Date().toISOString(),
                processing_time: processingTime,
                client_side: !!window.clientResumeEvaluator
            };
            
            // Save to analysis history
            if (!this.analysisHistory) this.analysisHistory = [];
            this.analysisHistory.unshift(enhancedResult);
            if (this.analysisHistory.length > 10) {
                this.analysisHistory = this.analysisHistory.slice(0, 10);
            }
            
            // Auto-save if enabled and available
            if (this.autoSaveEnabled && window.resumeEvaluatorSupabase) {
                try {
                    await window.resumeEvaluatorSupabase.saveEvaluationResult(enhancedResult, resumeContent, jobContent);
                    if (enhancedResult.parsed_resume) {
                        await window.resumeEvaluatorSupabase.updateUserProfileFromResume(enhancedResult.parsed_resume);
                    }
                    console.log('💾 Analysis saved to database');
                } catch (supabaseError) {
                    console.warn('Failed to save to database:', supabaseError);
                }
            }
            
            // Track analytics
            if (window.trackConversion) {
                window.trackConversion('resume_analysis', enhancedResult.total_score);
            }
            
            this.currentAnalysis = enhancedResult;
            this.displayEnhancedResults(enhancedResult);
            this.updateHistoryUI();
            
            // Show success message
            this.showSuccessMessage('Analysis completed successfully!');
            
        } catch (error) {
            console.error('❌ Analysis error:', error);
            this.showError(`Analysis failed: ${error.message}. Please check your input and try again.`);
        } finally {
            this.isProcessing = false;
            this.hideLoader();
        }
    }

    async performQuickAnalysis() {
        if (this.isProcessing || !this.evaluatorEngine) return;
        
        const resumeContent = this.resumeText.value.trim();
        const jobContent = this.jobDescription.value.trim();
        
        if (resumeContent.length < 50 || jobContent.length < 50) return;
        
        try {
            const quickResult = await this.evaluatorEngine.quickAnalyze(resumeContent, jobContent);
            this.displayQuickPreview(quickResult);
        } catch (error) {
            console.warn('Quick analysis failed:', error);
        }
    }

    displayResults(data) {
        // Show results section
        this.resultsSection.classList.remove('hidden');
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });

        // Display overall score
        const score = data.total_score || 0;
        this.updateScoreDisplay(score);

        // Display summary
        this.summaryText.textContent = data.summary || this.generateSummary(score);

        // Display keywords analysis
        this.displayKeywords(data.matched_keywords || [], data.missing_keywords || []);
        
        // Display quick suggestions
        this.displayQuickSuggestions(data.quick_suggestions || []);

        // Check if user is authenticated for advanced features
        const isAuthenticated = this.checkAuthentication();
        
        if (isAuthenticated) {
            this.showAdvancedFeatures();
            this.displayDetailedAnalysis(data);
            this.displayInsights(data);
            this.displayJobRecommendations(data.job_recommendations || []);
        } else {
            this.hideAdvancedFeatures();
        }
    }

    displayEnhancedResults(data) {
        try {
            // Call the basic display first
            this.displayResults(data);
            
            // Enable action buttons
            this.exportButton.disabled = false;
            this.compareButton.disabled = false;
            
            // Display enhanced features if authenticated
            const isAuthenticated = this.checkAuthentication();
            
            if (isAuthenticated) {
                // Display ATS compatibility
                if (data.ats_compatibility) {
                    this.displayATSCompatibility(data.ats_compatibility);
                }
                
                // Display salary estimate
                if (data.salary_estimate) {
                    this.displaySalaryEstimate(data.salary_estimate);
                }
                
                // Display career insights
                if (data.career_insights) {
                    this.displayCareerInsights(data.career_insights);
                }
            }
            
        } catch (error) {
            console.error('Error displaying enhanced results:', error);
            this.showError('Failed to display some analysis results. Basic analysis is still available.');
        }
    }

    displayATSCompatibility(atsData) {
        try {
            // Update ATS score
            document.getElementById('ats-score-text').textContent = `${atsData.overall_score}%`;
            
            // Update detailed scores
            this.updateATSScoreBar('contact', atsData.detailed_scores.contact_info);
            this.updateATSScoreBar('structure', atsData.detailed_scores.structure);
            this.updateATSScoreBar('keywords', atsData.detailed_scores.keyword_density);
            
            // Display recommendations
            const recommendationsList = document.getElementById('ats-recommendations-list');
            recommendationsList.innerHTML = '';
            atsData.recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                recommendationsList.appendChild(li);
            });
            
        } catch (error) {
            console.error('Error displaying ATS compatibility:', error);
        }
    }

    updateATSScoreBar(category, score) {
        try {
            const bar = document.getElementById(`ats-${category}-bar`);
            const scoreElement = document.getElementById(`ats-${category}-score`);
            
            if (bar && scoreElement) {
                bar.style.width = `${score}%`;
                scoreElement.textContent = `${score}%`;
                
                // Add color classes
                bar.className = 'score-fill';
                if (score >= 80) {
                    bar.classList.add('excellent');
                } else if (score >= 60) {
                    bar.classList.add('good');
                } else if (score >= 40) {
                    bar.classList.add('fair');
                } else {
                    bar.classList.add('poor');
                }
            }
        } catch (error) {
            console.error(`Error updating ATS score bar for ${category}:`, error);
        }
    }

    displaySalaryEstimate(salaryData) {
        try {
            // Update salary range
            const range = salaryData.estimated_range;
            document.getElementById('salary-range').textContent = 
                `$${range.min.toLocaleString()} - $${range.max.toLocaleString()}`;
            document.getElementById('salary-median').textContent = 
                `$${range.median.toLocaleString()}`;
            document.getElementById('salary-confidence').textContent = 
                `${salaryData.confidence_level}%`;
            
            // Update market insights
            const insights = salaryData.market_insights;
            document.getElementById('market-demand').textContent = insights.demand_level;
            document.getElementById('market-growth').textContent = insights.growth_trend;
            document.getElementById('market-competition').textContent = insights.competition;
            
            // Update growth projections
            const projection = salaryData.growth_projection;
            document.getElementById('salary-1year').textContent = 
                `$${projection.one_year.toLocaleString()}`;
            document.getElementById('salary-3years').textContent = 
                `$${projection.three_years.toLocaleString()}`;
            document.getElementById('salary-5years').textContent = 
                `$${projection.five_years.toLocaleString()}`;
            
        } catch (error) {
            console.error('Error displaying salary estimate:', error);
        }
    }

    displayCareerInsights(careerData) {
        try {
            // This would integrate with the existing insights display
            // Add career-specific insights to the insights tab
            if (careerData.next_steps) {
                const existingImprovements = document.getElementById('improvements-list');
                careerData.next_steps.forEach(step => {
                    const li = document.createElement('li');
                    li.innerHTML = `<i data-feather="trending-up"></i> ${step}`;
                    existingImprovements.appendChild(li);
                });
            }
            
            feather.replace();
        } catch (error) {
            console.error('Error displaying career insights:', error);
        }
    }

    displayQuickPreview(quickResult) {
        try {
            // Show a subtle preview of the analysis without full results
            const previewElement = document.getElementById('quick-preview');
            if (previewElement && quickResult) {
                previewElement.innerHTML = `
                    <div class="quick-preview-content">
                        <span class="preview-score">${quickResult.score || 0}%</span>
                        <span class="preview-text">Match Preview</span>
                    </div>
                `;
                previewElement.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error displaying quick preview:', error);
        }
    }

    updateScoreDisplay(score) {
        this.scoreText.textContent = `${score}%`;
        
        // Update progress circle
        const circumference = 2 * Math.PI * 54; // radius = 54
        const offset = circumference - (score / 100) * circumference;
        this.progressCircle.style.strokeDasharray = circumference;
        this.progressCircle.style.strokeDashoffset = offset;
        
        // Add color based on score (use setAttribute for SVG elements)
        this.progressCircle.setAttribute('class', 'progress-ring-fg');
        if (score >= 80) {
            this.progressCircle.classList.add('excellent');
        } else if (score >= 60) {
            this.progressCircle.classList.add('good');
        } else if (score >= 40) {
            this.progressCircle.classList.add('fair');
        } else {
            this.progressCircle.classList.add('poor');
        }
    }

    displayKeywords(matched, missing) {
        // Helper to format labels nicely and skip empties
        const formatLabel = (text) => {
            const t = (text || '').toString().trim();
            if (!t) return '';
            return t
                .split(/\s+/)
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
        };

        const renderChips = (container, items, styleClass) => {
            container.innerHTML = '';
            const unique = Array.from(new Set(items.map(k => (k || '').toString().trim())));
            if (unique.length === 0) {
                const empty = document.createElement('span');
                empty.className = 'keyword-tag';
                empty.textContent = 'None';
                container.appendChild(empty);
                return;
            }
            unique
                .filter(Boolean)
                .slice(0, 30)
                .forEach(keyword => {
                    const span = document.createElement('span');
                    span.className = `keyword-tag ${styleClass}`;
                    span.textContent = formatLabel(keyword);
                    // If we have contexts from the engine, set as title for tooltip
                    if (this.lastResult && Array.isArray(this.lastResult.missing_keyword_contexts)) {
                        const ctxItem = this.lastResult.missing_keyword_contexts.find(k => k.keyword === keyword);
                        if (ctxItem && ctxItem.context && styleClass === 'missing') {
                            span.title = ctxItem.context;
                        }
                    }
                    container.appendChild(span);
                });
        };

        renderChips(this.matchedKeywords, matched, 'matched');
        renderChips(this.missingKeywords, missing, 'missing');
    }

    displayQuickSuggestions(suggestions) {
        this.quickSuggestions.innerHTML = '';
        suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.textContent = suggestion;
            this.quickSuggestions.appendChild(li);
        });
    }

    displayDetailedAnalysis(data) {
        // Update score bars and values
        this.updateScoreBar('skills', data.skills_score || 0, 35);
        this.updateScoreBar('experience', data.experience_score || 0, 25);
        this.updateScoreBar('education', data.education_score || 0, 20);
        this.updateScoreBar('project', data.project_score || 0, 20);

        // Update reasoning
        if (data.reasoning) {
            this.skillsReasoning.textContent = data.reasoning.skills_reasoning || '';
            this.experienceReasoning.textContent = data.reasoning.experience_reasoning || '';
            this.educationReasoning.textContent = data.reasoning.education_reasoning || '';
            this.projectReasoning.textContent = data.reasoning.project_reasoning || '';
        }
    }

    updateScoreBar(category, score, maxScore) {
        const percentage = (score / maxScore) * 100;
        const bar = document.getElementById(`${category}-bar`);
        const scoreElement = document.getElementById(`${category}-score`);
        
        bar.style.width = `${percentage}%`;
        scoreElement.textContent = `${score}/${maxScore}`;
        
        // Add color classes
        bar.className = 'score-fill';
        if (percentage >= 80) {
            bar.classList.add('excellent');
        } else if (percentage >= 60) {
            bar.classList.add('good');
        } else if (percentage >= 40) {
            bar.classList.add('fair');
        } else {
            bar.classList.add('poor');
        }
    }

    displayInsights(data) {
        // Display strengths
        this.strengthsList.innerHTML = '';
        (data.strengths || []).forEach(strength => {
            const li = document.createElement('li');
            li.innerHTML = `<i data-feather="check-circle"></i> ${strength}`;
            this.strengthsList.appendChild(li);
        });

        // Display improvements
        this.improvementsList.innerHTML = '';
        (data.improvements || []).forEach(improvement => {
            const li = document.createElement('li');
            li.innerHTML = `<i data-feather="arrow-up-circle"></i> ${improvement}`;
            this.improvementsList.appendChild(li);
        });

        // Overall assessment
        this.overallAssessment.textContent = data.overall_assessment || '';
        
        // Hiring recommendation
        const recommendation = this.getHiringRecommendation(data.total_score || 0);
        this.hiringRecommendation.textContent = recommendation.text;
        this.hiringRecommendation.className = `recommendation-value ${recommendation.class}`;

        // Re-initialize feather icons
        feather.replace();
    }

    displayJobRecommendations(jobs) {
        if (jobs.length === 0) {
            this.jobRecommendations.classList.add('hidden');
            this.noJobsMessage.classList.remove('hidden');
            return;
        }

        this.noJobsMessage.classList.add('hidden');
        this.jobRecommendations.classList.remove('hidden');
        this.jobRecommendations.innerHTML = '';

        jobs.forEach(job => {
            const matchPercentage = Math.round(job.similarity_score * 100);
            const matchClass = this.getMatchClass(matchPercentage);
            const matchReasons = job.match_reasons || [];
            
            const jobCard = document.createElement('div');
            jobCard.className = 'job-recommendation-card';
            jobCard.innerHTML = `
                <div class="job-header">
                    <div class="job-info">
                        <h5 class="job-title">${job.title}</h5>
                        <p class="job-company">${job.company}</p>
                        <div class="job-location">
                            <i data-feather="map-pin"></i>
                            <span>${job.location}</span>
                            ${job.remote ? `<span class="remote-badge">${this.formatRemote(job.remote)}</span>` : ''}
                        </div>
                    </div>
                    <div class="job-match">
                        <div class="match-score ${matchClass}">
                            ${matchPercentage}% Match
                        </div>
                        ${job.salary ? `<div class="job-salary">${job.salary}</div>` : ''}
                    </div>
                </div>
                
                <p class="job-description">${job.description.substring(0, 120)}...</p>
                
                ${matchReasons.length > 0 ? `
                    <div class="match-reasons">
                        <strong>Why this matches:</strong>
                        <ul>
                            ${matchReasons.slice(0, 3).map(reason => `<li>${reason}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${job.matched_requirements && job.matched_requirements.length > 0 ? `
                    <div class="matched-skills">
                        <strong>Matching skills:</strong>
                        <div class="skill-tags">
                            ${job.matched_requirements.slice(0, 4).map(skill => 
                                `<span class="skill-tag matched">${skill}</span>`
                            ).join('')}
                            ${job.matched_requirements.length > 4 ? 
                                `<span class="skill-tag">+${job.matched_requirements.length - 4} more</span>` : ''}
                        </div>
                    </div>
                ` : ''}
                
                <div class="job-actions">
                    <button class="btn-apply" onclick="window.open('job_listings.html?job=${job.id}', '_blank')">
                        <i data-feather="external-link"></i>
                        View Job Details
                    </button>
                    <button class="btn-save" onclick="resumeEvaluator.saveJob('${job.id}')">
                        <i data-feather="bookmark"></i>
                        Save Job
                    </button>
                </div>
            `;
            this.jobRecommendations.appendChild(jobCard);
        });
        
        // Re-initialize feather icons
        feather.replace();
    }

    getMatchClass(percentage) {
        if (percentage >= 80) return 'excellent';
        if (percentage >= 60) return 'good';
        if (percentage >= 40) return 'fair';
        return 'poor';
    }

    formatRemote(remote) {
        const remoteMap = {
            'remote': 'Remote',
            'hybrid': 'Hybrid',
            'onsite': 'On-site'
        };
        return remoteMap[remote] || remote;
    }

    saveJob(jobId) {
        const session = localStorage.getItem('jobstir_session');
        if (!session) {
            this.showError('Please sign in to save jobs');
            return;
        }

        // Save job to user's saved jobs
        const savedJobs = JSON.parse(localStorage.getItem('jobstir_saved_jobs') || '[]');
        if (!savedJobs.includes(jobId)) {
            savedJobs.push(jobId);
            localStorage.setItem('jobstir_saved_jobs', JSON.stringify(savedJobs));
            this.showToast('Job saved successfully!');
        } else {
            this.showToast('Job already saved');
        }
    }

    showToast(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--navy);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    getHiringRecommendation(score) {
        if (score >= 85) {
            return { text: 'Strong Hire', class: 'excellent' };
        } else if (score >= 75) {
            return { text: 'Hire', class: 'good' };
        } else if (score >= 65) {
            return { text: 'Consider', class: 'fair' };
        } else if (score >= 50) {
            return { text: 'Maybe', class: 'fair' };
        } else {
            return { text: 'Pass', class: 'poor' };
        }
    }

    generateSummary(score) {
        if (score >= 85) {
            return "Excellent match! This candidate demonstrates strong alignment with the job requirements across multiple areas.";
        } else if (score >= 75) {
            return "Good match! This candidate shows solid qualifications with some areas for potential growth.";
        } else if (score >= 65) {
            return "Moderate match. The candidate has relevant experience but may need development in key areas.";
        } else if (score >= 50) {
            return "Partial match. The candidate has some relevant qualifications but significant gaps exist.";
        } else {
            return "Limited match. The candidate's background doesn't strongly align with the job requirements.";
        }
    }

    checkAuthentication() {
        // Consider logged in if our session exists
        return !!localStorage.getItem('jobstir_session');
    }

    showAdvancedFeatures() {
        document.querySelectorAll('.advanced-only').forEach(el => {
            el.classList.remove('hidden');
        });
    }

    hideAdvancedFeatures() {
        document.querySelectorAll('.advanced-only').forEach(el => {
            el.classList.add('hidden');
        });
        
        // Show upgrade prompt if not authenticated
        this.showUpgradePrompt();
    }

    showUpgradePrompt() {
        const overlay = document.getElementById('upgrade-overlay');
        if (overlay) {
            overlay.innerHTML = `
                <div class="upgrade-content">
                    <div class="upgrade-icon">🚀</div>
                    <h3>Unlock Advanced Analysis</h3>
                    <p>Get detailed scoring, insights, and job recommendations</p>
                    <div class="upgrade-features">
                        <div class="feature">✓ Detailed score breakdown</div>
                        <div class="feature">✓ Personalized insights</div>
                        <div class="feature">✓ Job recommendations</div>
                        <div class="feature">✓ Resume improvement tips</div>
                    </div>
                    <div class="upgrade-actions">
                        <a href="signin.html" class="btn-primary">Sign In</a>
                        <a href="signup.html" class="btn-secondary">Sign Up Free</a>
                    </div>
                    <button class="close-overlay" onclick="this.parentElement.parentElement.classList.add('hidden')">×</button>
                </div>
            `;
            overlay.classList.remove('hidden');
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.tab === tabName);
        });

        // Update tab contents
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });
    }

    resetForm() {
        // Clear inputs
        this.resumeText.value = '';
        this.jobDescription.value = '';
        this.pdfUpload.value = '';
        
        // Reset status
        this.pdfStatus.textContent = 'or paste content below';
        this.pdfStatus.className = 'pdf-status-text';
        this.updateCharCount();
        
        // Hide results
        this.resultsSection.classList.add('hidden');
        this.hideError();
        
        // Scroll to top
        document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
}

exportAnalysis() {
    try {
        if (!this.currentAnalysis) {
            this.showWarning('No analysis to export. Please analyze a resume first.');
            return;
        }
        
        const exportData = {
            analysis: this.currentAnalysis,
            timestamp: new Date().toISOString(),
            version: '2.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resume-analysis-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Analysis exported successfully');
        
    } catch (error) {
        console.error('Error exporting analysis:', error);
        this.showError('Failed to export analysis');
    }
}

showComparisonModal() {
    try {
        if (this.analysisHistory.length < 2) {
            this.showWarning('Need at least 2 analyses to compare');
            return;
        }
        
        // Implementation for comparison modal would go here
        this.showSuccess('Comparison feature coming soon!');
        
    } catch (error) {
        console.error('Error showing comparison modal:', error);
        this.showError('Failed to open comparison');
    }
}

showSettingsModal() {
    try {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // Load current settings
            document.getElementById('auto-save-setting').checked = this.autoSaveEnabled;
            document.getElementById('detailed-feedback-setting').checked = true;
            document.getElementById('market-insights-setting').checked = true;
        }
    } catch (error) {
        console.error('Error showing settings modal:', error);
        this.showError('Failed to open settings');
    }
}

saveSettings() {
    try {
        const autoSave = document.getElementById('auto-save-setting').checked;
        const detailedFeedback = document.getElementById('detailed-feedback-setting').checked;
        const marketInsights = document.getElementById('market-insights-setting').checked;
        
        this.autoSaveEnabled = autoSave;
        
        this.saveUserPreferences();
        
        document.getElementById('settings-modal').classList.add('hidden');
        this.showSuccess('Settings saved successfully');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        this.showError('Failed to save settings');
    }
}

saveUserPreferences() {
    try {
        const preferences = {
            realTimeMode: this.realTimeMode,
            autoSaveEnabled: this.autoSaveEnabled
        };
        
        localStorage.setItem('jobstir_evaluator_preferences', JSON.stringify(preferences));
    } catch (error) {
        console.error('Error saving user preferences:', error);
    }
}

updateHistoryUI() {
    try {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        this.analysisHistory.slice(0, 5).forEach((analysis, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-score">${analysis.total_score || 0}%</div>
                <div class="history-details">
                    <div class="history-date">${new Date(analysis.analysis_timestamp).toLocaleDateString()}</div>
                    <div class="history-time">${new Date(analysis.analysis_timestamp).toLocaleTimeString()}</div>
                </div>
            `;
            
            historyItem.addEventListener('click', () => {
                this.loadHistoryAnalysis(analysis);
            });
            
            historyList.appendChild(historyItem);
        });
        
    } catch (error) {
        console.error('Error updating history UI:', error);
    }
}

loadHistoryAnalysis(analysis) {
    try {
        this.currentAnalysis = analysis;
        this.displayEnhancedResults(analysis);
        document.getElementById('analysis-history-sidebar').classList.add('hidden');
        this.showSuccess('Historical analysis loaded');
    } catch (error) {
        console.error('Error loading historical analysis:', error);
        this.showError('Failed to load historical analysis');
    }
}

performBasicAnalysis(resumeText, jobDescription) {
    const wordCount = resumeText.split(/\s+/).length;
    const jobWords = jobDescription.toLowerCase().split(/\s+/);
    const resumeWords = resumeText.toLowerCase().split(/\s+/);
    
    let matchCount = 0;
    jobWords.forEach(word => {
        if (word.length > 3 && resumeWords.includes(word)) {
            matchCount++;
        }
    });
    
    const score = Math.min((matchCount / Math.max(jobWords.length * 0.1, 10)) * 100, 100);
    
    return {
        total_score: Math.round(score),
        skills_score: Math.round(score * 0.35),
        experience_score: Math.round(score * 0.25),
        education_score: Math.round(score * 0.20),
        project_score: Math.round(score * 0.20),
        matched_keywords: [`Found ${matchCount} matching terms`],
        missing_keywords: ['Unable to perform detailed analysis'],
        quick_suggestions: [
            'Enable JavaScript for full analysis',
            'Try the enhanced client-side evaluator',
            'Upload your resume for better results'
        ],
        strengths: ['Resume provided for analysis'],
        improvements: ['Use advanced analyzer for detailed feedback'],
        reasoning: {
            skills_reasoning: `Basic analysis found ${matchCount} matching terms`,
            experience_reasoning: `Resume contains approximately ${wordCount} words`,
            education_reasoning: 'Basic analysis - full evaluation not available',
            project_reasoning: 'Basic analysis - detailed project analysis not available',
            overall_assessment: `Basic compatibility analysis shows ${Math.round(score)}% similarity`
        },
        summary: `Basic analysis completed with ${Math.round(score)}% compatibility score`,
        job_recommendations: [],
        evaluation_method: 'basic-fallback',
        timestamp: new Date().toISOString()
    };
}

showEnhancedLoader() {
    if (this.loader) {
        this.loader.style.display = 'block';
        this.loader.innerHTML = `
            <div class="spinner"></div>
            <div class="loader-text">Analyzing resume with AI-powered insights...</div>
            <div class="loader-features">
                <div class="feature-item">✓ Skills & Experience Analysis</div>
                <div class="feature-item">✓ ATS Compatibility Check</div>
                <div class="feature-item">✓ Salary Range Estimation</div>
                <div class="feature-item">✓ Industry Fit Assessment</div>
            </div>
        `;
    }
}

showSuccessMessage(message) {
    console.log('✅', message);
    // Create and show a success toast
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: var(--olive); color: white; padding: 12px 20px;
        border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-weight: 500; animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
}

// Global keyboard shortcuts handler
function handleKeyboardShortcuts(event) {
    try {
        // Ctrl/Cmd + Enter to analyze
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            if (window.resumeEvaluator) {
                window.resumeEvaluator.analyzeResume();
            }
        }
        
        // Ctrl/Cmd + R to reset
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            if (window.resumeEvaluator) {
                window.resumeEvaluator.resetForm();
            }
        }
        
        // Escape to close modals
        if (event.key === 'Escape') {
            document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
                modal.classList.add('hidden');
            });
        }
        
    } catch (error) {
        console.error('Error handling keyboard shortcuts:', error);
    }
}

// Global logout function
window.logout = function() {
    localStorage.removeItem('jobstir_session');
    window.location.href = 'index.html';
};

// Global resume evaluator instance
window.resumeEvaluator = null;

// Initialize the resume evaluator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.resumeEvaluator = new ResumeEvaluator();
        
        // Initialize Feather Icons
        feather.replace();
        
        // Update authentication UI
        updateAuthUI();
        
        // Add global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            if (window.resumeEvaluator) {
                window.resumeEvaluator.showError('An unexpected error occurred. Please refresh the page.');
            }
        });
        
        // Add unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            if (window.resumeEvaluator) {
                window.resumeEvaluator.showError('An error occurred during processing. Please try again.');
            }
        });
        
    } catch (error) {
        console.error('Failed to initialize resume evaluator:', error);
        document.body.innerHTML += `
            <div class="initialization-error">
                <h3>Initialization Error</h3>
                <p>Failed to load the resume evaluator. Please refresh the page.</p>
                <button onclick="window.location.reload()">Refresh Page</button>
            </div>
        `;
    }
});

// Authentication UI Management (same as home.js)
function updateAuthUI() {
    const session = localStorage.getItem('jobstir_session');
    const navButtons = document.querySelector('.nav-buttons');
    const mobileNavButtons = document.querySelector('.mobile-nav-buttons');
    
    if (session) {
        const user = JSON.parse(session);
        const userMenu = createUserMenu(user);
        
        // Update desktop nav
        if (navButtons) {
            navButtons.innerHTML = navButtons.innerHTML.replace(
                /<a href="signin\.html".*?<\/a>\s*<a href="signup\.html".*?<\/a>/,
                userMenu
            );
        }
        
        // Update mobile nav
        if (mobileNavButtons) {
            mobileNavButtons.innerHTML = userMenu;
        }
    }
}

function createUserMenu(user) {
    const adminPanelLink = user.isAdmin ? 
        `<a href="admin_panel.html" class="btn btn-danger">Admin Panel</a>` : '';
    const hrDashboardLink = user.isHR ? 
        `<a href="hr_dashboard.html" class="btn btn-primary">HR Dashboard</a>` : '';
    const candidatePortalLink = (!user.isHR && !user.isAdmin) ? 
        `<a href="candidate_portal.html" class="btn btn-primary">My Applications</a>` : '';
    
    return `
        <div class="user-menu">
            <span class="user-greeting">Welcome, ${user.email.split('@')[0]}!</span>
            <div class="dashboard-buttons">
                ${adminPanelLink}
                ${hrDashboardLink}
                ${candidatePortalLink}
                <a href="profile.html" class="btn btn-info">My Profile</a>
            </div>
            <button onclick="logout()" class="btn btn-secondary">Logout</button>
        </div>
    `;
}