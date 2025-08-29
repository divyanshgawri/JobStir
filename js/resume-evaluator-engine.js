/**
 * High-Performance Resume Evaluator Engine
 * JavaScript implementation replacing Flask backend with optimized processing
 * Features: AI analysis, semantic matching, real-time processing, caching
 */

class ResumeEvaluatorEngine {
    constructor() {
        this.apiKey = null;
        this.cache = new Map();
        this.processingQueue = [];
        this.isProcessing = false;
        this.workers = [];
        this.maxCacheSize = 100;
        
        // Performance optimizations
        this.debounceTimeout = null;
        this.batchSize = 3;
        this.concurrentLimit = 2;
        
        this.init();
    }

    async init() {
        // Initialize Web Workers for parallel processing
        this.initializeWorkers();
        
        // Load cached results
        this.loadCache();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
    }

    initializeWorkers() {
        // Create Web Workers for CPU-intensive tasks
        const workerCount = Math.min(navigator.hardwareConcurrency || 2, 4);
        
        for (let i = 0; i < workerCount; i++) {
            const worker = new Worker(URL.createObjectURL(new Blob([`
                // Web Worker for text processing
                self.onmessage = function(e) {
                    const { type, data, id } = e.data;
                    
                    switch(type) {
                        case 'parseResume':
                            const parsed = parseResumeText(data.text);
                            self.postMessage({ type: 'parseComplete', data: parsed, id });
                            break;
                        case 'calculateSimilarity':
                            const similarity = calculateTextSimilarity(data.text1, data.text2);
                            self.postMessage({ type: 'similarityComplete', data: similarity, id });
                            break;
                    }
                };

                function parseResumeText(text) {
                    // High-performance text parsing
                    const lines = text.split('\\n').map(line => line.trim()).filter(line => line);
                    
                    const result = {
                        name: extractName(lines),
                        email: extractEmail(text),
                        phone: extractPhone(text),
                        skills: extractSkills(text),
                        experience: extractExperience(lines),
                        education: extractEducation(lines),
                        projects: extractProjects(lines),
                        certificates: extractCertificates(lines),
                        achievements: extractAchievements(lines)
                    };
                    
                    return result;
                }

                function extractName(lines) {
                    // Look for name in first few lines
                    for (let i = 0; i < Math.min(3, lines.length); i++) {
                        const line = lines[i];
                        if (line.length > 2 && line.length < 50 && 
                            /^[A-Za-z\\s\\.]+$/.test(line) && 
                            !/@/.test(line) && 
                            !/\\d/.test(line)) {
                            return line;
                        }
                    }
                    return null;
                }

                function extractEmail(text) {
                    const emailRegex = /\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b/g;
                    const matches = text.match(emailRegex);
                    return matches ? matches[0] : null;
                }

                function extractPhone(text) {
                    const phoneRegex = /(?:\\+?1[-\\s]?)?\\(?([0-9]{3})\\)?[-\\s]?([0-9]{3})[-\\s]?([0-9]{4})/g;
                    const matches = text.match(phoneRegex);
                    return matches ? matches[0] : null;
                }

                function extractSkills(text) {
                    const skillKeywords = [
                        'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'HTML', 'CSS',
                        'SQL', 'MongoDB', 'AWS', 'Docker', 'Git', 'TypeScript', 'Vue.js',
                        'Angular', 'Express', 'Django', 'Flask', 'PostgreSQL', 'MySQL',
                        'Redis', 'Kubernetes', 'Jenkins', 'CI/CD', 'REST API', 'GraphQL',
                        'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch',
                        'Agile', 'Scrum', 'Project Management', 'Leadership'
                    ];
                    
                    const foundSkills = [];
                    const textLower = text.toLowerCase();
                    
                    skillKeywords.forEach(skill => {
                        if (textLower.includes(skill.toLowerCase())) {
                            foundSkills.push(skill);
                        }
                    });
                    
                    return foundSkills;
                }

                function extractExperience(lines) {
                    const experience = [];
                    let currentExp = null;
                    
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        
                        // Look for job titles and companies
                        if (/\\b(engineer|developer|manager|analyst|consultant|director|lead|senior|junior)\\b/i.test(line)) {
                            if (currentExp) {
                                experience.push(currentExp);
                            }
                            currentExp = {
                                title: line,
                                duration: null,
                                location: null,
                                description: []
                            };
                        } else if (currentExp && /\\d{4}/.test(line)) {
                            // Look for dates
                            currentExp.duration = line;
                        } else if (currentExp && line.startsWith('•') || line.startsWith('-')) {
                            // Look for bullet points
                            currentExp.description.push(line.replace(/^[•-]\\s*/, ''));
                        }
                    }
                    
                    if (currentExp) {
                        experience.push(currentExp);
                    }
                    
                    return experience;
                }

                function extractEducation(lines) {
                    const education = [];
                    const degreeKeywords = ['bachelor', 'master', 'phd', 'degree', 'university', 'college'];
                    
                    for (const line of lines) {
                        if (degreeKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
                            education.push({
                                degree: line,
                                university: null,
                                start_year: null,
                                end_year: null,
                                concentration: null,
                                cumulative_gpa: null,
                                relevant_coursework: []
                            });
                        }
                    }
                    
                    return education;
                }

                function extractProjects(lines) {
                    const projects = [];
                    let currentProject = null;
                    
                    for (const line of lines) {
                        if (line.toLowerCase().includes('project') || /https?:\\/\\//.test(line)) {
                            if (currentProject) {
                                projects.push(currentProject);
                            }
                            currentProject = {
                                title: line,
                                link: extractURL(line),
                                description: []
                            };
                        } else if (currentProject && (line.startsWith('•') || line.startsWith('-'))) {
                            currentProject.description.push(line.replace(/^[•-]\\s*/, ''));
                        }
                    }
                    
                    if (currentProject) {
                        projects.push(currentProject);
                    }
                    
                    return projects;
                }

                function extractURL(text) {
                    const urlRegex = /https?:\\/\\/[^\\s]+/g;
                    const matches = text.match(urlRegex);
                    return matches ? matches[0] : null;
                }

                function extractCertificates(lines) {
                    const certificates = [];
                    const certKeywords = ['certified', 'certification', 'certificate', 'aws', 'google', 'microsoft'];
                    
                    for (const line of lines) {
                        if (certKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
                            certificates.push(line);
                        }
                    }
                    
                    return certificates;
                }

                function extractAchievements(lines) {
                    const achievements = [];
                    const achievementKeywords = ['award', 'recognition', 'achievement', 'honor', 'winner'];
                    
                    for (const line of lines) {
                        if (achievementKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
                            achievements.push(line);
                        }
                    }
                    
                    return achievements;
                }

                function calculateTextSimilarity(text1, text2) {
                    // Simple cosine similarity implementation
                    const words1 = text1.toLowerCase().split(/\\W+/).filter(w => w.length > 2);
                    const words2 = text2.toLowerCase().split(/\\W+/).filter(w => w.length > 2);
                    
                    const allWords = [...new Set([...words1, ...words2])];
                    
                    const vector1 = allWords.map(word => words1.filter(w => w === word).length);
                    const vector2 = allWords.map(word => words2.filter(w => w === word).length);
                    
                    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
                    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
                    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
                    
                    return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
                }
            `], { type: 'application/javascript' })));
            
            this.workers.push(worker);
        }
    }

