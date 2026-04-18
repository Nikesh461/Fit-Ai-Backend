/**
 * Browser-based Unit Tests for FitAI Data Transformation Functions
 * Paste this into your browser console while on any FitAI page to verify logic.
 */
(() => {
    const common = window.FitAICommon;
    if (!common) {
        console.error('FitAICommon not found. Make sure app.js is loaded.');
        return;
    }

    const tests = [
        {
            name: 'estimateWorkoutCalories - basic',
            test: () => {
                const result = common.estimateWorkoutCalories({ sets: 3 });
                return result === Math.round(3 * 32); // 96
            }
        },
        {
            name: 'estimateWorkoutCalories - weighted',
            test: () => {
                const result = common.estimateWorkoutCalories({ sets: 4, weight: 100 });
                return result === Math.round(4 * 40); // 160
            }
        },
        {
            name: 'estimateWorkoutMinutes - basic',
            test: () => {
                const result = common.estimateWorkoutMinutes({ sets: 5 });
                return result === 20; // 5 * 4
            }
        },
        {
            name: 'deriveAthleteLevel - beginner',
            test: () => {
                const result = common.deriveAthleteLevel(50);
                return result === 'Beginner Athlete';
            }
        },
        {
            name: 'deriveAthleteLevel - intermediate',
            test: () => {
                const result = common.deriveAthleteLevel(150);
                return result === 'Intermediate Athlete';
            }
        },
        {
            name: 'deriveAthleteLevel - advanced',
            test: () => {
                const result = common.deriveAthleteLevel(300);
                return result === 'Advanced Athlete';
            }
        },
        {
            name: 'parseMacroValue - string',
            test: () => {
                const result = common.parseMacroValue('150g');
                return result === 150;
            }
        },
        {
            name: 'parseMacroValue - number',
            test: () => {
                const result = common.parseMacroValue(200);
                return result === 200;
            }
        }
    ];

    console.group('FitAI Transformation Unit Tests');
    let passed = 0;
    tests.forEach(t => {
        try {
            if (t.test()) {
                console.log(`✅ PASSED: ${t.name}`);
                passed++;
            } else {
                console.error(`❌ FAILED: ${t.name}`);
            }
        } catch (e) {
            console.error(`💥 ERROR: ${t.name}`, e);
        }
    });
    console.log(`\nSummary: ${passed}/${tests.length} tests passed.`);
    console.groupEnd();
})();
