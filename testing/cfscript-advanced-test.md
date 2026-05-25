# CFScript Advanced Examples

This file focuses specifically on advanced CFScript syntax patterns to test enhanced preview rendering.

## Modern CFScript Syntax

### Component with Dependency Injection

```cfscript
/**
 * Advanced user service with dependency injection and modern patterns
 */
component implements="IUserService" accessors="true" {
    
    // Properties with injection
    property name="userDAO" inject="UserDAO";
    property name="cacheService" inject="CacheService";
    property name="eventDispatcher" inject="EventDispatcher";
    property name="logger" inject="Logger";
    
    // Configuration properties
    property name="cacheTimeout" inject="coldbox:setting:cache.userTimeout";
    property name="maxRetries" inject="coldbox:setting:api.maxRetries";
    
    public UserService function init() {
        return this;
    }
    
    /**
     * Create a new user with validation and caching
     */
    public struct function createUser(required struct userData) {
        // Validate input using modern validation
        var validationResult = validateUserData(arguments.userData);
        if (!validationResult.isValid) {
            throw(
                type = "ValidationException",
                message = "Invalid user data",
                detail = serializeJSON(validationResult.errors)
            );
        }
        
        transaction {
            try {
                // Hash password with salt
                if (structKeyExists(arguments.userData, "password")) {
                    arguments.userData.passwordHash = generatePasswordHash(
                        arguments.userData.password
                    );
                    structDelete(arguments.userData, "password");
                }
                
                // Create user record
                var userId = userDAO.create(arguments.userData);
                var newUser = userDAO.findById(userId);
                
                // Cache the new user
                var cacheKey = "user_#userId#";
                cacheService.set(cacheKey, newUser, cacheTimeout);
                
                // Dispatch user created event
                eventDispatcher.dispatch("user.created", {
                    userId: userId,
                    userData: newUser
                });
                
                logger.info("User created successfully", {
                    userId: userId,
                    email: newUser.email
                });
                
                return {
                    success: true,
                    userId: userId,
                    user: sanitizeUserData(newUser)
                };
                
            } catch (any e) {
                transaction action="rollback";
                logger.error("Failed to create user", {
                    error: e.message,
                    userData: arguments.userData
                });
                rethrow;
            }
        }
    }
    
    /**
     * Advanced user search with filtering and pagination
     */
    public struct function searchUsers(
        string searchTerm = "",
        array filters = [],
        numeric page = 1,
        numeric pageSize = 25,
        string sortBy = "lastName",
        string sortOrder = "ASC"
    ) {
        // Build dynamic WHERE clause
        var whereConditions = [];
        var params = {};
        
        if (len(trim(arguments.searchTerm))) {
            whereConditions.append("(firstName LIKE :searchTerm OR lastName LIKE :searchTerm OR email LIKE :searchTerm)");
            params.searchTerm = "%#arguments.searchTerm#%";
        }
        
        // Process dynamic filters
        for (var filter in arguments.filters) {
            if (structKeyExists(filter, "field") && structKeyExists(filter, "value")) {
                var paramName = "filter_#whereConditions.len() + 1#";
                
                switch (filter.operator ?: "=") {
                    case "LIKE":
                        whereConditions.append("#filter.field# LIKE :#paramName#");
                        params[paramName] = "%#filter.value#%";
                        break;
                    case "IN":
                        whereConditions.append("#filter.field# IN (:#paramName#)");
                        params[paramName] = {list: true, value: filter.value};
                        break;
                    default:
                        whereConditions.append("#filter.field# #filter.operator# :#paramName#");
                        params[paramName] = filter.value;
                }
            }
        }
        
        var whereClause = whereConditions.len() ? "WHERE " & whereConditions.toList(" AND ") : "";
        var offset = (arguments.page - 1) * arguments.pageSize;
        
        // Execute search query
        var searchResults = queryExecute("
            SELECT id, firstName, lastName, email, active, createdDate,
                   COUNT(*) OVER() as totalRecords
            FROM users
            #whereClause#
            ORDER BY #arguments.sortBy# #arguments.sortOrder#
            LIMIT :pageSize OFFSET :offset
        ", 
        params.append({
            pageSize: arguments.pageSize,
            offset: offset
        }), {
            datasource: application.dsn
        });
        
        return {
            results: queryToArray(searchResults),
            pagination: {
                page: arguments.page,
                pageSize: arguments.pageSize,
                totalRecords: searchResults.recordCount ? searchResults.totalRecords[1] : 0,
                totalPages: ceiling((searchResults.totalRecords[1] ?: 0) / arguments.pageSize)
            },
            searchCriteria: {
                searchTerm: arguments.searchTerm,
                filters: arguments.filters,
                sortBy: arguments.sortBy,
                sortOrder: arguments.sortOrder
            }
        };
    }
    
    /**
     * Bulk operations with progress tracking
     */
    public struct function bulkUpdateUsers(
        required array userIds,
        required struct updateData,
        boolean async = false
    ) {
        var results = {
            success: [],
            failed: [],
            total: userIds.len(),
            startTime: now()
        };
        
        if (arguments.async) {
            // Asynchronous processing
            thread name="bulkUpdate_#createUUID()#" {
                processBulkUpdate(userIds, updateData, results);
            }
            
            return {
                async: true,
                message: "Bulk update started in background",
                totalRecords: results.total
            };
        } else {
            return processBulkUpdate(userIds, updateData, results);
        }
    }
    
    /**
     * Private helper for bulk update processing
     */
    private struct function processBulkUpdate(
        required array userIds,
        required struct updateData,
        required struct results
    ) {
        for (var userId in arguments.userIds) {
            try {
                userDAO.update(userId, arguments.updateData);
                
                // Clear cache for updated user
                cacheService.clear("user_#userId#");
                
                results.success.append(userId);
                
                // Dispatch update event
                eventDispatcher.dispatch("user.updated", {
                    userId: userId,
                    updateData: arguments.updateData
                });
                
            } catch (any e) {
                results.failed.append({
                    userId: userId,
                    error: e.message
                });
                
                logger.error("Bulk update failed for user", {
                    userId: userId,
                    error: e.message
                });
            }
        }
        
        results.endTime = now();
        results.duration = dateDiff("s", results.startTime, results.endTime);
        
        return results;
    }
    
    /**
     * Advanced caching with cache-aside pattern
     */
    public any function getUserById(required numeric userId) {
        var cacheKey = "user_#arguments.userId#";
        
        // Try cache first
        var cachedUser = cacheService.get(cacheKey);
        if (!isNull(cachedUser)) {
            logger.debug("User loaded from cache", {userId: arguments.userId});
            return cachedUser;
        }
        
        // Load from database
        var user = userDAO.findById(arguments.userId);
        if (isNull(user)) {
            throw(
                type = "UserNotFoundException",
                message = "User not found",
                detail = "No user found with ID #arguments.userId#"
            );
        }
        
        // Cache for future requests
        cacheService.set(cacheKey, user, cacheTimeout);
        
        logger.debug("User loaded from database and cached", {userId: arguments.userId});
        
        return user;
    }
    
    /**
     * Validation with custom rules
     */
    private struct function validateUserData(required struct userData) {
        var errors = [];
        var rules = {
            firstName: {required: true, minLength: 2, maxLength: 50},
            lastName: {required: true, minLength: 2, maxLength: 50},
            email: {required: true, type: "email"},
            password: {minLength: 8, pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$"}
        };
        
        for (var field in rules) {
            var rule = rules[field];
            var value = userData[field] ?: "";
            
            // Required field validation
            if (structKeyExists(rule, "required") && rule.required && !len(trim(value))) {
                errors.append("#field# is required");
                continue;
            }
            
            // Skip other validations if field is empty and not required
            if (!len(trim(value))) continue;
            
            // Length validations
            if (structKeyExists(rule, "minLength") && len(value) < rule.minLength) {
                errors.append("#field# must be at least #rule.minLength# characters");
            }
            
            if (structKeyExists(rule, "maxLength") && len(value) > rule.maxLength) {
                errors.append("#field# must not exceed #rule.maxLength# characters");
            }
            
            // Type validations
            if (structKeyExists(rule, "type")) {
                switch (rule.type) {
                    case "email":
                        if (!isValid("email", value)) {
                            errors.append("#field# must be a valid email address");
                        }
                        break;
                }
            }
            
            // Pattern validations
            if (structKeyExists(rule, "pattern") && !reFind(rule.pattern, value)) {
                switch (field) {
                    case "password":
                        errors.append("Password must contain at least one lowercase letter, one uppercase letter, and one number");
                        break;
                    default:
                        errors.append("#field# format is invalid");
                }
            }
        }
        
        return {
            isValid: !errors.len(),
            errors: errors
        };
    }
    
    /**
     * Secure password hashing
     */
    private string function generatePasswordHash(required string password) {
        var salt = generateSecretKey("AES", 256);
        var saltedPassword = arguments.password & salt;
        var hashedPassword = hash(saltedPassword, "SHA-512");
        
        return hashedPassword & ":" & salt;
    }
    
    /**
     * Remove sensitive data from user object
     */
    private struct function sanitizeUserData(required struct userData) {
        var sanitized = duplicate(arguments.userData);
        
        // Remove sensitive fields
        var sensitiveFields = ["password", "passwordHash", "salt", "securityQuestion"];
        for (var field in sensitiveFields) {
            structDelete(sanitized, field);
        }
        
        return sanitized;
    }
}
```