    setupPerformanceMonitoring() {
        this.performanceMetrics = {
            totalProcessed: 0,
            averageProcessingTime: 0,
            cacheHitRate: 0,
            errorRate: 0
        };
    }

    loadCache() {
        try {
            const cached = localStorage.getItem('resumeEvaluatorCache');
            if (cached) {
                const data = JSON.parse(cached);
                this.cache = new Map(data);
            }
        } catch (error) {
            console.warn('Failed to load cache:', error);
        }
    }

    saveCache() {
        try {
            // Limit cache size
            if (this.cache.size > this.maxCacheSize) {
                const entries = Array.from(this.cache.entries());
                this.cache = new Map(entries.slice(-this.maxCacheSize));
            }
            
            localStorage.setItem('resumeEvaluatorCache', JSON.stringify(Array.from(this.cache.entries())));
        } catch (error) {
            console.warn('Failed to save cache:', error);
        }
    }

    generateCacheKey(resumeText, jobDescription) {
        // Create a hash-like key for caching
        const combined = resumeText + '|' + jobDescription;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    async evaluateResume(resumeText, jobDescription, options = {}) {
        const startTime = performance.now();
        
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(resumeText, jobDescription);
            if (this.cache.has(cacheKey) && !options.skipCache) {
                this.performanceMetrics.cacheHitRate++;
                return this.cache.get(cacheKey);
            }

            // Parse resume using Web Worker
            const parsedResume = await this.parseResumeWithWorker(resumeText);
            
            // Analyze resume against job description
            const analysis = await this.analyzeResumeMatch(parsedResume, jobDescription);
            
            // Find job recommendations
            const jobRecommendations = await this.findSimilarJobs(parsedResume);
            
            // Combine results
            const result = {
                ...analysis,
                job_recommendations: jobRecommendations,
                parsed_resume: parsedResume,
                timestamp: new Date().toISOString(),
                processing_time: performance.now() - startTime
            };

            // Cache the result
            this.cache.set(cacheKey, result);
            this.saveCache();
            
            // Update metrics
            this.performanceMetrics.totalProcessed++;
            this.performanceMetrics.averageProcessingTime = 
                (this.performanceMetrics.averageProcessingTime + (performance.now() - startTime)) / 2;

            return result;

        } catch (error) {
            this.performanceMetrics.errorRate++;
            console.error('Resume evaluation error:', error);
            throw error;
        }
    }

