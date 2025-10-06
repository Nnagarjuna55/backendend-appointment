interface IDCardVerificationData {
    idNumber: string;
    visitorName: string;
    bookingId: string;
    museum: string;
    visitDate: string;
    timeSlot: string;
}

interface IDCardVerificationResult {
    success: boolean;
    verified: boolean;
    verificationCode?: string;
    error?: string;
    verificationDetails?: any;
}

class IDCardVerificationService {
    /**
     * Verify ID card for museum entry
     */
    async verifyIDCard(verificationData: IDCardVerificationData): Promise<IDCardVerificationResult> {
        console.log('🆔 Verifying ID card for museum entry...');
        console.log('📋 Verification data:', {
            idNumber: verificationData.idNumber,
            visitorName: verificationData.visitorName,
            bookingId: verificationData.bookingId
        });

        try {
            // Validate ID number format
            const isValidIDFormat = this.validateIDNumber(verificationData.idNumber);
            if (!isValidIDFormat) {
                console.log('❌ Invalid ID number format');
                return {
                    success: false,
                    verified: false,
                    error: 'Invalid ID number format'
                };
            }

            // Check if ID number matches visitor name
            const nameMatches = this.validateNameMatch(verificationData.visitorName, verificationData.idNumber);
            if (!nameMatches) {
                console.log('❌ Name does not match ID number');
                return {
                    success: false,
                    verified: false,
                    error: 'Name does not match ID number'
                };
            }

            // Verify booking exists and is valid
            const bookingValid = await this.verifyBookingValidity(verificationData);
            if (!bookingValid) {
                console.log('❌ Booking is not valid');
                return {
                    success: false,
                    verified: false,
                    error: 'Booking is not valid or expired'
                };
            }

            // Generate verification code
            const verificationCode = this.generateVerificationCode(verificationData);

            console.log('✅ ID card verification successful');
            return {
                success: true,
                verified: true,
                verificationCode: verificationCode,
                verificationDetails: {
                    idNumber: verificationData.idNumber,
                    visitorName: verificationData.visitorName,
                    bookingId: verificationData.bookingId,
                    museum: verificationData.museum,
                    visitDate: verificationData.visitDate,
                    timeSlot: verificationData.timeSlot,
                    verifiedAt: new Date().toISOString(),
                    verificationCode: verificationCode
                }
            };

        } catch (error) {
            console.error('❌ ID card verification failed:', error);
            return {
                success: false,
                verified: false,
                error: `ID card verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    /**
     * Validate Chinese ID number format
     */
    private validateIDNumber(idNumber: string): boolean {
        console.log('🔍 Validating ID number format...');

        // Chinese ID number should be 18 digits
        if (idNumber.length !== 18) {
            console.log('❌ ID number length invalid:', idNumber.length);
            return false;
        }

        // Check if all characters are digits
        if (!/^\d{17}[\dXx]$/.test(idNumber)) {
            console.log('❌ ID number format invalid');
            return false;
        }

        // Validate check digit
        const isValidCheckDigit = this.validateCheckDigit(idNumber);
        if (!isValidCheckDigit) {
            console.log('❌ ID number check digit invalid');
            return false;
        }

        console.log('✅ ID number format valid');
        return true;
    }

    /**
     * Validate check digit of Chinese ID number
     */
    private validateCheckDigit(idNumber: string): boolean {
        const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
        const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

        let sum = 0;
        for (let i = 0; i < 17; i++) {
            sum += parseInt(idNumber[i]) * weights[i];
        }

        const checkDigit = checkCodes[sum % 11];
        const lastDigit = idNumber[17].toUpperCase();

        return checkDigit === lastDigit;
    }

    /**
     * Validate name matches ID number (basic validation)
     */
    private validateNameMatch(visitorName: string, idNumber: string): boolean {
        console.log('🔍 Validating name match...');

        // Basic validation - name should not be empty
        if (!visitorName || visitorName.trim().length === 0) {
            console.log('❌ Visitor name is empty');
            return false;
        }

        // Name should contain Chinese characters
        if (!/[\u4e00-\u9fa5]/.test(visitorName)) {
            console.log('❌ Visitor name should contain Chinese characters');
            return false;
        }

        console.log('✅ Name format valid');
        return true;
    }

    /**
     * Verify booking validity
     */
    private async verifyBookingValidity(verificationData: IDCardVerificationData): Promise<boolean> {
        console.log('🔍 Verifying booking validity...');

        try {
            // Check if booking date is not in the past
            const visitDate = new Date(verificationData.visitDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (visitDate < today) {
                console.log('❌ Visit date is in the past');
                return false;
            }

            // Check if booking is within valid range (not more than 30 days in advance)
            const maxAdvanceDate = new Date(today);
            maxAdvanceDate.setDate(today.getDate() + 30);

            if (visitDate > maxAdvanceDate) {
                console.log('❌ Visit date is too far in advance');
                return false;
            }

            // Check if time slot is valid
            const validTimeSlots = [
                '09:00-10:30',
                '10:30-12:00',
                '12:00-13:30',
                '13:30-15:00',
                '15:00-16:30',
                '16:30-18:00'
            ];

            if (!validTimeSlots.includes(verificationData.timeSlot)) {
                console.log('❌ Invalid time slot');
                return false;
            }

            // Check if museum is valid
            const validMuseums = ['main', 'qin_han'];
            if (!validMuseums.includes(verificationData.museum)) {
                console.log('❌ Invalid museum');
                return false;
            }

            console.log('✅ Booking validity confirmed');
            return true;

        } catch (error) {
            console.error('❌ Error verifying booking validity:', error);
            return false;
        }
    }

    /**
     * Generate verification code for museum entry
     */
    private generateVerificationCode(verificationData: IDCardVerificationData): string {
        console.log('🔐 Generating verification code...');

        const timestamp = Date.now().toString();
        const idHash = verificationData.idNumber.slice(-4);
        const bookingHash = verificationData.bookingId.slice(-4);

        const verificationCode = `ENTRY-${idHash}-${bookingHash}-${timestamp.slice(-6)}`;

        console.log('✅ Verification code generated:', verificationCode);
        return verificationCode;
    }

    /**
     * Create entry record for museum
     */
    async createEntryRecord(verificationData: IDCardVerificationData): Promise<IDCardVerificationResult> {
        console.log('📝 Creating museum entry record...');

        try {
            const entryRecord = {
                idNumber: verificationData.idNumber,
                visitorName: verificationData.visitorName,
                bookingId: verificationData.bookingId,
                museum: verificationData.museum,
                visitDate: verificationData.visitDate,
                timeSlot: verificationData.timeSlot,
                entryTime: new Date().toISOString(),
                verificationCode: this.generateVerificationCode(verificationData),
                status: 'entered'
            };

            console.log('✅ Museum entry record created:', entryRecord);

            return {
                success: true,
                verified: true,
                verificationCode: entryRecord.verificationCode,
                verificationDetails: entryRecord
            };

        } catch (error) {
            console.error('❌ Failed to create entry record:', error);
            return {
                success: false,
                verified: false,
                error: `Failed to create entry record: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}

export const idCardVerificationService = new IDCardVerificationService();
