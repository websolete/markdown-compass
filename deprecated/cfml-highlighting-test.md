# CFML Syntax Highlighting Test

This file tests the CFML syntax highlighting in our enhanced preview.

## Test 1: CFScript Component

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

## Test 3: CFScript Block

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
```

## Test 4: Alternative Language IDs

Using `coldfusion`:

```coldfusion
<cfquery name="users" datasource="myDB">
    SELECT id, name, email
    FROM users
    WHERE active = <cfqueryparam value="1" cfsqltype="cf_sql_bit">
</cfquery>
```

Using `cf`:

```cf
component {
    function getValue() {
        return "Hello from CF!";
    }
}
```

## Expected Results

With VS Code's native CFML syntax highlighting:

1. **Keywords**: `component`, `function`, `var`, `return`, etc. should be highlighted
2. **Strings**: Text in quotes should be colored
3. **Comments**: `//` and `/* */` comments should be styled
4. **CF Tags**: `<cfcomponent>`, `<cffunction>`, etc. should be highlighted
5. **Visual Enhancements**: Green left borders and language badges
6. **No Escape Issues**: All code should render cleanly without HTML escaping
