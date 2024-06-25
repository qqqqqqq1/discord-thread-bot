const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Function to take screenshot of a specific element
async function takeElementScreenshot(page, selector, outputFilePath) {
    const element = await page.$(selector);
    if (!element) {
        throw new Error(`Element with selector ${selector} not found`);
    }

    const boundingBox = await element.boundingBox();
    if (!boundingBox) {
        throw new Error(`Failed to get bounding box of element ${selector}`);
    }

    await page.screenshot({
        path: outputFilePath,
        clip: {
            x: boundingBox.x,
            y: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height
        }
    });

    console.log(`Screenshot saved to ${outputFilePath}`);
}

// Main function
async function main() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        const videoUrl = 'https://www.youtube.com/watch?v=dPTTMvUm9uA';
        await page.goto(videoUrl);

        // Wait for the video player element to be present (adjust selector as needed)
        const videoSelector = 'video.html5-main-video';
        await page.waitForSelector(videoSelector);

        // Loop to take screenshots every 30 minutes
        const intervalMinutes = 30;
        setInterval(async () => {
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
            const screenshotPath = path.join(__dirname, `screenshot_${timestamp}.png`);

            try {
                await takeElementScreenshot(page, videoSelector, screenshotPath);
            } catch (error) {
                console.error(`Error taking screenshot: ${error}`);
            }
        }, intervalMinutes * 60 * 1000);

    } catch (error) {
        console.error(`Error: ${error}`);
    } finally {
        await browser.close();
    }
}

// Run the main function
main();