    async parseResumeWithWorker(resumeText) {
        return new Promise((resolve, reject) => {
            const worker = this.workers[0]; // Use first available worker
            const id = Date.now() + Math.random();
            
            const timeout = setTimeout(() => {
                reject(new Error('Resume parsing timeout'));
            }, 10000);

            const handleMessage = (e) => {
                if (e.data.id === id && e.data.type === 'parseComplete') {
                    clearTimeout(timeout);
                    worker.removeEventListener('message', handleMessage);
                    resolve(e.data.data);
                }
            };

            worker.addEventListener('message', handleMessage);
            worker.postMessage({
                type: 'parseResume',
                data: { text: resumeText },
                id: id
            });
        });
    }

    async analyzeResumeMatch(parsedResume, jobDescription) {
        // High-performance local analysis
        const analysis = {
            total_score: 0,
            skills_score: 0,
            experience_score: 0,
            education_score: 0,
            project_score: 0,
            matched_keywords: [],
            missing_keywords: [],
            quick_suggestions: [],
            strengths: [],
            improvements: [],
            missing_keyword_contexts: [],
            reasoning: {
                skills_reasoning: '',
                experience_reasoning: '',
                education_reasoning: '',
                project_reasoning: '',
                overall_assessment: ''
            },
            summary: ''
        };

        // Extract job requirements
        const jobKeywords = this.extractJobKeywords(jobDescription);
        const keywordContexts = this.extractKeywordContexts(jobDescription, jobKeywords);
        const resumeKeywords = this.extractResumeKeywords(parsedResume);

        // Calculate skills match
        const skillsMatch = this.calculateSkillsMatch(parsedResume.skills || [], jobKeywords);
        analysis.skills_score = Math.round(skillsMatch.score * 35);
        analysis.matched_keywords = skillsMatch.matched;
        analysis.missing_keywords = skillsMatch.missing;

        // Calculate experience match
        const experienceMatch = this.calculateExperienceMatch(parsedResume.experience || [], jobDescription);
        analysis.experience_score = Math.round(experienceMatch.score * 25);

        // Calculate education match
        const educationMatch = this.calculateEducationMatch(parsedResume.education || [], jobDescription);
        analysis.education_score = Math.round(educationMatch.score * 20);

        // Calculate project match
        const projectMatch = this.calculateProjectMatch(parsedResume.projects || [], jobDescription);
        analysis.project_score = Math.round(projectMatch.score * 20);

        // Calculate total score
        analysis.total_score = analysis.skills_score + analysis.experience_score + 
                              analysis.education_score + analysis.project_score;

        // Generate suggestions and feedback
        analysis.quick_suggestions = this.generateQuickSuggestions(analysis, parsedResume, jobKeywords, keywordContexts);
        analysis.strengths = this.identifyStrengths(parsedResume, jobKeywords);
        analysis.improvements = this.identifyImprovements(analysis, parsedResume, jobKeywords);

        // Map missing keywords to context snippets for UI tooltips
        analysis.missing_keyword_contexts = (analysis.missing_keywords || []).map(k => ({
            keyword: k,
            context: keywordContexts[k] || ''
        }));

        // Generate reasoning
        analysis.reasoning = this.generateReasoning(analysis, parsedResume, jobDescription);
        // Provide top positive/negative keyword examples for clearer UX
        analysis.matched_keywords = (analysis.matched_keywords || []).slice(0, 15);
        analysis.missing_keywords = (analysis.missing_keywords || []).slice(0, 15);
        analysis.summary = this.generateSummary(analysis);

        return analysis;
    }

