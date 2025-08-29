/**
 * Resume Evaluator Supabase Integration
 * Handles storing and retrieving resume evaluation data from Supabase
 */

class ResumeEvaluatorSupabase {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.init();
    }

    async init() {
        try {
            // Initialize Supabase client (use shared singleton)
            if (window && window.getSupabaseClient) {
                this.supabase = window.getSupabaseClient();
            }
            if (!this.supabase) {
                console.warn('Supabase client not available');
                return;
            }

            // Get current user and keep in sync with auth state
            await this.getCurrentUser();
            if (this.supabase.auth && this.supabase.auth.onAuthStateChange) {
                this.supabase.auth.onAuthStateChange(async () => {
                    await this.getCurrentUser();
                });
            }
        } catch (error) {
            console.error('Failed to initialize Supabase integration:', error);
        }
    }

    async getCurrentUser() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            this.currentUser = user;
            return user;
        } catch (error) {
            console.error('Failed to get current user:', error);
            return null;
        }
    }

    async saveEvaluationResult(evaluationData, resumeText, jobDescription) {
        if (!this.supabase || !this.currentUser) {
            console.log('Supabase not available or user not authenticated - skipping save');
            return null;
        }

        try {
            const startTime = performance.now();

            // Prepare the main evaluation record
            const evaluationRecord = {
                user_id: this.currentUser.id,
                resume_text: resumeText,
                job_description: jobDescription,
                parsed_resume: evaluationData.parsed_resume || {},
                total_score: evaluationData.total_score || 0,
                skills_score: evaluationData.skills_score || 0,
                experience_score: evaluationData.experience_score || 0,
                education_score: evaluationData.education_score || 0,
                project_score: evaluationData.project_score || 0,
                matched_keywords: evaluationData.matched_keywords || [],
                missing_keywords: evaluationData.missing_keywords || [],
                quick_suggestions: evaluationData.quick_suggestions || [],
                strengths: evaluationData.strengths || [],
                improvements: evaluationData.improvements || [],
                skills_reasoning: evaluationData.reasoning?.skills_reasoning || '',
                experience_reasoning: evaluationData.reasoning?.experience_reasoning || '',
                education_reasoning: evaluationData.reasoning?.education_reasoning || '',
                project_reasoning: evaluationData.reasoning?.project_reasoning || '',
                overall_assessment: evaluationData.reasoning?.overall_assessment || '',
                summary: evaluationData.summary || '',
                job_recommendations: evaluationData.job_recommendations || [],
                processing_time_ms: Math.round(evaluationData.processing_time || 0),
                cache_hit: evaluationData.cache_hit || false
            };

            // Insert the main evaluation record
            const { data: evaluation, error: evalError } = await this.supabase
                .from('resume_evaluations')
                .insert([evaluationRecord])
                .select()
                .single();

            if (evalError) {
                throw evalError;
            }

            console.log('Resume evaluation saved successfully:', evaluation.id);

            // Save extracted data in parallel
            const promises = [];

            // Save extracted skills
            if (evaluationData.parsed_resume?.skills?.length > 0) {
                promises.push(this.saveExtractedSkills(evaluation.id, evaluationData.parsed_resume.skills));
            }

            // Save extracted experience
            if (evaluationData.parsed_resume?.experience?.length > 0) {
                promises.push(this.saveExtractedExperience(evaluation.id, evaluationData.parsed_resume.experience));
            }

            // Save extracted education
            if (evaluationData.parsed_resume?.education?.length > 0) {
                promises.push(this.saveExtractedEducation(evaluation.id, evaluationData.parsed_resume.education));
            }

            // Save extracted projects
            if (evaluationData.parsed_resume?.projects?.length > 0) {
                promises.push(this.saveExtractedProjects(evaluation.id, evaluationData.parsed_resume.projects));
            }

            // Wait for all extractions to complete
            await Promise.allSettled(promises);

            const saveTime = performance.now() - startTime;
            console.log(`Resume evaluation data saved in ${saveTime.toFixed(2)}ms`);

            return evaluation;

        } catch (error) {
            console.error('Failed to save evaluation result:', error);
            return null;
        }
    }

    async saveExtractedSkills(evaluationId, skills) {
        try {
            const skillRecords = skills.map(skill => ({
                evaluation_id: evaluationId,
                user_id: this.currentUser.id,
                skill: skill,
                confidence_score: 0.9, // Default confidence
                source: 'resume_text'
            }));

            const { error } = await this.supabase
                .from('resume_skills_extracted')
                .insert(skillRecords);

            if (error) throw error;
            console.log(`Saved ${skills.length} extracted skills`);
        } catch (error) {
            console.error('Failed to save extracted skills:', error);
        }
    }

    async saveExtractedExperience(evaluationId, experiences) {
        try {
            const experienceRecords = experiences.map(exp => ({
                evaluation_id: evaluationId,
                user_id: this.currentUser.id,
                job_title: exp.title || '',
                company: exp.location || '', // Using location as company for now
                duration: exp.duration || '',
                location: exp.location || '',
                description: exp.description || [],
                is_current: exp.duration?.toLowerCase().includes('present') || false
            }));

            const { error } = await this.supabase
                .from('resume_experience_extracted')
                .insert(experienceRecords);

            if (error) throw error;
            console.log(`Saved ${experiences.length} extracted experience entries`);
        } catch (error) {
            console.error('Failed to save extracted experience:', error);
        }
    }

    async saveExtractedEducation(evaluationId, educations) {
        try {
            const educationRecords = educations.map(edu => ({
                evaluation_id: evaluationId,
                user_id: this.currentUser.id,
                degree: edu.degree || '',
                university: edu.university || '',
                start_year: edu.start_year || '',
                end_year: edu.end_year || '',
                concentration: edu.concentration || '',
                gpa: edu.cumulative_gpa || '',
                relevant_coursework: edu.relevant_coursework || []
            }));

            const { error } = await this.supabase
                .from('resume_education_extracted')
                .insert(educationRecords);

            if (error) throw error;
            console.log(`Saved ${educations.length} extracted education entries`);
        } catch (error) {
            console.error('Failed to save extracted education:', error);
        }
    }

    async saveExtractedProjects(evaluationId, projects) {
        try {
            const projectRecords = projects.map(project => ({
                evaluation_id: evaluationId,
                user_id: this.currentUser.id,
                title: project.title || '',
                description: project.description || [],
                link: project.link || '',
                technologies: this.extractTechnologiesFromProject(project)
            }));

            const { error } = await this.supabase
                .from('resume_projects_extracted')
                .insert(projectRecords);

            if (error) throw error;
            console.log(`Saved ${projects.length} extracted project entries`);
        } catch (error) {
            console.error('Failed to save extracted projects:', error);
        }
    }

    extractTechnologiesFromProject(project) {
        // Extract technologies from project description
        const techKeywords = [
            'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'HTML', 'CSS',
            'SQL', 'MongoDB', 'AWS', 'Docker', 'Git', 'TypeScript', 'Vue.js',
            'Angular', 'Express', 'Django', 'Flask', 'PostgreSQL', 'MySQL'
        ];

        const technologies = [];
        const projectText = (project.description || []).join(' ').toLowerCase();

        techKeywords.forEach(tech => {
            if (projectText.includes(tech.toLowerCase())) {
                technologies.push(tech);
            }
        });

        return technologies;
    }

    async getUserEvaluationHistory(limit = 10) {
        if (!this.supabase || !this.currentUser) {
            return [];
        }

        try {
            const { data, error } = await this.supabase
                .from('resume_evaluations')
                .select(`
                    id,
                    total_score,
                    skills_score,
                    experience_score,
                    education_score,
                    project_score,
                    summary,
                    created_at,
                    processing_time_ms,
                    cache_hit
                `)
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Failed to get evaluation history:', error);
            return [];
        }
    }

    async getEvaluationById(evaluationId) {
        if (!this.supabase || !this.currentUser) {
            return null;
        }

        try {
            const { data, error } = await this.supabase
                .from('resume_evaluations')
                .select('*')
                .eq('id', evaluationId)
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Failed to get evaluation by ID:', error);
            return null;
        }
    }

    async getUserSkillsAnalysis() {
        if (!this.supabase || !this.currentUser) {
            return null;
        }

        try {
            // Get most frequently mentioned skills
            const { data: skills, error: skillsError } = await this.supabase
                .from('resume_skills_extracted')
                .select('skill, confidence_score')
                .eq('user_id', this.currentUser.id);

            if (skillsError) throw skillsError;

            // Aggregate skills by frequency
            const skillCounts = {};
            skills.forEach(skill => {
                skillCounts[skill.skill] = (skillCounts[skill.skill] || 0) + 1;
            });

            // Sort by frequency
            const topSkills = Object.entries(skillCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 20)
                .map(([skill, count]) => ({ skill, count }));

            return {
                totalSkills: skills.length,
                uniqueSkills: Object.keys(skillCounts).length,
                topSkills: topSkills
            };

        } catch (error) {
            console.error('Failed to get skills analysis:', error);
            return null;
        }
    }

    async getEvaluationStats() {
        if (!this.supabase || !this.currentUser) {
            return null;
        }

        try {
            const { data, error } = await this.supabase
                .from('resume_evaluations')
                .select('total_score, skills_score, experience_score, education_score, project_score, created_at')
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            if (data.length === 0) {
                return {
                    totalEvaluations: 0,
                    averageScore: 0,
                    highestScore: 0,
                    lowestScore: 0,
                    scoreImprovement: 0
                };
            }

            const scores = data.map(d => d.total_score);
            const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            const highestScore = Math.max(...scores);
            const lowestScore = Math.min(...scores);

            // Calculate improvement (compare first vs last evaluation)
            const firstScore = data[data.length - 1].total_score;
            const lastScore = data[0].total_score;
            const scoreImprovement = lastScore - firstScore;

            return {
                totalEvaluations: data.length,
                averageScore: Math.round(averageScore),
                highestScore,
                lowestScore,
                scoreImprovement,
                evaluationHistory: data.slice(0, 10) // Last 10 evaluations
            };

        } catch (error) {
            console.error('Failed to get evaluation stats:', error);
            return null;
        }
    }

    async deleteEvaluation(evaluationId) {
        if (!this.supabase || !this.currentUser) {
            return false;
        }

        try {
            const { error } = await this.supabase
                .from('resume_evaluations')
                .delete()
                .eq('id', evaluationId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;
            console.log('Evaluation deleted successfully');
            return true;
        } catch (error) {
            console.error('Failed to delete evaluation:', error);
            return false;
        }
    }

    // Update user profile with extracted resume data
    async updateUserProfileFromResume(parsedResume) {
        if (!this.supabase || !this.currentUser || !parsedResume) {
            return false;
        }

        try {
            const updates = {};

            // Update basic info if not already set
            if (parsedResume.name && !this.currentUser.user_metadata?.full_name) {
                const nameParts = parsedResume.name.split(' ');
                updates.first_name = nameParts[0];
                if (nameParts.length > 1) {
                    updates.last_name = nameParts.slice(1).join(' ');
                }
            }

            if (parsedResume.phone) {
                updates.phone = parsedResume.phone;
            }

            // Only update if we have something to update
            if (Object.keys(updates).length > 0) {
                const { error } = await this.supabase
                    .from('user_profiles')
                    .update(updates)
                    .eq('id', this.currentUser.id);

                if (error) throw error;
                console.log('User profile updated from resume data');
            }

            // Update user skills
            if (parsedResume.skills && parsedResume.skills.length > 0) {
                await this.updateUserSkills(parsedResume.skills);
            }

            return true;
        } catch (error) {
            console.error('Failed to update user profile from resume:', error);
            return false;
        }
    }

    async updateUserSkills(skills) {
        try {
            // First, get existing skills to avoid duplicates
            const { data: existingSkills } = await this.supabase
                .from('user_skills')
                .select('skill')
                .eq('user_id', this.currentUser.id);

            const existingSkillNames = existingSkills?.map(s => s.skill.toLowerCase()) || [];

            // Filter out skills that already exist
            const newSkills = skills.filter(skill => 
                !existingSkillNames.includes(skill.toLowerCase())
            );

            if (newSkills.length > 0) {
                const skillRecords = newSkills.map(skill => ({
                    user_id: this.currentUser.id,
                    skill: skill,
                    proficiency_level: 'intermediate' // Default level
                }));

                const { error } = await this.supabase
                    .from('user_skills')
                    .insert(skillRecords);

                if (error) throw error;
                console.log(`Added ${newSkills.length} new skills to user profile`);
            }
        } catch (error) {
            console.error('Failed to update user skills:', error);
        }
    }
}

// Global instance
let resumeEvaluatorSupabase = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    resumeEvaluatorSupabase = new ResumeEvaluatorSupabase();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResumeEvaluatorSupabase;
}

// Make available globally
window.ResumeEvaluatorSupabase = ResumeEvaluatorSupabase;
window.resumeEvaluatorSupabase = resumeEvaluatorSupabase;