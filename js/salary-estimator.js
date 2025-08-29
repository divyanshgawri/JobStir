// Salary Estimator - Estimates salary ranges based on skills, experience, and location
class SalaryEstimator {
    constructor() {
        this.salaryData = new Map();
        this.locationMultipliers = new Map();
        this.skillPremiums = new Map();
        this.industryAdjustments = new Map();
        this.init();
    }

    async init() {
        this.loadSalaryData();
        this.loadLocationMultipliers();
        this.loadSkillPremiums();
        this.loadIndustryAdjustments();
    }

    loadSalaryData() {
        // Base salary data by role and experience level
        this.salaryData.set('software_engineer', {
            'entry': { min: 65000, max: 85000, median: 75000 },
            'junior': { min: 75000, max: 95000, median: 85000 },
            'mid': { min: 95000, max: 130000, median: 112000 },
            'senior': { min: 130000, max: 170000, median: 150000 },
            'lead': { min: 160000, max: 200000, median: 180000 },
            'principal': { min: 190000, max: 250000, median: 220000 }
        });

        this.salaryData.set('data_scientist', {
            'entry': { min: 70000, max: 90000, median: 80000 },
            'junior': { min: 85000, max: 110000, median: 97000 },
            'mid': { min: 110000, max: 145000, median: 127000 },
            'senior': { min: 145000, max: 185000, median: 165000 },
            'lead': { min: 175000, max: 220000, median: 197000 },
            'principal': { min: 210000, max: 280000, median: 245000 }
        });

        this.salaryData.set('product_manager', {
            'entry': { min: 75000, max: 95000, median: 85000 },
            'junior': { min: 90000, max: 115000, median: 102000 },
            'mid': { min: 115000, max: 150000, median: 132000 },
            'senior': { min: 150000, max: 190000, median: 170000 },
            'lead': { min: 180000, max: 230000, median: 205000 },
            'principal': { min: 220000, max: 300000, median: 260000 }
        });

        this.salaryData.set('designer', {
            'entry': { min: 50000, max: 70000, median: 60000 },
            'junior': { min: 65000, max: 85000, median: 75000 },
            'mid': { min: 80000, max: 110000, median: 95000 },
            'senior': { min: 105000, max: 140000, median: 122000 },
            'lead': { min: 130000, max: 170000, median: 150000 },
            'principal': { min: 160000, max: 210000, median: 185000 }
        });
    }

    loadLocationMultipliers() {
        // Location-based salary adjustments
        this.locationMultipliers.set('san_francisco', 1.4);
        this.locationMultipliers.set('new_york', 1.3);
        this.locationMultipliers.set('seattle', 1.25);
        this.locationMultipliers.set('boston', 1.2);
        this.locationMultipliers.set('los_angeles', 1.15);
        this.locationMultipliers.set('chicago', 1.1);
        this.locationMultipliers.set('austin', 1.05);
        this.locationMultipliers.set('denver', 1.0);
        this.locationMultipliers.set('atlanta', 0.95);
        this.locationMultipliers.set('phoenix', 0.9);
        this.locationMultipliers.set('remote', 1.1); // Remote work premium
        this.locationMultipliers.set('default', 1.0);
    }

    loadSkillPremiums() {
        // Premium percentages for high-demand skills
        this.skillPremiums.set('machine_learning', 0.15);
        this.skillPremiums.set('ai', 0.18);
        this.skillPremiums.set('blockchain', 0.12);
        this.skillPremiums.set('cloud_architecture', 0.10);
        this.skillPremiums.set('devops', 0.08);
        this.skillPremiums.set('cybersecurity', 0.12);
        this.skillPremiums.set('react', 0.05);
        this.skillPremiums.set('kubernetes', 0.08);
        this.skillPremiums.set('aws', 0.06);
        this.skillPremiums.set('python', 0.04);
        this.skillPremiums.set('golang', 0.07);
        this.skillPremiums.set('rust', 0.10);
    }

    loadIndustryAdjustments() {
        // Industry-specific salary adjustments
        this.industryAdjustments.set('tech', 1.2);
        this.industryAdjustments.set('finance', 1.15);
        this.industryAdjustments.set('healthcare', 1.05);
        this.industryAdjustments.set('consulting', 1.1);
        this.industryAdjustments.set('startup', 0.9);
        this.industryAdjustments.set('government', 0.85);
        this.industryAdjustments.set('education', 0.8);
        this.industryAdjustments.set('nonprofit', 0.75);
    }

