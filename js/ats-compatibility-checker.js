// ATS Compatibility Checker - Analyzes resume compatibility with Applicant Tracking Systems
class ATSCompatibilityChecker {
    constructor() {
        this.atsRules = new Map();
        this.formatChecks = new Map();
        this.keywordDensityThresholds = new Map();
        this.init();
    }

    async init() {
        this.loadATSRules();
        this.loadFormatChecks();
        this.loadKeywordThresholds();
    }

    loadATSRules() {
        // Common ATS parsing rules and requirements
        this.atsRules.set('contact_info', {
            required: ['email', 'phone'],
            format: 'standard',
            location: 'top_section'
        });

        this.atsRules.set('section_headers', {
            standard: ['experience', 'education', 'skills', 'summary'],
            avoid: ['references', 'hobbies', 'personal']
        });

        this.atsRules.set('formatting', {
            avoid: ['tables', 'columns', 'text_boxes', 'headers_footers'],
            prefer: ['bullet_points', 'standard_fonts', 'clear_hierarchy']
        });

        this.atsRules.set('file_format', {
            best: ['docx', 'pdf'],
            avoid: ['jpg', 'png', 'txt']
        });
    }

    loadFormatChecks() {
        this.formatChecks.set('font_analysis', {
            standard_fonts: ['Arial', 'Calibri', 'Times New Roman', 'Helvetica'],
            avoid_fonts: ['Comic Sans', 'Papyrus', 'Brush Script']
        });

        this.formatChecks.set('structure_analysis', {
            required_sections: ['contact', 'experience', 'education'],
            recommended_sections: ['summary', 'skills'],
            section_order: ['contact', 'summary', 'experience', 'education', 'skills']
        });
    }

    loadKeywordThresholds() {
        this.keywordDensityThresholds.set('optimal', { min: 0.02, max: 0.05 });
        this.keywordDensityThresholds.set('acceptable', { min: 0.01, max: 0.07 });
    }

    async checkCompatibility(resumeText) {
        try {
            const compatibility = {
                overall_score: 0,
                detailed_scores: {},
                issues: [],
                recommendations: [],
                ats_friendly_elements: [],
                problematic_elements: []
            };

            // Run all compatibility checks
            const [
                contactCheck,
                structureCheck,
                formatCheck,
                keywordCheck,
                lengthCheck,
                readabilityCheck
            ] = await Promise.all([
                this.checkContactInfo(resumeText),
                this.checkStructure(resumeText),
                this.checkFormatting(resumeText),
                this.checkKeywordDensity(resumeText),
                this.checkLength(resumeText),
                this.checkReadability(resumeText)
            ]);

            // Combine results
            compatibility.detailed_scores = {
                contact_info: contactCheck.score,
                structure: structureCheck.score,
                formatting: formatCheck.score,
                keyword_density: keywordCheck.score,
                length: lengthCheck.score,
                readability: readabilityCheck.score
            };

            // Calculate overall score
            const scores = Object.values(compatibility.detailed_scores);
            compatibility.overall_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

            // Collect issues and recommendations
            [contactCheck, structureCheck, formatCheck, keywordCheck, lengthCheck, readabilityCheck]
                .forEach(check => {
                    compatibility.issues.push(...check.issues);
                    compatibility.recommendations.push(...check.recommendations);
                    compatibility.ats_friendly_elements.push(...check.good_elements);
                    compatibility.problematic_elements.push(...check.bad_elements);
                });

            return compatibility;

        } catch (error) {
            console.error('ATS compatibility check failed:', error);
            return this.getDefaultCompatibility();
        }
    }