    extractJobKeywords(jobDescription) {
        const text = jobDescription.toLowerCase();
        const keywords = [];
        
        // Technical skills
        const techSkills = [
            'javascript', 'python', 'java', 'react', 'node.js', 'html', 'css',
            'sql', 'mongodb', 'aws', 'docker', 'git', 'typescript', 'vue.js',
            'angular', 'express', 'django', 'flask', 'postgresql', 'mysql',
            'redis', 'kubernetes', 'jenkins', 'ci/cd', 'rest api', 'graphql',
            'machine learning', 'data science', 'tensorflow', 'pytorch'
        ];

        // Soft skills
        const softSkills = [
            'leadership', 'communication', 'teamwork', 'problem solving',
            'project management', 'agile', 'scrum', 'analytical thinking'
        ];

        // Experience levels
        const experienceLevels = ['senior', 'junior', 'lead', 'principal', 'staff'];

        [...techSkills, ...softSkills, ...experienceLevels].forEach(skill => {
            if (text.includes(skill)) {
                keywords.push(skill);
            }
        });

        return keywords;
    }

    extractResumeKeywords(parsedResume) {
        const keywords = [];
        
        if (parsedResume.skills) {
            keywords.push(...parsedResume.skills.map(s => s.toLowerCase()));
        }
        
        if (parsedResume.experience) {
            parsedResume.experience.forEach(exp => {
                if (exp.title) keywords.push(exp.title.toLowerCase());
                if (exp.description) {
                    exp.description.forEach(desc => {
                        keywords.push(...desc.toLowerCase().split(/\W+/));
                    });
                }
            });
        }

        return [...new Set(keywords)];
    }

    calculateSkillsMatch(resumeSkills, jobKeywords) {
        const resumeSkillsLower = resumeSkills.map(s => s.toLowerCase());
        const matched = [];
        const missing = [];

        jobKeywords.forEach(keyword => {
            if (resumeSkillsLower.some(skill => skill.includes(keyword) || keyword.includes(skill))) {
                matched.push(keyword);
            } else {
                missing.push(keyword);
            }
        });

        const score = jobKeywords.length > 0 ? matched.length / jobKeywords.length : 0;
        return { score, matched, missing };
    }

    extractKeywordContexts(jobDescription, keywords) {
        // Split JD into sentences and map each keyword to its best-matching sentence
        const sentences = jobDescription
            .split(/(?<=[\.!?])\s+/)
            .map(s => s.trim())
            .filter(Boolean);
        const contexts = {};
        const jdLower = jobDescription.toLowerCase();
        keywords.forEach(kw => {
            const k = kw.toLowerCase();
            // Find first sentence that includes keyword
            let ctx = '';
            for (const s of sentences) {
                if (s.toLowerCase().includes(k)) { ctx = s; break; }
            }
            // Fallback to a short window around first index
            if (!ctx && jdLower.includes(k)) {
                const idx = jdLower.indexOf(k);
                const start = Math.max(0, idx - 60);
                const end = Math.min(jobDescription.length, idx + k.length + 60);
                ctx = jobDescription.substring(start, end) + '...';
            }
            contexts[kw] = ctx;
        });
        return contexts;
    }

