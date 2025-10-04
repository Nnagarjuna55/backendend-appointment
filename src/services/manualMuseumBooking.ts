import fs from 'fs';
import path from 'path';

interface BookingRecord {
    id: string;
    timestamp: string;
    status: string;
    data: ManualBookingData;
    instructions?: string;
    officialReference?: string;
    updatedAt?: string;
}

export interface ManualBookingData {
    visitorName: string;
    idNumber: string;
    idType: string;
    museum: 'main' | 'qin_han';
    visitDate: string;
    timeSlot: string;
    visitorDetails: Array<{
        name: string;
        idNumber: string;
        idType: string;
        age?: number;
    }>;
}

export interface ManualBookingResult {
    success: boolean;
    bookingReference?: string;
    error?: string;
    instructions?: string;
}

export class ManualMuseumBooking {
    private bookingLogPath = path.join(process.cwd(), 'museum-bookings.json');

    async attemptBooking(bookingData: ManualBookingData): Promise<ManualBookingResult> {
        try {
            console.log('Manual booking process initiated...');

            // Create booking record for manual processing
            const bookingRecord = {
                id: `MANUAL-${Date.now()}`,
                timestamp: new Date().toISOString(),
                status: 'pending_manual_booking',
                data: bookingData,
                instructions: this.generateBookingInstructions(bookingData)
            };

            // Save to log file
            await this.saveBookingRecord(bookingRecord);

            return {
                success: true,
                bookingReference: bookingRecord.id,
                instructions: bookingRecord.instructions
            };

        } catch (error) {
            return {
                success: false,
                error: `Manual booking failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private generateBookingInstructions(bookingData: ManualBookingData): string {
        const museumName = bookingData.museum === 'main'
            ? 'Shaanxi History Museum (Xiaozhai East Road, Yanta District Number 91)'
            : 'Qin and Han Dynasties Museum of Shaanxi History Museum (East Section of lan chi 3rd Road of Qin and Han Dynasties New City of Xi\'an-Xian New Area)';

        return `
MANUAL BOOKING INSTRUCTIONS
============================

Museum: ${museumName}
Date: ${bookingData.visitDate}
Time Slot: ${bookingData.timeSlot}

Visitor Information:
- Name: ${bookingData.visitorName}
- ID Number: ${bookingData.idNumber}
- ID Type: ${bookingData.idType}

Additional Visitors:
${bookingData.visitorDetails.map((visitor, index) => `
${index + 1}. Name: ${visitor.name}
   ID: ${visitor.idNumber}
   Type: ${visitor.idType}
   Age: ${visitor.age || 'Not specified'}
`).join('')}

STEPS TO COMPLETE BOOKING:
1. Go to museum's official WeChat account
2. Navigate to ticket reservation system
3. Select visit date: ${bookingData.visitDate}
4. Select time slot: ${bookingData.timeSlot}
5. Add visitor information as listed above
6. Complete the booking process
7. Note the booking reference number
8. Update this record with the official booking reference

BOOKING REFERENCE: MANUAL-${Date.now()}
STATUS: Pending manual completion
        `.trim();
    }

    private async saveBookingRecord(record: any): Promise<void> {
        try {
            let bookings = [];

            // Read existing bookings
            if (fs.existsSync(this.bookingLogPath)) {
                const data = fs.readFileSync(this.bookingLogPath, 'utf8');
                bookings = JSON.parse(data);
            }

            // Add new booking
            bookings.push(record);

            // Save updated bookings
            fs.writeFileSync(this.bookingLogPath, JSON.stringify(bookings, null, 2));

            console.log('Booking record saved for manual processing');
        } catch (error) {
            console.error('Failed to save booking record:', error);
            throw error;
        }
    }

    async getPendingBookings(): Promise<BookingRecord[]> {
        try {
            if (!fs.existsSync(this.bookingLogPath)) {
                return [];
            }

            const data = fs.readFileSync(this.bookingLogPath, 'utf8');
            const bookings: BookingRecord[] = JSON.parse(data);

            return bookings.filter((booking: BookingRecord) => booking.status === 'pending_manual_booking');
        } catch (error) {
            console.error('Failed to get pending bookings:', error);
            return [];
        }
    }

    async updateBookingStatus(bookingId: string, status: string, officialReference?: string): Promise<void> {
        try {
            if (!fs.existsSync(this.bookingLogPath)) {
                throw new Error('Booking log file not found');
            }

            const data = fs.readFileSync(this.bookingLogPath, 'utf8');
            const bookings: BookingRecord[] = JSON.parse(data);

            const booking = bookings.find((b: BookingRecord) => b.id === bookingId);
            if (booking) {
                booking.status = status;
                if (officialReference) {
                    booking.officialReference = officialReference;
                }
                booking.updatedAt = new Date().toISOString();
            }

            fs.writeFileSync(this.bookingLogPath, JSON.stringify(bookings, null, 2));
            console.log(`Booking ${bookingId} status updated to ${status}`);
        } catch (error) {
            console.error('Failed to update booking status:', error);
            throw error;
        }
    }
}

export const manualMuseumBooking = new ManualMuseumBooking();
