# CFML Syntax Test

Testing the enhanced syntax highlighting:

```cfml
component accessors="true" displayname="ExampleEntity" {
    // This is a comment
    variables.myVar = "test string";
    
    function getValue() {
        return variables.myVar;
    }
}
```

If this works, you should see:
- **component**, **function**, **return** highlighted as keywords in red/pink
- **"true"**, **"ExampleEntity"**, **"test string"** highlighted as strings in blue  
- **// This is a comment** highlighted in gray
- Green border around the code block
- "CFML" badge in the top-right corner
