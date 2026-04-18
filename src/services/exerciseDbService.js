const axios = require('axios');
const Exercise = require('../models/exercise.model'); // Import the new model

const EXERCISE_DB_BASE = 'https://exercisedb.p.rapidapi.com';
const RAPID_API_KEY = process.env.EXERCISE_DB_KEY;
const FALLBACK_GIF = `https://media.giphy.com/media/3o7TKMGpxx6rZg8fW8/giphy.gif`;

async function fetchFromExerciseDB(exerciseName) {
  try {
    const cleanName = exerciseName.toLowerCase().trim();
    
    const response = await axios.get(`${EXERCISE_DB_BASE}/exercises/name/${encodeURIComponent(cleanName)}`, {
      headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': 'exercisedb.p.rapidapi.com'
      },
      params: { limit: 1 }
    });

    if (response.data && response.data.length > 0) {
      const exercise = response.data[0];
      const officialImageUrl = `${EXERCISE_DB_BASE}/image?exerciseId=${exercise.id}&resolution=360&rapidapi-key=${RAPID_API_KEY}`;

      // SAVE TO DATABASE for future use
      const newExercise = await Exercise.create({
        name: cleanName,
        img: officialImageUrl,
        instructions: exercise.instructions || ['Maintain proper form throughout.']
      });

      return { img: newExercise.img, instructions: newExercise.instructions };
    }
    return null;
  } catch (e) {
    console.error(`API Error for ${exerciseName}: ${e.message}`);
    return null;
  }
}

async function attachExerciseData(weekPlan) {
  const exerciseLibrary = {};
  
  // 1. Get unique names from the plan
  const uniqueNames = [...new Set(weekPlan.flatMap(day => 
    day.exercises.map(ex => (typeof ex === 'object' ? ex.name : ex).toLowerCase().trim())
  ))];

  // 2. Lookup existing exercises in our Database
  const existingExercises = await Exercise.find({ name: { $in: uniqueNames } });
  
  // Populate library with DB data
  existingExercises.forEach(ex => {
    exerciseLibrary[ex.name] = { img: ex.img, instructions: ex.instructions };
  });

  // 3. Identify which names are MISSING from our DB
  const missingNames = uniqueNames.filter(name => !exerciseLibrary[name]);

  // 4. Only hit the External API for missing exercises
  if (missingNames.length > 0) {
    await Promise.all(
      missingNames.map(async (name) => {
        const data = await fetchFromExerciseDB(name);
        exerciseLibrary[name] = data || {
          img: FALLBACK_GIF,
          instructions: ['Perform this exercise with controlled movements.']
        };
      })
    );
  }

  // 5. Map back to the week plan
  return weekPlan.map(day => ({
    ...day,
    exercises: day.exercises.map(ex => {
      const isObj = typeof ex === 'object';
      const rawName = isObj ? ex.name : ex;
      const lookupKey = rawName.toLowerCase().trim();
      
      return {
        name: rawName,
        sets: isObj ? ex.sets : 3,
        reps: isObj ? ex.reps : '12',
        rest: isObj ? ex.rest : '60s',
        details: exerciseLibrary[lookupKey]
      };
    })
  }));
}

module.exports = { attachExerciseData };