    calculateExperienceMatch(experience, jobDescription) {
        if (!experience || experience.length === 0) {
            return { score: 0 };
        }

        let relevanceScore = 0;
        const jobDescLower = jobDescription.toLowerCase();

        experience.forEach(exp => {
            if (exp.title && jobDescLower.includes(exp.title.toLowerCase())) {
                relevanceScore += 0.3;
            }
            if (exp.description) {
                exp.description.forEach(desc => {
                    const commonWords = desc.toLowerCase().split(/\W+/)
                        .filter(word => word.length > 3 && jobDescLower.includes(word));
                    relevanceScore += commonWords.length * 0.1;
                });
            }
        });

        return { score: Math.min(relevanceScore, 1) };
    }

    calculateEducationMatch(education, jobDescription) {
        if (!education || education.length === 0) {
            return { score: 0.5 }; // Neutral score if no education info
        }

        const jobDescLower = jobDescription.toLowerCase();
        let educationScore = 0.5; // Base score

        education.forEach(edu => {
            if (edu.degree) {
                if (jobDescLower.includes('bachelor') && edu.degree.toLowerCase().includes('bachelor')) {
                    educationScore += 0.3;
                }
                if (jobDescLower.includes('master') && edu.degree.toLowerCase().includes('master')) {
                    educationScore += 0.4;
                }
                if (jobDescLower.includes('phd') && edu.degree.toLowerCase().includes('phd')) {
                    educationScore += 0.5;
                }
            }
        });

        return { score: Math.min(educationScore, 1) };
    }

    calculateProjectMatch(projects, jobDescription) {
        if (!projects || projects.length === 0) {
            return { score: 0.3 }; // Low but not zero score
        }

        const jobDescLower = jobDescription.toLowerCase();
        let projectScore = 0;

        projects.forEach(project => {
            if (project.description) {
                project.description.forEach(desc => {
                    const commonWords = desc.toLowerCase().split(/\W+/)
                        .filter(word => word.length > 3 && jobDescLower.includes(word));
                    projectScore += commonWords.length * 0.1;
                });
            }
        });

        return { score: Math.min(projectScore, 1) };
    }

    generateQuickSuggestions(analysis, parsedResume, jobKeywords, keywordContexts = {}) {
        const suggestions = [];

        if (analysis.skills_score < 20) {
            const topMissing = analysis.missing_keywords.slice(0, 3);
            const withContext = topMissing
                .map(k => keywordContexts[k] ? `${k} (JD: "${keywordContexts[k]}")` : k)
                .join(', ');
            suggestions.push(`Add more relevant skills: ${withContext}`);
        }

        if (analysis.experience_score < 15) {
            suggestions.push('Highlight more relevant work experience and achievements');
        }

        if (!parsedResume.projects || parsedResume.projects.length === 0) {
            suggestions.push('Add relevant projects to showcase your skills');
        }

        if (analysis.total_score < 60) {
            suggestions.push('Tailor your resume more closely to the job requirements');
        }

        suggestions.push('Use action verbs and quantify your achievements');

        return suggestions.slice(0, 5);
    }

    identifyStrengths(parsedResume, jobKeywords) {
        const strengths = [];

        if (parsedResume.skills && parsedResume.skills.length > 5) {
            strengths.push('Strong technical skill set');
        }

        if (parsedResume.experience && parsedResume.experience.length > 2) {
            strengths.push('Solid work experience');
        }

        if (parsedResume.projects && parsedResume.projects.length > 0) {
            strengths.push('Demonstrates practical application through projects');
        }

        if (parsedResume.certificates && parsedResume.certificates.length > 0) {
            strengths.push('Professional certifications show commitment to learning');
        }

        return strengths;
    }

