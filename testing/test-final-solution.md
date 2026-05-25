# Final CFML Syntax Highlighting Test

This test verifies that both issues are resolved:

1. ✅ Enhanced preview opens in single window (not split)
2. ✅ CFML syntax highlighting works correctly without corrupting tags

## Test Case 1: CFML Tags (Should NOT break tag structure)

```cfml
<cfoutput query="getUsers">
    <div class="user">
        <h3>#name#</h3>
        <p>Email: #email#</p>
    </div>
</cfoutput>

<cfif isDefined("form.submit")>
    <cfset var userInput = form.userInput />
    <cfif len(userInput) GT 0>
        <cfquery name="insertUser" datasource="mydb">
            INSERT INTO users (name, email) 
            VALUES (<cfqueryparam value="#userInput#" cfsqltype="cf_sql_varchar">)
        </cfquery>
    </cfif>
</cfif>
```

## Test Case 2: CFScript Keywords (Should be highlighted)

```cfml
function getUserData(required numeric userId) {
    var query = queryExecute("SELECT * FROM users WHERE id = ?", [userId]);
    
    if (query.recordCount > 0) {
        var userData = {
            "name": query.name,
            "email": query.email,
            "isActive": true
        };
        return userData;
    } else {
        return {};
    }
}

public component {
    property string name required;
    property numeric age;
    
    public function init() {
        variables.created = now();
        return this;
    }
}
```

## Test Case 3: Mixed CFML and CFScript

```cfml
<cfscript>
    var users = ["John", "Jane", "Bob"];
    var count = arrayLen(users);
    
    for (var i = 1; i <= count; i++) {
        writeOutput("User " & i & ": " & users[i] & "<br>");
    }
</cfscript>

<cfloop array="#users#" index="user">
    <cfoutput>
        <p>Processing user: #user#</p>
        <cfif user EQ "John">
            <strong>Admin User Found!</strong>
        </cfif>
    </cfoutput>
</cfloop>
```

## Expected Results:

- **CFML Tags**: Should appear as complete green bold tags (not broken apart)
- **CFScript Keywords**: Should be highlighted with appropriate colors
- **Comments**: Should be italic gray
- **Strings**: Should be blue
- **Data Types**: Should be blue bold
- **Booleans/Numbers**: Should be highlighted appropriately

## Previous Issue (Now Fixed):

Before the fix, `<cfoutput query="getUsers">` was being corrupted to:
`<cfoutput "cfml-type">query="getUsers">`

This should no longer happen with the improved tag protection approach.
