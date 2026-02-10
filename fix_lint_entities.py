import os
import re

def fix_entities(content):
    # This is a very basic replacement for common characters that ESLint complains about in JSX
    # We want to be careful not to break tags or imports.
    # We target characters inside > and < (JSX text)
    
    def replace_entities(match):
        text = match.group(0)
        # Avoid replacing inside tags (starts with <)
        if text.startswith('<'):
            return text
        
        # Replace occurrences
        text = text.replace('"', '&quot;')
        text = text.replace("'", '&apos;')
        return text

    # Regex to find JSX text: (matches between > and <)
    # This is not perfect for all JSX but covers most template text
    return re.sub(r'>([^<]+)<', lambda m: f'>{m.group(1).replace("\"", "&quot;").replace("\'", "&apos;")}<', content)

src_dir = 'c:\\Users\\Belos Artefatos\\Majordocx\\Majordocs\\src'

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.tsx'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = fix_entities(content)
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f'Fixed entities in: {path}')
