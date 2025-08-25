import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

interface PaperGeneratorDependencies {
    model: GenerativeModel;
    web_search: (query: string, model: GenerativeModel) => Promise<string>;
    view_text_website: (url: string) => Promise<string>;
}

export default class PaperGenerator {
    private model: GenerativeModel;
    private web_search: (query: string, model: GenerativeModel) => Promise<string>;
    private view_text_website: (url: string) => Promise<string>;

    constructor({ model, web_search, view_text_website }: PaperGeneratorDependencies) {
        this.model = model;
        this.web_search = web_search;
        this.view_text_website = view_text_website;
    }

    public async generate(topic: string): Promise<string> {
        // Step 1: Generate Outline
        const outline = await this._generateOutline(topic);
        console.log("Generated Outline:", outline);
        // Step 2: Perform Research
        const research = await this._performResearch(topic, outline);
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

    private async _performResearch(topic: string, outline: string): Promise<Record<string, string>> {
        console.log(`Performing research for topic "${topic}"`);
        const researchData: Record<string, string> = {};
        const sections = outline.split('\n').filter(line => line.match(/^\s*(\d+\.|-|\*)\s+/)).map(line => line.replace(/^\s*(\d+\.|-|\*)\s+/, '').trim());

        for (const section of sections) {
            if (!section) continue;
            console.log(`Researching section: ${section}`);
            const query = `detailed information on "${topic}" focusing on "${section}"`;
            try {
                // The new web_search tool already returns summarized content from top results.
                const sectionContent = await this.web_search(query, this.model);
                researchData[section] = sectionContent;
            }
            catch (error) {
                console.error(`Error researching section "${section}":`, error);
                researchData[section] = `Error: Could not perform research for section "${section}".`;
            }
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
