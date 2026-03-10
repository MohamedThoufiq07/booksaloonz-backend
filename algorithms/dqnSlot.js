/**
 * DQN (Deep Q-Network) Inspired Slot Selection Algorithm
 * 
 * Purpose: Optimize appointment slot allocation to maximize both salon 
 *          efficiency and user convenience using reinforcement-learning ideas.
 * 
 * Concept:
 *   - Each available slot is a "state" 
 *   - A Q-value is computed for each slot based on multiple reward signals
 *   - The slot with the highest Q-value is recommended
 * 
 * Reward signals:
 *   1. Time-of-day preference (user convenience)
 *   2. Gap minimization (salon efficiency — reduce dead time between bookings)
 *   3. Load balancing (spread bookings evenly)
 *   4. Peak-hour avoidance bonus (incentivize off-peak booking)
 *   5. Buffer time (avoid back-to-back stress)
 */

// Configurable weights for each reward signal (like learned Q-network weights)
const REWARD_WEIGHTS = {
    timePreference: 0.30,    // How well the slot matches user's preferred time
    gapMinimization: 0.25,   // How well it fills gaps in the salon's schedule
    loadBalance: 0.20,       // Even distribution across the day
    peakAvoidance: 0.15,     // Bonus for off-peak slots
    bufferTime: 0.10         // Adequate buffer between appointments
};

// Peak hours (typically busiest)
const PEAK_HOURS = [10, 11, 17, 18, 19]; // 10-11 AM and 5-7 PM

// Off-peak bonus hours
const OFF_PEAK_HOURS = [9, 13, 14, 15, 20]; // Early morning, afternoon

/**
 * Parse a time string to hour (24h format)
 * Supports "09:00", "9:00 AM", "14:30", etc.
 */
function parseTimeToHour(timeStr) {
    if (!timeStr) return 12;

    const cleaned = timeStr.toString().trim().toUpperCase();

    // Handle "HH:MM AM/PM" format
    const ampmMatch = cleaned.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/);
    if (ampmMatch) {
        let hour = parseInt(ampmMatch[1]);
        if (ampmMatch[3] === 'PM' && hour !== 12) hour += 12;
        if (ampmMatch[3] === 'AM' && hour === 12) hour = 0;
        return hour;
    }

    // Handle "HH:MM" 24h format
    const h24Match = cleaned.match(/(\d{1,2}):(\d{2})/);
    if (h24Match) {
        return parseInt(h24Match[1]);
    }

    return parseInt(cleaned) || 12;
}

/**
 * Calculate Time Preference Reward
 * Higher reward for slots closer to user's preferred time
 */
function timePreferenceReward(slotHour, preferredHour) {
    if (!preferredHour && preferredHour !== 0) return 0.5; // neutral if no preference

    const diff = Math.abs(slotHour - preferredHour);
    // Gaussian-like decay: perfect match = 1.0, 4+ hours away = ~0
    return Math.exp(-(diff * diff) / 8);
}

/**
 * Calculate Gap Minimization Reward
 * Higher reward for slots that reduce gaps in existing schedule
 */
function gapMinimizationReward(slotHour, existingBookingHours) {
    if (!existingBookingHours || existingBookingHours.length === 0) return 0.5;

    // Find closest existing booking
    const closestGap = Math.min(
        ...existingBookingHours.map(h => Math.abs(slotHour - h))
    );

    // Ideal gap is 1-2 hours (adjacent but not overlapping)
    if (closestGap >= 1 && closestGap <= 2) return 1.0;
    if (closestGap === 0) return 0.0; // conflict
    if (closestGap <= 3) return 0.7;

    // Large gap — less efficient
    return Math.max(0.1, 1 - (closestGap / 10));
}

/**
 * Calculate Load Balance Reward
 * Higher reward for slots in time blocks with fewer bookings
 */
function loadBalanceReward(slotHour, existingBookingHours, totalSlots) {
    if (!existingBookingHours || existingBookingHours.length === 0) return 1.0;

    // Divide day into 4 blocks: morning (9-12), afternoon (12-15), evening (15-18), night (18-21)
    const getBlock = (h) => {
        if (h < 12) return 'morning';
        if (h < 15) return 'afternoon';
        if (h < 18) return 'evening';
        return 'night';
    };

    const slotBlock = getBlock(slotHour);
    const blockCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    existingBookingHours.forEach(h => {
        blockCounts[getBlock(h)]++;
    });

    // Reward is inversely proportional to current block load
    const maxLoad = Math.max(...Object.values(blockCounts), 1);
    return 1 - (blockCounts[slotBlock] / (maxLoad + 1));
}

