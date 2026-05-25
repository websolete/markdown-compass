# Multi-Language Code Block Test

This file tests syntax highlighting across multiple programming languages to ensure the enhanced preview works correctly with various code types.

## JavaScript Examples

### Modern ES6+ Features

```javascript
// Class definition with modern features
class UserManager {
    #privateKey = 'secret';
    
    constructor(apiEndpoint) {
        this.apiEndpoint = apiEndpoint;
        this.users = new Map();
    }
    
    async fetchUsers() {
        try {
            const response = await fetch(`${this.apiEndpoint}/users`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const users = await response.json();
            return users.map(user => ({
                ...user,
                fullName: `${user.firstName} ${user.lastName}`,
                isActive: user.status === 'active'
            }));
        } catch (error) {
            console.error('Failed to fetch users:', error);
            return [];
        }
    }
    
    // Private method
    #validateUser(user) {
        const required = ['firstName', 'lastName', 'email'];
        return required.every(field => user[field]?.trim());
    }
}

// Usage with destructuring and arrow functions
const userManager = new UserManager('https://api.example.com');
const processUsers = async () => {
    const users = await userManager.fetchUsers();
    const activeUsers = users.filter(user => user.isActive);
    
    activeUsers.forEach(({ fullName, email }) => {
        console.log(`${fullName}: ${email}`);
    });
};
```

## Python Examples

### Data Processing with Pandas

```python
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt

class DataAnalyzer:
    def __init__(self, data_source):
        self.data_source = data_source
        self.df = None
    
    def load_data(self):
        """Load data from various sources"""
        try:
            if self.data_source.endswith('.csv'):
                self.df = pd.read_csv(self.data_source)
            elif self.data_source.endswith('.json'):
                self.df = pd.read_json(self.data_source)
            else:
                raise ValueError(f"Unsupported file format: {self.data_source}")
            
            print(f"Loaded {len(self.df)} records")
            return self.df
        except Exception as e:
            print(f"Error loading data: {e}")
            return None
    
    def clean_data(self):
        """Clean and preprocess the data"""
        if self.df is None:
            return None
        
        # Remove duplicates
        initial_count = len(self.df)
        self.df = self.df.drop_duplicates()
        
        # Handle missing values
        numeric_columns = self.df.select_dtypes(include=[np.number]).columns
        self.df[numeric_columns] = self.df[numeric_columns].fillna(
            self.df[numeric_columns].median()
        )
        
        # Convert date columns
        date_columns = [col for col in self.df.columns if 'date' in col.lower()]
        for col in date_columns:
            self.df[col] = pd.to_datetime(self.df[col], errors='coerce')
        
        print(f"Cleaned data: {initial_count} -> {len(self.df)} records")
        return self.df
    
    def analyze_trends(self, date_column='date', value_column='value'):
        """Analyze trends in the data"""
        if self.df is None or date_column not in self.df.columns:
            return None
        
        # Group by month and calculate statistics
        monthly_stats = (
            self.df.groupby(self.df[date_column].dt.to_period('M'))
            .agg({
                value_column: ['mean', 'sum', 'count', 'std']
            })
            .round(2)
        )
        
        return monthly_stats

# Usage example
analyzer = DataAnalyzer('sales_data.csv')
data = analyzer.load_data()
if data is not None:
    cleaned_data = analyzer.clean_data()
    trends = analyzer.analyze_trends('sale_date', 'amount')
    print(trends)
```

## Java Examples

### Spring Boot REST Controller

```java
package com.example.userservice.controller;

import com.example.userservice.model.User;
import com.example.userservice.service.UserService;
import com.example.userservice.dto.UserCreateRequest;
import com.example.userservice.dto.UserResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import javax.validation.Valid;
import java.util.Optional;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {
    
    private final UserService userService;
    
    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }
    
    @GetMapping
    public ResponseEntity<Page<UserResponse>> getAllUsers(Pageable pageable) {
        try {
            Page<User> users = userService.findAll(pageable);
            Page<UserResponse> userResponses = users.map(this::convertToResponse);
            return ResponseEntity.ok(userResponses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        Optional<User> user = userService.findById(id);
        
        return user.map(u -> ResponseEntity.ok(convertToResponse(u)))
                  .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserCreateRequest request) {
        try {
            User user = convertToEntity(request);
            User savedUser = userService.save(user);
            UserResponse response = convertToResponse(savedUser);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id, 
            @Valid @RequestBody UserCreateRequest request) {
        
        Optional<User> existingUser = userService.findById(id);
        if (existingUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        User user = existingUser.get();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        
        User updatedUser = userService.save(user);
        return ResponseEntity.ok(convertToResponse(updatedUser));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userService.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        
        userService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
    
    private UserResponse convertToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
    
    private User convertToEntity(UserCreateRequest request) {
        User user = new User();
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        return user;
    }
}
```

