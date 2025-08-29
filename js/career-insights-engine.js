// Career Insights Engine - Advanced career path analysis and recommendations
class CareerInsightsEngine {
    constructor() {
        this.careerPaths = new Map();
        this.skillTrends = new Map();
        this.industryData = new Map();
        this.init();
    }

    async init() {
        await this.loadCareerData();
        await this.loadSkillTrends();
        await this.loadIndustryInsights();
    }

    async loadCareerData() {
        // Sample career progression data
        this.careerPaths.set('software_engineer', {
            levels: ['Junior Developer', 'Software Engineer', 'Senior Software Engineer', 'Tech Lead', 'Engineering Manager'],
            skills_progression: {
                'Junior Developer': ['JavaScript', 'HTML', 'CSS', 'Git'],
                'Software Engineer': ['React', 'Node.js', 'Databases', 'Testing'],
                'Senior Software Engineer': ['System Design', 'Architecture', 'Mentoring', 'Performance'],
                'Tech Lead': ['Leadership', 'Project Management', 'Technical Strategy'],
                'Engineering Manager': ['People Management', 'Budget Planning', 'Strategic Planning']
            },
            salary_ranges: {
                'Junior Developer': { min: 60000, max: 80000 },
                'Software Engineer': { min: 80000, max: 120000 },
                'Senior Software Engineer': { min: 120000, max: 160000 },
                'Tech Lead': { min: 140000, max: 180000 },
                'Engineering Manager': { min: 160000, max: 220000 }
            }
        });

        this.careerPaths.set('data_scientist', {
            levels: ['Data Analyst', 'Data Scientist', 'Senior Data Scientist', 'Principal Data Scientist', 'Head of Data'],
            skills_progression: {
                'Data Analyst': ['SQL', 'Excel', 'Python', 'Statistics'],
                'Data Scientist': ['Machine Learning', 'R', 'Data Visualization', 'A/B Testing'],
                'Senior Data Scientist': ['Deep Learning', 'MLOps', 'Model Deployment', 'Mentoring'],
                'Principal Data Scientist': ['Research', 'Innovation', 'Technical Leadership'],
                'Head of Data': ['Strategy', 'Team Building', 'Business Alignment']
            },
            salary_ranges: {
                'Data Analyst': { min: 65000, max: 85000 },
                'Data Scientist': { min: 95000, max: 130000 },
                'Senior Data Scientist': { min: 130000, max: 170000 },
                'Principal Data Scientist': { min: 160000, max: 200000 },
                'Head of Data': { min: 180000, max: 250000 }
            }
        });
    }

    async loadSkillTrends() {
        // Current skill demand trends
        this.skillTrends.set('trending_up', [
            'AI/Machine Learning', 'Cloud Computing', 'DevOps', 'Cybersecurity',
            'Data Science', 'React', 'Kubernetes', 'TypeScript', 'GraphQL'
        ]);
        
        this.skillTrends.set('stable', [
            'JavaScript', 'Python', 'Java', 'SQL', 'Git', 'Agile',
            'Project Management', 'Communication', 'Problem Solving'
        ]);
        
        this.skillTrends.set('declining', [
            'jQuery', 'Flash', 'Perl', 'COBOL', 'Waterfall'
        ]);
    }

    async loadIndustryInsights() {
        this.industryData.set('tech', {
            growth_rate: 0.15,
            avg_salary_increase: 0.08,
            hot_skills: ['AI', 'Cloud', 'DevOps', 'Mobile'],
            job_security: 'high',
            remote_friendly: true
        });
        
        this.industryData.set('finance', {
            growth_rate: 0.05,
            avg_salary_increase: 0.06,
            hot_skills: ['FinTech', 'Blockchain', 'Risk Management', 'Compliance'],
            job_security: 'medium',
            remote_friendly: false
        });
    }

    async analyzeCareerPath(resumeText, jobDescription) {
        try {
            const currentSkills = this.extractSkills(resumeText);
            const targetSkills = this.extractSkills(jobDescription);
            const experience = this.extractExperience(resumeText);
            
            const careerLevel = this.determineCareerLevel(currentSkills, experience);
            const careerPath = this.identifyCareerPath(currentSkills, targetSkills);
            const nextSteps = this.generateNextSteps(careerLevel, careerPath, currentSkills);
            const skillGaps = this.identifySkillGaps(currentSkills, targetSkills);
            
            return {
                current_level: careerLevel,
                career_path: careerPath,
                next_steps: nextSteps,
                skill_gaps: skillGaps,
                skill_trends: this.analyzeSkillTrends(currentSkills),
                growth_opportunities: this.identifyGrowthOpportunities(currentSkills, careerPath),
                timeline_estimate: this.estimateTimeline(careerLevel, careerPath),
                salary_projection: this.projectSalary(careerLevel, careerPath)
            };
        } catch (error) {
            console.error('Career analysis failed:', error);
            return this.getDefaultCareerInsights();
        }
    }