    identifyImprovements(analysis, parsedResume, jobKeywords) {
        const improvements = [];

        if (analysis.missing_keywords.length > 0) {
            improvements.push(`Consider adding these skills: ${analysis.missing_keywords.slice(0, 3).join(', ')}`);
        }

        if (!parsedResume.achievements || parsedResume.achievements.length === 0) {
            improvements.push('Add quantifiable achievements and results');
        }

        if (analysis.total_score < 70) {
            improvements.push('Better align your experience with job requirements');
        }

        return improvements;
    }

    generateReasoning(analysis, parsedResume, jobDescription) {
        return {
            skills_reasoning: `Skills match: ${analysis.skills_score}/35. ${analysis.matched_keywords.length} relevant skills found.`,
            experience_reasoning: `Experience relevance: ${analysis.experience_score}/25. Based on ${parsedResume.experience?.length || 0} experience entries.`,
            education_reasoning: `Education match: ${analysis.education_score}/20. ${parsedResume.education?.length || 0} education entries evaluated.`,
            project_reasoning: `Project relevance: ${analysis.project_score}/20. ${parsedResume.projects?.length || 0} projects analyzed.`,
            overall_assessment: `Overall score: ${analysis.total_score}/100. ${analysis.total_score >= 70 ? 'Strong' : analysis.total_score >= 50 ? 'Moderate' : 'Weak'} match for this position.`
        };
    }

    generateSummary(analysis) {
        const score = analysis.total_score;
        if (score >= 80) {
            return 'Excellent match! This candidate strongly aligns with the job requirements.';
        } else if (score >= 60) {
            return 'Good match with some areas for improvement. Consider for interview.';
        } else if (score >= 40) {
            return 'Moderate match. Candidate may need additional development in key areas.';
        } else {
            return 'Limited match. Significant gaps in required skills and experience.';
        }
    }

    async findSimilarJobs(parsedResume) {
        try {
            // Get actual jobs from the job listings database
            const allJobs = JSON.parse(localStorage.getItem('jobstir_jobs') || '[]');
            
            // If no jobs in database, use demo jobs
            if (allJobs.length === 0) {
                return this.getDemoJobRecommendations(parsedResume);
            }

            // Calculate similarity scores for all active jobs
            const jobMatches = [];
            const resumeSkills = (parsedResume.skills || []).map(s => s.toLowerCase());
            const resumeText = this.getResumeText(parsedResume).toLowerCase();

            for (const job of allJobs) {
                if (job.status !== 'active') continue;

                const matchResult = this.calculateJobMatch(job, parsedResume, resumeSkills, resumeText);
                
                if (matchResult.similarity_score > 0.1) { // Only include jobs with some relevance
                    jobMatches.push({
                        ...job,
                        ...matchResult,
                        match_reasons: this.generateMatchReasons(matchResult, job, parsedResume)
                    });
                }
            }

            // Sort by similarity and return top 8
            return jobMatches
                .sort((a, b) => b.similarity_score - a.similarity_score)
                .slice(0, 8);

        } catch (error) {
            console.warn('Error finding similar jobs:', error);
            return this.getDemoJobRecommendations(parsedResume);
        }
    }

    calculateJobMatch(job, parsedResume, resumeSkills, resumeText) {
        let similarityScore = 0;
        let matchedSkills = 0;
        let matchedRequirements = [];
        let missingRequirements = [];

        // 1. Skills matching (40% weight)
        const jobRequirements = job.requirements || [];
        jobRequirements.forEach(req => {
            const reqLower = req.toLowerCase();
            const skillMatch = resumeSkills.some(skill => 
                skill.includes(reqLower) || 
                reqLower.includes(skill) ||
                this.areSkillsSimilar(skill, reqLower)
            );
            
            if (skillMatch) {
                matchedSkills++;
                matchedRequirements.push(req);
                similarityScore += 0.4 / jobRequirements.length;
            } else {
                missingRequirements.push(req);
            }
        });

        // 2. Job title and experience matching (30% weight)
        const titleMatch = this.calculateTitleMatch(job.title, parsedResume.experience || []);
        similarityScore += titleMatch * 0.3;

        // 3. Description keyword matching (20% weight)
        const descriptionMatch = this.calculateDescriptionMatch(job.description, resumeText);
        similarityScore += descriptionMatch * 0.2;

        // 4. Experience level matching (10% weight)
        const experienceMatch = this.calculateExperienceLevelMatch(job.experienceLevel, parsedResume.experience || []);
        similarityScore += experienceMatch * 0.1;

        return {
            similarity_score: Math.min(similarityScore, 1),
            matched_skills: matchedSkills,
            total_requirements: jobRequirements.length,
            matched_requirements: matchedRequirements,
            missing_requirements: missingRequirements,
            title_match_score: titleMatch,
            description_match_score: descriptionMatch,
            experience_level_match: experienceMatch
        };
    }

