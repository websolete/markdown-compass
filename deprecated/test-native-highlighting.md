# CFML Native Syntax Highlighting Test

Testing the new approach that leverages VS Code's built-in CFML syntax highlighting via the installed `kamasamak.vscode-cfml` extension.

## Test 1: CFScript-style Component

```cfml
component accessors="true" displayname="UserService" extends="BaseService" {
    
    // Component properties
    property name="userDAO" inject="UserDAO";
    property name="logger" inject="logbox:logger:{this}";
    
    /**
     * Initialize the service
     */
    function init() {
        variables.initialized = true;
        return this;
    }
    
    /**
     * Get user by ID
     */
    function getUserById(required numeric id) {
        try {
            var user = userDAO.get(arguments.id);
            
            if (!user.isLoaded()) {
                throw(type="UserNotFound", message="User with ID #arguments.id# not found");
            }
            
            logger.info("Retrieved user: #user.getEmail()#");
            return user;
            
        } catch (any e) {
            logger.error("Error retrieving user: #e.message#", e);
            rethrow;
        }
    }
}
```

## Test 2: Traditional CFML Tags

```cfml
<cfcomponent displayname="UserService" extends="BaseService">
    
    <cfproperty name="userDAO" inject="UserDAO">
    <cfproperty name="logger" inject="logbox:logger:{this}">
    
    <!--- Initialize the service --->
    <cffunction name="init" access="public" returntype="UserService">
        <cfset variables.initialized = true>
        <cfreturn this>
    </cffunction>
    
    <!--- Get user by ID --->
    <cffunction name="getUserById" access="public" returntype="User">
        <cfargument name="id" type="numeric" required="true">
        
        <cftry>
            <cfset var user = userDAO.get(arguments.id)>
            
            <cfif NOT user.isLoaded()>
                <cfthrow type="UserNotFound" message="User with ID #arguments.id# not found">
            </cfif>
            
            <cfset logger.info("Retrieved user: #user.getEmail()#")>
            <cfreturn user>
            
            <cfcatch type="any">
                <cfset logger.error("Error retrieving user: #cfcatch.message#", cfcatch)>
                <cfrethrow>
            </cfcatch>
        </cftry>
    </cffunction>
    
</cfcomponent>
```

## Test 3: Pure CFScript Block

```cfscript
// Pure CFScript function
function calculateTax(required numeric amount, string region = "US") {
    var taxRates = {
        "US": 0.08,
        "CA": 0.12,
        "EU": 0.20
    };
    
    var rate = structKeyExists(taxRates, arguments.region) ? 
               taxRates[arguments.region] : 
               taxRates["US"];
    
    return arguments.amount * rate;
}

// Array and struct manipulation
function processOrderItems(required array items) {
    var processed = [];
    
    for (var i = 1; i <= arrayLen(arguments.items); i++) {
        var item = arguments.items[i];
        var processedItem = {
            "id": item.id,
            "name": trim(item.name),
            "price": item.price,
            "tax": calculateTax(item.price, item.region ?: "US"),
            "processed": now()
        };
        
        arrayAppend(processed, processedItem);
    }
    
    return processed;
}
```

## Test 4: Mixed CFML and CFScript

```cfml
<cfcomponent>
    
    <cffunction name="processData" access="public" returntype="struct">
        <cfargument name="inputData" type="array" required="true">
        
        <cfscript>
            // CFScript within CFML tags
            var result = {
                "processedCount": 0,
                "errors": [],
                "data": []
            };
            
            for (var item in arguments.inputData) {
                try {
                    var processedItem = processItem(item);
                    arrayAppend(result.data, processedItem);
                    result.processedCount++;
                } catch (any e) {
                    arrayAppend(result.errors, {
                        "item": item,
                        "error": e.message
                    });
                }
            }
        </cfscript>
        
        <cfreturn result>
    </cffunction>
    
</cfcomponent>
```

## Expected Results

With the new approach leveraging VS Code's native CFML syntax highlighting:

1. **Proper Syntax Highlighting**: All CFML constructs should be highlighted with appropriate colors
2. **Visual Enhancements**: Green left borders on all CFML code blocks
3. **Language Badges**: "CFML" or "CFScript" badges in the top-right corners
4. **No HTML Escape Issues**: Clean rendering without escaped HTML tags
5. **Performance**: Faster rendering since we're using VS Code's optimized TextMate grammars

## Key Improvements

- ✅ **Leverages existing CFML extension**: Uses `kamasamak.vscode-cfml` grammar
- ✅ **No custom parsing**: Eliminates our complex syntax highlighting logic
- ✅ **Better accuracy**: TextMate grammars are more comprehensive than our patterns
- ✅ **Maintenance-free**: Updates automatically with the CFML extension
- ✅ **Consistent**: Matches VS Code editor highlighting exactly
