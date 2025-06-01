# CFML Syntax Highlighting Test

This file tests the enhanced CFML syntax highlighting in markdown preview.

## CFScript Component

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

## Traditional CFML Tags

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

## Expected Results

- Green left border on CFML code blocks
- "CFML" badges in top-right corners
- Proper syntax highlighting via VS Code's native CFML TextMate grammar
- Clean rendering without HTML escape issues
