import re
import urllib.request

BASE = 'https://clone-g498.vercel.app'
PAGE = BASE + '/login'

print('Fetching', PAGE)
html = urllib.request.urlopen(PAGE).read().decode('utf-8')
script_srcs = re.findall(r"<script[^>]+src=\"([^\"]+)\"", html)
print('Found', len(script_srcs), 'script tags')

checked = []
for src in script_srcs:
    url = src
    if url.startswith('/'):
        url = BASE + url
    if url.startswith('//'):
        url = 'https:' + url
    print('\nChecking', url)
    try:
        js = urllib.request.urlopen(url).read().decode('utf-8', errors='ignore')
    except Exception as e:
        print('  Failed to fetch:', e)
        continue
    found = False
    for pattern in ['localStorage.getItem(\'token\')', "localStorage.getItem(\"token\")", 'Authorization:', "headers.set('Authorization'", 'headers.set("Authorization"', 'localStorage.setItem(' , 'fetchApi(']:
        if pattern in js:
            print('  Found pattern in JS:', pattern)
            found = True
    # search for 'Authorization' occurrences and print surrounding context
    if 'Authorization' in js or 'localStorage.getItem' in js or 'headers.set' in js or "localStorage.setItem('token')" in js:
        print('  Snippets:')
        for m in re.finditer(r"(.{0,80}(Authorization|localStorage\.getItem|localStorage\.setItem|headers\.set).{0,80})", js, re.IGNORECASE):
            snippet = m.group(1).replace('\n', ' ')
            print('    ...', snippet[:300])
            break
    if not found:
        print('  No obvious token/header patterns found in this chunk')
    checked.append(url)

print('\nChecked', len(checked), 'scripts')
