import { z } from 'zod';
export const createTool = (toolDefinition, dependencies = {}) => {
    const { name, definition, implementation } = toolDefinition;
    const wrappedImplementation = async (input) => {
        try {
            const schema = z.object(definition.inputSchema);
            const validatedInput = schema.parse(input);
            const result = await implementation(validatedInput, dependencies);
            return { success: true, data: result };
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                return { success: false, error: `Invalid input: ${error.message}` };
            }
            return { success: false, error: error.message };
        }
    };
    return {
        name,
        definition,
        implementation: wrappedImplementation,
    };
};
