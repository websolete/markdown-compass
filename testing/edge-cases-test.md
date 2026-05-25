# Edge Cases and Special Syntax Test

This file tests edge cases, special characters, and complex syntax patterns that might cause issues with highlighting.

## CFML Edge Cases

### Nested Tags and Complex Attributes

```cfml
<cfcomponent displayname="Complex Component" 
             hint="This component tests complex attribute patterns"
             output="false"
             extends="BaseComponent"
             implements="ITestInterface">
    
    <cfproperty name="testProperty" 
                type="string" 
                required="true"
                hint="A test property with complex attributes">
    
    <cffunction name="complexFunction" 
                access="public" 
                returntype="struct" 
                hint="Function with complex parameters and nested tags">
        <cfargument name="inputData" 
                    type="struct" 
                    required="true"
                    hint="Complex input structure">
        <cfargument name="options" 
                    type="struct" 
                    required="false" 
                    default="#structNew()#">
        
        <cfset var result = structNew()>
        <cfset var tempQuery = "">
        
        <cfquery name="tempQuery" datasource="#application.dsn#">
            SELECT 
                <cfif structKeyExists(arguments.options, "includeDetails") AND arguments.options.includeDetails>
                    id, name, description, created_date, modified_date
                <cfelse>
                    id, name
                </cfif>
            FROM test_table
            WHERE 1=1
            <cfif structKeyExists(arguments.inputData, "filters")>
                <cfloop collection="#arguments.inputData.filters#" item="filterKey">
                    <cfif filterKey EQ "name">
                        AND name LIKE <cfqueryparam value="%#arguments.inputData.filters[filterKey]#%" cfsqltype="cf_sql_varchar">
                    <cfelseif filterKey EQ "status">
                        AND status = <cfqueryparam value="#arguments.inputData.filters[filterKey]#" cfsqltype="cf_sql_varchar">
                    <cfelse>
                        AND #filterKey# = <cfqueryparam value="#arguments.inputData.filters[filterKey]#" cfsqltype="cf_sql_varchar">
                    </cfif>
                </cfloop>
            </cfif>
            ORDER BY 
            <cfif structKeyExists(arguments.options, "sortBy")>
                #arguments.options.sortBy# 
                <cfif structKeyExists(arguments.options, "sortOrder")>
                    #arguments.options.sortOrder#
                <cfelse>
                    ASC
                </cfif>
            <cfelse>
                name ASC
            </cfif>
        </cfquery>
        
        <cfreturn result>
    </cffunction>
</cfcomponent>
```

### CFML with Special Characters and Escaping

```cfml
<cfscript>
// String with various escape sequences
testString = "This is a ""quoted"" string with 'single quotes' and \n newlines";
regexPattern = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$";
jsonString = '{"name": "John \"Doe\"", "age": 30, "email": "john@example.com"}';

// Complex struct with special characters
complexData = {
    "user_info": {
        "first.name": "John",
        "last-name": "Doe", 
        "email@domain": "john.doe@example.com",
        "preferences": {
            "theme": "dark",
            "notifications": true,
            "api_key": "abc123!@##$%^&*()"
        }
    }
};
</cfscript>

<cfoutput>
    <div data-user-id="#session.user.id#" 
         data-preferences='#serializeJSON(complexData.user_info.preferences)#'
         class="user-panel special-chars-test">
        
        <h2>User: #htmlEditFormat(complexData.user_info["first.name"])# #htmlEditFormat(complexData.user_info["last-name"])#</h2>
        
        <cfif reFind(regexPattern, complexData.user_info["email@domain"])>
            <p>Email: <a href="mailto:#complexData.user_info["email@domain"]#">#complexData.user_info["email@domain"]#</a></p>
        <cfelse>
            <p class="error">Invalid email format</p>
        </cfif>
        
        <script type="text/javascript">
            var userPrefs = #serializeJSON(complexData.user_info.preferences)#;
            console.log('User preferences:', userPrefs);
            
            // JavaScript with CFML variables
            if (userPrefs.theme === 'dark') {
                document.body.classList.add('dark-theme');
            }
        </script>
    </div>
</cfoutput>
```

## CFScript Edge Cases

### Complex Object Manipulation