## CFScript Query Building

### Dynamic Query Builder

```cfscript
component {
    
    /**
     * Advanced query builder with method chaining
     */
    public QueryBuilder function init(string datasource = "") {
        variables.datasource = arguments.datasource ?: application.dsn;
        variables.selectFields = [];
        variables.fromTable = "";
        variables.joins = [];
        variables.whereConditions = [];
        variables.orderBy = [];
        variables.groupBy = [];
        variables.having = [];
        variables.params = {};
        variables.limit = 0;
        variables.offset = 0;
        
        return this;
    }
    
    public QueryBuilder function select(required string fields) {
        if (isArray(arguments.fields)) {
            variables.selectFields.addAll(arguments.fields);
        } else {
            variables.selectFields.append(arguments.fields);
        }
        return this;
    }
    
    public QueryBuilder function from(required string table) {
        variables.fromTable = arguments.table;
        return this;
    }
    
    public QueryBuilder function join(
        required string table,
        required string condition,
        string type = "INNER"
    ) {
        variables.joins.append("#arguments.type# JOIN #arguments.table# ON #arguments.condition#");
        return this;
    }
    
    public QueryBuilder function leftJoin(required string table, required string condition) {
        return join(arguments.table, arguments.condition, "LEFT");
    }
    
    public QueryBuilder function where(required string condition, any value) {
        if (structKeyExists(arguments, "value")) {
            var paramName = "param_#variables.params.count() + 1#";
            variables.whereConditions.append(arguments.condition);
            variables.params[paramName] = arguments.value;
        } else {
            variables.whereConditions.append(arguments.condition);
        }
        return this;
    }
    
    public QueryBuilder function whereIn(required string field, required array values) {
        var paramName = "param_#variables.params.count() + 1#";
        variables.whereConditions.append("#arguments.field# IN (:#paramName#)");
        variables.params[paramName] = {list: true, value: arguments.values.toList()};
        return this;
    }
    
    public QueryBuilder function whereBetween(
        required string field,
        required any startValue,
        required any endValue
    ) {
        var startParam = "param_#variables.params.count() + 1#";
        var endParam = "param_#variables.params.count() + 2#";
        
        variables.whereConditions.append("#arguments.field# BETWEEN :#startParam# AND :#endParam#");
        variables.params[startParam] = arguments.startValue;
        variables.params[endParam] = arguments.endValue;
        
        return this;
    }
    
    public QueryBuilder function orderBy(required string field, string direction = "ASC") {
        variables.orderBy.append("#arguments.field# #arguments.direction#");
        return this;
    }
    
    public QueryBuilder function groupBy(required string field) {
        variables.groupBy.append(arguments.field);
        return this;
    }
    
    public QueryBuilder function limit(required numeric count, numeric offset = 0) {
        variables.limit = arguments.count;
        variables.offset = arguments.offset;
        return this;
    }
    
    public query function execute() {
        var sql = buildSQL();
        
        return queryExecute(
            sql,
            variables.params,
            {datasource: variables.datasource}
        );
    }
    
    public string function toSQL() {
        return buildSQL();
    }
    
    private string function buildSQL() {
        var sql = [];
        
        // SELECT clause
        var selectClause = variables.selectFields.len() ? 
            variables.selectFields.toList() : "*";
        sql.append("SELECT #selectClause#");
        
        // FROM clause
        if (!len(variables.fromTable)) {
            throw(type="InvalidQuery", message="FROM table is required");
        }
        sql.append("FROM #variables.fromTable#");
        
        // JOIN clauses
        if (variables.joins.len()) {
            sql.append(variables.joins.toList(" "));
        }
        
        // WHERE clause
        if (variables.whereConditions.len()) {
            sql.append("WHERE #variables.whereConditions.toList(' AND ')#");
        }
        
        // GROUP BY clause
        if (variables.groupBy.len()) {
            sql.append("GROUP BY #variables.groupBy.toList()#");
        }
        
        // HAVING clause
        if (variables.having.len()) {
            sql.append("HAVING #variables.having.toList(' AND ')#");
        }
        
        // ORDER BY clause
        if (variables.orderBy.len()) {
            sql.append("ORDER BY #variables.orderBy.toList()#");
        }
        
        // LIMIT clause
        if (variables.limit > 0) {
            sql.append("LIMIT #variables.limit#");
            if (variables.offset > 0) {
                sql.append("OFFSET #variables.offset#");
            }
        }
        
        return sql.toList(" ");
    }
}

// Usage example
queryBuilder = new QueryBuilder()
    .select(["u.id", "u.firstName", "u.lastName", "u.email", "p.name as profileName"])
    .from("users u")
    .leftJoin("profiles p", "p.userId = u.id")
    .where("u.active = :active", true)
    .whereIn("u.department", ["IT", "Engineering", "Product"])
    .whereBetween("u.createdDate", createDate(2024, 1, 1), now())
    .orderBy("u.lastName")
    .orderBy("u.firstName")
    .limit(25, 0);

var users = queryBuilder.execute();
writeDump(queryBuilder.toSQL());
```

