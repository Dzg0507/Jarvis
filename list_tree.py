import os

def list_files_recursively(startpath):
    for root, dirs, files in os.walk(startpath):
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * (level)
        print(f'{indent}{os.path.basename(root)}/')
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            print(f'{subindent}{f}')

# Replace 'path/to/your/project' with the actual path to your project folder.
# For example, if you're in the same directory as your project, use '.'
project_path = '.' 
list_files_recursively(project_path)