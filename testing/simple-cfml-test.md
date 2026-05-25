# Simple CFML Test

This is a simple test to verify CFML syntax highlighting works in the enhanced preview.

## Basic CFScript Function

```cfml
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

## CFML Component

```cfml
component extends="BaseService" {
    
    property name="userDAO" inject="UserDAO";
    
    public UserService function init() {
        return this;
    }
    
    public struct function createUser(required struct userData) {
        var result = userDAO.create(userData);
        return {"success": true, "userId": result};
    }
}
```

## CFML Tags

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