/**
 * Calculate Peak Avoidance Reward
 * Incentivize off-peak bookings to spread demand
 */
function peakAvoidanceReward(slotHour) {
    if (OFF_PEAK_HOURS.includes(slotHour)) return 1.0;
    if (PEAK_HOURS.includes(slotHour)) return 0.2;
    return 0.6; // neutral hours
}

/**
 * Calculate Buffer Time Reward
 * Ensure adequate time between appointments
 */
function bufferTimeReward(slotHour, existingBookingHours, serviceDuration = 1) {
    if (!existingBookingHours || existingBookingHours.length === 0) return 1.0;

    const minGap = Math.min(
        ...existingBookingHours.map(h => Math.abs(slotHour - h))
    );

    // Need at least serviceDuration gap
    if (minGap < serviceDuration) return 0.0;
    if (minGap >= serviceDuration + 0.5) return 1.0;
    return 0.5;
}

/**
 * Calculate the total Q-value for a slot
 */
function calculateQValue(slot, context) {
    const slotHour = parseTimeToHour(slot.time || slot);

    const rewards = {
        timePreference: timePreferenceReward(slotHour, context.preferredHour),
        gapMinimization: gapMinimizationReward(slotHour, context.existingHours),
        loadBalance: loadBalanceReward(slotHour, context.existingHours, context.totalSlots),
        peakAvoidance: peakAvoidanceReward(slotHour),
        bufferTime: bufferTimeReward(slotHour, context.existingHours, context.serviceDuration)
    };

    // Weighted sum of rewards (Q-value)
    let qValue = 0;
    for (const [signal, weight] of Object.entries(REWARD_WEIGHTS)) {
        qValue += rewards[signal] * weight;
    }

    return {
        qValue: Math.round(qValue * 1000) / 1000,
        rewards
    };
}

/**
 * DQN Slot Selection
 * 
 * @param {Array} availableSlots - Array of available time slots (strings or objects with .time)
 * @param {Object} bookingRequest - Booking context
 * @param {string} bookingRequest.preferredTime - User's preferred time
 * @param {Array} bookingRequest.existingBookings - Current bookings for the day
 * @param {number} bookingRequest.serviceDuration - Duration of requested service in hours
 * @returns {Object} Best slot with Q-value and all ranked slots
 */
const dqnSlot = (availableSlots, bookingRequest = {}) => {
    if (!Array.isArray(availableSlots) || availableSlots.length === 0) {
        console.log('⚠️ DQN Slot: No available slots');
        return { bestSlot: null, rankedSlots: [] };
    }

    console.log(`🧠 DQN Slot: Evaluating ${availableSlots.length} available slots...`);

    // Build context from booking request
    const context = {
        preferredHour: bookingRequest.preferredTime
            ? parseTimeToHour(bookingRequest.preferredTime)
            : null,
        existingHours: (bookingRequest.existingBookings || [])
            .map(b => parseTimeToHour(b.time || b)),
        totalSlots: availableSlots.length,
        serviceDuration: bookingRequest.serviceDuration || 1
    };

    // Calculate Q-value for each slot
    const rankedSlots = availableSlots.map(slot => {
        const slotTime = typeof slot === 'string' ? slot : slot.time || slot;
        const { qValue, rewards } = calculateQValue(slot, context);

        return {
            slot: slotTime,
            qValue,
            rewards,
            originalSlot: slot
        };
    });

    // Sort by Q-value descending (best first)
    rankedSlots.sort((a, b) => b.qValue - a.qValue);

    const bestSlot = rankedSlots[0];
    console.log(`   ✅ Best slot: ${bestSlot.slot} (Q-value: ${bestSlot.qValue})`);

    return {
        bestSlot: bestSlot.originalSlot,
        bestTime: bestSlot.slot,
        qValue: bestSlot.qValue,
        rankedSlots: rankedSlots.map(s => ({
            time: s.slot,
            qValue: s.qValue,
            rewards: s.rewards
        }))
    };
};

module.exports = dqnSlot;
