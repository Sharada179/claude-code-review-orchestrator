---
description: Analyzes Python code for idioms, best practices, security issues, and performance improvements
---

# Python Code Review Skill

Expert in Python idioms, best practices, and common pitfalls. Help developers write Pythonic, secure, and efficient code.

## Core Areas of Expertise

### 1. Python Idioms and Style
- **PEP 8 Compliance**: Code formatting, naming conventions, line length
- **Pythonic Patterns**: List comprehensions, generators, context managers, decorators
- **Modern Python**: Use of f-strings, type hints, dataclasses, type annotations
- **Avoid Anti-patterns**: Manual index manipulation, unnecessary lambdas, misuse of `globals()`

### 2. Type Safety and Annotations
- **Type Hints**: Function annotations, return types, type hints for class variables
- **typing Module**: Use of Union, Optional, List, Dict, Callable, Protocol
- **Type Checking**: Ensuring type hints are compatible with runtime behavior
- **Missing Annotations**: Functions should have clear type hints for maintainability

### 3. Common Python Pitfalls
- **Mutable Default Arguments**: `def func(x=[])` - creates shared default list
- **Late Binding in Loops**: Lambda/function in loops capturing variables incorrectly
- **Missing `self` Parameter**: Instance methods must include self parameter
- **Improper Exception Handling**: Catching too broad exceptions, swallowing errors
- **Global vs Nonlocal**: Incorrect use of scope modifiers
- **Off-by-One Errors**: Incorrect range() usage, slice boundaries

### 4. Performance and Optimization
- **List vs Set Operations**: Use sets for membership testing (O(1) vs O(n))
- **Generator Expressions**: Use generators for large data to save memory
- **Algorithm Efficiency**: Identify inefficient algorithms, N+1 queries
- **String Operations**: Avoid building strings in loops, use join()
- **Dictionary vs List**: Choose appropriate data structure

### 5. Security Issues
- **Input Validation**: User input should be validated and sanitized
- **SQL Injection**: Parameterized queries for database operations
- **Command Injection**: Use subprocess with list args, not shell=True
- **Hardcoded Secrets**: No passwords, API keys, tokens in code
- **Pickle Security**: Don't unpickle untrusted data
- **YAML/JSON**: Use safe loaders (not yaml.load with arbitrary Python objects)

### 6. Code Organization
- **Module Structure**: Proper imports, avoid circular imports
- **Class Design**: Proper inheritance, composition over inheritance
- **Function Complexity**: Functions should do one thing well
- **Dead Code**: Remove unused imports, variables, functions
- **Constants**: Magic numbers should be named constants at module level

## Scoring Criteria

### Critical (20 pts)
- SQL/Command injection vulnerabilities
- Hardcoded credentials
- Mutable default arguments in function signatures
- Uncaught exception causing crashes
- Security-related issues (pickle, eval, etc.)

### High (10 pts)
- Missing error handling
- Late binding issues in loops
- Improper exception handling (catching Exception)
- Performance issues (N+1 queries, inefficient algorithms)
- Missing type hints on public functions

### Medium (5 pts)
- PEP 8 violations
- Non-Pythonic patterns (manual index loops when comprehension would work)
- Unclear variable names
- Incomplete docstrings

### Low (1 pt)
- Code style issues
- Minor formatting issues
- Unnecessary complexity

## Common Python Pitfalls to Check

### Mutable Default Arguments
```python
# ❌ WRONG - Shared default list
def append_item(item, items=[]):
    items.append(item)
    return items

# ✅ CORRECT - Use None as default
def append_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

### Late Binding in Loops
```python
# ❌ WRONG - Captures loop variable by reference
funcs = [lambda x: x + i for i in range(3)]

# ✅ CORRECT - Capture variable value
funcs = [lambda x, i=i: x + i for i in range(3)]
```

### Exception Handling
```python
# ❌ WRONG - Too broad, hides errors
try:
    result = risky_operation()
except:
    print("Something went wrong")

# ✅ CORRECT - Specific exception handling
try:
    result = risky_operation()
except ValueError as e:
    logger.error(f"Invalid input: {e}")
except IOError as e:
    logger.error(f"IO error: {e}")
```

### SQL Injection
```python
# ❌ VULNERABLE - String concatenation
query = f"SELECT * FROM users WHERE id = {user_id}"
db.execute(query)

# ✅ SAFE - Parameterized query
query = "SELECT * FROM users WHERE id = ?"
db.execute(query, (user_id,))
```

## Pythonic Code Examples

### Good Pattern
```python
# Use list comprehension instead of manual loops
squared = [x**2 for x in numbers if x % 2 == 0]

# Use context managers for resource handling
with open('file.txt') as f:
    content = f.read()

# Use type hints
def process_data(items: list[str]) -> dict[str, int]:
    return {item: len(item) for item in items}

# Use dataclasses instead of plain classes
from dataclasses import dataclass

@dataclass
class User:
    name: str
    email: str
    age: int = 0
```

## Success Checklist

- [ ] All functions have type hints for parameters and return values
- [ ] No mutable default arguments in function signatures
- [ ] All imports are used (no dead imports)
- [ ] Exception handling is specific to expected exceptions
- [ ] Security: No hardcoded credentials, proper parameterized queries
- [ ] Code follows PEP 8 style guidelines
- [ ] Complex logic has docstrings
- [ ] No use of dangerous functions (eval, exec, pickle on untrusted data)
- [ ] Loop operations use Pythonic patterns (comprehensions, generators)
- [ ] Error messages are logged appropriately

## Output Format

When analyzing Python code, provide:
```json
{
  "file": "filename.py",
  "issues": [
    {
      "line": 42,
      "severity": "critical",
      "category": "security",
      "description": "SQL injection: User input directly concatenated into query",
      "suggestion": "Use parameterized query: db.execute('SELECT * FROM users WHERE id = ?', (user_id,))"
    }
  ],
  "pythonScore": 75,
  "summary": "3 issues found: 1 critical, 1 high, 1 medium"
}
```
