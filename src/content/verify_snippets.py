"""Execute all deterministic reference snippets with the installed Python."""
import json
import subprocess
import sys

ROOT = __import__('pathlib').Path(__file__).resolve().parents[2]
result = subprocess.run(
    ['node', '--import', 'tsx', '--input-type=module', '-e',
     'import { exercises } from "./src/content/index.ts"; console.log(JSON.stringify(exercises))'],
    cwd=ROOT, text=True, capture_output=True, check=True,
)
exercises = json.loads(result.stdout)
checked = 0
failures = []
for exercise in exercises:
    if exercise['type'] not in {'predict', 'trace', 'memory'} or 'code' not in exercise:
        continue
    reference_input = exercise.get('referenceInput', [])
    input_text = ''.join(value + '\n' for value in reference_input)
    output = subprocess.run([sys.executable, '-c', exercise['code']], input=input_text, text=True, capture_output=True, timeout=3)
    checked += 1
    actual = output.stdout.rstrip('\n')
    expected = exercise['answer']
    if output.returncode or actual != expected:
        failures.append(f"{exercise['id']}: expected {expected!r}, got {actual!r}; stderr={output.stderr!r}")
if failures:
    print('\n'.join(failures), file=sys.stderr)
    raise SystemExit(1)
print(f'Python verified {checked} deterministic snippet answers.')