    async estimateSalary(resumeText, jobDescription) {
        try {
            const analysis = this.analyzeResumeForSalary(resumeText, jobDescription);
            const baseEstimate = this.calculateBaseSalary(analysis);
            const adjustedEstimate = this.applyAdjustments(baseEstimate, analysis);
            
            return {
                estimated_range: adjustedEstimate,
                confidence_level: this.calculateConfidence(analysis),
                factors: this.getInfluencingFactors(analysis),
                market_insights: this.getMarketInsights(analysis),
                negotiation_tips: this.getNegotiationTips(adjustedEstimate),
                growth_projection: this.projectSalaryGrowth(analysis, adjustedEstimate)
            };
        } catch (error) {
            console.error('Salary estimation failed:', error);
            return this.getDefaultSalaryEstimate();
        }
    }

    analyzeResumeForSalary(resumeText, jobDescription) {
        const analysis = {
            role: this.identifyRole(resumeText, jobDescription),
            experience_level: this.determineExperienceLevel(resumeText),
            skills: this.extractSkills(resumeText),
            location: this.extractLocation(resumeText, jobDescription),
            industry: this.identifyIndustry(jobDescription),
            company_size: this.estimateCompanySize(jobDescription),
            education: this.extractEducation(resumeText),
            certifications: this.extractCertifications(resumeText)
        };

        return analysis;
    }

    identifyRole(resumeText, jobDescription) {
        const roleKeywords = {
            'software_engineer': ['software engineer', 'developer', 'programmer', 'full stack', 'backend', 'frontend'],
            'data_scientist': ['data scientist', 'machine learning', 'data analyst', 'ml engineer'],
            'product_manager': ['product manager', 'product owner', 'pm'],
            'designer': ['designer', 'ux', 'ui', 'graphic design', 'visual design']
        };

        const combinedText = (resumeText + ' ' + jobDescription).toLowerCase();
        
        for (const [role, keywords] of Object.entries(roleKeywords)) {
            if (keywords.some(keyword => combinedText.includes(keyword))) {
                return role;
            }
        }
        
        return 'software_engineer'; // Default
    }

    determineExperienceLevel(resumeText) {
        const text = resumeText.toLowerCase();
        
        // Look for explicit experience mentions
        const experiencePatterns = [
            /(\d+)\+?\s*years?\s*of\s*experience/g,
            /(\d+)\+?\s*years?\s*experience/g
        ];
        
        let maxYears = 0;
        experiencePatterns.forEach(pattern => {
            const matches = [...text.matchAll(pattern)];
            matches.forEach(match => {
                const years = parseInt(match[1]);
                maxYears = Math.max(maxYears, years);
            });
        });

        // If no explicit years, estimate from content
        if (maxYears === 0) {
            maxYears = this.estimateExperienceFromContent(text);
        }

        if (maxYears >= 10) return 'principal';
        if (maxYears >= 7) return 'lead';
        if (maxYears >= 4) return 'senior';
        if (maxYears >= 2) return 'mid';
        if (maxYears >= 1) return 'junior';
        return 'entry';
    }

    estimateExperienceFromContent(text) {
        const seniorIndicators = ['lead', 'senior', 'architect', 'principal', 'director', 'manager'];
        const midIndicators = ['developed', 'designed', 'implemented', 'optimized', 'managed'];
        const juniorIndicators = ['assisted', 'supported', 'learned', 'contributed'];

        if (seniorIndicators.some(indicator => text.includes(indicator))) {
            return 8;
        } else if (midIndicators.some(indicator => text.includes(indicator))) {
            return 4;
        } else if (juniorIndicators.some(indicator => text.includes(indicator))) {
            return 2;
        }
        
        return 1;
    }

    extractSkills(resumeText) {
        const skillKeywords = [
            'javascript', 'python', 'java', 'react', 'node.js', 'aws', 'kubernetes',
            'machine learning', 'ai', 'blockchain', 'devops', 'cybersecurity',
            'golang', 'rust', 'typescript', 'graphql', 'docker'
        ];

        const text = resumeText.toLowerCase();
        return skillKeywords.filter(skill => text.includes(skill.toLowerCase()));
    }

