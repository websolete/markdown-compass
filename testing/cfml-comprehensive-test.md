# CFML Comprehensive Test File

This file contains comprehensive CFML and CFScript examples to test syntax highlighting and enhanced preview functionality.

## Basic CFML Tags

### Simple Query Example

```cfml
<cfquery name="getUsers" datasource="myDB">
    SELECT id, firstName, lastName, email
    FROM users
    WHERE active = <cfqueryparam value="#form.active#" cfsqltype="cf_sql_bit">
    ORDER BY lastName, firstName
</cfquery>

<cfoutput query="getUsers">
    <div class="user-card">
        <h3>#firstName# #lastName#</h3>
        <p>Email: #email#</p>
    </div>
</cfoutput>
```

### Component Definition

```cfml
<cfcomponent displayname="User Service" hint="Handles user operations">
    
    <cfproperty name="userDAO" type="any" required="true">
    
    <cffunction name="init" access="public" returntype="UserService">
        <cfargument name="userDAO" type="any" required="true">
        <cfset variables.userDAO = arguments.userDAO>
        <cfreturn this>
    </cffunction>
    
    <cffunction name="getActiveUsers" access="public" returntype="query">
        <cfargument name="limit" type="numeric" required="false" default="50">
        
        <cfset var result = "">
        
        <cfquery name="result" datasource="#variables.dsn#">
            SELECT id, firstName, lastName, email, createdDate
            FROM users
            WHERE active = 1
            ORDER BY createdDate DESC
            LIMIT #arguments.limit#
        </cfquery>
        
        <cfreturn result>
    </cffunction>
    
</cfcomponent>
```

## CFScript Examples

### Basic CFScript Function

```cfscript
function calculateTax(amount, taxRate = 0.08) {
    if (!isNumeric(amount) || amount <= 0) {
        throw(type="InvalidArgument", message="Amount must be a positive number");
    }
    
    var taxAmount = amount * taxRate;
    var total = amount + taxAmount;
    
    return {
        "subtotal": amount,
        "tax": taxAmount,
        "total": total,
        "taxRate": taxRate
    };
}
```

### Advanced CFScript Component

```cfscript
component extends="BaseService" implements="IUserService" {
    
    property name="userDAO" inject="UserDAO";
    property name="emailService" inject="EmailService";
    
    public UserService function init() {
        super.init();
        return this;
    }
    
    public struct function createUser(required struct userData) {
        // Validate input data
        if (!structKeyExists(arguments.userData, "email") || 
            !isValid("email", arguments.userData.email)) {
            throw(type="ValidationError", message="Valid email is required");
        }
        
        // Check for existing user
        var existingUser = userDAO.findByEmail(arguments.userData.email);
        if (!isNull(existingUser)) {
            throw(type="DuplicateUser", message="User with this email already exists");
        }
        
        // Hash password
        if (structKeyExists(arguments.userData, "password")) {
            arguments.userData.password = hash(arguments.userData.password, "SHA-256");
        }
        
        // Create user
        var newUserId = userDAO.create(arguments.userData);
        var newUser = userDAO.findById(newUserId);
        
        // Send welcome email
        try {
            emailService.sendWelcomeEmail(newUser.email, newUser.firstName);
        } catch (any e) {
            // Log error but don't fail user creation
            writeLog(type="error", text="Failed to send welcome email: #e.message#");
        }
        
        return {
            "success": true,
            "userId": newUserId,
            "user": newUser
        };
    }
    
    public query function searchUsers(string searchTerm = "", numeric page = 1, numeric pageSize = 25) {
        var offset = (arguments.page - 1) * arguments.pageSize;
        
        return queryExecute(
            "SELECT id, firstName, lastName, email, active, createdDate 
             FROM users 
             WHERE (firstName LIKE :searchTerm 
                OR lastName LIKE :searchTerm 
                OR email LIKE :searchTerm)
             ORDER BY lastName, firstName
             LIMIT :pageSize OFFSET :offset",
            {
                searchTerm: "%#arguments.searchTerm#%",
                pageSize: arguments.pageSize,
                offset: offset
            },
            {
                datasource: application.dsn
            }
        );
    }
    
    public boolean function deactivateUser(required numeric userId) {
        transaction {
            try {
                // Update user status
                userDAO.update(arguments.userId, {"active": false});
                
                // Log the deactivation
                auditService.logUserDeactivation(arguments.userId, session.user.id);
                
                return true;
            } catch (any e) {
                transaction action="rollback";
                throw(type="DeactivationError", message="Failed to deactivate user: #e.message#");
            }
        }
    }
}
```

