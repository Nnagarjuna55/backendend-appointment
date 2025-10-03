const { museumAutomation } = require('./dist/services/museumAutomation');

async function testAutomation() {
    console.log('Testing museum automation...');

    try {
        // Test availability check
        console.log('Checking availability...');
        const isAvailable = await museumAutomation.checkAvailability(
            '2025-01-15',
            '8:30-10:30',
            'main'
        );
        console.log('Availability result:', isAvailable);

        // Test booking attempt
        console.log('Attempting booking...');
        const bookingResult = await museumAutomation.attemptBooking({
            visitorName: 'Test User',
            idNumber: '123456789',
            idType: 'id_card',
            museum: 'main',
            visitDate: '2025-01-15',
            timeSlot: '8:30-10:30',
            visitorDetails: [{
                name: 'Test User',
                idNumber: '123456789',
                idType: 'id_card',
                age: 25
            }]
        });

        console.log('Booking result:', bookingResult);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testAutomation();
