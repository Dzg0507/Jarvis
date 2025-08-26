import os
import shutil

# This path is based on your error message
file_path = os.path.join(os.pardir, 'package.json')

try:
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Check for UTF-8 BOM (b'\xef\xbb\xbf')
    if content.startswith(b'\xef\xbb\xbf'):
        print("BOM found. Removing it.")
        content = content[3:]  # Remove the first 3 bytes
    else:
        print("No BOM found. The file is likely okay, but re-writing it just in case.")

    # Write the content back to a temporary file
    temp_path = file_path + '.temp'
    with open(temp_path, 'wb') as f:
        f.write(content)
    
    # Replace the original file with the corrected one
    shutil.move(temp_path, file_path)
    
    print(f"Successfully cleaned the file at: {os.path.abspath(file_path)}")

except FileNotFoundError:
    print(f"Error: The file was not found at {os.path.abspath(file_path)}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")