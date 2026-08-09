from typing import List, Dict, Any

def get_sample_test_cases(challenge_id: str) -> List[Dict[str, Any]]:
    cases = {
        'starter-1': [
            {'id': 't1', 'expected_output': 'Welcome to Code Realm', 'description': 'Outputs welcome greeting'}
        ],
        'logic-1': [
            {'id': 't1', 'expected_output': 'ACCESS GRANTED', 'description': 'Correct passcode 777'},
            {'id': 't2', 'expected_output': 'ACCESS DENIED', 'description': 'Wrong passcode'}
        ],
        'logic-2': [
            {'id': 't1', 'expected_output': '50', 'description': 'Level 3 with 4 spells'}
        ],
        'loop-1': [
            {'id': 't1', 'expected_output': '30', 'description': 'Sum evens up to 10'},
            {'id': 't2', 'expected_output': '12', 'description': 'Sum evens up to 6'}
        ]
    }
    return cases.get(challenge_id, [{'id': 't1', 'expected_output': 'Welcome to Code Realm', 'description': 'Default assertion'}])