    extractLocation(resumeText, jobDescription) {
        const locations = [
            'san francisco', 'new york', 'seattle', 'boston', 'los angeles',
            'chicago', 'austin', 'denver', 'atlanta', 'phoenix', 'remote'
        ];

        const combinedText = (resumeText + ' ' + jobDescription).toLowerCase();
        
        for (const location of locations) {
            if (combinedText.includes(location)) {
                return location.replace(' ', '_');
            }
        }
        
        return 'default';
    }

    identifyIndustry(jobDescription) {
        const industryKeywords = {
            'tech': ['technology', 'software', 'saas', 'platform', 'startup'],
            'finance': ['finance', 'banking', 'fintech', 'investment', 'trading'],
            'healthcare': ['healthcare', 'medical', 'hospital', 'pharma'],
            'consulting': ['consulting', 'advisory', 'professional services'],
            'government': ['government', 'federal', 'state', 'public sector'],
            'education': ['education', 'university', 'school', 'academic']
        };

        const text = jobDescription.toLowerCase();
        
        for (const [industry, keywords] of Object.entries(industryKeywords)) {
            if (keywords.some(keyword => text.includes(keyword))) {
                return industry;
            }
        }
        
        return 'tech'; // Default
    }

    estimateCompanySize(jobDescription) {
        const text = jobDescription.toLowerCase();
        
        if (text.includes('startup') || text.includes('small team')) {
            return 'startup';
        } else if (text.includes('enterprise') || text.includes('fortune')) {
            return 'large';
        }
        
        return 'medium';
    }

    extractEducation(resumeText) {
        const text = resumeText.toLowerCase();
        
        if (text.includes('phd') || text.includes('doctorate')) {
            return 'phd';
        } else if (text.includes('master') || text.includes('mba')) {
            return 'masters';
        } else if (text.includes('bachelor') || text.includes('bs') || text.includes('ba')) {
            return 'bachelors';
        }
        
        return 'other';
    }

    extractCertifications(resumeText) {
        const certKeywords = [
            'aws certified', 'google cloud', 'azure', 'pmp', 'cissp',
            'certified', 'certification', 'scrum master'
        ];

        const text = resumeText.toLowerCase();
        return certKeywords.filter(cert => text.includes(cert));
    }

    calculateBaseSalary(analysis) {
        const roleData = this.salaryData.get(analysis.role) || this.salaryData.get('software_engineer');
        const levelData = roleData[analysis.experience_level] || roleData['mid'];
        
        return {
            min: levelData.min,
            max: levelData.max,
            median: levelData.median
        };
    }

    applyAdjustments(baseEstimate, analysis) {
        let multiplier = 1.0;
        
        // Location adjustment
        const locationMultiplier = this.locationMultipliers.get(analysis.location) || 1.0;
        multiplier *= locationMultiplier;
        
        // Industry adjustment
        const industryMultiplier = this.industryAdjustments.get(analysis.industry) || 1.0;
        multiplier *= industryMultiplier;
        
        // Skills premium
        let skillsPremium = 0;
        analysis.skills.forEach(skill => {
            const premium = this.skillPremiums.get(skill.replace(/\s+/g, '_').toLowerCase()) || 0;
            skillsPremium += premium;
        });
        multiplier *= (1 + Math.min(skillsPremium, 0.3)); // Cap at 30% premium
        
        // Education bonus
        const educationBonus = {
            'phd': 1.1,
            'masters': 1.05,
            'bachelors': 1.0,
            'other': 0.95
        };
        multiplier *= educationBonus[analysis.education] || 1.0;
        
        return {
            min: Math.round(baseEstimate.min * multiplier),
            max: Math.round(baseEstimate.max * multiplier),
            median: Math.round(baseEstimate.median * multiplier)
        };
    }

    calculateConfidence(analysis) {
        let confidence = 70; // Base confidence
        
        // Increase confidence based on data availability
        if (analysis.experience_level !== 'entry') confidence += 10;
        if (analysis.skills.length > 3) confidence += 10;
        if (analysis.location !== 'default') confidence += 5;
        if (analysis.industry !== 'tech') confidence += 5;
        
        return Math.min(confidence, 95);
    }

