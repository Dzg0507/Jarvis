import { Builder, By, until, WebDriver, Capabilities } from 'selenium-webdriver';

interface VideoSearchOptions { 
    maxResults?: number; 
}

interface SearchResult { 
    title: string; 
    url: string; 
    thumbnail: string; 
}

async function _searchBrave(query: string, driver: WebDriver): Promise<SearchResult[]> {
    console.log(`[DEBUG] [Brave] Navigating to search URL for: "${query}"`);
    const searchUrl = `https://search.brave.com/videos?q=${encodeURIComponent(query)}&safesearch=off`;
    await driver.get(searchUrl);
    try {
        const closeButton = await driver.wait(until.elementLocated(By.css('button[aria-label="Close"]')), 5000);
        await closeButton.click();
        console.log('[DEBUG] [Brave] Privacy banner closed.');
    } catch (e) { 
        console.log('[DEBUG] [Brave] Privacy banner not found, continuing...'); 
    }
    const videoSelector = 'div.snippet[data-type="videos"]';
    console.log(`[DEBUG] [Brave] Waiting for selector: ${videoSelector}`);
    await driver.wait(until.elementLocated(By.css(videoSelector)), 20000);
    console.log('[DEBUG] [Brave] Search results loaded.');
    const items = await driver.findElements(By.css(videoSelector));
    const results: SearchResult[] = [];
    for (const item of items) {
        try {
            const anchor = await item.findElement(By.css('a'));
            const url = await anchor.getAttribute('href');
            const title = await item.findElement(By.css('.snippet-title')).getText();
            const img = await item.findElement(By.css('img.video-thumb'));
            const thumbnail = await img.getAttribute('src');
            if (url && title && thumbnail) {
                results.push({ title, url, thumbnail });
            }
        } catch (e) { 
            console.warn('[DEBUG] [Brave] Could not parse a video snippet, skipping.'); 
        }
    }
    return results;
}

async function _searchDuckDuckGo(query: string, driver: WebDriver): Promise<SearchResult[]> {
    console.log(`[DEBUG] [DDG] Navigating to search URL for: "${query}"`);
    const searchUrl = `https://duckduckgo.com/?q=!v+${encodeURIComponent(query)}&ia=videos`;
    await driver.get(searchUrl);
    const videoSelector = '.tile--vid';
    console.log(`[DEBUG] [DDG] Waiting for selector: ${videoSelector}`);
    await driver.wait(until.elementLocated(By.css(videoSelector)), 20000);
    console.log('[DEBUG] [DDG] Search results loaded.');
    const items = await driver.findElements(By.css(videoSelector));
    const results: SearchResult[] = [];
    for (const item of items) {
         try {
            const titleElement = await item.findElement(By.css('.tile__title > a'));
            const url = await titleElement.getAttribute('href');
            const title = await titleElement.getText();
            const thumbElement = await item.findElement(By.css('.tile__media__img'));
            const style = await thumbElement.getAttribute('style');
            const thumbnailUrlMatch = style.match(/url\("(.*)"\)/);
            const thumbnail = thumbnailUrlMatch ? `https:${thumbnailUrlMatch[1]}` : '';
            if (url && title && thumbnail) {
                results.push({ title, url, thumbnail });
            }
        } catch (e) { 
            console.warn('[DEBUG] [DDG] Could not parse a video snippet, skipping.'); 
        }
    }
    return results;
}

export async function video_search(query: string, options: VideoSearchOptions = {}): Promise<string> {
  let driver: WebDriver | null = null;
  try {
    console.log(`[DEBUG] Initializing Selenium WebDriver for video search...`);
    
    // --- START OF THE FIX ---
    // We now use Capabilities instead of Chrome Options to avoid the broken import.
    const capabilities = Capabilities.chrome();
    capabilities.set('goog:chromeOptions', {
        args: [
            '--headless',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ]
    });
    
    driver = await new Builder().withCapabilities(capabilities).build();
    // --- END OF THE FIX ---

    console.log(`[DEBUG] WebDriver initialized. Starting search for "${query}"`);
    let results: SearchResult[] = [];
    try {
        results = await _searchBrave(query, driver);
    } catch (braveError) {
        console.error("[DEBUG] Brave (Selenium) search failed. Trying DuckDuckGo...", braveError);
        results = await _searchDuckDuckGo(query, driver);
    }
    console.log(`[DEBUG] Found ${results.length} total results.`);
    if (results.length === 0) {
        return `[]`; // Return empty JSON array on no results
    }
    return JSON.stringify(results.slice(0, options.maxResults || 10));
  } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('[DEBUG] CRITICAL ERROR in video_search:', errorMessage);
      return `{"error": "Failed to execute video search: ${errorMessage.replace(/"/g, "'")}"}`; // Return error as JSON
  } finally {
    if (driver) {
      await driver.quit();
      console.log('[DEBUG] WebDriver closed.');
    }
  }
}