## CFScript REST API Client

### HTTP Client with Error Handling

```cfscript
component {
    
    property name="baseURL" type="string";
    property name="timeout" type="numeric" default="30";
    property name="headers" type="struct";
    
    public APIClient function init(
        required string baseURL,
        struct defaultHeaders = {},
        numeric timeout = 30
    ) {
        variables.baseURL = arguments.baseURL;
        variables.timeout = arguments.timeout;
        variables.headers = arguments.defaultHeaders;
        
        // Set default headers
        if (!structKeyExists(variables.headers, "Content-Type")) {
            variables.headers["Content-Type"] = "application/json";
        }
        
        return this;
    }
    
    public struct function get(required string endpoint, struct params = {}) {
        var url = buildURL(arguments.endpoint, arguments.params);
        return makeRequest("GET", url);
    }
    
    public struct function post(required string endpoint, any data = {}) {
        return makeRequest("POST", arguments.endpoint, arguments.data);
    }
    
    public struct function put(required string endpoint, any data = {}) {
        return makeRequest("PUT", arguments.endpoint, arguments.data);
    }
    
    public struct function delete(required string endpoint) {
        return makeRequest("DELETE", arguments.endpoint);
    }
    
    private struct function makeRequest(
        required string method,
        required string endpoint,
        any data
    ) {
        var startTime = getTickCount();
        var httpService = new http();
        
        try {
            // Configure HTTP request
            httpService.setMethod(arguments.method);
            httpService.setURL(variables.baseURL & arguments.endpoint);
            httpService.setTimeout(variables.timeout);
            
            // Add headers
            for (var headerName in variables.headers) {
                httpService.addParam(
                    type = "header",
                    name = headerName,
                    value = variables.headers[headerName]
                );
            }
            
            // Add request body for POST/PUT
            if (structKeyExists(arguments, "data") && 
                listFind("POST,PUT,PATCH", arguments.method)) {
                
                var requestBody = isStruct(arguments.data) || isArray(arguments.data) ?
                    serializeJSON(arguments.data) : arguments.data;
                    
                httpService.addParam(
                    type = "body",
                    value = requestBody
                );
            }
            
            // Execute request
            var result = httpService.send().getPrefix();
            var duration = getTickCount() - startTime;
            
            // Parse response
            var response = {
                success: false,
                statusCode: result.responseHeader.status_code ?: 0,
                statusText: result.responseHeader.status_text ?: "",
                headers: result.responseHeader,
                data: {},
                duration: duration,
                request: {
                    method: arguments.method,
                    url: variables.baseURL & arguments.endpoint,
                    headers: variables.headers
                }
            };
            
            // Parse response body
            if (structKeyExists(result, "fileContent") && len(result.fileContent)) {
                try {
                    response.data = deserializeJSON(result.fileContent);
                } catch (any e) {
                    response.data = result.fileContent;
                }
            }
            
            // Determine success based on status code
            response.success = (response.statusCode >= 200 && response.statusCode < 300);
            
            // Log request details
            logRequest(response);
            
            return response;
            
        } catch (any e) {
            var errorResponse = {
                success: false,
                error: {
                    type: e.type ?: "HTTPError",
                    message: e.message ?: "Request failed",
                    detail: e.detail ?: ""
                },
                duration: getTickCount() - startTime,
                request: {
                    method: arguments.method,
                    url: variables.baseURL & arguments.endpoint
                }
            };
            
            logError(errorResponse);
            return errorResponse;
        }
    }
    
    private string function buildURL(required string endpoint, struct params = {}) {
        var url = arguments.endpoint;
        
        if (structCount(arguments.params)) {
            var queryString = [];
            for (var key in arguments.params) {
                queryString.append("#urlEncodedFormat(key)#=#urlEncodedFormat(arguments.params[key])#");
            }
            url &= "?" & queryString.toList("&");
        }
        
        return url;
    }
    
    private void function logRequest(required struct response) {
        if (application.environment == "development") {
            writeLog(
                type = "information",
                file = "api_client",
                text = "API Request: #response.request.method# #response.request.url# -> #response.statusCode# (#response.duration#ms)"
            );
        }
    }
    
    private void function logError(required struct errorResponse) {
        writeLog(
            type = "error",
            file = "api_client",
            text = "API Error: #errorResponse.request.method# #errorResponse.request.url# -> #errorResponse.error.message#"
        );
    }
    
    public APIClient function setHeader(required string name, required string value) {
        variables.headers[arguments.name] = arguments.value;
        return this;
    }
    
    public APIClient function setBearerToken(required string token) {
        return setHeader("Authorization", "Bearer #arguments.token#");
    }
}

// Usage examples
api = new APIClient("https://api.example.com/v1/")
    .setBearerToken(session.authToken);

// GET request with parameters
usersResponse = api.get("/users", {
    page: 1,
    limit: 25,
    active: true
});

// POST request with data
newUserResponse = api.post("/users", {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com"
});

if (newUserResponse.success) {
    writeOutput("User created with ID: #newUserResponse.data.id#");
} else {
    writeOutput("Error: #newUserResponse.error.message#");
}
```