    getInfluencingFactors(analysis) {
        const factors = [];
        
        factors.push(`Experience Level: ${analysis.experience_level}`);
        factors.push(`Location: ${analysis.location.replace('_', ' ')}`);
        factors.push(`Industry: ${analysis.industry}`);
        
        if (analysis.skills.length > 0) {
            factors.push(`High-value skills: ${analysis.skills.slice(0, 3).join(', ')}`);
        }
        
        if (analysis.education !== 'other') {
            factors.push(`Education: ${analysis.education}`);
        }
        
        return factors;
    }

    getMarketInsights(analysis) {
        return {
            demand_level: this.getDemandLevel(analysis.role, analysis.skills),
            growth_trend: this.getGrowthTrend(analysis.role),
            competition: this.getCompetitionLevel(analysis.role, analysis.location),
            market_outlook: this.getMarketOutlook(analysis.industry)
        };
    }

    getDemandLevel(role, skills) {
        const highDemandSkills = ['ai', 'machine_learning', 'cloud_architecture', 'cybersecurity'];
        const hasHighDemandSkills = skills.some(skill => 
            highDemandSkills.includes(skill.replace(/\s+/g, '_').toLowerCase())
        );
        
        if (hasHighDemandSkills) return 'Very High';
        if (role === 'software_engineer' || role === 'data_scientist') return 'High';
        return 'Medium';
    }

    getGrowthTrend(role) {
        const growthTrends = {
            'software_engineer': 'Strong growth expected',
            'data_scientist': 'Explosive growth continues',
            'product_manager': 'Steady growth',
            'designer': 'Moderate growth'
        };
        
        return growthTrends[role] || 'Stable';
    }

    getCompetitionLevel(role, location) {
        const highCompetitionLocations = ['san_francisco', 'new_york', 'seattle'];
        
        if (highCompetitionLocations.includes(location)) {
            return 'High competition, but higher salaries';
        }
        
        return 'Moderate competition';
    }

    getMarketOutlook(industry) {
        const outlooks = {
            'tech': 'Continued strong growth and innovation',
            'finance': 'Digital transformation driving demand',
            'healthcare': 'Growing need for tech solutions',
            'consulting': 'Stable with digital focus',
            'government': 'Modernization initiatives',
            'education': 'EdTech growth opportunities'
        };
        
        return outlooks[industry] || 'Stable market conditions';
    }

    getNegotiationTips(estimate) {
        return [
            `Research shows salaries in this range: $${estimate.min.toLocaleString()} - $${estimate.max.toLocaleString()}`,
            'Highlight your unique skills and achievements',
            'Consider total compensation including benefits',
            'Be prepared to discuss your value proposition',
            'Research company-specific salary data if possible'
        ];
    }

    projectSalaryGrowth(analysis, currentEstimate) {
        const annualGrowthRates = {
            'entry': 0.15,
            'junior': 0.12,
            'mid': 0.08,
            'senior': 0.06,
            'lead': 0.05,
            'principal': 0.04
        };
        
        const growthRate = annualGrowthRates[analysis.experience_level] || 0.08;
        
        return {
            one_year: Math.round(currentEstimate.median * (1 + growthRate)),
            three_years: Math.round(currentEstimate.median * Math.pow(1 + growthRate, 3)),
            five_years: Math.round(currentEstimate.median * Math.pow(1 + growthRate, 5)),
            growth_rate: `${(growthRate * 100).toFixed(1)}% annually`
        };
    }

    getDefaultSalaryEstimate() {
        return {
            estimated_range: { min: 80000, max: 120000, median: 100000 },
            confidence_level: 60,
            factors: ['Unable to analyze detailed factors'],
            market_insights: {
                demand_level: 'Medium',
                growth_trend: 'Stable',
                competition: 'Moderate',
                market_outlook: 'Stable market conditions'
            },
            negotiation_tips: [
                'Research market rates for your role',
                'Highlight your achievements',
                'Consider total compensation'
            ],
            growth_projection: {
                one_year: 108000,
                three_years: 125000,
                five_years: 146000,
                growth_rate: '8.0% annually'
            }
        };
    }
}