```cfscript
component {
    
    // Property with complex default value
    property name="config" default="{
        'database': {
            'host': 'localhost',
            'port': 3306,
            'username': 'user',
            'password': 'p@ssw0rd!@##$'
        },
        'cache': {
            'enabled': true,
            'timeout': 3600,
            'providers': ['redis', 'memcached']
        }
    }";
    
    public any function init() {
        // Complex initialization with try-catch
        try {
            variables.dynamicProperties = {};
            
            // Create dynamic properties with special names
            variables.dynamicProperties["property-with-dashes"] = "value1";
            variables.dynamicProperties["property.with.dots"] = "value2";
            variables.dynamicProperties["property_with_underscores"] = "value3";
            variables.dynamicProperties["property with spaces"] = "value4";
            
            // Complex regex patterns
            variables.patterns = {
                email: "^[a-zA-Z0-9.!##$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$",
                phone: "^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$",
                creditCard: "^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$"
            };
            
        } catch (any e) {
            writeLog(type="error", text="Initialization failed: #e.message#");
            rethrow;
        }
        
        return this;
    }
    
    // Function with complex parameter patterns
    public struct function processData(
        required struct inputData,
        string mode = "standard",
        boolean validateInput = true,
        numeric timeout = 30,
        struct options = {
            "compression": true,
            "encryption": false,
            "async": false,
            "retries": 3
        }
    ) {
        // Complex string manipulation with special characters
        var processedData = {};
        var errorMessages = [];
        
        // Process each key-value pair with special character handling
        for (var key in arguments.inputData) {
            try {
                var value = arguments.inputData[key];
                var processedKey = key;
                
                // Handle keys with special characters
                if (reFind("[^a-zA-Z0-9_]", key)) {
                    processedKey = reReplace(key, "[^a-zA-Z0-9_]", "_", "all");
                    writeLog(type="info", text="Normalized key from '#key#' to '#processedKey#'");
                }
                
                // Complex value processing based on type
                switch (getMetadata(value).getName()) {
                    case "java.lang.String":
                        // String processing with escape sequences
                        value = reReplace(value, "[\r\n\t]", " ", "all");
                        value = reReplace(value, "\s+", " ", "all");
                        value = trim(value);
                        
                        // Validate against patterns if applicable
                        if (processedKey == "email" && structKeyExists(variables.patterns, "email")) {
                            if (!reFind(variables.patterns.email, value)) {
                                errorMessages.append("Invalid email format: #value#");
                                continue;
                            }
                        }
                        break;
                        
                    case "java.lang.Double":
                    case "java.lang.Integer":
                        // Numeric validation and formatting
                        if (!isNumeric(value)) {
                            errorMessages.append("Invalid numeric value for #processedKey#: #value#");
                            continue;
                        }
                        value = parseFloat(value);
                        break;
                        
                    case "coldfusion.runtime.Struct":
                        // Recursive processing for nested structures
                        value = processData(value, arguments.mode, arguments.validateInput, arguments.timeout, arguments.options);
                        break;
                        
                    case "coldfusion.runtime.Array":
                        // Array processing with filtering
                        var processedArray = [];
                        for (var arrayItem in value) {
                            if (!isNull(arrayItem) && len(trim(arrayItem))) {
                                processedArray.append(arrayItem);
                            }
                        }
                        value = processedArray;
                        break;
                }
                
                processedData[processedKey] = value;
                
            } catch (any e) {
                errorMessages.append("Error processing key '#key#': #e.message#");
            }
        }
        
        return {
            "success": !errorMessages.len(),
            "data": processedData,
            "errors": errorMessages,
            "metadata": {
                "processedAt": now(),
                "mode": arguments.mode,
                "options": arguments.options,
                "originalKeyCount": structCount(arguments.inputData),
                "processedKeyCount": structCount(processedData)
            }
        };
    }
    
    // Function with complex query and parameter binding
    public query function executeComplexQuery(
        required string baseQuery,
        struct parameters = {},
        struct options = {}
    ) {
        var finalQuery = arguments.baseQuery;
        var queryParams = {};
        
        // Dynamic parameter replacement with type safety
        for (var paramName in arguments.parameters) {
            var paramValue = arguments.parameters[paramName];
            var paramType = "cf_sql_varchar"; // default
            
            // Determine SQL type based on value type
            if (isNumeric(paramValue)) {
                paramType = find(".", paramValue) ? "cf_sql_float" : "cf_sql_integer";
            } else if (isDate(paramValue)) {
                paramType = "cf_sql_timestamp";
            } else if (isBoolean(paramValue)) {
                paramType = "cf_sql_bit";
            }
            
            queryParams[paramName] = {
                value: paramValue,
                cfsqltype: paramType
            };
            
            // Handle IN clauses
            if (isArray(paramValue)) {
                queryParams[paramName].list = true;
                queryParams[paramName].value = arrayToList(paramValue);
            }
        }
        
        // Execute with error handling
        try {
            return queryExecute(
                finalQuery,
                queryParams,
                {
                    datasource: arguments.options.datasource ?: application.dsn,
                    timeout: arguments.options.timeout ?: 30
                }
            );
        } catch (database e) {
            writeLog(
                type="error",
                file="database_errors",
                text="Query execution failed: #e.message# | SQL: #finalQuery# | Params: #serializeJSON(queryParams)#"
            );
            rethrow;
        }
    }
}
```

## Mixed Content with Special Characters

### CFML with Embedded JavaScript and CSS

