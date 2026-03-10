const Booking = require('../models/Booking');

/**
 * Generate time slots for a salon
 * @param {string} openTime - e.g. "09:00"
 * @param {string} closeTime - e.g. "21:00"
 * @param {number} duration - slot duration in minutes (default 30)
 * @returns {string[]} - array of time slots like ["09:00", "09:30", ...]
 */
const generateTimeSlots = (openTime = '09:00', closeTime = '21:00', duration = 30) => {
    const slots = [];
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);

    let currentMinutes = openH * 60 + openM;
    const endMinutes = closeH * 60 + closeM;

    while (currentMinutes + duration <= endMinutes) {
        const hours24 = Math.floor(currentMinutes / 60);
        const mins = currentMinutes % 60;
        // Convert to 12-hour AM/PM format
        const period = hours24 >= 12 ? 'PM' : 'AM';
        const hours12 = hours24 % 12 || 12;
        slots.push(`${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`);
        currentMinutes += duration;
    }

    return slots;
};

/**
 * Get booked slots for a salon on a specific date
 * @param {string} salonId
 * @param {string} date - format: "YYYY-MM-DD"
 * @returns {string[]} - array of booked time strings
 */
const getBookedSlots = async (salonId, date) => {
    const bookings = await Booking.find({
        salon: salonId,
        date: date,
        status: { $in: ['pending', 'confirmed'] }
    }).select('time').lean();

    return bookings.map(b => b.time);
};

/**
 * Get available slots for a salon on a specific date
 * @param {string} salonId
 * @param {string} date
 * @param {object} openingHours - { open: "09:00", close: "21:00" }
 * @returns {object[]} - array of { time, available }
 */
const getAvailableSlots = async (salonId, date, openingHours = {}) => {
    const allSlots = generateTimeSlots(openingHours.open, openingHours.close);
    const bookedSlots = await getBookedSlots(salonId, date);

    // Also disable past time slots for today
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return allSlots.map(slot => {
        // Parse 12-hour AM/PM format (e.g. "02:00 PM")
        const parts = slot.match(/(\d+):(\d+)\s*(AM|PM)/i);
        let h = parseInt(parts[1]);
        const m = parseInt(parts[2]);
        const period = parts[3].toUpperCase();
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        const slotMinutes = h * 60 + m;

        let available = !bookedSlots.includes(slot);

        // If the date is today, disable past slots
        if (date === today && slotMinutes <= currentMinutes) {
            available = false;
        }

        return { time: slot, available };
    });
};

/**
 * Check if a specific slot is available (prevents double booking)
 * @param {string} salonId
 * @param {string} date
 * @param {string} time
 * @returns {boolean}
 */
const isSlotAvailable = async (salonId, date, time) => {
    const existingBooking = await Booking.findOne({
        salon: salonId,
        date: date,
        time: time,
        status: { $in: ['pending', 'confirmed'] }
    });
    return !existingBooking;
};

module.exports = {
    generateTimeSlots,
    getBookedSlots,
    getAvailableSlots,
    isSlotAvailable
};
