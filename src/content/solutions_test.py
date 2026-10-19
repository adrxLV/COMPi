"""Verify reference solutions against every interactive coding test case."""
import json
import pathlib
import subprocess
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
SOLUTIONS = {
    'w2-boolean-expression-construction': 'x = int(input())\nprint(x % 2 == 0 and x % 5 != 0 and x > 10)',
    'w3-substring-and-method': 'phrase = input()\nprint("python" in phrase.lower())',
    'w4-one-based-user-position': 'word = input()\nposition = int(input())\nprint(word[position - 1])',
    'w5-fee-cap': 'days = int(input())\nbooks = int(input())\nfee = days * books * 2\nif days > 30:\n    fee += 16\nif books > 3 and days > 10:\n    fee += 10\nprint(min(fee, 140))',
    'w6-loop-accumulator': 'n = int(input())\ntotal = 0\nfor value in range(1, n + 1):\n    total += value\nprint(total)',
    'w7-correcting-guest-list': 'guests = "Jim, Pam, Dwight"\nnames = guests.split(", ")\nnames.append("Michael")\nfor name in names:\n    print(f"Welcome, {name.upper()}!")\nprint(f"Last: {names[-1]}")',
    'w7-room-matching': 'rooms = ["A120", "Annex I", "Annex II", "INE auditorium"]\nstarts = [20080048, 20261213, 20261394, 20261481]\nends = [20261212, 20261393, 20261480, 20262195]\nnumber = int(input())\nfound = False\nfor i in range(len(rooms)):\n    if starts[i] <= number <= ends[i]:\n        print(rooms[i])\n        found = True\nif not found:\n    print("contact academic services")',
    'trap-w7-double-slots': 'values = [int(x) for x in input().split(",")]\nfor i in range(len(values)):\n    values[i] *= 2\nprint(values)',
    'trap-w7-remove-on-copy': 'values = [int(x) for x in input().split(",")]\nfor value in values[:]:\n    if value < 10:\n        values.remove(value)\nprint(values)',
}


class CodingCases(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        result = subprocess.run(['node', '--import', 'tsx', '--input-type=module', '-e',
            'import { exercises } from "./src/content/index.ts"; console.log(JSON.stringify(exercises))'],
            cwd=ROOT, text=True, capture_output=True, check=True)
        cls.exercises = json.loads(result.stdout)

    def test_every_coding_task_has_reference_solution_and_cases(self):
        coding = [e for e in self.exercises if e['type'] in ('fix', 'complete', 'program')]
        self.assertEqual(set(SOLUTIONS), {e['id'] for e in coding})
        for exercise in coding:
            for case in exercise['tests']:
                with self.subTest(id=exercise['id'], case=case['description']):
                    completed = subprocess.run([sys.executable, '-c', SOLUTIONS[exercise['id']]],
                        input='\n'.join(case['input']) + ('\n' if case['input'] else ''),
                        text=True, capture_output=True, timeout=3)
                    self.assertEqual(completed.returncode, 0, completed.stderr)
                    self.assertEqual(completed.stdout, case['expectedOutput'])


if __name__ == '__main__':
    unittest.main()
