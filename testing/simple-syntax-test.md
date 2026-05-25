# Simple Code Block Test

A minimal test file with basic code examples to verify syntax highlighting functionality.

## Basic Examples

### JavaScript

```javascript
function greetUser(name) {
    return `Hello, ${name}!`;
}

console.log(greetUser("World"));
```

### Python

```python
def calculate_area(radius):
    return 3.14159 * radius ** 2

print(f"Area: {calculate_area(5)}")
```

### CFML

```cfml
<cffunction name="getTimestamp" returntype="string">
    <cfreturn dateFormat(now(), "yyyy-mm-dd") & " " & timeFormat(now(), "HH:mm:ss")>
</cffunction>

<cfoutput>#getTimestamp()#</cfoutput>
```

### CFScript

```cfscript
function addNumbers(a, b) {
    return a + b;
}

result = addNumbers(10, 20);
writeOutput("Result: " & result);
```

### SQL

```sql
SELECT id, name, email 
FROM users 
WHERE active = 1 
ORDER BY name;
```

### CSS

```css
.user-card {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    margin: 8px 0;
}

.user-card h3 {
    color: #333;
    margin: 0 0 8px 0;
}
```

### HTML

```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <div class="container">
        <h1>Welcome</h1>
        <p>This is a test page.</p>
    </div>
</body>
</html>
```

### JSON

```json
{
    "users": [
        {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "active": true
        },
        {
            "id": 2,
            "name": "Jane Smith", 
            "email": "jane@example.com",
            "active": false
        }
    ],
    "total": 2
}
```

## Mixed Language Example

Here's a CFML page that includes multiple languages:

```cfml
<cfscript>
// CFScript section
function formatUserData(userData) {
    return {
        "fullName": userData.firstName & " " & userData.lastName,
        "displayEmail": lcase(userData.email)
    };
}
</cfscript>

<cfquery name="getUsers" datasource="myDB">
    SELECT firstName, lastName, email
    FROM users
    WHERE active = 1
</cfquery>

<!DOCTYPE html>
<html>
<head>
    <title>User List</title>
    <style>
        .user-list {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
        }
        .user-item {
            padding: 10px;
            border-bottom: 1px solid #eee;
        }
    </style>
</head>
<body>
    <div class="user-list">
        <h1>Active Users</h1>
        <cfoutput query="getUsers">
            <cfset userInfo = formatUserData({
                "firstName": firstName,
                "lastName": lastName,
                "email": email
            })>
            <div class="user-item">
                <strong>#userInfo.fullName#</strong><br>
                <em>#userInfo.displayEmail#</em>
            </div>
        </cfoutput>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            console.log('User list loaded');
            
            // Add click handlers
            const userItems = document.querySelectorAll('.user-item');
            userItems.forEach(item => {
                item.addEventListener('click', function() {
                    this.style.backgroundColor = '#f0f0f0';
                });
            });
        });
    </script>
</body>
</html>
```
