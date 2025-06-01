# CFML Syntax Highlighting Verification

Testing the fixed CFML syntax highlighting with our updated detection logic.

## Test 1: CFScript in CFML block (should now work!)

```cfml
component accessors="true" displayname="ExampleEntity" {
    // This is a comment
    variables.myVar = "test string";
    
    function getValue() {
        return variables.myVar;
    }
    
    function setName(required string name) {
        variables.name = arguments.name;
    }
}
```

## Test 2: Traditional CFML tags

```cfml
<cffunction name="getUserById" returntype="query">
    <cfargument name="userId" type="numeric" required="true">
    
    <cfquery name="userData" datasource="myDatabase">
        SELECT id, firstName, lastName, email
        FROM users 
        WHERE id = <cfqueryparam value="#arguments.userId#" cfsqltype="cf_sql_integer">
    </cfquery>
    
    <cfreturn userData>
</cffunction>
```

## Test 3: Explicit CFScript block

```cfscript
function calculateTotal(items) {
    var total = 0;
    for (var i = 1; i <= arrayLen(items); i++) {
        total += items[i].price;
    }
    return total;
}
```

## Expected Results

- **Test 1**: Should now highlight `component`, `function`, `return`, `variables` as keywords (red/pink), strings in blue, comments in gray
- **Test 2**: Should highlight CFML tags in green, expressions in red background
- **Test 3**: Should highlight CFScript keywords and syntax properly
- **All**: Should have green left borders and language badges
