/**
 * Evaluation History Manager
 * Displays user's resume evaluation history and analytics
 */

class EvaluationHistory {
    constructor() {
        this.supabaseIntegration = null;
        this.evaluations = [];
        this.stats = null;
        this.init();
    }

    async init() {
        // Wait for Supabase integration to be ready
        if (window.resumeEvaluatorSupabase) {
            this.supabaseIntegration = window.resumeEvaluatorSupabase;
            await this.loadEvaluationHistory();
        } else {
            // Retry after a short delay
            setTimeout(() => this.init(), 1000);
        }
    }

    async loadEvaluationHistory() {
        try {
            // Load evaluation history and stats
            const [evaluations, stats, skillsAnalysis] = await Promise.all([
                this.supabaseIntegration.getUserEvaluationHistory(20),
                this.supabaseIntegration.getEvaluationStats(),
                this.supabaseIntegration.getUserSkillsAnalysis()
            ]);

            this.evaluations = evaluations || [];
            this.stats = stats || {};
            this.skillsAnalysis = skillsAnalysis || {};

            this.renderHistory();
            this.renderStats();
            this.renderSkillsAnalysis();

        } catch (error) {
            console.error('Failed to load evaluation history:', error);
        }
    }

    renderHistory() {
        const container = document.getElementById('evaluation-history');
        if (!container) return;

        if (this.evaluations.length === 0) {
            container.innerHTML = `
                <div class="no-evaluations">
                    <i data-feather="file-text"></i>
                    <h3>No Evaluations Yet</h3>
                    <p>Start by evaluating your resume to see your history here.</p>
                    <a href="evaluate_resume.html" class="btn btn-primary">Evaluate Resume</a>
                </div>
            `;
            feather.replace();
            return;
        }

        const historyHTML = this.evaluations.map(evaluation => `
            <div class="evaluation-card" data-id="${evaluation.id}">
                <div class="evaluation-header">
                    <div class="evaluation-score">
                        <div class="score-circle ${this.getScoreClass(evaluation.total_score)}">
                            <span class="score-value">${evaluation.total_score}</span>
                        </div>
                    </div>
                    <div class="evaluation-info">
                        <div class="evaluation-date">
                            ${new Date(evaluation.created_at).toLocaleDateString()}
                        </div>
                        <div class="evaluation-summary">
                            ${evaluation.summary || 'Resume evaluation completed'}
                        </div>
                    </div>
                    <div class="evaluation-actions">
                        <button class="btn-icon" onclick="evaluationHistory.viewDetails('${evaluation.id}')" title="View Details">
                            <i data-feather="eye"></i>
                        </button>
                        <button class="btn-icon" onclick="evaluationHistory.deleteEvaluation('${evaluation.id}')" title="Delete">
                            <i data-feather="trash-2"></i>
                        </button>
                    </div>
                </div>
                <div class="evaluation-breakdown">
                    <div class="score-breakdown">
                        <div class="score-item">
                            <span class="score-label">Skills</span>
                            <span class="score-bar">
                                <span class="score-fill" style="width: ${(evaluation.skills_score / 35) * 100}%"></span>
                            </span>
                            <span class="score-text">${evaluation.skills_score}/35</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Experience</span>
                            <span class="score-bar">
                                <span class="score-fill" style="width: ${(evaluation.experience_score / 25) * 100}%"></span>
                            </span>
                            <span class="score-text">${evaluation.experience_score}/25</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Education</span>
                            <span class="score-bar">
                                <span class="score-fill" style="width: ${(evaluation.education_score / 20) * 100}%"></span>
                            </span>
                            <span class="score-text">${evaluation.education_score}/20</span>
                        </div>
                        <div class="score-item">
                            <span class="score-label">Projects</span>
                            <span class="score-bar">
                                <span class="score-fill" style="width: ${(evaluation.project_score / 20) * 100}%"></span>
                            </span>
                            <span class="score-text">${evaluation.project_score}/20</span>
                        </div>
                    </div>
                    <div class="evaluation-meta">
                        <span class="processing-time">
                            <i data-feather="clock"></i>
                            ${evaluation.processing_time_ms}ms
                        </span>
                        ${evaluation.cache_hit ? '<span class="cache-hit"><i data-feather="zap"></i>Cached</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = historyHTML;
        feather.replace();
    }

    renderStats() {
        const container = document.getElementById('evaluation-stats');
        if (!container || !this.stats) return;

        const improvementClass = this.stats.scoreImprovement > 0 ? 'positive' : 
                                this.stats.scoreImprovement < 0 ? 'negative' : 'neutral';

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i data-feather="file-text"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.totalEvaluations}</div>
                        <div class="stat-label">Total Evaluations</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i data-feather="trending-up"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.averageScore}%</div>
                        <div class="stat-label">Average Score</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i data-feather="award"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">${this.stats.highestScore}%</div>
                        <div class="stat-label">Highest Score</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon ${improvementClass}">
                        <i data-feather="${this.stats.scoreImprovement >= 0 ? 'arrow-up' : 'arrow-down'}"></i>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value ${improvementClass}">
                            ${this.stats.scoreImprovement >= 0 ? '+' : ''}${this.stats.scoreImprovement}%
                        </div>
                        <div class="stat-label">Improvement</div>
                    </div>
                </div>
            </div>
        `;

        feather.replace();
    }

    renderSkillsAnalysis() {
        const container = document.getElementById('skills-analysis');
        if (!container || !this.skillsAnalysis) return;

        if (this.skillsAnalysis.topSkills?.length > 0) {
            const skillsHTML = this.skillsAnalysis.topSkills.slice(0, 10).map(skill => `
                <div class="skill-item">
                    <span class="skill-name">${skill.skill}</span>
                    <span class="skill-count">${skill.count}</span>
                </div>
            `).join('');

            container.innerHTML = `
                <div class="skills-summary">
                    <h4>Your Top Skills</h4>
                    <p>Based on ${this.skillsAnalysis.totalSkills} skill mentions across your evaluations</p>
                </div>
                <div class="skills-list">
                    ${skillsHTML}
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="no-skills">
                    <i data-feather="code"></i>
                    <p>No skills analysis available yet. Complete more evaluations to see your skill trends.</p>
                </div>
            `;
            feather.replace();
        }
    }

    getScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'fair';
        return 'poor';
    }

