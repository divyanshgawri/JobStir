/**
 * Performance Benchmark Tool
 * Compares Flask backend vs JavaScript engine performance
 */

class PerformanceBenchmark {
    constructor() {
        this.results = [];
        this.testData = this.generateTestData();
    }

    generateTestData() {
        return [
            {
                name: "Software Engineer Resume",
                resumeText: `John Doe
john.doe@email.com
(555) 123-4567

EXPERIENCE
Senior Software Engineer | TechCorp | 2020-2023
• Developed scalable web applications using React, Node.js, and MongoDB
• Led a team of 5 developers in agile development processes
• Implemented CI/CD pipelines reducing deployment time by 60%
• Built RESTful APIs serving 1M+ requests daily

Software Developer | StartupXYZ | 2018-2020
• Created responsive web interfaces using HTML, CSS, JavaScript
• Integrated third-party APIs and payment systems
• Optimized database queries improving performance by 40%

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2014-2018
GPA: 3.8/4.0

SKILLS
JavaScript, Python, React, Node.js, MongoDB, SQL, AWS, Docker, Git, Agile, Scrum

PROJECTS
E-commerce Platform | https://github.com/johndoe/ecommerce
• Built full-stack e-commerce application with React and Node.js
• Implemented secure payment processing and user authentication
• Deployed on AWS with auto-scaling capabilities

Task Management App | https://github.com/johndoe/taskmanager
• Developed real-time task management application
• Used WebSocket for live updates and collaboration features
• Integrated with Google Calendar API

CERTIFICATIONS
AWS Certified Solutions Architect
Google Cloud Professional Developer`,
                jobDescription: `We are seeking a Senior Software Engineer to join our growing team. The ideal candidate will have 3+ years of experience in full-stack development with expertise in JavaScript, React, Node.js, and cloud technologies.

Key Responsibilities:
• Design and develop scalable web applications
• Collaborate with cross-functional teams in an agile environment
• Implement best practices for code quality and testing
• Deploy and maintain applications on cloud platforms
• Mentor junior developers and contribute to technical decisions

Required Skills:
• 3+ years of software development experience
• Proficiency in JavaScript, React, Node.js
• Experience with databases (SQL and NoSQL)
• Knowledge of cloud platforms (AWS, GCP, or Azure)
• Understanding of CI/CD processes
• Strong problem-solving and communication skills

Preferred Qualifications:
• Bachelor's degree in Computer Science or related field
• Experience with microservices architecture
• Knowledge of containerization (Docker, Kubernetes)
• Agile/Scrum methodology experience
• Open source contributions`
            },
            {
                name: "Data Scientist Resume",
                resumeText: `Jane Smith
jane.smith@email.com
(555) 987-6543

EXPERIENCE
Senior Data Scientist | DataCorp | 2021-2023
• Built machine learning models for customer segmentation and churn prediction
• Developed predictive analytics solutions using Python, TensorFlow, and scikit-learn
• Created data pipelines processing 10TB+ of data daily
• Collaborated with product teams to implement A/B testing frameworks

Data Analyst | Analytics Inc | 2019-2021
• Performed statistical analysis on large datasets using SQL and Python
• Created interactive dashboards and visualizations using Tableau
• Conducted market research and customer behavior analysis
• Presented findings to executive leadership team

EDUCATION
Master of Science in Data Science
Data University | 2017-2019
GPA: 3.9/4.0

Bachelor of Science in Statistics
Math College | 2013-2017
GPA: 3.7/4.0

SKILLS
Python, R, SQL, TensorFlow, PyTorch, scikit-learn, Pandas, NumPy, Matplotlib, Tableau, AWS, Spark, Hadoop

PROJECTS
Customer Churn Prediction | https://github.com/janesmith/churn-prediction
• Developed ML model achieving 92% accuracy in predicting customer churn
• Used ensemble methods combining Random Forest and XGBoost
• Deployed model using Flask API and Docker containers

Stock Price Prediction | https://github.com/janesmith/stock-prediction
• Built LSTM neural network for time series forecasting
• Implemented feature engineering and data preprocessing pipelines
• Achieved 15% improvement over baseline models

CERTIFICATIONS
AWS Certified Machine Learning Specialty
Google Cloud Professional Data Engineer
Tableau Desktop Certified Associate`,
                jobDescription: `We are looking for a Data Scientist to join our analytics team. The successful candidate will have experience in machine learning, statistical analysis, and data visualization.

Responsibilities:
• Develop and deploy machine learning models
• Analyze large datasets to extract business insights
• Create data visualizations and reports for stakeholders
• Collaborate with engineering teams on data infrastructure
• Design and execute A/B tests and experiments

Requirements:
• Master's degree in Data Science, Statistics, or related field
• 2+ years of experience in data science or analytics
• Proficiency in Python and SQL
• Experience with machine learning libraries (scikit-learn, TensorFlow, PyTorch)
• Knowledge of statistical analysis and hypothesis testing
• Experience with data visualization tools (Tableau, matplotlib, seaborn)
• Strong communication and presentation skills

Preferred:
• Experience with cloud platforms (AWS, GCP, Azure)
• Knowledge of big data technologies (Spark, Hadoop)
• Experience with deep learning and neural networks
• Publications or contributions to open source projects`
            }
        ];
    }

