// The same Python source is exercised with CPython in tests and with Pyodide in the worker.
// Trace covers Python statements in the submitted code (including its functions), not native/C calls.
export const PYTHON_RUNNER = String.raw`
import builtins
import contextlib
import io
import json
import reprlib
import sys
import traceback

_OUTPUT_LIMIT = 100000
_REPR_LIMIT = 160

class _BoundedOutput(io.StringIO):
    def write(self, text):
        text = str(text)
        room = _OUTPUT_LIMIT - self.tell()
        if room > 0:
            super().write(text[:room])
        return len(text)

def _execute(code, inputs, trace=False, max_steps=500):
    stdout = _BoundedOutput()
    stderr = _BoundedOutput()
    iterator = iter(inputs)
    frames = []
    identities = {}
    references = []
    limit = max(1, min(int(max_steps or 500), 2000))
    source_lines = code.splitlines()
    scope = {'__name__': '__main__'}
    own_builtins = vars(builtins).copy()

    def ordered_input(prompt=''):
        stdout.write(str(prompt))
        try:
            return str(next(iterator))
        except StopIteration:
            raise EOFError('No more input available') from None

    own_builtins['input'] = ordered_input
    scope['__builtins__'] = own_builtins

    def snapshot(frame):
        # Keep references alive so CPython/Pyodide cannot recycle an id mid-run.
        visible = dict(frame.f_globals)
        visible.update(frame.f_locals)
        bindings = []
        for name, value in sorted(visible.items()):
            if name.startswith('__') or len(bindings) >= 50:
                continue
            address = id(value)
            if address not in identities:
                identities[address] = len(identities) + 1
                references.append(value)
            try:
                representation = reprlib.repr(value)
            except Exception:
                representation = '<repr unavailable>'
            bindings.append({'name': name, 'objectId': identities[address],
                             'type': type(value).__name__, 'repr': representation[:_REPR_LIMIT]})
        line = frame.f_lineno
        frames.append({'line': line,
                       'source': source_lines[line - 1] if 0 < line <= len(source_lines) else '',
                       'bindings': bindings, 'output': stdout.getvalue()})

    def tracer(frame, event, arg):
        if frame.f_code.co_filename != '<user>':
            return None
        if event == 'line':
            if len(frames) >= limit:
                raise RuntimeError('Trace step limit exceeded (' + str(limit) + ')')
            snapshot(frame)
        elif event == 'return' and frame.f_code.co_name == '<module>' and len(frames) < limit:
            snapshot(frame)
        return tracer

    error = None
    try:
        compiled = compile(code, '<user>', 'exec')
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            if trace:
                sys.settrace(tracer)
            try:
                exec(compiled, scope, scope)
            finally:
                sys.settrace(None)
    except BaseException as exc:
        error = type(exc).__name__ + ': ' + str(exc)
        stderr.write(''.join(traceback.format_exception(type(exc), exc, exc.__traceback__))[-_OUTPUT_LIMIT:])
    finally:
        sys.settrace(None)
    return {'ok': error is None, 'stdout': stdout.getvalue(),
            'stderr': stderr.getvalue(), 'error': error, 'frames': frames}

def run_request(request):
    rid = request['id']
    mode = request['mode']
    if mode == 'grade':
        cases = []
        for test in request.get('tests') or []:
            result = _execute(request['code'], test['input'])
            expected = test['expectedOutput']
            actual = result['stdout']
            passed = result['ok'] and actual.rstrip(chr(10)) == expected.rstrip(chr(10))
            case = {'description': test['description'], 'passed': passed,
                    'expected': expected, 'actual': actual}
            if result['error']:
                case['error'] = result['error']
            cases.append(case)
        return {'id': rid, 'ok': all(case['passed'] for case in cases),
                'stdout': '', 'stderr': '', 'cases': cases}
    result = _execute(request['code'], request.get('inputs') or [], mode == 'trace',
                      request.get('maxSteps') or 500)
    response = {'id': rid, 'ok': result['ok'], 'stdout': result['stdout'],
                'stderr': result['stderr']}
    if result['error']:
        response['error'] = result['error']
    if mode == 'trace':
        response['frames'] = result['frames']
    return response
`;