## C# Examples

### ASP.NET Core Service

```csharp
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using System.Linq.Expressions;

namespace UserService.Services
{
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<UserService> _logger;
        
        public UserService(
            ApplicationDbContext context, 
            IMapper mapper, 
            ILogger<UserService> logger)
        {
            _context = context;
            _mapper = mapper;
            _logger = logger;
        }
        
        public async Task<PagedResult<UserDto>> GetUsersAsync(
            int page, 
            int pageSize, 
            string searchTerm = null)
        {
            try
            {
                var query = _context.Users.AsQueryable();
                
                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    query = query.Where(u => 
                        u.FirstName.Contains(searchTerm) ||
                        u.LastName.Contains(searchTerm) ||
                        u.Email.Contains(searchTerm));
                }
                
                var totalCount = await query.CountAsync();
                
                var users = await query
                    .OrderBy(u => u.LastName)
                    .ThenBy(u => u.FirstName)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();
                
                var userDtos = _mapper.Map<List<UserDto>>(users);
                
                return new PagedResult<UserDto>
                {
                    Items = userDtos,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving users with search term: {SearchTerm}", searchTerm);
                throw;
            }
        }
        
        public async Task<UserDto> CreateUserAsync(CreateUserRequest request)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // Check for existing email
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == request.Email);
                
                if (existingUser != null)
                {
                    throw new BusinessException("User with this email already exists");
                }
                
                var user = _mapper.Map<User>(request);
                user.CreatedAt = DateTime.UtcNow;
                user.IsActive = true;
                
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                
                await transaction.CommitAsync();
                
                _logger.LogInformation("Created user with ID: {UserId}", user.Id);
                
                return _mapper.Map<UserDto>(user);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error creating user: {@Request}", request);
                throw;
            }
        }
        
        public async Task<bool> DeleteUserAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return false;
            }
            
            user.IsActive = false;
            user.DeletedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Soft deleted user with ID: {UserId}", userId);
            
            return true;
        }
    }
}
```

## SQL Examples

### Complex Query with CTEs

```sql
-- User analytics with Common Table Expressions
WITH user_stats AS (
    SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.created_at,
        COUNT(o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MAX(o.created_at) as last_order_date
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.active = true
    GROUP BY u.id, u.first_name, u.last_name, u.email, u.created_at
),
user_segments AS (
    SELECT 
        *,
        CASE 
            WHEN total_spent >= 1000 THEN 'VIP'
            WHEN total_spent >= 500 THEN 'Premium'
            WHEN total_spent >= 100 THEN 'Regular'
            ELSE 'New'
        END as customer_segment,
        CASE 
            WHEN last_order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 'Active'
            WHEN last_order_date >= DATE_SUB(NOW(), INTERVAL 90 DAY) THEN 'At Risk'
            ELSE 'Inactive'
        END as activity_status
    FROM user_stats
)
SELECT 
    customer_segment,
    activity_status,
    COUNT(*) as user_count,
    AVG(total_spent) as avg_lifetime_value,
    AVG(total_orders) as avg_order_count,
    AVG(avg_order_value) as avg_order_amount
FROM user_segments
GROUP BY customer_segment, activity_status
ORDER BY customer_segment, activity_status;
```

## TypeScript Examples

### Generic Utility Functions

```typescript
interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
    createdAt: Date;
}

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    pagination?: {
        page: number;
        totalPages: number;
        totalItems: number;
    };
}

class ApiClient {
    private baseUrl: string;
    private defaultHeaders: Record<string, string>;
    
    constructor(baseUrl: string, authToken?: string) {
        this.baseUrl = baseUrl;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        };
    }
    
    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>('GET', endpoint);
    }
    
    async post<T, U>(endpoint: string, data: U): Promise<ApiResponse<T>> {
        return this.request<T>('POST', endpoint, data);
    }
    
    private async request<T>(
        method: string, 
        endpoint: string, 
        data?: unknown
    ): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method,
                headers: this.defaultHeaders,
                ...(data && { body: JSON.stringify(data) })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result: ApiResponse<T> = await response.json();
            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// Usage with type safety
const userApi = new ApiClient('https://api.example.com', 'your-token');

async function fetchUsers(): Promise<User[]> {
    const response = await userApi.get<User[]>('/users');
    
    if (response.success && response.data) {
        return response.data;
    }
    
    throw new Error(response.error || 'Failed to fetch users');
}
```