    async viewDetails(evaluationId) {
        try {
            const evaluation = await this.supabaseIntegration.getEvaluationById(evaluationId);
            if (evaluation) {
                this.showEvaluationModal(evaluation);
            }
        } catch (error) {
            console.error('Failed to load evaluation details:', error);
        }
    }

    showEvaluationModal(evaluation) {
        const modal = document.createElement('div');
        modal.className = 'evaluation-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Evaluation Details</h3>
                    <button class="close-modal" onclick="this.closest('.evaluation-modal').remove()">
                        <i data-feather="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="evaluation-overview">
                        <div class="score-display">
                            <div class="score-circle ${this.getScoreClass(evaluation.total_score)}">
                                <span class="score-value">${evaluation.total_score}</span>
                            </div>
                            <div class="score-breakdown-detailed">
                                <div class="score-item">Skills: ${evaluation.skills_score}/35</div>
                                <div class="score-item">Experience: ${evaluation.experience_score}/25</div>
                                <div class="score-item">Education: ${evaluation.education_score}/20</div>
                                <div class="score-item">Projects: ${evaluation.project_score}/20</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="evaluation-sections">
                        <div class="section">
                            <h4>Summary</h4>
                            <p>${evaluation.summary}</p>
                        </div>
                        
                        <div class="section">
                            <h4>Matched Keywords</h4>
                            <div class="keywords">
                                ${evaluation.matched_keywords.map(keyword => 
                                    `<span class="keyword matched">${keyword}</span>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="section">
                            <h4>Missing Keywords</h4>
                            <div class="keywords">
                                ${evaluation.missing_keywords.map(keyword => 
                                    `<span class="keyword missing">${keyword}</span>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="section">
                            <h4>Suggestions</h4>
                            <ul>
                                ${evaluation.quick_suggestions.map(suggestion => 
                                    `<li>${suggestion}</li>`
                                ).join('')}
                            </ul>
                        </div>
                        
                        <div class="section">
                            <h4>Overall Assessment</h4>
                            <p>${evaluation.overall_assessment}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.evaluation-modal').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        feather.replace();

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async deleteEvaluation(evaluationId) {
        if (!confirm('Are you sure you want to delete this evaluation?')) {
            return;
        }

        try {
            const success = await this.supabaseIntegration.deleteEvaluation(evaluationId);
            if (success) {
                // Remove from local array
                this.evaluations = this.evaluations.filter(e => e.id !== evaluationId);
                
                // Re-render
                this.renderHistory();
                
                // Reload stats
                await this.loadEvaluationHistory();
            } else {
                alert('Failed to delete evaluation. Please try again.');
            }
        } catch (error) {
            console.error('Failed to delete evaluation:', error);
            alert('Failed to delete evaluation. Please try again.');
        }
    }

    async refresh() {
        await this.loadEvaluationHistory();
    }
}

// Global instance
let evaluationHistory = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    evaluationHistory = new EvaluationHistory();
});

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EvaluationHistory;
}

window.EvaluationHistory = EvaluationHistory;
window.evaluationHistory = evaluationHistory;