    areSkillsSimilar(skill1, skill2) {
        // Define skill synonyms and related technologies
        const skillSynonyms = {
            'javascript': ['js', 'ecmascript', 'node.js', 'nodejs'],
            'python': ['py', 'django', 'flask', 'fastapi'],
            'react': ['reactjs', 'react.js'],
            'vue': ['vuejs', 'vue.js'],
            'angular': ['angularjs'],
            'css': ['scss', 'sass', 'less', 'stylus'],
            'sql': ['mysql', 'postgresql', 'sqlite', 'database'],
            'aws': ['amazon web services', 'cloud'],
            'docker': ['containerization', 'containers'],
            'kubernetes': ['k8s', 'orchestration'],
            'machine learning': ['ml', 'ai', 'artificial intelligence'],
            'data science': ['analytics', 'data analysis']
        };

        for (const [key, synonyms] of Object.entries(skillSynonyms)) {
            if ((skill1.includes(key) || synonyms.some(s => skill1.includes(s))) &&
                (skill2.includes(key) || synonyms.some(s => skill2.includes(s)))) {
                return true;
            }
        }

        return false;
    }

    calculateTitleMatch(jobTitle, experiences) {
        if (!experiences || experiences.length === 0) return 0;

        const jobTitleWords = jobTitle.toLowerCase().split(/\s+/);
        let maxMatch = 0;

        experiences.forEach(exp => {
            if (!exp.title) return;
            
            const expTitleWords = exp.title.toLowerCase().split(/\s+/);
            const commonWords = jobTitleWords.filter(word => 
                expTitleWords.some(expWord => 
                    expWord.includes(word) || word.includes(expWord)
                )
            );
            
            const matchScore = commonWords.length / Math.max(jobTitleWords.length, expTitleWords.length);
            maxMatch = Math.max(maxMatch, matchScore);
        });

        return maxMatch;
    }

    calculateDescriptionMatch(jobDescription, resumeText) {
        if (!jobDescription || !resumeText) return 0;

        const jobWords = jobDescription.toLowerCase()
            .split(/\W+/)
            .filter(word => word.length > 3)
            .slice(0, 100); // Limit for performance

        const resumeWords = resumeText.split(/\W+/).filter(word => word.length > 3);
        
        const commonWords = jobWords.filter(word => resumeWords.includes(word));
        return commonWords.length / jobWords.length;
    }

    calculateExperienceLevelMatch(jobLevel, experiences) {
        if (!jobLevel || !experiences || experiences.length === 0) return 0.5;

        const experienceYears = this.estimateExperienceYears(experiences);
        
        const levelMap = {
            'entry': [0, 2],
            'mid': [2, 5],
            'senior': [5, 10],
            'executive': [10, 20]
        };

        const [minYears, maxYears] = levelMap[jobLevel] || [0, 20];
        
        if (experienceYears >= minYears && experienceYears <= maxYears) {
            return 1.0;
        } else if (experienceYears < minYears) {
            return Math.max(0.3, experienceYears / minYears);
        } else {
            return Math.max(0.7, maxYears / experienceYears);
        }
    }

    estimateExperienceYears(experiences) {
        // Simple heuristic: count number of positions and estimate years
        return Math.min(experiences.length * 2, 15); // Cap at 15 years
    }

