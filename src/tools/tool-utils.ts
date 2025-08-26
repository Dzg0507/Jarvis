import { z } from 'zod';

export type ToolResult = {
  success: boolean;
  data?: any;
  error?: string;
};

export const createTool = (toolDefinition: any, dependencies: any = {}) => {
  const { name, definition, implementation } = toolDefinition;

  const wrappedImplementation = async (input: any): Promise<ToolResult> => {
    try {
      const schema = z.object(definition.inputSchema);
      const validatedInput = schema.parse(input);
      const result = await implementation(validatedInput, dependencies);
      return { success: true, data: result };
    } catch (error: any) {
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
