/**
 * Booking Algorithm — Slot Availability Check with DQN Optimization
 * 
 * Purpose: Check if a requested time slot is available for a salon,
 *          and if not, suggest the best alternative slot using DQN.
 * 
 * Pipeline:
 *   1. Check direct availability for requested slot
 *   2. If unavailable, use DQN to suggest best alternative
 *   3. Handle conflict detection and resolution
 */

const dqnSlot = require('./dqnSlot');

/**
 * Generate available time slots for a salon on a given date
 * 
 * @param {Object} salon - Salon object with operating hours
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {Array} existingBookings - Existing bookings for that date
 * @returns {Array} Available time slots
 */
function generateAvailableSlots(salon, date, existingBookings) {
    const openHour = salon?.openingHour || 9;
    const closeHour = salon?.closingHour || 21;
    const slotDuration = salon?.slotDuration || 1; // in hours

    const bookedTimes = existingBookings
        .filter(b => b.date === date && b.status !== 'cancelled')
        .map(b => b.time);

    const availableSlots = [];

    for (let hour = openHour; hour < closeHour; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        if (!bookedTimes.includes(timeStr)) {
            availableSlots.push({ time: timeStr, hour });
        }
    }

    return availableSlots;
}

/**
 * Booking Algorithm
 * 
 * @param {Array} existingBookings - All bookings for the salon on the date
 * @param {string} requestedDate - The date requested (YYYY-MM-DD)
 * @param {string} requestedTime - The time slot requested (HH:MM)
 * @param {Object} options - Additional options
 * @param {string} options.preferredTime - User's preferred time
 * @param {number} options.serviceDuration - Service duration in hours
 * @param {Object} options.salon - Salon info for generating alternatives
 * @returns {Object} Availability result with potential alternatives
 */
const bookingAlgorithm = (existingBookings, requestedDate, requestedTime, options = {}) => {
    console.log(`📅 Booking Algorithm: Checking ${requestedDate} at ${requestedTime}`);

    // Step 1: Check direct availability
    const conflict = existingBookings.find(booking =>
        booking.date === requestedDate &&
        booking.time === requestedTime &&
        booking.status !== 'cancelled'
    );

    if (!conflict) {
        console.log('   ✅ Slot is available');
        return {
            available: true,
            requestedSlot: { date: requestedDate, time: requestedTime },
            message: 'The requested slot is available.'
        };
    }

    // Step 2: Slot is taken — find alternatives using DQN
    console.log('   ⚠️ Slot is taken — finding alternatives...');

    const availableSlots = generateAvailableSlots(
        options.salon || {},
        requestedDate,
        existingBookings
    );

    if (availableSlots.length === 0) {
        return {
            available: false,
            requestedSlot: { date: requestedDate, time: requestedTime },
            alternatives: [],
            message: 'No available slots for this date. Please try another date.'
        };
    }

    // Step 3: Use DQN to rank alternative slots
    const dqnResult = dqnSlot(availableSlots, {
        preferredTime: requestedTime,
        existingBookings: existingBookings.filter(
            b => b.date === requestedDate && b.status !== 'cancelled'
        ),
        serviceDuration: options.serviceDuration || 1
    });

    // Return top 3 alternatives
    const alternatives = dqnResult.rankedSlots.slice(0, 3).map(s => ({
        time: s.time,
        score: s.qValue
    }));

    return {
        available: false,
        requestedSlot: { date: requestedDate, time: requestedTime },
        suggestedSlot: dqnResult.bestTime,
        alternatives,
        message: `The ${requestedTime} slot is taken. Best alternative: ${dqnResult.bestTime}.`
    };
};

module.exports = bookingAlgorithm;
