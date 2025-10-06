import { ClientPlaceBooking, IClientPlaceBooking } from '../models/ClientPlaceBooking';
import { museumAutomation } from './museumAutomation';

export interface ClientPlaceBookingData {
    bookingId: string;
    visitorName: string;
    idNumber: string;
    idType: string;
    museum: 'main' | 'qin_han';
    visitDate: Date;
    timeSlot: string;
    numberOfVisitors: number;
    visitorDetails: Array<{
        name: string;
        idNumber: string;
        idType: string;
        age?: number;
    }>;
}

export interface ClientPlaceResult {
    success: boolean;
    clientPlaceBooking?: IClientPlaceBooking;
    museumBookingId?: string;
    confirmationCode?: string;
    error?: string;
    clientPlaceResponse?: any;
}

class ClientPlaceStorageService {

    // Store booking in client place database
    async storeClientPlaceBooking(bookingData: ClientPlaceBookingData): Promise<ClientPlaceResult> {
        console.log('💾 Storing booking in client place database...');

        try {
            // Generate unique identifiers
            const museumBookingId = this.generateMuseumBookingId(bookingData.museum);
            const confirmationCode = this.generateConfirmationCode();

            // Create client place booking record
            const clientPlaceBooking = new ClientPlaceBooking({
                bookingId: bookingData.bookingId,
                museumBookingId: museumBookingId,
                confirmationCode: confirmationCode,
                visitorName: bookingData.visitorName,
                idNumber: bookingData.idNumber,
                idType: bookingData.idType,
                museum: bookingData.museum,
                visitDate: bookingData.visitDate,
                timeSlot: bookingData.timeSlot,
                numberOfVisitors: bookingData.numberOfVisitors,
                clientPlaceStatus: 'pending',
                museumPlatform: 'ticket.sxhm.com',
                museumUrl: 'https://ticket.sxhm.com/quickticket/index.html#/',
                verificationAttempts: 0
            });

            // Save to database
            await clientPlaceBooking.save();
            console.log('✅ Client place booking record created in database');

            return {
                success: true,
                clientPlaceBooking: clientPlaceBooking,
                museumBookingId: museumBookingId,
                confirmationCode: confirmationCode
            };

        } catch (error) {
            console.error('❌ Failed to store client place booking:', error);
            return {
                success: false,
                error: `Failed to store client place booking: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    // Attempt to book in museum system and store result
    async bookInMuseumSystem(bookingData: ClientPlaceBookingData): Promise<ClientPlaceResult> {
        console.log('🎯 Attempting to book in museum system...');

        try {
            // First, store in our client place database
            const storageResult = await this.storeClientPlaceBooking(bookingData);
            if (!storageResult.success) {
                return storageResult;
            }

            const clientPlaceBooking = storageResult.clientPlaceBooking!;

            // Attempt museum booking through NEW working integration
            console.log('🏛️ Creating REAL museum booking with working integration...');
            const { workingMuseumIntegration } = await import('./workingMuseumIntegration');
            const museumResult = await workingMuseumIntegration.createRealMuseumBooking({
                visitorName: bookingData.visitorName,
                idNumber: bookingData.idNumber,
                idType: bookingData.idType,
                museum: bookingData.museum as 'main' | 'qin_han',
                visitDate: bookingData.visitDate.toISOString().split('T')[0],
                timeSlot: bookingData.timeSlot,
                visitorDetails: bookingData.visitorDetails
            });

            if (museumResult.success) {
                // Update client place booking with museum response
                clientPlaceBooking.clientPlaceStatus = 'confirmed';
                clientPlaceBooking.clientPlaceResponse = museumResult;
                clientPlaceBooking.museumResponse = {
                    museumBookingId: museumResult.museumBookingId,
                    confirmationCode: museumResult.confirmationCode,
                    wechatVerificationUrl: museumResult.wechatVerificationUrl,
                    status: 'real_booking',
                    timestamp: new Date().toISOString(),
                    note: 'Real museum booking created with working integration'
                };
                clientPlaceBooking.verifiedAt = new Date();

                await clientPlaceBooking.save();
                console.log('✅ Museum booking successful, client place updated');

                return {
                    success: true,
                    clientPlaceBooking: clientPlaceBooking,
                    museumBookingId: clientPlaceBooking.museumBookingId,
                    confirmationCode: clientPlaceBooking.confirmationCode,
                    clientPlaceResponse: museumResult
                };
            } else {
                // Update status to failed
                clientPlaceBooking.clientPlaceStatus = 'failed';
                clientPlaceBooking.clientPlaceResponse = museumResult;

                await clientPlaceBooking.save();
                console.log('❌ Museum booking failed, client place updated');

                return {
                    success: false,
                    clientPlaceBooking: clientPlaceBooking,
                    error: museumResult.error || 'Museum booking failed'
                };
            }

        } catch (error) {
            console.error('❌ Museum system booking failed:', error);
            return {
                success: false,
                error: `Museum system booking failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    // Verify booking exists in client place
    async verifyClientPlaceBooking(bookingId: string): Promise<ClientPlaceResult> {
        console.log('🔍 Verifying client place booking...');

        try {
            const clientPlaceBooking = await ClientPlaceBooking.findOne({ bookingId });

            if (!clientPlaceBooking) {
                return {
                    success: false,
                    error: 'Client place booking not found'
                };
            }

            // Update verification attempt
            clientPlaceBooking.verificationAttempts += 1;
            clientPlaceBooking.lastVerificationAttempt = new Date();

            // Attempt to verify with museum system
            const verificationResult = await museumAutomation.verifyBookingInClientPlace(
                clientPlaceBooking.museumBookingId,
                clientPlaceBooking.visitorName,
                clientPlaceBooking.idNumber
            );

            if (verificationResult) {
                clientPlaceBooking.clientPlaceStatus = 'verified';
                clientPlaceBooking.verifiedAt = new Date();
                await clientPlaceBooking.save();

                console.log('✅ Client place booking verified');

                return {
                    success: true,
                    clientPlaceBooking: clientPlaceBooking,
                    museumBookingId: clientPlaceBooking.museumBookingId,
                    confirmationCode: clientPlaceBooking.confirmationCode
                };
            } else {
                await clientPlaceBooking.save();

                return {
                    success: false,
                    clientPlaceBooking: clientPlaceBooking,
                    error: 'Booking not found in museum system'
                };
            }

        } catch (error) {
            console.error('❌ Client place verification failed:', error);
            return {
                success: false,
                error: `Client place verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    // Get all client place bookings
    async getClientPlaceBookings(filters?: {
        status?: string;
        museum?: string;
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<IClientPlaceBooking[]> {
        console.log('📋 Retrieving client place bookings...');

        try {
            const query: any = {};

            if (filters?.status) {
                query.clientPlaceStatus = filters.status;
            }

            if (filters?.museum) {
                query.museum = filters.museum;
            }

            if (filters?.dateFrom || filters?.dateTo) {
                query.visitDate = {};
                if (filters.dateFrom) {
                    query.visitDate.$gte = filters.dateFrom;
                }
                if (filters.dateTo) {
                    query.visitDate.$lte = filters.dateTo;
                }
            }

            const bookings = await ClientPlaceBooking.find(query)
                .sort({ createdAt: -1 })
                .lean();

            console.log(`✅ Retrieved ${bookings.length} client place bookings`);
            return bookings;

        } catch (error) {
            console.error('❌ Failed to retrieve client place bookings:', error);
            return [];
        }
    }

    // Get client place booking by ID
    async getClientPlaceBookingById(bookingId: string): Promise<IClientPlaceBooking | null> {
        console.log(`🔍 Retrieving client place booking: ${bookingId}`);

        try {
            const booking = await ClientPlaceBooking.findOne({ bookingId }).lean();

            if (booking) {
                console.log('✅ Client place booking found');
            } else {
                console.log('❌ Client place booking not found');
            }

            return booking;

        } catch (error) {
            console.error('❌ Failed to retrieve client place booking:', error);
            return null;
        }
    }

    // Update client place booking status
    async updateClientPlaceBookingStatus(
        bookingId: string,
        status: 'pending' | 'confirmed' | 'failed' | 'verified',
        clientPlaceResponse?: any
    ): Promise<boolean> {
        console.log(`🔄 Updating client place booking status: ${bookingId} -> ${status}`);

        try {
            const updateData: any = {
                clientPlaceStatus: status,
                updatedAt: new Date()
            };

            if (clientPlaceResponse) {
                updateData.clientPlaceResponse = clientPlaceResponse;
            }

            if (status === 'verified') {
                updateData.verifiedAt = new Date();
            }

            const result = await ClientPlaceBooking.updateOne(
                { bookingId },
                updateData
            );

            if (result.modifiedCount > 0) {
                console.log('✅ Client place booking status updated');
                return true;
            } else {
                console.log('❌ Client place booking not found or not updated');
                return false;
            }

        } catch (error) {
            console.error('❌ Failed to update client place booking status:', error);
            return false;
        }
    }

    // Generate museum booking ID
    private generateMuseumBookingId(museum: string): string {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const museumPrefix = museum === 'main' ? 'SM' : 'QH';
        return `${museumPrefix}${timestamp.slice(-6)}${random}`;
    }

    // Generate confirmation code
    private generateConfirmationCode(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `CONFIRM${timestamp}${random}`;
    }
}

export const clientPlaceStorageService = new ClientPlaceStorageService();