    extractSkills(text) {
        const skillKeywords = [
            'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'Git',
            'Machine Learning', 'Data Science', 'Cloud Computing', 'AWS', 'Azure',
            'Docker', 'Kubernetes', 'DevOps', 'Agile', 'Scrum', 'Leadership',
            'Project Management', 'Communication', 'Problem Solving', 'TypeScript',
            'GraphQL', 'MongoDB', 'PostgreSQL', 'Redis', 'Elasticsearch'
        ];
        
        const foundSkills = [];
        const lowerText = text.toLowerCase();
        
        skillKeywords.forEach(skill => {
            if (lowerText.includes(skill.toLowerCase())) {
                foundSkills.push(skill);
            }
        });
        
        return foundSkills;
    }

    extractExperience(text) {
        const experiencePatterns = [
            /(\d+)\+?\s*years?\s*of\s*experience/gi,
            /(\d+)\+?\s*years?\s*experience/gi,
            /experience:\s*(\d+)\+?\s*years?/gi
        ];
        
        let maxExperience = 0;
        
        experiencePatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const years = parseInt(match.match(/\d+/)[0]);
                    maxExperience = Math.max(maxExperience, years);
                });
            }
        });
        
        return maxExperience || this.estimateExperienceFromContent(text);
    }

    estimateExperienceFromContent(text) {
        // Estimate experience based on content complexity and keywords
        const seniorKeywords = ['lead', 'senior', 'architect', 'manager', 'director'];
        const midKeywords = ['developed', 'implemented', 'designed', 'optimized'];
        const juniorKeywords = ['learned', 'assisted', 'supported', 'contributed'];
        
        const lowerText = text.toLowerCase();
        
        if (seniorKeywords.some(keyword => lowerText.includes(keyword))) {
            return 7; // Senior level
        } else if (midKeywords.some(keyword => lowerText.includes(keyword))) {
            return 4; // Mid level
        } else if (juniorKeywords.some(keyword => lowerText.includes(keyword))) {
            return 2; // Junior level
        }
        
        return 1; // Entry level
    }

    determineCareerLevel(skills, experience) {
        if (experience >= 8) return 'Senior';
        if (experience >= 5) return 'Mid-Level';
        if (experience >= 2) return 'Junior';
        return 'Entry-Level';
    }

    identifyCareerPath(currentSkills, targetSkills) {
        const techSkills = ['JavaScript', 'Python', 'Java', 'React', 'Node.js'];
        const dataSkills = ['Python', 'SQL', 'Machine Learning', 'Data Science'];
        const managementSkills = ['Leadership', 'Project Management', 'Team Management'];
        
        if (currentSkills.some(skill => dataSkills.includes(skill))) {
            return 'Data Science';
        } else if (currentSkills.some(skill => techSkills.includes(skill))) {
            return 'Software Engineering';
        } else if (currentSkills.some(skill => managementSkills.includes(skill))) {
            return 'Management';
        }
        
        return 'General Technology';
    }

    generateNextSteps(level, path, skills) {
        const steps = [];
        
        if (level === 'Entry-Level') {
            steps.push('Build a strong foundation in core technologies');
            steps.push('Create personal projects to demonstrate skills');
            steps.push('Contribute to open-source projects');
            steps.push('Network with professionals in your field');
        } else if (level === 'Junior') {
            steps.push('Deepen expertise in specialized areas');
            steps.push('Take on more complex projects');
            steps.push('Start mentoring newer team members');
            steps.push('Pursue relevant certifications');
        } else if (level === 'Mid-Level') {
            steps.push('Develop leadership and communication skills');
            steps.push('Lead cross-functional projects');
            steps.push('Stay updated with industry trends');
            steps.push('Consider specialization or management track');
        } else {
            steps.push('Focus on strategic thinking and vision');
            steps.push('Build and mentor high-performing teams');
            steps.push('Drive innovation and technical excellence');
            steps.push('Establish thought leadership in your domain');
        }
        
        return steps;
    }

    identifySkillGaps(currentSkills, targetSkills) {
        const gaps = targetSkills.filter(skill => !currentSkills.includes(skill));
        
        return gaps.map(skill => ({
            skill,
            priority: this.getSkillPriority(skill),
            learning_resources: this.getLearningResources(skill),
            time_estimate: this.getTimeEstimate(skill)
        }));
    }

    getSkillPriority(skill) {
        const highPriority = ['JavaScript', 'Python', 'React', 'SQL', 'Cloud Computing'];
        const mediumPriority = ['TypeScript', 'GraphQL', 'Docker', 'Kubernetes'];
        
        if (highPriority.includes(skill)) return 'High';
        if (mediumPriority.includes(skill)) return 'Medium';
        return 'Low';
    }

    getLearningResources(skill) {
        const resources = {
            'JavaScript': ['MDN Web Docs', 'JavaScript.info', 'FreeCodeCamp'],
            'Python': ['Python.org Tutorial', 'Automate the Boring Stuff', 'Python Crash Course'],
            'React': ['React Documentation', 'React Tutorial', 'Scrimba React Course'],
            'SQL': ['W3Schools SQL', 'SQLBolt', 'Mode Analytics SQL Tutorial']
        };
        
        return resources[skill] || ['Online courses', 'Documentation', 'Practice projects'];
    }

    getTimeEstimate(skill) {
        const timeEstimates = {
            'JavaScript': '2-3 months',
            'Python': '2-3 months',
            'React': '1-2 months',
            'SQL': '1 month',
            'Machine Learning': '3-6 months',
            'Cloud Computing': '2-4 months'
        };
        
        return timeEstimates[skill] || '1-3 months';
    }

    analyzeSkillTrends(skills) {
        const trends = {
            trending_up: [],
            stable: [],
            declining: []
        };
        
        skills.forEach(skill => {
            if (this.skillTrends.get('trending_up').includes(skill)) {
                trends.trending_up.push(skill);
            } else if (this.skillTrends.get('declining').includes(skill)) {
                trends.declining.push(skill);
            } else {
                trends.stable.push(skill);
            }
        });
        
        return trends;
    }

    identifyGrowthOpportunities(skills, careerPath) {
        const opportunities = [];
        
        if (careerPath === 'Software Engineering') {
            opportunities.push('Full-Stack Development');
            opportunities.push('DevOps Engineering');
            opportunities.push('Technical Architecture');
            opportunities.push('Engineering Management');
        } else if (careerPath === 'Data Science') {
            opportunities.push('Machine Learning Engineering');
            opportunities.push('Data Engineering');
            opportunities.push('AI Research');
            opportunities.push('Data Science Management');
        }
        
        return opportunities;
    }

    estimateTimeline(level, path) {
        const timelines = {
            'Entry-Level': '6-12 months to Junior level',
            'Junior': '2-3 years to Mid-Level',
            'Mid-Level': '3-5 years to Senior level',
            'Senior': '5+ years to Leadership roles'
        };
        
        return timelines[level] || '1-2 years for next level';
    }

    projectSalary(level, path) {
        const baseSalaries = {
            'Entry-Level': { min: 50000, max: 70000 },
            'Junior': { min: 70000, max: 90000 },
            'Mid-Level': { min: 90000, max: 130000 },
            'Senior': { min: 130000, max: 180000 }
        };
        
        const current = baseSalaries[level] || baseSalaries['Entry-Level'];
        
        return {
            current_range: current,
            next_level_range: this.getNextLevelSalary(level),
            growth_potential: '15-25% annually with skill development'
        };
    }

    getNextLevelSalary(currentLevel) {
        const nextLevels = {
            'Entry-Level': { min: 70000, max: 90000 },
            'Junior': { min: 90000, max: 130000 },
            'Mid-Level': { min: 130000, max: 180000 },
            'Senior': { min: 180000, max: 250000 }
        };
        
        return nextLevels[currentLevel] || { min: 200000, max: 300000 };
    }

    getDefaultCareerInsights() {
        return {
            current_level: 'Mid-Level',
            career_path: 'Technology',
            next_steps: [
                'Continue developing technical skills',
                'Build leadership experience',
                'Stay updated with industry trends',
                'Network with professionals'
            ],
            skill_gaps: [],
            skill_trends: { trending_up: [], stable: [], declining: [] },
            growth_opportunities: ['Technical Leadership', 'Specialization', 'Management'],
            timeline_estimate: '2-3 years for next career milestone',
            salary_projection: {
                current_range: { min: 90000, max: 130000 },
                next_level_range: { min: 130000, max: 180000 },
                growth_potential: '15-25% annually'
            }
        };
    }
}