    async runBenchmark() {
        console.log('🚀 Starting Performance Benchmark...');
        
        const engine = new ResumeEvaluatorEngine();
        const results = {
            javascript: {
                times: [],
                scores: [],
                errors: 0
            },
            flask: {
                times: [],
                scores: [],
                errors: 0
            }
        };

        // Test JavaScript Engine
        console.log('📊 Testing JavaScript Engine...');
        for (const testCase of this.testData) {
            try {
                const startTime = performance.now();
                const result = await engine.evaluateResume(testCase.resumeText, testCase.jobDescription);
                const endTime = performance.now();
                
                results.javascript.times.push(endTime - startTime);
                results.javascript.scores.push(result.total_score);
                
                console.log(`✅ ${testCase.name}: ${(endTime - startTime).toFixed(2)}ms, Score: ${result.total_score}`);
            } catch (error) {
                results.javascript.errors++;
                console.error(`❌ ${testCase.name}: Error -`, error.message);
            }
        }

        // Test Flask Backend (if available)
        console.log('🐍 Testing Flask Backend...');
        for (const testCase of this.testData) {
            try {
                const startTime = performance.now();
                const response = await fetch('/api/evaluate-resume', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        resume_text: testCase.resumeText,
                        job_description: testCase.jobDescription
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    const endTime = performance.now();
                    
                    results.flask.times.push(endTime - startTime);
                    results.flask.scores.push(result.total_score);
                    
                    console.log(`✅ ${testCase.name}: ${(endTime - startTime).toFixed(2)}ms, Score: ${result.total_score}`);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                results.flask.errors++;
                console.log(`⚠️ ${testCase.name}: Flask backend not available`);
            }
        }

        // Calculate statistics
        const stats = this.calculateStats(results);
        this.displayResults(stats);
        
        return stats;
    }

    calculateStats(results) {
        const calculateMetrics = (times) => {
            if (times.length === 0) return { avg: 0, min: 0, max: 0, median: 0 };
            
            const sorted = [...times].sort((a, b) => a - b);
            return {
                avg: times.reduce((a, b) => a + b, 0) / times.length,
                min: Math.min(...times),
                max: Math.max(...times),
                median: sorted[Math.floor(sorted.length / 2)]
            };
        };

        return {
            javascript: {
                performance: calculateMetrics(results.javascript.times),
                accuracy: results.javascript.scores.reduce((a, b) => a + b, 0) / results.javascript.scores.length || 0,
                errors: results.javascript.errors,
                totalTests: this.testData.length
            },
            flask: {
                performance: calculateMetrics(results.flask.times),
                accuracy: results.flask.scores.reduce((a, b) => a + b, 0) / results.flask.scores.length || 0,
                errors: results.flask.errors,
                totalTests: this.testData.length
            }
        };
    }

    displayResults(stats) {
        console.log('\n📈 PERFORMANCE BENCHMARK RESULTS');
        console.log('=====================================');
        
        console.log('\n🟢 JavaScript Engine:');
        console.log(`   Average Time: ${stats.javascript.performance.avg.toFixed(2)}ms`);
        console.log(`   Min Time: ${stats.javascript.performance.min.toFixed(2)}ms`);
        console.log(`   Max Time: ${stats.javascript.performance.max.toFixed(2)}ms`);
        console.log(`   Median Time: ${stats.javascript.performance.median.toFixed(2)}ms`);
        console.log(`   Average Score: ${stats.javascript.accuracy.toFixed(1)}`);
        console.log(`   Success Rate: ${((stats.javascript.totalTests - stats.javascript.errors) / stats.javascript.totalTests * 100).toFixed(1)}%`);
        
        if (stats.flask.performance.avg > 0) {
            console.log('\n🐍 Flask Backend:');
            console.log(`   Average Time: ${stats.flask.performance.avg.toFixed(2)}ms`);
            console.log(`   Min Time: ${stats.flask.performance.min.toFixed(2)}ms`);
            console.log(`   Max Time: ${stats.flask.performance.max.toFixed(2)}ms`);
            console.log(`   Median Time: ${stats.flask.performance.median.toFixed(2)}ms`);
            console.log(`   Average Score: ${stats.flask.accuracy.toFixed(1)}`);
            console.log(`   Success Rate: ${((stats.flask.totalTests - stats.flask.errors) / stats.flask.totalTests * 100).toFixed(1)}%`);
            
            // Performance comparison
            const speedImprovement = ((stats.flask.performance.avg - stats.javascript.performance.avg) / stats.flask.performance.avg * 100);
            console.log('\n⚡ Performance Comparison:');
            console.log(`   JavaScript is ${speedImprovement.toFixed(1)}% ${speedImprovement > 0 ? 'FASTER' : 'SLOWER'} than Flask`);
            console.log(`   Speed Ratio: ${(stats.flask.performance.avg / stats.javascript.performance.avg).toFixed(2)}x`);
        } else {
            console.log('\n🐍 Flask Backend: Not available for comparison');
        }

        // Create visual chart if possible
        this.createPerformanceChart(stats);
    }

    createPerformanceChart(stats) {
        // Create a simple ASCII chart
        console.log('\n📊 Performance Chart:');
        console.log('┌─────────────────────────────────────┐');
        
        const jsBar = '█'.repeat(Math.floor(stats.javascript.performance.avg / 100));
        const flaskBar = stats.flask.performance.avg > 0 ? '█'.repeat(Math.floor(stats.flask.performance.avg / 100)) : 'N/A';
        
        console.log(`│ JavaScript: ${jsBar} ${stats.javascript.performance.avg.toFixed(0)}ms`);
        if (stats.flask.performance.avg > 0) {
            console.log(`│ Flask:      ${flaskBar} ${stats.flask.performance.avg.toFixed(0)}ms`);
        }
        console.log('└─────────────────────────────────────┘');
    }

    // Memory usage benchmark
    async benchmarkMemoryUsage() {
        if (!performance.memory) {
            console.log('⚠️ Memory API not available in this browser');
            return;
        }

        console.log('\n🧠 Memory Usage Benchmark');
        console.log('==========================');

        const initialMemory = performance.memory.usedJSHeapSize;
        console.log(`Initial Memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);

        const engine = new ResumeEvaluatorEngine();
        
        // Run multiple evaluations
        for (let i = 0; i < 10; i++) {
            await engine.evaluateResume(this.testData[0].resumeText, this.testData[0].jobDescription);
        }

        const finalMemory = performance.memory.usedJSHeapSize;
        const memoryIncrease = finalMemory - initialMemory;
        
        console.log(`Final Memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Memory Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Memory per Evaluation: ${(memoryIncrease / 10 / 1024).toFixed(2)} KB`);
    }

    // Stress test
    async stressTest(iterations = 50) {
        console.log(`\n🔥 Stress Test (${iterations} iterations)`);
        console.log('=====================================');

        const engine = new ResumeEvaluatorEngine();
        const startTime = performance.now();
        let successCount = 0;
        let errorCount = 0;

        const promises = [];
        for (let i = 0; i < iterations; i++) {
            const testCase = this.testData[i % this.testData.length];
            promises.push(
                engine.evaluateResume(testCase.resumeText, testCase.jobDescription)
                    .then(() => successCount++)
                    .catch(() => errorCount++)
            );
        }

        await Promise.allSettled(promises);
        const endTime = performance.now();
        const totalTime = endTime - startTime;

        console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
        console.log(`Average Time per Evaluation: ${(totalTime / iterations).toFixed(2)}ms`);
        console.log(`Success Rate: ${(successCount / iterations * 100).toFixed(1)}%`);
        console.log(`Throughput: ${(iterations / (totalTime / 1000)).toFixed(2)} evaluations/second`);
    }
}

// Global benchmark functions
window.runPerformanceBenchmark = async () => {
    const benchmark = new PerformanceBenchmark();
    return await benchmark.runBenchmark();
};

window.runMemoryBenchmark = async () => {
    const benchmark = new PerformanceBenchmark();
    return await benchmark.benchmarkMemoryUsage();
};

window.runStressTest = async (iterations = 50) => {
    const benchmark = new PerformanceBenchmark();
    return await benchmark.stressTest(iterations);
};

// Auto-run benchmark in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Development mode detected. Run benchmark with: runPerformanceBenchmark()');
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceBenchmark;
}