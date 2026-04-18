const calculateStreak = (user) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!user.lastActivityDate) {
        return 1;
    }

    const lastActivity = new Date(user.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);

    const diffTime = today - lastActivity;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // Same day, keep streak
        return user.streak || 0;
    } else if (diffDays === 1) {
        // Consecutive day, increase streak
        return (user.streak || 0) + 1;
    } else {
        // Streak broken
        return 1;
    }
};

module.exports = {
    calculateStreak
};
