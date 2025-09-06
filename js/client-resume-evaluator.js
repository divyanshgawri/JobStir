// Client-Side Resume Evaluator
// Advanced JavaScript implementation with NLP and rule-based analysis
// No backend dependencies - works entirely in the browser

class ClientResumeEvaluator {
    constructor() {
        this.skills = new Set();
        this.keywords = new Set();
        this.stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 
            'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 
            'above', 'below', 'between', 'among', 'is', 'was', 'are', 'were', 'be', 'been',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could'
        ]);
        
        // Advanced features
        this.industryData = new Map();
        this.salaryData = new Map();
        this.atsKeywords = new Set();
        this.locationData = new Map();
        this.educationLevels = new Map();
        this.experienceLevels = new Map();
        
        // Initialize all databases
        this.initializeSkillDatabase();
        this.initializeIndustryDatabase();
        this.initializeSalaryDatabase();
        this.initializeATSDatabase();
        this.initializePatterns();
        this.initializeLocationDatabase();
        
        // Performance tracking
        this.analysisCache = new Map();
        this.lastAnalysis = null;
        
        console.log('🚀 Advanced client-side resume evaluator initialized');
        console.log('📊 Features: ATS Analysis, Salary Estimation, Industry Matching, Location Analysis');
    }

    initializeSkillDatabase() {
        // Comprehensive Technical Skills Database
        this.technicalSkills = new Map([
            // Programming Languages
            ['javascript', { category: 'Programming', weight: 3, aliases: ['js', 'node.js', 'nodejs'], salary: 75000 }],
            ['python', { category: 'Programming', weight: 3, aliases: ['py'], salary: 80000 }],
            ['java', { category: 'Programming', weight: 3, aliases: [], salary: 85000 }],
            ['typescript', { category: 'Programming', weight: 3, aliases: ['ts'], salary: 85000 }],
            ['c++', { category: 'Programming', weight: 3, aliases: ['cpp'], salary: 90000 }],
            ['c#', { category: 'Programming', weight: 3, aliases: ['csharp'], salary: 80000 }],
            ['php', { category: 'Programming', weight: 2, aliases: [], salary: 65000 }],
            ['ruby', { category: 'Programming', weight: 2, aliases: [], salary: 75000 }],
            ['go', { category: 'Programming', weight: 3, aliases: ['golang'], salary: 95000 }],
            ['rust', { category: 'Programming', weight: 3, aliases: [], salary: 100000 }],
            
            // Frontend Technologies
            ['react', { category: 'Frontend', weight: 3, aliases: ['reactjs', 'react.js'], salary: 80000 }],
            ['angular', { category: 'Frontend', weight: 3, aliases: ['angularjs'], salary: 80000 }],
            ['vue', { category: 'Frontend', weight: 3, aliases: ['vuejs', 'vue.js'], salary: 75000 }],
            ['svelte', { category: 'Frontend', weight: 2, aliases: [], salary: 75000 }],
            ['html', { category: 'Frontend', weight: 2, aliases: ['html5'], salary: 50000 }],
            ['css', { category: 'Frontend', weight: 2, aliases: ['css3', 'scss', 'sass'], salary: 50000 }],
            ['tailwind', { category: 'Frontend', weight: 2, aliases: ['tailwindcss'], salary: 65000 }],
            
            // Backend & Databases
            ['sql', { category: 'Database', weight: 3, aliases: ['mysql', 'postgresql', 'sqlite'], salary: 70000 }],
            ['mongodb', { category: 'Database', weight: 3, aliases: ['mongo'], salary: 75000 }],
            ['redis', { category: 'Database', weight: 2, aliases: [], salary: 80000 }],
            ['elasticsearch', { category: 'Database', weight: 2, aliases: ['elastic'], salary: 85000 }],
            
            // Cloud & DevOps
            ['docker', { category: 'DevOps', weight: 3, aliases: [], salary: 85000 }],
            ['kubernetes', { category: 'DevOps', weight: 3, aliases: ['k8s'], salary: 100000 }],
            ['aws', { category: 'Cloud', weight: 3, aliases: ['amazon web services'], salary: 95000 }],
            ['azure', { category: 'Cloud', weight: 3, aliases: ['microsoft azure'], salary: 90000 }],
            ['gcp', { category: 'Cloud', weight: 3, aliases: ['google cloud'], salary: 90000 }],
            ['terraform', { category: 'DevOps', weight: 3, aliases: [], salary: 95000 }],
            
            // Data Science & AI
            ['machine learning', { category: 'AI/ML', weight: 3, aliases: ['ml', 'ai'], salary: 110000 }],
            ['tensorflow', { category: 'AI/ML', weight: 3, aliases: [], salary: 115000 }],
            ['pytorch', { category: 'AI/ML', weight: 3, aliases: [], salary: 115000 }],
            ['pandas', { category: 'Data Science', weight: 2, aliases: [], salary: 90000 }],
            ['numpy', { category: 'Data Science', weight: 2, aliases: [], salary: 85000 }],
            
            // Tools & Frameworks
            ['git', { category: 'Tools', weight: 2, aliases: ['github', 'gitlab'], salary: 60000 }],
            ['jenkins', { category: 'CI/CD', weight: 2, aliases: [], salary: 80000 }],
            ['jira', { category: 'Tools', weight: 1, aliases: [], salary: 55000 }],
            ['figma', { category: 'Design', weight: 2, aliases: [], salary: 65000 }],
        ]);

        // Enhanced Soft Skills Database
        this.softSkills = new Map([
            ['leadership', { category: 'Management', weight: 3, aliases: ['team lead', 'team leader'], impact: 'high' }],
            ['communication', { category: 'Interpersonal', weight: 3, aliases: ['verbal', 'written'], impact: 'high' }],
            ['problem solving', { category: 'Cognitive', weight: 3, aliases: ['troubleshooting', 'debugging'], impact: 'high' }],
            ['project management', { category: 'Management', weight: 3, aliases: ['project lead', 'scrum master'], impact: 'high' }],
            ['teamwork', { category: 'Interpersonal', weight: 2, aliases: ['collaboration', 'team player'], impact: 'medium' }],
            ['analytical', { category: 'Cognitive', weight: 3, aliases: ['analysis', 'analytical thinking'], impact: 'high' }],
            ['creativity', { category: 'Cognitive', weight: 2, aliases: ['creative thinking', 'innovation'], impact: 'medium' }],
            ['adaptability', { category: 'Personal', weight: 2, aliases: ['flexibility', 'adaptable'], impact: 'medium' }],
            ['time management', { category: 'Personal', weight: 2, aliases: ['prioritization'], impact: 'medium' }],
            ['critical thinking', { category: 'Cognitive', weight: 3, aliases: ['critical analysis'], impact: 'high' }],
        ]);
    }
    
    initializeIndustryDatabase() {
        this.industryData.set('technology', {
            keywords: ['software', 'developer', 'engineer', 'programming', 'coding', 'tech', 'startup'],
            avgSalary: 90000,
            growth: 'high',
            skills: ['javascript', 'python', 'react', 'aws']
        });
        
        this.industryData.set('finance', {
            keywords: ['financial', 'banking', 'investment', 'fintech', 'analyst', 'accounting'],
            avgSalary: 85000,
            growth: 'medium',
            skills: ['sql', 'python', 'excel', 'tableau']
        });
        
        this.industryData.set('healthcare', {
            keywords: ['medical', 'healthcare', 'hospital', 'clinical', 'patient'],
            avgSalary: 70000,
            growth: 'high',
            skills: ['data analysis', 'compliance', 'communication']
        });
        
        this.industryData.set('marketing', {
            keywords: ['marketing', 'digital', 'social media', 'advertising', 'campaign'],
            avgSalary: 65000,
            growth: 'medium',
            skills: ['analytics', 'creativity', 'communication']
        });
    }
    
    initializeSalaryDatabase() {
        // Salary ranges by experience level
        this.experienceLevels.set('entry', { min: 45000, max: 70000, years: [0, 2] });
        this.experienceLevels.set('mid', { min: 65000, max: 100000, years: [2, 5] });
        this.experienceLevels.set('senior', { min: 90000, max: 150000, years: [5, 10] });
        this.experienceLevels.set('lead', { min: 120000, max: 200000, years: [8, 15] });
        this.experienceLevels.set('executive', { min: 150000, max: 300000, years: [10, 30] });
        
        // Location multipliers
        this.locationData.set('san francisco', 1.4);
        this.locationData.set('new york', 1.3);
        this.locationData.set('seattle', 1.25);
        this.locationData.set('boston', 1.2);
        this.locationData.set('austin', 1.1);
        this.locationData.set('denver', 1.05);
        this.locationData.set('remote', 1.1);
        this.locationData.set('chicago', 1.15);
    }
    
    initializeATSDatabase() {
        // ATS-friendly keywords and phrases
        const atsKeywords = [
            'results-driven', 'team player', 'detail-oriented', 'problem-solver',
            'self-motivated', 'excellent communication', 'leadership skills',
            'project management', 'analytical skills', 'creative thinking',
            'time management', 'adaptability', 'collaboration',
            'customer-focused', 'goal-oriented', 'strategic thinking'
        ];
        
        atsKeywords.forEach(keyword => this.atsKeywords.add(keyword.toLowerCase()));
        
        // Action verbs that ATS systems love
        this.actionVerbs = new Set([
            'achieved', 'improved', 'increased', 'decreased', 'managed', 'led',
            'developed', 'created', 'implemented', 'designed', 'analyzed',
            'optimized', 'streamlined', 'collaborated', 'coordinated', 'supervised',
            'trained', 'mentored', 'delivered', 'executed', 'launched'
        ]);
    }
    
    initializeLocationDatabase() {
        // Major tech hubs and their characteristics
        this.locationData.set('silicon valley', {
            multiplier: 1.5,
            industries: ['technology', 'startups'],
            avgSalary: 140000
        });
        
        this.locationData.set('new york', {
            multiplier: 1.3,
            industries: ['finance', 'technology', 'media'],
            avgSalary: 120000
        });
        
        this.locationData.set('seattle', {
            multiplier: 1.25,
            industries: ['technology', 'aerospace'],
            avgSalary: 115000
        });
    }

    initializePatterns() {
        // Regular expressions for parsing resume sections
        this.patterns = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            phone: /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
            education: /\b(?:bachelor|master|phd|doctorate|associate|diploma|certificate)\b.*?(?:in|of)\s+([^.\n]+)/gi,
            experience: /\b(\d{4})\s*[-–]\s*(\d{4}|present)\b/gi,
            technologies: /\b(?:technologies?|tools?|skills?|frameworks?)[:\-]?\s*([^.\n]+)/gi,
            achievements: /\b(?:achieved|accomplished|delivered|improved|increased|reduced|managed|led)\b[^.\n]*/gi,
        };
    }

    // Main evaluation function
    async evaluateResume(resumeText, jobDescription) {
        if (!resumeText.trim()) {
            throw new Error('Resume text is required');
        }
        
        if (!jobDescription.trim()) {
            throw new Error('Job description is required');
        }

        console.log('📊 Starting client-side resume evaluation...');
        
        try {
            // Step 1: Parse resume structure
            const parsedResume = this.parseResumeStructure(resumeText);
            
            // Step 2: Extract job requirements
            const jobRequirements = this.parseJobRequirements(jobDescription);
            
            // Step 3: Calculate scores
            const scoring = this.calculateScores(parsedResume, jobRequirements);
            
            // Step 4: Generate insights
            const insights = this.generateInsights(parsedResume, jobRequirements, scoring);
            
            // Step 5: Advanced Analysis
            const atsAnalysis = this.performATSAnalysis(parsedResume, jobRequirements);
            const salaryEstimate = this.estimateSalary(parsedResume);
            const industryAnalysis = this.analyzeIndustryFit(parsedResume, jobRequirements);
            const locationAnalysis = this.analyzeLocation(parsedResume);
            
            // Step 6: Create job recommendations
            const recommendations = this.generateAdvancedJobRecommendations(parsedResume, industryAnalysis);
            
            const result = {
                // Core Compatibility (existing UI)
                total_score: scoring.totalScore,
                skills_score: scoring.skillsScore,
                experience_score: scoring.experienceScore,
                education_score: scoring.educationScore,
                project_score: scoring.projectScore,
                matched_keywords: insights.matchedKeywords,
                missing_keywords: insights.missingKeywords,
                quick_suggestions: insights.suggestions,
                strengths: insights.strengths,
                improvements: insights.improvements,
                reasoning: {
                    skills_reasoning: insights.skillsReasoning,
                    experience_reasoning: insights.experienceReasoning,
                    education_reasoning: insights.educationReasoning,
                    project_reasoning: insights.projectReasoning,
                    overall_assessment: insights.overallAssessment
                },
                summary: insights.summary,
                job_recommendations: recommendations,
                parsed_resume: parsedResume,
                
                // Advanced Features (new)
                ats_analysis: {
                    overall_score: atsAnalysis.score,
                    compatibility: atsAnalysis.compatibility,
                    detailed_scores: {
                        contact_info: atsAnalysis.formattingScore >= 15 ? 85 : 45,
                        structure: atsAnalysis.formattingScore >= 30 ? 90 : 60,
                        keyword_density: Math.min((atsAnalysis.keywordDensity / 10) * 100, 100)
                    },
                    recommendations: atsAnalysis.suggestions,
                    keyword_density: atsAnalysis.keywordDensity,
                    action_verbs_count: atsAnalysis.actionVerbsCount
                },
                salary_estimate: {
                    estimated_range: {
                        min: salaryEstimate.min,
                        max: salaryEstimate.max,
                        median: salaryEstimate.median
                    },
                    confidence_level: salaryEstimate.confidence,
                    market_insights: {
                        demand_level: 'High',
                        growth_trend: 'Positive',
                        competition: 'Moderate'
                    },
                    growth_projection: {
                        one_year: Math.round(salaryEstimate.median * 1.05),
                        three_years: Math.round(salaryEstimate.median * 1.15),
                        five_years: Math.round(salaryEstimate.median * 1.25)
                    },
                    factors: salaryEstimate.factors,
                    location_adjustment: salaryEstimate.locationAdjustment
                },
                industry_analysis: {
                    primary_industry: industryAnalysis.primaryIndustry,
                    fit_score: industryAnalysis.fitScore,
                    alternative_industries: industryAnalysis.alternatives,
                    growth_potential: industryAnalysis.growthPotential,
                    skill_gaps: industryAnalysis.skillGaps
                },
                location_analysis: locationAnalysis,
                
                // Metadata
                timestamp: new Date().toISOString(),
                evaluation_method: 'client-side-advanced',
                features_used: ['ATS Analysis', 'Salary Estimation', 'Industry Matching', 'Location Analysis']
            };
            
            console.log(`✅ Evaluation complete - Score: ${scoring.totalScore}/100`);
            return result;
            
        } catch (error) {
            console.error('❌ Evaluation failed:', error);
            throw new Error(`Resume evaluation failed: ${error.message}`);
        }
    }

    parseResumeStructure(text) {
        console.log('📋 Parsing resume structure...');
        
        const structure = {
            raw_text: text,
            email: null,
            phone: null,
            name: null,
            skills: [],
            experience: [],
            education: [],
            projects: [],
            certifications: [],
            achievements: []
        };

        // Extract email
        const emailMatch = text.match(this.patterns.email);
        if (emailMatch) {
            structure.email = emailMatch[0];
        }

        // Extract phone
        const phoneMatch = text.match(this.patterns.phone);
        if (phoneMatch) {
            structure.phone = phoneMatch[0];
        }

        // Extract name (first line often contains name)
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
            structure.name = lines[0].trim();
        }

        // Extract skills
        structure.skills = this.extractSkills(text);
        
        // Extract experience information
        structure.experience = this.extractExperience(text);
        
        // Extract education
        structure.education = this.extractEducation(text);
        
        // Extract projects
        structure.projects = this.extractProjects(text);
        
        // Extract achievements
        structure.achievements = this.extractAchievements(text);

        return structure;
    }

    extractSkills(text) {
        const foundSkills = [];
        const textLower = text.toLowerCase();
        
        // Check technical skills
        for (const [skill, data] of this.technicalSkills) {
            if (textLower.includes(skill)) {
                foundSkills.push({
                    name: skill,
                    category: data.category,
                    type: 'technical',
                    confidence: this.calculateSkillConfidence(skill, text)
                });
            }
            
            // Check aliases
            for (const alias of data.aliases) {
                if (textLower.includes(alias.toLowerCase())) {
                    foundSkills.push({
                        name: skill,
                        category: data.category,
                        type: 'technical',
                        confidence: this.calculateSkillConfidence(alias, text)
                    });
                    break;
                }
            }
        }
        
        // Check soft skills
        for (const [skill, data] of this.softSkills) {
            if (textLower.includes(skill)) {
                foundSkills.push({
                    name: skill,
                    category: data.category,
                    type: 'soft',
                    confidence: this.calculateSkillConfidence(skill, text)
                });
            }
        }
        
        return foundSkills;
    }

    calculateSkillConfidence(skill, text) {
        const skillRegex = new RegExp(`\\b${skill}\\b`, 'gi');
        const matches = text.match(skillRegex);
        return matches ? Math.min(matches.length * 0.3, 1.0) : 0.3;
    }

    extractExperience(text) {
        const experiences = [];
        const lines = text.split('\n');
        let currentExp = null;
        
        for (const line of lines) {
            // Look for job titles or company patterns
            if (this.isExperienceHeader(line)) {
                if (currentExp) {
                    experiences.push(currentExp);
                }
                currentExp = {
                    title: line.trim(),
                    duration: this.extractDuration(line),
                    description: [],
                    location: null
                };
            } else if (currentExp && line.trim() && line.startsWith('•') || line.startsWith('-')) {
                currentExp.description.push(line.trim());
            }
        }
        
        if (currentExp) {
            experiences.push(currentExp);
        }
        
        return experiences;
    }

    isExperienceHeader(line) {
        const experienceIndicators = [
            'engineer', 'developer', 'manager', 'analyst', 'consultant',
            'director', 'specialist', 'coordinator', 'supervisor', 'lead'
        ];
        
        const lineLower = line.toLowerCase();
        return experienceIndicators.some(indicator => lineLower.includes(indicator));
    }

    extractDuration(text) {
        const durationMatch = text.match(/(\d{4})\s*[-–]\s*(\d{4}|present)/i);
        return durationMatch ? durationMatch[0] : null;
    }

    extractEducation(text) {
        const education = [];
        const eduMatches = text.match(this.patterns.education);
        
        if (eduMatches) {
            eduMatches.forEach(match => {
                education.push({
                    degree: match.trim(),
                    institution: null, // Could be enhanced
                    year: null,
                    field: null
                });
            });
        }
        
        return education;
    }

    extractProjects(text) {
        const projects = [];
        const lines = text.split('\n');
        let inProjectsSection = false;
        
        for (const line of lines) {
            if (line.toLowerCase().includes('project')) {
                inProjectsSection = true;
                if (line.trim() && !line.toLowerCase().includes('projects:')) {
                    projects.push({
                        title: line.trim(),
                        description: [],
                        technologies: []
                    });
                }
            } else if (inProjectsSection && (line.includes('experience') || line.includes('education'))) {
                break;
            }
        }
        
        return projects;
    }

    extractAchievements(text) {
        const achievements = [];
        const achievementMatches = text.match(this.patterns.achievements);
        
        if (achievementMatches) {
            achievementMatches.forEach(match => {
                achievements.push(match.trim());
            });
        }
        
        return achievements;
    }

    parseJobRequirements(jobDescription) {
        console.log('🎯 Parsing job requirements...');
        
        const requirements = {
            required_skills: [],
            preferred_skills: [],
            experience_years: 0,
            education_level: null,
            keywords: [],
            responsibilities: []
        };

        const textLower = jobDescription.toLowerCase();
        
        // Extract required skills
        for (const [skill] of this.technicalSkills) {
            if (textLower.includes(skill)) {
                requirements.required_skills.push(skill);
            }
        }
        
        // Extract experience requirements
        const expMatch = jobDescription.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/i);
        if (expMatch) {
            requirements.experience_years = parseInt(expMatch[1]);
        }
        
        // Extract keywords
        requirements.keywords = this.extractKeywords(jobDescription);
        
        return requirements;
    }

    extractKeywords(text) {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !this.stopWords.has(word));
            
        // Count word frequency
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
        
        // Return top keywords
        return Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word]) => word);
    }

    calculateScores(parsedResume, jobRequirements) {
        console.log('🧮 Calculating compatibility scores...');
        
        // Skills Score (35 points max)
        const skillsScore = this.calculateSkillsScore(parsedResume.skills, jobRequirements.required_skills);
        
        // Experience Score (25 points max)
        const experienceScore = this.calculateExperienceScore(parsedResume.experience, jobRequirements.experience_years);
        
        // Education Score (20 points max)
        const educationScore = this.calculateEducationScore(parsedResume.education);
        
        // Project Score (20 points max)
        const projectScore = this.calculateProjectScore(parsedResume.projects);
        
        const totalScore = Math.min(skillsScore + experienceScore + educationScore + projectScore, 100);
        
        return {
            totalScore: Math.round(totalScore),
            skillsScore: Math.round(skillsScore),
            experienceScore: Math.round(experienceScore),
            educationScore: Math.round(educationScore),
            projectScore: Math.round(projectScore)
        };
    }

    calculateSkillsScore(resumeSkills, requiredSkills) {
        if (requiredSkills.length === 0) return 25; // Default if no requirements
        
        const matchedSkills = resumeSkills.filter(skill => 
            requiredSkills.some(req => req === skill.name)
        );
        
        const matchPercentage = matchedSkills.length / requiredSkills.length;
        return Math.min(matchPercentage * 35, 35);
    }

    calculateExperienceScore(experiences, requiredYears) {
        const totalYears = experiences.length * 1.5; // Rough estimation
        if (requiredYears === 0) return 20;
        
        const scoreRatio = Math.min(totalYears / requiredYears, 1.0);
        return scoreRatio * 25;
    }

    calculateEducationScore(education) {
        if (education.length === 0) return 10; // Basic score for work experience
        
        // Higher degrees get more points
        let score = education.length * 8;
        
        // Bonus for advanced degrees
        const hasAdvanced = education.some(edu => 
            edu.degree.toLowerCase().includes('master') || 
            edu.degree.toLowerCase().includes('phd')
        );
        
        if (hasAdvanced) score += 5;
        
        return Math.min(score, 20);
    }

    calculateProjectScore(projects) {
        return Math.min(projects.length * 5, 20);
    }

    generateInsights(parsedResume, jobRequirements, scoring) {
        console.log('💡 Generating insights...');
        
        const resumeSkillNames = parsedResume.skills.map(s => s.name);
        const matchedKeywords = jobRequirements.required_skills.filter(skill => 
            resumeSkillNames.includes(skill)
        );
        
        const missingKeywords = jobRequirements.required_skills.filter(skill => 
            !resumeSkillNames.includes(skill)
        );
        
        return {
            matchedKeywords,
            missingKeywords,
            strengths: this.generateStrengths(parsedResume),
            improvements: this.generateImprovements(parsedResume, missingKeywords),
            suggestions: this.generateSuggestions(scoring, missingKeywords),
            skillsReasoning: this.generateSkillsReasoning(parsedResume, jobRequirements),
            experienceReasoning: this.generateExperienceReasoning(parsedResume, jobRequirements),
            educationReasoning: this.generateEducationReasoning(parsedResume),
            projectReasoning: this.generateProjectReasoning(parsedResume),
            overallAssessment: this.generateOverallAssessment(scoring),
            summary: this.generateSummary(scoring)
        };
    }

    generateStrengths(parsedResume) {
        const strengths = [];
        
        if (parsedResume.skills.length > 5) {
            strengths.push('Diverse technical skill set');
        }
        
        if (parsedResume.experience.length > 2) {
            strengths.push('Solid work experience');
        }
        
        if (parsedResume.projects.length > 0) {
            strengths.push('Hands-on project experience');
        }
        
        if (parsedResume.achievements.length > 0) {
            strengths.push('Demonstrated achievements');
        }
        
        return strengths;
    }

    generateImprovements(parsedResume, missingSkills) {
        const improvements = [];
        
        if (missingSkills.length > 0) {
            improvements.push(`Consider learning: ${missingSkills.slice(0, 3).join(', ')}`);
        }
        
        if (parsedResume.projects.length < 2) {
            improvements.push('Add more project examples');
        }
        
        if (parsedResume.achievements.length === 0) {
            improvements.push('Highlight specific achievements');
        }
        
        return improvements;
    }

    generateSuggestions(scoring, missingSkills) {
        const suggestions = [];
        
        if (scoring.skillsScore < 25) {
            suggestions.push('Focus on developing key technical skills');
        }
        
        if (scoring.experienceScore < 15) {
            suggestions.push('Emphasize relevant work experience');
        }
        
        if (missingSkills.length > 0) {
            suggestions.push(`Learn ${missingSkills[0]} to improve match score`);
        }
        
        suggestions.push('Quantify achievements with specific metrics');
        suggestions.push('Tailor resume keywords to job description');
        
        return suggestions;
    }

    generateSkillsReasoning(parsedResume, jobRequirements) {
        const skillCount = parsedResume.skills.length;
        const matchedCount = parsedResume.skills.filter(skill => 
            jobRequirements.required_skills.includes(skill.name)
        ).length;
        
        return `Found ${skillCount} skills, with ${matchedCount} matching job requirements. ` +
               `${matchedCount > 0 ? 'Good alignment' : 'Consider developing relevant skills'}.`;
    }

    generateExperienceReasoning(parsedResume, jobRequirements) {
        const expCount = parsedResume.experience.length;
        return `${expCount} work experience entries found. ` +
               `${expCount >= 2 ? 'Shows career progression' : 'Could benefit from more detailed experience'}.`;
    }

    generateEducationReasoning(parsedResume) {
        const eduCount = parsedResume.education.length;
        return `${eduCount} educational qualification(s) found. ` +
               `${eduCount > 0 ? 'Good educational foundation' : 'Experience-based profile'}.`;
    }

    generateProjectReasoning(parsedResume) {
        const projectCount = parsedResume.projects.length;
        return `${projectCount} project(s) identified. ` +
               `${projectCount > 0 ? 'Shows practical application' : 'Consider adding project examples'}.`;
    }

    generateOverallAssessment(scoring) {
        if (scoring.totalScore >= 80) {
            return 'Excellent match for this position with strong qualifications.';
        } else if (scoring.totalScore >= 60) {
            return 'Good candidate with relevant skills and experience.';
        } else if (scoring.totalScore >= 40) {
            return 'Potential candidate with some skill gaps to address.';
        } else {
            return 'Significant skill development needed for this role.';
        }
    }

    generateSummary(scoring) {
        return `Resume shows ${scoring.totalScore}% compatibility with the job requirements. ` +
               `${scoring.totalScore >= 60 ? 'Strong candidate profile' : 'Room for improvement in key areas'}.`;
    }

    // Advanced Analysis Methods
    performATSAnalysis(parsedResume, jobRequirements) {
        const resumeText = parsedResume.raw_text.toLowerCase();
        let score = 0;
        let maxScore = 100;
        const suggestions = [];
        
        // Check for ATS-friendly keywords
        let atsKeywordCount = 0;
        for (const keyword of this.atsKeywords) {
            if (resumeText.includes(keyword)) {
                atsKeywordCount++;
            }
        }
        
        const keywordScore = Math.min((atsKeywordCount / 10) * 30, 30); // Max 30 points
        score += keywordScore;
        
        // Check for action verbs
        let actionVerbCount = 0;
        for (const verb of this.actionVerbs) {
            const regex = new RegExp(`\\b${verb}\\b`, 'gi');
            const matches = resumeText.match(regex);
            if (matches) {
                actionVerbCount += matches.length;
            }
        }
        
        const verbScore = Math.min((actionVerbCount / 15) * 25, 25); // Max 25 points
        score += verbScore;
        
        // Check formatting (basic)
        let formattingScore = 0;
        if (parsedResume.email) formattingScore += 10;
        if (parsedResume.phone) formattingScore += 10;
        if (parsedResume.experience.length > 0) formattingScore += 15;
        if (parsedResume.skills.length > 0) formattingScore += 10;
        
        score += formattingScore;
        
        // Generate suggestions
        if (atsKeywordCount < 5) {
            suggestions.push('Add more industry-standard keywords and phrases');
        }
        if (actionVerbCount < 8) {
            suggestions.push('Use more action verbs to describe accomplishments');
        }
        if (!parsedResume.email || !parsedResume.phone) {
            suggestions.push('Ensure contact information is clearly formatted');
        }
        
        const compatibility = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
        
        return {
            score: Math.round(score),
            compatibility,
            suggestions,
            keywordDensity: atsKeywordCount,
            formattingScore,
            actionVerbsCount: actionVerbCount
        };
    }
    
    estimateSalary(parsedResume) {
        const skills = parsedResume.skills.map(s => s.name);
        const experienceCount = parsedResume.experience.length;
        
        // Base salary calculation
        let skillSalaries = [];
        for (const skill of skills) {
            const skillData = this.technicalSkills.get(skill);
            if (skillData && skillData.salary) {
                skillSalaries.push(skillData.salary);
            }
        }
        
        const avgSkillSalary = skillSalaries.length > 0 
            ? skillSalaries.reduce((a, b) => a + b) / skillSalaries.length 
            : 60000;
        
        // Experience level adjustment
        let experienceLevel = 'entry';
        if (experienceCount >= 5) experienceLevel = 'senior';
        else if (experienceCount >= 2) experienceLevel = 'mid';
        
        const expData = this.experienceLevels.get(experienceLevel);
        const baseMin = expData ? expData.min : 45000;
        const baseMax = expData ? expData.max : 70000;
        
        // Combine skill salary with experience
        const adjustedMin = Math.round((baseMin + avgSkillSalary) / 2);
        const adjustedMax = Math.round((baseMax + avgSkillSalary * 1.2) / 2);
        const median = Math.round((adjustedMin + adjustedMax) / 2);
        
        // Confidence calculation
        const confidence = skillSalaries.length >= 3 && experienceCount >= 1 ? 'High' :
                          skillSalaries.length >= 1 ? 'Medium' : 'Low';
        
        return {
            min: adjustedMin,
            max: adjustedMax,
            median,
            confidence,
            factors: {
                skills_count: skills.length,
                experience_years: experienceCount * 1.5, // Rough estimate
                high_value_skills: skillSalaries.filter(s => s > 80000).length
            },
            locationAdjustment: 'Base estimate - adjust for location'
        };
    }
    
    analyzeIndustryFit(parsedResume, jobRequirements) {
        const resumeText = parsedResume.raw_text.toLowerCase();
        const skills = parsedResume.skills.map(s => s.name);
        
        let bestIndustry = 'technology'; // Default
        let bestScore = 0;
        const industryScores = new Map();
        
        // Score each industry
        for (const [industry, data] of this.industryData) {
            let score = 0;
            
            // Check keywords
            for (const keyword of data.keywords) {
                if (resumeText.includes(keyword.toLowerCase())) {
                    score += 10;
                }
            }
            
            // Check skills match
            for (const skill of data.skills) {
                if (skills.includes(skill)) {
                    score += 15;
                }
            }
            
            industryScores.set(industry, score);
            if (score > bestScore) {
                bestScore = score;
                bestIndustry = industry;
            }
        }
        
        const primaryIndustryData = this.industryData.get(bestIndustry);
        const fitScore = Math.min((bestScore / 100) * 100, 100);
        
        // Find alternatives
        const alternatives = Array.from(industryScores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(1, 4)
            .map(([industry, score]) => ({
                industry,
                score: Math.round(score),
                growth: this.industryData.get(industry)?.growth || 'medium'
            }));
        
        // Identify skill gaps
        const requiredSkills = primaryIndustryData ? primaryIndustryData.skills : [];
        const skillGaps = requiredSkills.filter(skill => !skills.includes(skill));
        
        return {
            primaryIndustry: bestIndustry,
            fitScore: Math.round(fitScore),
            alternatives,
            growthPotential: primaryIndustryData?.growth || 'medium',
            skillGaps: skillGaps.slice(0, 5)
        };
    }
    
    analyzeLocation(parsedResume) {
        const resumeText = parsedResume.raw_text.toLowerCase();
        let detectedLocation = null;
        let salaryMultiplier = 1.0;
        
        // Try to detect location from resume
        for (const [location, data] of this.locationData) {
            if (resumeText.includes(location)) {
                detectedLocation = location;
                salaryMultiplier = typeof data === 'object' ? data.multiplier : data;
                break;
            }
        }
        
        return {
            detected_location: detectedLocation,
            salary_multiplier: salaryMultiplier,
            remote_friendly: resumeText.includes('remote'),
            willing_to_relocate: resumeText.includes('relocate') || resumeText.includes('willing to move')
        };
    }
    
    generateAdvancedJobRecommendations(parsedResume, industryAnalysis) {
        const skills = parsedResume.skills.map(s => s.name);
        const primaryIndustry = industryAnalysis.primaryIndustry;
        const recommendations = [];
        
        // Industry-specific recommendations
        if (primaryIndustry === 'technology') {
            if (skills.includes('react') || skills.includes('javascript')) {
                recommendations.push({
                    title: 'Senior Frontend Developer',
                    company: 'Tech Innovation Corp',
                    salary_range: '$85,000 - $130,000',
                    match_reason: 'Strong React/JavaScript skills align with frontend development',
                    similarity_score: 0.9,
                    industry: 'Technology',
                    remote_friendly: true
                });
            }
            
            if (skills.includes('python') || skills.includes('machine learning')) {
                recommendations.push({
                    title: 'ML Engineer',
                    company: 'AI Dynamics',
                    salary_range: '$100,000 - $160,000',
                    match_reason: 'Python and ML experience perfect for AI/ML roles',
                    similarity_score: 0.85,
                    industry: 'Technology',
                    remote_friendly: true
                });
            }
            
            if (skills.includes('aws') || skills.includes('kubernetes')) {
                recommendations.push({
                    title: 'DevOps Engineer',
                    company: 'Cloud Solutions Inc',
                    salary_range: '$95,000 - $150,000',
                    match_reason: 'Cloud and containerization skills in high demand',
                    similarity_score: 0.8,
                    industry: 'Technology',
                    remote_friendly: true
                });
            }
        } else if (primaryIndustry === 'finance') {
            recommendations.push({
                title: 'Financial Data Analyst',
                company: 'FinTech Solutions',
                salary_range: '$70,000 - $110,000',
                match_reason: 'Financial background with analytical skills',
                similarity_score: 0.75,
                industry: 'Finance',
                remote_friendly: false
            });
        }
        
        // Add cross-industry recommendations
        if (skills.includes('project management')) {
            recommendations.push({
                title: 'Senior Project Manager',
                company: 'Global Enterprises',
                salary_range: '$80,000 - $120,000',
                match_reason: 'Project management skills transferable across industries',
                similarity_score: 0.7,
                industry: 'Multi-industry',
                remote_friendly: true
            });
        }
        
        return recommendations.slice(0, 5); // Limit to top 5
    }
    
    generateJobRecommendations(parsedResume) {
        // Legacy method - redirect to advanced version
        const basicIndustryAnalysis = { primaryIndustry: 'technology' };
        return this.generateAdvancedJobRecommendations(parsedResume, basicIndustryAnalysis)
            .slice(0, 3)
            .map(rec => ({
                id: rec.title.toLowerCase().replace(/\s+/g, '_'),
                title: rec.title,
                company: rec.company,
                description: rec.match_reason,
                similarity_score: rec.similarity_score
            }));
    }
}

// Export class globally
window.ClientResumeEvaluator = ClientResumeEvaluator;

// Initialize global instance
window.clientResumeEvaluator = new ClientResumeEvaluator();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientResumeEvaluator;
}

console.log('✅ Client-side resume evaluator loaded successfully');
