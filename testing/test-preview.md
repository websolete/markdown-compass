# Enhanced Preview Test

This is a test file to verify the enhanced preview functionality of the markdown-compass extension.

## Regular Markdown Features

### Headers
- This is a level 3 header
- **Bold text**
- *Italic text*
- `Inline code`

### Code Blocks

#### JavaScript
```javascript
function testFunction() {
    console.log("Hello from JavaScript!");
    return true;
}
```

#### CFML Code
```cfml
<cffunction name="testFunction" access="public" returntype="string">
    <cfargument name="inputString" type="string" required="true">
    
    <cfset var result = "">
    <cfif len(arguments.inputString) gt 0>
        <cfset result = "Hello, " & arguments.inputString & "!">
    <cfelse>
        <cfset result = "Hello, World!">
    </cfif>
    
    <cfreturn result>
</cffunction>

<cfquery name="getUsers" datasource="myDB">
    SELECT id, name, email
    FROM users
    WHERE status = <cfqueryparam value="active" cfsqltype="cf_sql_varchar">
    ORDER BY name
</cfquery>

<cfloop query="getUsers">
    <cfoutput>
        <p>User: #name# (#email#)</p>
    </cfoutput>
</cfloop>
```

#### HTML
```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <h1>Welcome</h1>
    <p>This is a test page.</p>
</body>
</html>
```

### Lists

#### Unordered List
- Item 1
- Item 2
  - Sub-item 2.1
  - Sub-item 2.2
- Item 3

#### Ordered List
1. First step
2. Second step
3. Third step

### Links and Images
- [Link to Google](https://www.google.com)
- [Internal link](#headers)

### Tables
| Name | Age | City |
|------|-----|------|
| John | 25  | NYC  |
| Jane | 30  | LA   |
| Bob  | 35  | CHI  |

### Blockquotes
> This is a blockquote.
> It can span multiple lines.

### Horizontal Rule
---

## Special Characters and Formatting
- Em dash: —
- Ellipsis: …
- Copyright: ©
- Math: E = mc²

## Debug Information
This file is used to test the enhanced preview functionality and should be cleaned up after testing.
