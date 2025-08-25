import puppeteer from 'puppeteer';
export async function video_search(query, options = {}) {
    let browser = null;
    try {
        console.log(`Starting video search for query: "${query}"`);
        browser = await puppeteer.launch({
            // Headless: true is default, but being explicit is good.
            // Sandbox arguments are often needed in containerized environments.
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();
        // Go to Bing and search for videos
        const searchUrl = `https://www.bing.com/videos/search?q=${encodeURIComponent(query)}`;
        console.log(`Navigating to ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        // Wait for the results to load
        console.log('Waiting for search results to load...');
        try {
            // This is the correct selector for video result tiles on Bing.
            await page.waitForSelector('.mc_vtvc', { timeout: 10000 });
            console.log('Search results loaded.');
        }
        catch (e) {
            console.error("Failed to find selector '.mc_vtvc' on Bing. Dumping page HTML for debugging...");
            const pageContent = await page.content();
            console.log(pageContent);
            throw new Error("Failed to find the video results container element on the page.");
        }
        // Extract the search results
        const results = await page.evaluate(() => {
            const items = [];
            // Select all video result containers
            document.querySelectorAll('.mc_vtvc').forEach(element => {
                const titleElement = element.querySelector('.mc_vtvc_title');
                // The real URL is in the 'ourl' attribute of this div
                const urlContainer = element.querySelector('.mc_vtvc_con_rc');
                const title = titleElement ? titleElement.innerText.trim() : 'No title found';
                const url = urlContainer ? urlContainer.getAttribute('ourl') : null;
                if (url) {
                    items.push({ title, url });
                }
            });
            return items;
        });
        console.log(`Found ${results.length} results.`);
        if (results.length === 0) {
            return `No video results found for "${query}".`;
        }
        // Format the results
        const formattedResults = results
            .slice(0, options.maxResults || 10) // Limit to maxResults or 10
            .map((item, index) => `${index + 1}. ${item.title}\n   ${item.url}`)
            .join('\n\n');
        return `Found ${results.length} videos for "${query}":\n\n${formattedResults}`;
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
