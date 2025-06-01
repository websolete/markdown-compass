# Quick CFML Syntax Test

## CFScript Component

```cfml
component {
    function getUserById(required numeric id) {
        var user = userDAO.get(arguments.id);
        return user;
    }
}
```

## CFML Tags

```cfml
<cffunction name="getUserById">
    <cfargument name="id" type="numeric" required="true">
    <cfset var user = userDAO.get(arguments.id)>
    <cfreturn user>
</cffunction>
```

## Mixed Syntax

```cfml
<cfcomponent>
    <cffunction name="init">
        variables.initialized = true;
        return this;
    </cffunction>
</cfcomponent>
```
