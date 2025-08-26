import puppeteer from 'puppeteer';
export async function video_search(query, options = {}) {
    let browser = null;
    try {
        console.log(`Starting video search for query: "${query}"`);
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        const searchUrl = `https://www.bing.com/videos/search?q=${encodeURIComponent(query)}`;
        console.log(`Navigating to ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        console.log('Waiting for search results to load...');
        await page.waitForSelector('.mc_vtvc', { timeout: 10000 });
        console.log('Search results loaded.');
        const results = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('.mc_vtvc').forEach(element => {
                const titleElement = element.querySelector('.mc_vtvc_title');
                const urlContainer = element.querySelector('.mc_vtvc_con_rc');
                const thumbnailElement = element.querySelector('.rms_img');
                const title = titleElement ? titleElement.innerText.trim() : 'No title found';
                const url = urlContainer ? urlContainer.getAttribute('ourl') : null;
                const thumbnail = thumbnailElement ? thumbnailElement.src : null;
                if (url && title && thumbnail) {
                    items.push({ title, url, thumbnail });
                }
            });
            return items;
        });
        console.log(`Found ${results.length} results with thumbnails.`);
        if (results.length === 0) {
            return `No video results found for "${query}".`;
        }
        return JSON.stringify(results.slice(0, options.maxResults || 10));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error during video search:', errorMessage);
        return `Error searching for videos: ${errorMessage}`;
    }
    finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed.');
        }
    }
}
export async function video_search_alternative(query, maxResults = 20) {
    try {
        // This can be another implementation, maybe for a different site
        return `This is an alternative video search for "${query}". (Not implemented yet)`;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return `Error in alternative video search: ${errorMessage}`;
    }
}
