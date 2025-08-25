import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import fetch from 'node-fetch';

async function fetchPageContent(url: string): Promise<string> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        // This is a simplified version of getting text content.
        // A more robust solution might use a library like Cheerio to parse HTML.
        const text = await response.text();
        // A simple regex to strip HTML tags. This is not perfect.
        return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    } catch (error: any) {
        console.error(`Failed to fetch content from ${url}: ${error.message}`);
        return `Error: Could not retrieve content from ${url}.`;
    }
}

/**
 * Uses the AI model to generate a list of relevant URLs for a query,
 * then fetches the content of those URLs.
 * @param query The search query.
 * @param model The GenerativeModel instance to use for URL generation.
 * @returns The combined text content of the top search results.
 */
export async function web_search(query: string, model: GenerativeModel): Promise<string> {
    try {
        console.log(`Performing AI-powered web search for: "${query}"`);

        // Step 1: Ask the AI to generate relevant URLs
        const urlGenerationPrompt = `You are a search engine. Based on the query "${query}", provide a newline-separated list of 3 highly relevant URLs that would likely contain the answer. Output ONLY the URLs.`;
        const urlResult = await model.generateContent(urlGenerationPrompt);
        const urlResponse = await urlResult.response;
        const urlsText = urlResponse.text();
        const urls = urlsText.split('\n').filter(url => url.trim().startsWith('http'));

        if (urls.length === 0) {
            return `The AI could not find any relevant URLs for the query "${query}".`;
        }

        console.log(`AI suggested URLs:`, urls);

        // Step 2: Fetch content from the top URLs
        const topUrls = urls.slice(0, 3);
        const contentPromises = topUrls.map(url => fetchPageContent(url));
        const allContent = await Promise.all(contentPromises);

        // Step 3: Combine and return the content
        let combinedContent = `Web search results for "${query}":\n\n`;
        allContent.forEach((content, index) => {
            combinedContent += `--- Content from: ${topUrls[index]} ---\n`;
            // Truncate content to avoid being too verbose
            combinedContent += content.substring(0, 2500) + '...\n\n';
        });

        return combinedContent;

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error during AI-powered web search:', errorMessage);
        return `Error performing web search: ${errorMessage}`;
    }
}
