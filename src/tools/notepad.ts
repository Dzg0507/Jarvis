import { promises as fs } from 'fs';
import path from 'path';

const notepadFile = path.join(process.cwd(), 'notepad.txt');

/**
 * Saves a note to the notepad.txt file.
 * @param note_content The content of the note to save.
 * @returns A confirmation message.
 */
export async function save_note(note_content: string): Promise<string> {
    try {
        // Append the new note with a timestamp
        await fs.appendFile(notepadFile, `${new Date().toISOString()}: ${note_content}\n\n`);
        return `Note saved successfully.`;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error saving note:', errorMessage);
        return `Error saving note: ${errorMessage}`;
    }
}

/**
 * Reads all notes from the notepad.txt file.
 * @returns The content of the notepad file, or a message if it's empty.
 */
export async function read_notes(): Promise<string> {
    try {
        // Check if the file exists before trying to read it
        await fs.access(notepadFile);
        const notes = await fs.readFile(notepadFile, 'utf-8');
        return notes.trim().length > 0 ? notes : 'The notepad is currently empty.';
    } catch (error: any) {
        // If the file doesn't exist, it's just an empty notepad.
        if (error.code === 'ENOENT') {
            return 'The notepad is currently empty.';
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        console.error('Error reading notes:', errorMessage);
        return `Error reading notes: ${errorMessage}`;
    }
}