```cfml
<cfscript>
// Complex data structure with special characters
pageData = {
    "page_title": "Special Characters Test & Edge Cases",
    "meta_description": "Testing \"quotes\", 'apostrophes', <tags>, and other special chars",
    "user_data": {
        "preferences": {
            "theme": "dark",
            "language": "en-US",
            "timezone": "America/New_York",
            "special_chars": "!@##$%^&*()[]{}|;':\",./<>?"
        }
    },
    "json_config": '{"api_endpoint": "https://api.example.com/v1", "auth_token": "abc123!@##$%^", "timeout": 5000}'
};

// Generate dynamic CSS classes
cssClassNames = [
    "user-profile",
    "special-chars-test", 
    "edge-case-validation",
    "complex.class.name",
    "class-with-dashes"
];
</cfscript>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><cfoutput>#htmlEditFormat(pageData.page_title)#</cfoutput></title>
    <meta name="description" content="<cfoutput>#htmlEditFormat(pageData.meta_description)#</cfoutput>">
    
    <style>
        /* CSS with CFML-generated content */
        <cfoutput>
        <cfloop array="#cssClassNames#" index="className">
        .#className# {
            background-color: ##f5f5f5;
            border: 1px solid ##ddd;
            padding: 1rem;
            margin-bottom: 0.5rem;
        }
        </cfloop>
        </cfoutput>
        
        /* Complex CSS selectors */
        .user-profile[data-theme="dark"] {
            background-color: #333;
            color: #fff;
        }
        
        .special-chars-test::before {
            content: "⚠️ ";
        }
        
        /* CSS with special characters in content */
        .edge-case-validation::after {
            content: " ✓ Validated: !@##$%^&*()";
        }
    </style>
</head>
<body>
    <cfoutput>
    <div class="#arrayToList(cssClassNames, ' ')#" 
         data-theme="#pageData.user_data.preferences.theme#"
         data-config='#htmlEditFormat(pageData.json_config)#'>
        
        <h1>#htmlEditFormat(pageData.page_title)#</h1>
        
        <div class="user-preferences">
            <h2>User Preferences</h2>
            <cfloop collection="#pageData.user_data.preferences#" item="prefKey">
                <div class="preference-item">
                    <strong>#htmlEditFormat(prefKey)#:</strong>
                    <span class="value">#htmlEditFormat(pageData.user_data.preferences[prefKey])#</span>
                </div>
            </cfloop>
        </div>
        
        <script type="text/javascript">
            // JavaScript with CFML-generated content
            const pageConfig = #serializeJSON(pageData)#;
            const specialChars = '#javaScript(pageData.user_data.preferences.special_chars)#';
            
            console.log('Page configuration:', pageConfig);
            console.log('Special characters test:', specialChars);
            
            // Complex JavaScript with special character handling
            function validateSpecialChars(input) {
                const patterns = {
                    email: /^[a-zA-Z0-9.!##$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
                    phone: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
                    specialChars: /[!@##$%^&*(),.?":{}|<>]/g
                };
                
                const results = {};
                for (const [key, pattern] of Object.entries(patterns)) {
                    results[key] = pattern.test(input);
                }
                
                return results;
            }
            
            // Test with special characters
            const testString = "test@example.com with special chars: !@##$%^&*()";
            const validationResults = validateSpecialChars(testString);
            console.log('Validation results:', validationResults);
            
            // Event handlers with complex selectors
            document.addEventListener('DOMContentLoaded', function() {
                const elements = document.querySelectorAll('.special-chars-test, .edge-case-validation');
                elements.forEach(element => {
                    element.addEventListener('click', function(e) {
                        console.log('Clicked element with classes:', e.target.className);
                        console.log('Data attributes:', e.target.dataset);
                    });
                });
            });
        </script>
    </div>
    </cfoutput>
</body>
</html>
```

## Code Blocks with No Language Specified

Sometimes code blocks don't have a language specified:

```
function noLanguageSpecified() {
    return "This code block has no language identifier";
}

var result = noLanguageSpecified();
console.log(result);
```

## Inline Code with Special Characters

Here's some inline code with special characters: `var test = "hello & goodbye <script>alert('xss')</script>";`

And some CFML inline code: `<cfset myVar = "test & validation">` or `#dateFormat(now(), "yyyy-mm-dd")#`

## Very Long Code Lines

```cfml
<cfquery name="veryLongQuery" datasource="myDatabase">
    SELECT users.id, users.firstName, users.lastName, users.email, users.phoneNumber, users.address, users.city, users.state, users.zipCode, users.country, profiles.bio, profiles.avatar, profiles.website, departments.name as departmentName, departments.description as departmentDescription FROM users LEFT JOIN profiles ON users.id = profiles.userId LEFT JOIN departments ON users.departmentId = departments.id WHERE users.active = <cfqueryparam value="true" cfsqltype="cf_sql_bit"> AND users.createdDate >= <cfqueryparam value="#dateAdd('yyyy', -1, now())#" cfsqltype="cf_sql_timestamp"> ORDER BY users.lastName, users.firstName
</cfquery>
```

## Empty Code Blocks

```cfml

```

```javascript

```
