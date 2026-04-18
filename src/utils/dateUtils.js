/**
 * Checks if a regeneration is due for a plan.
 * A regeneration is due if the last generation occurred before the most recent Monday at 00:00:00.
 * @param {Date|string|number} lastGeneratedAt - The timestamp of the last generation.
 * @returns {boolean} - True if regeneration is due.
 */
const isWeeklyResetDue = (lastGeneratedAt) => {
    if (!lastGeneratedAt) return true;
    
    const now = new Date();
    // Get the most recent Monday at 00:00:00
    const mostRecentMonday = new Date(now);
    mostRecentMonday.setHours(0, 0, 0, 0);
    
    const dayOfWeek = mostRecentMonday.getDay(); // 0 (Sun) to 6 (Sat)
    // Monday is 1. 
    // If today is Monday (1), daysToSubtract is 0.
    // If today is Sunday (0), daysToSubtract is 6.
    // Formula: (dayOfWeek + 6) % 7
    const daysToSubtract = (dayOfWeek + 6) % 7;
    mostRecentMonday.setDate(mostRecentMonday.getDate() - daysToSubtract);
    
    const lastGen = new Date(lastGeneratedAt);
    return lastGen < mostRecentMonday;
};

module.exports = { isWeeklyResetDue };
