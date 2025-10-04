const { museumAutomation } = require('./src/services/museumAutomation');

async function testClientPlaceIntegration() {
    console.log('🧪 Testing comprehensive client place integration...');

    const testBookingData = {
        visitorName: 'Test User',
        idNumber: '123456789012345678',
        idType: 'id_card',
        museum: 'main',
        visitDate: '2025-10-09',
        timeSlot: '16:30-18:00',
        visitorDetails: [
            { name: 'Test User', idNumber: '123456789012345678', idType: 'id_card' }
        ]
    };

    try {
        console.log('🎯 Calling implementClientPlaceIntegration...');
        const result = await museumAutomation.implementClientPlaceIntegration(testBookingData);

        console.log('📊 Result:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('✅ Client place integration test PASSED');
            console.log('📋 Booking Reference:', result.bookingReference);
            console.log('🏛️ Museum Response:', result.museumResponse);
        } else {
            console.log('❌ Client place integration test FAILED');
            console.log('🚨 Error:', result.error);
        }
    } catch (error) {
        console.error('💥 Test failed with error:', error.message);
    }
}

testClientPlaceIntegration();
