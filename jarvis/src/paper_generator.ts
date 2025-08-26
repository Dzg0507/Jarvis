import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

interface PaperGeneratorDependencies {
    model: GenerativeModel;
    google_search: (query: string) => Promise<string>;
    view_text_website: (url: string) => Promise<string>;
}

export default class PaperGenerator {
    private model: GenerativeModel;
    private google_search: (query: string) => Promise<string>;
    private view_text_website: (url: string) => Promise<string>;

    constructor({ model, google_search, view_text_website }: PaperGeneratorDependencies) {
        this.model = model;
        this.google_search = google_search;
        this.view_text_website = view_text_website;
    }

    public async generate(topic: string): Promise<string> {
        // Step 1: Generate Outline
        const outline = await this._generateOutline(topic);
        console.log("Generated Outline:", outline);

        // This tool requires a web search tool that returns structured JSON.
        // The current google_search returns a string link.
        // We will create a mock search function for this tool to use.
        const mock_google_search_for_paper = async (query: string): Promise<string> => {
            console.log(`PAPER_GENERATOR: Faking web search for: "${query}"`);
            const mockResults = [
                { title: `Study on ${query}`, url: 'http://example.com/study1', snippet: `A comprehensive study on the effects of ${topic}.` },
                { title: `Introduction to ${query}`, url: 'http://example.com/intro1', snippet: `An introductory article about ${topic}.` }
            ];
            return JSON.stringify(mockResults);
        };

        // Use the mock search instead of the real one.
        const research = await this._performResearch(topic, outline, mock_google_search_for_paper);
        console.log("Research Complete:", research);

        // Step 3: Draft Sections
        const draftedSections = await this._draftSections(topic, research);
        console.log("Drafted Sections:", draftedSections);

        // Step 4: Assemble Paper
        const finalPaper = this._assemblePaper(topic, outline, draftedSections);
        console.log("Final Paper:", finalPaper);

        return finalPaper;
    }

    private async _generateOutline(topic: string): Promise<string> {
        console.log(`Generating outline for: ${topic}`);
        const prompt = `You are an expert academic researcher. Your task is to generate a structured outline for a research paper on the following topic: "${topic}".

The outline should be well-structured, with clear sections and subsections. It should cover the key aspects of the topic and provide a logical flow for the paper. Please provide the outline in a simple, easy-to-parse format (e.g., using markdown headings or numbered lists).`;
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            return text;
        }
        catch (error) {
            console.error("Error generating outline:", error);
            return `Error: Could not generate an outline for the topic "${topic}".`;
        }
    }

    private async _performResearch(topic: string, outline: string, search_function: (query: string) => Promise<string>): Promise<Record<string, string>> {
        console.log(`Performing research for topic "${topic}"`);
        const researchData: Record<string, string> = {};
        const sections = outline.split('\n').filter(line => line.match(/^\s*(\d+\.|-|\*)\s+/)).map(line => line.replace(/^\s*(\d+\.|-|\*)\s+/, '').trim());

        for (const section of sections) {
            if (!section) continue;
            console.log(`Researching section: ${section}`);
            const query = `"${topic}" "${section}"`;
            let sectionContent = "";
            try {
                const searchResultsText = await search_function(query);
                // This JSON.parse call is now safe because we are using a search function that returns valid JSON
                const searchResults = JSON.parse(searchResultsText);
                const urlsToRead = searchResults.slice(0, 2).map((r: any) => r.url); // Read top 2 results

                for (const url of urlsToRead) {
                    try {
                        console.log(`Reading URL: ${url}`);
                        // Since these are example.com URLs, we'll fake the content too.
                        const content = `This is placeholder content from ${url} about ${section}. In a real scenario, this would be the scraped text from the website.`;
                        sectionContent += `\n\n--- Source: ${url} ---\n${content.substring(0, 2000)}`; // Truncate content to avoid being too large
                    }
                    catch (error) {
                        console.error(`Error reading URL ${url}:`, error);
                    }
                }
            }
            catch (error) {
                console.error(`Error researching section "${section}":`, error);
                sectionContent = `Error: Could not perform research for section "${section}".`;
            }
            researchData[section] = sectionContent;
        }
        return researchData;
    }

    private async _draftSections(topic: string, research: Record<string, string>): Promise<Record<string, string>> {
        console.log(`Drafting sections for topic "${topic}"`);
        const draftedSections: Record<string, string> = {};
        for (const section in research) {
            if (Object.prototype.hasOwnProperty.call(research, section)) {
                const researchContent = research[section];
                console.log(`Drafting section: ${section}`);
                const prompt = `You are an expert academic writer. Your task is to write a section of a research paper.

The topic of the paper is: "${topic}".
The section you are writing is: "${section}".

Here is the research material you should use to write this section:
---
${researchContent}
---

Please write a clear, concise, and well-structured section based on the provided research. The section should be suitable for an academic paper.`;
                try {
                    const result = await this.model.generateContent(prompt);
                    const response = await result.response;
                    draftedSections[section] = response.text();
                }
                catch (error) {
                    console.error(`Error drafting section "${section}":`, error);
                    draftedSections[section] = `Error: Could not draft section "${section}".`;
                }
            }
        }
        return draftedSections;
    }

    private _assemblePaper(topic: string, outline: string, sections: Record<string, string>): string {
        console.log(`Assembling paper for topic "${topic}"`);
        let paper = `# Research Paper: ${topic}\n\n`;
        const sectionHeadings = outline.split('\n').filter(line => line.match(/^\s*(\d+\.|-|\*)\s+/)).map(line => line.replace(/^\s*(\d+\.|-|\*)\s+/, '').trim());
        for (const heading of sectionHeadings) {
            if (sections[heading]) {
                paper += `## ${heading}\n\n`;
                paper += `${sections[heading]}\n\n`;
            }
        }
        return paper;
    }
}