    async checkContactInfo(text) {
        const result = {
            score: 0,
            issues: [],
            recommendations: [],
            good_elements: [],
            bad_elements: []
        };

        // Check for email
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        if (emailPattern.test(text)) {
            result.score += 30;
            result.good_elements.push('Email address found');
        } else {
            result.issues.push('No email address detected');
            result.recommendations.push('Add a professional email address');
        }

        // Check for phone number
        const phonePattern = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
        if (phonePattern.test(text)) {
            result.score += 30;
            result.good_elements.push('Phone number found');
        } else {
            result.issues.push('No phone number detected');
            result.recommendations.push('Add a phone number');
        }

        // Check for LinkedIn
        if (text.toLowerCase().includes('linkedin')) {
            result.score += 20;
            result.good_elements.push('LinkedIn profile mentioned');
        } else {
            result.recommendations.push('Consider adding LinkedIn profile');
        }

        // Check contact info placement
        const firstThird = text.substring(0, text.length / 3);
        if (emailPattern.test(firstThird) && phonePattern.test(firstThird)) {
            result.score += 20;
            result.good_elements.push('Contact info at top of resume');
        } else {
            result.issues.push('Contact info should be at the top');
            result.recommendations.push('Move contact information to the top');
        }

        return result;
    }

    async checkStructure(text) {
        const result = {
            score: 0,
            issues: [],
            recommendations: [],
            good_elements: [],
            bad_elements: []
        };

        const standardSections = ['experience', 'education', 'skills', 'summary', 'objective'];
        const foundSections = [];
        const lowerText = text.toLowerCase();

        // Check for standard sections
        standardSections.forEach(section => {
            const patterns = [
                new RegExp(`\\b${section}\\b`, 'i'),
                new RegExp(`${section}:`, 'i'),
                new RegExp(`${section}\\s*$`, 'im')
            ];

            if (patterns.some(pattern => pattern.test(text))) {
                foundSections.push(section);
                result.good_elements.push(`${section.charAt(0).toUpperCase() + section.slice(1)} section found`);
            }
        });

        // Score based on found sections
        result.score = Math.min(100, (foundSections.length / standardSections.length) * 100);

        // Check for required sections
        if (!foundSections.includes('experience')) {
            result.issues.push('Missing work experience section');
            result.recommendations.push('Add a clear work experience section');
        }

        if (!foundSections.includes('education')) {
            result.issues.push('Missing education section');
            result.recommendations.push('Add an education section');
        }

        // Check for problematic sections
        const problematicSections = ['references', 'hobbies', 'personal information'];
        problematicSections.forEach(section => {
            if (lowerText.includes(section)) {
                result.bad_elements.push(`${section} section (not ATS-friendly)`);
                result.recommendations.push(`Consider removing ${section} section`);
            }
        });

        return result;
    }

