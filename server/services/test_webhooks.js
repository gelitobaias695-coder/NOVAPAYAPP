import { sendPostback } from './utmifyService.js';
import { sendOrderConfirmation } from './emailService.js';

async function test() {
    console.log("Testing UTMify Postback...");
    await sendPostback('715b2375-71c2-4c49-9984-9119c7338482');
    console.log("Testing Email Sending...");
    await sendOrderConfirmation('715b2375-71c2-4c49-9984-9119c7338482');
}
test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
