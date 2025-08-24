"use strict";
class PaperGenerator {
    constructor({ model, google_search, view_text_website }) {
        this.model = model;
        this.google_search = google_search;
        this.view_text_website = view_text_website;
    }
    async generate(topic) {
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
    async _generateOutline(topic) {
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
    async _performResearch(topic, outline) {
        console.log(`Performing research for topic "${topic}"`);
        const researchData = {};
        const sections = outline.split('\n').filter(line => line.match(/^\s*(\d+\.|-|\*)\s+/)).map(line => line.replace(/^\s*(\d+\.|-|\*)\s+/, '').trim());
        for (const section of sections) {
            if (!section)
                continue;
            console.log(`Researching section: ${section}`);
            const query = `"${topic}" "${section}"`;
            let sectionContent = "";
            try {
                const searchResultsText = await this.google_search(query);
                // Assuming google_search returns a JSON string of format: [{title: string, url: string, snippet: string}]
                const searchResults = JSON.parse(searchResultsText);
                const urlsToRead = searchResults.slice(0, 2).map((r) => r.url); // Read top 2 results
                for (const url of urlsToRead) {
                    try {
                        console.log(`Reading URL: ${url}`);
                        const content = await this.view_text_website(url);
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
    async _draftSections(topic, research) {
        console.log(`Drafting sections for topic "${topic}"`);
        const draftedSections = {};
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
    _assemblePaper(topic, outline, sections) {
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
module.exports = PaperGenerator;
