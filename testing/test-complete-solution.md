# CFML Syntax Highlighting Test

This document tests the complete solution for enhanced preview functionality.

## Test Case 1: Basic CFML Function

```cfml
public string function getUsers() {
    var result = "Hello World";
    if (len(result) GT 0) {
        return result;
    }
    return "";
}
```

## Test Case 2: Complex CFML with Comments

```cfml
component extends="BaseController" {
    // This is a single-line comment
    property name="userService" inject="userService";
    
    /*
     * Multi-line comment block
     * Contains important information
     */
    public struct function processData(required string input) {
        var data = {
            users: [],
            count: 0,
            success: true
        };
        
        // Query database
        var qUsers = queryExecute("SELECT * FROM users WHERE active = ?", [true]);
        
        return data;
    }
}
```

## Test Case 3: CFML with Various Data Types

```cfml
function testDataTypes() {
    var stringVar = "test string";
    var numericVar = 42.5;
    var booleanVar = true;
    var arrayVar = ["one", "two", "three"];
    var structVar = {
        name: "John",
        age: 30,
        active: yes
    };
    
    if (isValid("string", stringVar) AND len(stringVar) GT 0) {
        writeLog("Valid string detected");
    }
    
    return structVar;
}
```

## Expected Results

When viewing this in Enhanced Preview:

1. **Window Behavior**: Should open in the active window, not force a split view
2. **Syntax Highlighting**: 
   - Keywords like `public`, `function`, `var`, `if`, `return` should be purple/blue
   - Data types like `string`, `struct` should be blue
   - Strings like `"Hello World"` should be dark blue
   - Comments should be gray and italic
   - Boolean values like `true`, `yes` should be highlighted
   - Operators like `GT`, `AND` should be highlighted
   - No malformed HTML spans should appear as visible text
   - No nested span corruption like `<span class="cfml-<span...`

3. **Debugging**: Check browser console for:
   - Total CFML highlighted elements count
   - No corruption warnings
   - Balanced span tags
   - No nested spans detected