### Modern CFScript with Closures

```cfscript
// Array manipulation with closures
users = [
    {name: "John Doe", age: 30, department: "IT"},
    {name: "Jane Smith", age: 25, department: "Marketing"},
    {name: "Bob Johnson", age: 35, department: "IT"},
    {name: "Alice Brown", age: 28, department: "Sales"}
];

// Filter IT department users
itUsers = users.filter(function(user) {
    return user.department == "IT";
});

// Map to just names and ages
userSummaries = users.map(function(user) {
    return "#user.name# (#user.age#)";
});

// Reduce to average age
averageAge = users.reduce(function(accumulator, user) {
    return accumulator + user.age;
}, 0) / users.len();

// Sort by age descending
sortedByAge = users.sort(function(a, b) {
    return b.age - a.age;
});
```

## Mixed CFML and HTML

```cfml
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>User Dashboard</title>
    <cfhtmlhead text='<link rel="stylesheet" href="/css/dashboard.css">'>
</head>
<body>
    <cfif structKeyExists(session, "user")>
        <header class="dashboard-header">
            <h1>Welcome, <cfoutput>#session.user.firstName#</cfoutput>!</h1>
            <nav>
                <cfloop array="#application.navigation#" index="navItem">
                    <cfoutput>
                        <a href="#navItem.url#" 
                           class="nav-link <cfif cgi.script_name contains navItem.url>active</cfif>">
                            #navItem.label#
                        </a>
                    </cfoutput>
                </cfloop>
            </nav>
        </header>
        
        <main class="dashboard-content">
            <cfswitch expression="#url.section#">
                <cfcase value="profile">
                    <cfinclude template="includes/profile-section.cfm">
                </cfcase>
                <cfcase value="reports">
                    <cfinclude template="includes/reports-section.cfm">
                </cfcase>
                <cfdefaultcase>
                    <cfinclude template="includes/home-section.cfm">
                </cfdefaultcase>
            </cfswitch>
        </main>
    <cfelse>
        <cflocation url="/login.cfm" addtoken="false">
    </cfif>
</body>
</html>
```

## Error Handling Examples

```cfml
<cftry>
    <cfquery name="sensitiveData" datasource="secureDB">
        SELECT * FROM financial_records
        WHERE user_id = <cfqueryparam value="#session.user.id#" cfsqltype="cf_sql_integer">
    </cfquery>
    
    <cfcatch type="database">
        <cflog type="error" text="Database error in financial records query: #cfcatch.message#">
        <cfset error_message = "Unable to retrieve financial data at this time.">
    </cfcatch>
    <cfcatch type="any">
        <cflog type="error" text="Unexpected error: #cfcatch.message# - #cfcatch.detail#">
        <cfset error_message = "An unexpected error occurred.">
    </cfcatch>
</cftry>
```

```cfscript
try {
    var apiResponse = http_get("https://api.example.com/data");
    var data = deserializeJSON(apiResponse.fileContent);
    
    if (data.status != "success") {
        throw(type="APIError", message="API returned error: #data.message#");
    }
    
    return data.results;
} catch (any e) {
    writeLog(
        type="error", 
        file="api_errors",
        text="API call failed: #e.message# | Detail: #e.detail#"
    );
    
    return {
        "error": true,
        "message": "External service unavailable"
    };
}
```
