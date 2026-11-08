"""Build/verify a Trace Viewer timeline from validated safe JSON, never from raw traces."""
import json
import pathlib
import sys
import zipfile


def trace_bytes(data):
    events = [{
        'version': 8, 'type': 'context-options', 'origin': 'testRunner',
        'browserName': '', 'options': {}, 'platform': 'linux',
        'wallTime': 0, 'monotonicTime': 0, 'sdkLanguage': 'javascript',
        'testTimeout': 30000
    }]
    for index, step in enumerate(data['steps']):
        call_id = f'step@{index}'
        events.append({
            'type': 'before', 'callId': call_id, 'stepId': call_id,
            'startTime': step['elapsedMs'], 'class': 'Test',
            'method': 'expect' if step['kind'] == 'assertion' else 'pw:api',
            'title': f"{step['kind']}: {step['operation']}", 'params': {}, 'stack': []
        })
        after = {
            'type': 'after', 'callId': call_id,
            'endTime': step['elapsedMs'] + step['durationMs'], 'annotations': []
        }
        if step['failed']:
            after['error'] = {'name': 'Error', 'message': 'Failed step (private error text omitted)'}
        events.append(after)
    return ('\n'.join(json.dumps(event) for event in events) + '\n').encode()


def main():
    source = pathlib.Path(sys.argv[1])
    target = source.with_suffix('.zip')
    expected = trace_bytes(json.loads(source.read_text()))
    if len(sys.argv) > 2 and sys.argv[2] == '--verify':
        with zipfile.ZipFile(target) as archive:
            if archive.namelist() != ['test.trace'] or archive.read('test.trace') != expected:
                raise ValueError('Unexpected trace content')
    else:
        with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('test.trace', expected)


if __name__ == '__main__':
    main()
