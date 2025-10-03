import puppeteer, { ElementHandle } from 'puppeteer';

export interface BookingData {
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

export interface BookingResult {
    success: boolean;
    bookingReference?: string;
    error?: string;
    museumResponse?: any;
}

export class MuseumAutomation {
    private browser: any;
    private page: any;

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        this.page.setDefaultNavigationTimeout(60000);
        this.page.setDefaultTimeout(30000);

        // Set user agent to avoid detection
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

        // Auto-accept dialogs to prevent blocking
        this.page.on('dialog', async (dialog: any) => {
            try { await dialog.dismiss(); } catch { }
        });
    }

    async attemptBooking(bookingData: BookingData): Promise<BookingResult> {
        try {
            await this.initialize();

            // Navigate to museum's official booking site
            // Use env var to switch between mock and production
            const configuredUrl = process.env.MUSEUM_BOOKING_URL;
            const museumUrl = configuredUrl && configuredUrl.trim().length > 0
                ? configuredUrl
                : 'http://localhost:8080/test-museum-site.html';

            await this.page.goto(museumUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // Fill in the booking form
            await this.fillBookingForm(bookingData);

            // Submit the form with better error handling
            try {
                await this.page.click('#submit-booking');

                // Wait for either navigation or result container with better error handling
                await Promise.race([
                    this.page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
                    this.page.waitForSelector('#booking-result', { timeout: 15000 }).catch(() => null),
                    this.page.waitForSelector('.booking-success', { timeout: 15000 }).catch(() => null),
                    this.page.waitForSelector('.booking-error', { timeout: 15000 }).catch(() => null)
                ]);
            } catch (error) {
                console.log('Submit click failed, trying alternative approach:', error);
                // Try clicking with different approach
                await this.page.evaluate(() => {
                    const submitBtn = (document as any).querySelector('#submit-booking');
                    if (submitBtn) {
                        (submitBtn as any).click();
                    }
                }).catch(() => undefined);

                // Wait a bit for any response
                await this.page.waitForTimeout(3000);
            }

            // Check if booking was successful
            const successElement = await this.page.$('.booking-success');
            const errorElement = await this.page.$('.booking-error');

            if (successElement) {
                const bookingRef = await this.page.$eval('.booking-reference', (el: any) => el.textContent);
                return {
                    success: true,
                    bookingReference: bookingRef,
                    museumResponse: await this.page.evaluate(() => {
                        return {
                            status: 'success',
                            timestamp: new Date().toISOString()
                        };
                    })
                };
            } else if (errorElement) {
                const errorMessage = await this.page.$eval('.booking-error', (el: any) => el.textContent);
                return {
                    success: false,
                    error: errorMessage
                };
            }

            return {
                success: false,
                error: 'Unknown booking result'
            };

        } catch (error) {
            return {
                success: false,
                error: `Automation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }

    private async fillBookingForm(bookingData: BookingData) {
        // Fill fields that exist in the mock test page, guard each selector for production site
        const typeIfPresent = async (selector: string, value: string) => {
            const el = await this.page.$(selector);
            if (el) {
                await this.page.click(selector, { clickCount: 3 }).catch(() => undefined);
                await this.page.type(selector, value).catch(() => undefined);
            }
        };
        const selectIfPresent = async (selector: string, value: string) => {
            const el = await this.page.$(selector);
            if (el) {
                await this.page.select(selector, value).catch(() => undefined);
            }
        };

        await typeIfPresent('#visitor-name', bookingData.visitorName);
        await typeIfPresent('#id-number', bookingData.idNumber);
        await selectIfPresent('#id-type', bookingData.idType);

        await selectIfPresent('#museum', bookingData.museum);
        await typeIfPresent('#visit-date', bookingData.visitDate);
        await selectIfPresent('#time-slot', bookingData.timeSlot);

        // If detailed visitor fields exist (not in mock), fill them defensively
        const firstVisitorName = await this.page.$('#visitor-0-name');
        if (firstVisitorName) {
            for (let i = 0; i < bookingData.visitorDetails.length; i++) {
                const visitor = bookingData.visitorDetails[i];
                const nameSel = `#visitor-${i}-name`;
                const idSel = `#visitor-${i}-id`;
                const idTypeSel = `#visitor-${i}-id-type`;
                const ageSel = `#visitor-${i}-age`;

                if (await this.page.$(nameSel)) await typeIfPresent(nameSel, visitor.name);
                if (await this.page.$(idSel)) await typeIfPresent(idSel, visitor.idNumber);
                if (await this.page.$(idTypeSel)) await selectIfPresent(idTypeSel, visitor.idType);
                if (visitor.age && await this.page.$(ageSel)) await typeIfPresent(ageSel, visitor.age.toString());
            }
        }
    }

    async checkAvailability(date: string, timeSlot: string, museum: 'main' | 'qin_han'): Promise<boolean> {
        try {
            await this.initialize();

            const configuredUrl = process.env.MUSEUM_BOOKING_URL;
            const baseUrl = configuredUrl && configuredUrl.trim().length > 0
                ? configuredUrl
                : 'http://localhost:8080/test-museum-site.html';
            const museumUrl = baseUrl.includes('?') ? baseUrl : `${baseUrl}?check=true`;

            await this.page.goto(museumUrl, { waitUntil: 'networkidle2', timeout: 60000 });

            // The mock page reveals availability when ?check=true is present.
            // Wait for the availability container and read the result text.
            await this.page.waitForSelector('#availability-check', { timeout: 15000 }).catch(() => undefined);

            const isAvailable = await this.page.$eval('.availability-result', (el: any) => {
                return el.textContent?.includes('available') || false;
            });

            return isAvailable;

        } catch (error) {
            console.error('Availability check failed:', error);
            return false;
        } finally {
            if (this.browser) {
                await this.browser.close();
            }
        }
    }
}

export const museumAutomation = new MuseumAutomation();