    async checkFormatting(text) {
        const result = {
            score: 80, // Start with good score, deduct for issues
            issues: [],
            recommendations: [],
            good_elements: [],
            bad_elements: []
        };

        // Check for bullet points
        const bulletPatterns = [/•/, /\*/, /-\s/, /\d+\./];
        if (bulletPatterns.some(pattern => pattern.test(text))) {
            result.good_elements.push('Uses bullet points for lists');
        } else {
            result.issues.push('No bullet points detected');
            result.recommendations.push('Use bullet points to list achievements and responsibilities');
            result.score -= 15;
        }

        // Check for excessive formatting characters
        const specialChars = text.match(/[★☆♦♠♣♥]/g);
        if (specialChars && specialChars.length > 5) {
            result.bad_elements.push('Excessive special characters');
            result.recommendations.push('Remove decorative characters that ATS cannot parse');
            result.score -= 10;
        }

        // Check for consistent spacing
        const multipleSpaces = text.match(/\s{3,}/g);
        if (multipleSpaces && multipleSpaces.length > 3) {
            result.issues.push('Inconsistent spacing detected');
            result.recommendations.push('Use consistent spacing throughout');
            result.score -= 5;
        }

        // Check for proper capitalization
        const lines = text.split('\n');
        const properlyCapitalized = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.length === 0 || /^[A-Z]/.test(trimmed);
        });

        if (properlyCapitalized.length / lines.length > 0.8) {
            result.good_elements.push('Proper capitalization used');
        } else {
            result.issues.push('Inconsistent capitalization');
            result.recommendations.push('Ensure consistent capitalization');
            result.score -= 10;
        }

        return result;
    }

    async checkKeywordDensity(text) {
        const result = {
            score: 0,
            issues: [],
            recommendations: [],
            good_elements: [],
            bad_elements: []
        };

        const words = text.toLowerCase().split(/\s+/);
        const totalWords = words.length;

        // Common job-related keywords
        const jobKeywords = [
            'experience', 'skills', 'developed', 'managed', 'led', 'created',
            'implemented', 'improved', 'achieved', 'responsible', 'collaborated'
        ];

        let keywordCount = 0;
        jobKeywords.forEach(keyword => {
            const occurrences = words.filter(word => word.includes(keyword)).length;
            keywordCount += occurrences;
        });

        const keywordDensity = keywordCount / totalWords;
        const optimal = this.keywordDensityThresholds.get('optimal');

        if (keywordDensity >= optimal.min && keywordDensity <= optimal.max) {
            result.score = 100;
            result.good_elements.push('Optimal keyword density');
        } else if (keywordDensity < optimal.min) {
            result.score = 60;
            result.issues.push('Low keyword density');
            result.recommendations.push('Include more relevant keywords from job descriptions');
        } else {
            result.score = 70;
            result.issues.push('High keyword density may appear as keyword stuffing');
            result.recommendations.push('Reduce keyword repetition for natural flow');
        }

        return result;
    }

    async checkLength(text) {
        const result = {
            score: 0,
            issues: [],
            recommendations: [],
            good_elements: [],
            bad_elements: []
        };

        const wordCount = text.split(/\s+/).length;
        const pageEstimate = wordCount / 250; // Rough estimate

        if (pageEstimate >= 1 && pageEstimate <= 2) {
            result.score = 100;
            result.good_elements.push('Appropriate length (1-2 pages)');
        } else if (pageEstimate < 1) {
            result.score = 70;
            result.issues.push('Resume may be too short');
            result.recommendations.push('Consider adding more detail about achievements');
        } else if (pageEstimate <= 3) {
            result.score = 80;
            result.issues.push('Resume is lengthy but acceptable');
            result.recommendations.push('Consider condensing to 2 pages if possible');
        } else {
            result.score = 50;
            result.issues.push('Resume is too long');
            result.recommendations.push('Reduce to 2 pages maximum');
        }

        return result;
    }

    async checkReadability(text) {
        const result = {
            score: 0,
            issues: [],
            recommendations: [],
            good_elements: [],
            bad_elements: []
        };

        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/);
        const avgWordsPerSentence = words.length / sentences.length;

        // Check sentence length
        if (avgWordsPerSentence <= 20) {
            result.score += 50;
            result.good_elements.push('Appropriate sentence length');
        } else {
            result.issues.push('Sentences may be too long');
            result.recommendations.push('Use shorter, clearer sentences');
        }

        // Check for action verbs
        const actionVerbs = [
            'achieved', 'managed', 'led', 'developed', 'created', 'improved',
            'increased', 'reduced', 'implemented', 'designed', 'coordinated'
        ];

        const actionVerbCount = actionVerbs.filter(verb => 
            text.toLowerCase().includes(verb)
        ).length;

        if (actionVerbCount >= 5) {
            result.score += 50;
            result.good_elements.push('Uses strong action verbs');
        } else {
            result.issues.push('Limited use of action verbs');
            result.recommendations.push('Use more action verbs to describe achievements');
        }

        return result;
    }

    getDefaultCompatibility() {
        return {
            overall_score: 75,
            detailed_scores: {
                contact_info: 80,
                structure: 75,
                formatting: 70,
                keyword_density: 75,
                length: 80,
                readability: 70
            },
            issues: ['Unable to perform detailed analysis'],
            recommendations: ['Ensure contact info is at the top', 'Use standard section headers', 'Include relevant keywords'],
            ats_friendly_elements: ['Standard format detected'],
            problematic_elements: []
        };
    }
}
