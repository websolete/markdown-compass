# CFML Syntax Highlighting Test

This document tests the CFML syntax highlighting in the enhanced markdown preview.

## Basic CFML Component

```cfml
component extends="BaseComponent" {
    // Single line comment
    /* Multi-line
       comment block */
    
    public string function test(required string name) {
        var result = "Hello " & name;
        if (len(result) GT 0) {
            return result;
        }
        return "";
    }
    
    private boolean function validate(any data) {
        return isValid("string", data) AND len(data) GT 0;
    }
}
```

## CFML Script with Various Syntax

```cfml
// Function with various data types
public array function processData(
    required struct input,
    numeric maxItems = 10,
    boolean debug = false
) {
    var results = [];
    var counter = 0;
    
    // Loop through input structure
    for (var key in input) {
        if (counter GTE maxItems) break;
        
        var item = input[key];
        if (isValid("string", item) AND len(item) GT 0) {
            arrayAppend(results, {
                key: key,
                value: item,
                processed: true
            });
            counter++;
        }
    }
    
    if (debug) {
        writeLog("Processed " & counter & " items");
    }
    
    return results;
}
```

This should display with proper syntax highlighting for:
- Keywords (component, function, var, if, etc.)
- Data types (string, array, struct, boolean, etc.)
- Access modifiers (public, private)
- Comments (// and /* */)
- Strings ("Hello" & name)
- Operators (GT, GTE, AND)
- Boolean values (true, false)
- Numbers (10, 0)