    getResumeText(parsedResume) {
        let text = '';
        
        if (parsedResume.skills) {
            text += parsedResume.skills.join(' ') + ' ';
        }
        
        if (parsedResume.experience) {
            parsedResume.experience.forEach(exp => {
                text += (exp.title || '') + ' ';
                if (exp.description) {
                    text += exp.description.join(' ') + ' ';
                }
            });
        }
        
        if (parsedResume.education) {
            parsedResume.education.forEach(edu => {
                text += (edu.degree || '') + ' ';
            });
        }

        return text;
    }

    generateMatchReasons(matchResult, job, parsedResume) {
        const reasons = [];
        
        if (matchResult.matched_skills > 0) {
            reasons.push(`${matchResult.matched_skills}/${matchResult.total_requirements} required skills match`);
        }
        
        if (matchResult.title_match_score > 0.3) {
            reasons.push('Similar job title experience');
        }
        
        if (matchResult.description_match_score > 0.2) {
            reasons.push('Strong keyword alignment');
        }
        
        if (matchResult.experience_level_match > 0.8) {
            reasons.push('Perfect experience level match');
        }

        return reasons;
    }

    getDemoJobRecommendations(parsedResume) {
        // Fallback demo jobs with enhanced matching
        const demoJobs = [
            {
                id: 'demo_1',
                title: 'Senior Frontend Developer',
                company: 'TechCorp Inc.',
                location: 'San Francisco, CA',
                type: 'full-time',
                salary: '$120,000 - $160,000',
                description: 'We are looking for a skilled Frontend Developer to join our dynamic team. You will be responsible for developing user interface components and implementing them following well-known React.js workflows.',
                requirements: ['React', 'TypeScript', 'CSS', '5+ years experience'],
                remote: 'hybrid',
                experienceLevel: 'senior',
                status: 'active'
            },
            {
                id: 'demo_2',
                title: 'Data Scientist',
                company: 'DataFlow Solutions',
                location: 'New York, NY',
                type: 'full-time',
                salary: '$130,000 - $180,000',
                description: 'We are seeking a talented Data Scientist to analyze large datasets and provide actionable insights to drive business decisions.',
                requirements: ['Python', 'SQL', 'Machine Learning', 'TensorFlow', 'Statistics'],
                remote: 'onsite',
                experienceLevel: 'senior',
                status: 'active'
            },
            {
                id: 'demo_3',
                title: 'Full Stack Developer',
                company: 'StartupXYZ',
                location: 'Remote',
                type: 'full-time',
                salary: '$100,000 - $130,000',
                description: 'Looking for a versatile Full Stack Developer to work on our web applications using modern technologies.',
                requirements: ['JavaScript', 'Node.js', 'React', 'MongoDB', 'Express'],
                remote: 'remote',
                experienceLevel: 'mid',
                status: 'active'
            }
        ];

        const resumeSkills = (parsedResume.skills || []).map(s => s.toLowerCase());
        const resumeText = this.getResumeText(parsedResume).toLowerCase();

        return demoJobs.map(job => {
            const matchResult = this.calculateJobMatch(job, parsedResume, resumeSkills, resumeText);
            return {
                ...job,
                ...matchResult,
                match_reasons: this.generateMatchReasons(matchResult, job, parsedResume)
            };
        }).sort((a, b) => b.similarity_score - a.similarity_score);
    }

    // Batch processing for multiple resumes
    async batchEvaluate(resumeJobs) {
        const results = [];
        const batches = [];
        
        // Split into batches
        for (let i = 0; i < resumeJobs.length; i += this.batchSize) {
            batches.push(resumeJobs.slice(i, i + this.batchSize));
        }

        // Process batches with concurrency limit
        for (const batch of batches) {
            const batchPromises = batch.map(({ resumeText, jobDescription }) =>
                this.evaluateResume(resumeText, jobDescription)
            );
            
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults);
        }

        return results;
    }

    // Get performance metrics
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            cacheSize: this.cache.size,
            workerCount: this.workers.length
        };
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
        localStorage.removeItem('resumeEvaluatorCache');
    }

    // Cleanup resources
    destroy() {
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
        this.clearCache();
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResumeEvaluatorEngine;
}

// Global instance
window.ResumeEvaluatorEngine = ResumeEvaluatorEngine;